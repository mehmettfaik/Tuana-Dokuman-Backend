const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const excelOcrParser = require('../services/parsers/excelOcrParser');
const convert = require('heic-convert');

/**
 * Excel Controller
 * Fotoğraflardan OCR ile veri çıkarıp Excel oluşturur
 */

// Upload dizinlerini oluştur
const uploadsDir = path.join(__dirname, '../temp/uploads');
const excelsDir = path.join(__dirname, '../temp/excels');

// Dizinleri oluştur
[uploadsDir, excelsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * POST /api/excel/create-from-photos
 * Fotoğraflardan Excel oluşturur
 */
const createExcelFromPhotos = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hiç fotoğraf yüklenmedi'
      });
    }
    // Her fotoğraf için OCR işlemi yap
    const allProducts = [];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // Dosyayı oku
        let fileBuffer = fs.readFileSync(file.path);
        
        // HEIC dosyaları için mimetype normalizasyonu ve JPEG'e çevirme
        let mimeType = file.mimetype;
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (ext === '.heic' || ext === '.heif') {
          try {
            // HEIC'i JPEG'e çevir
            const outputBuffer = await convert({
              buffer: fileBuffer,
              format: 'JPEG',
              quality: 0.9
            });
            fileBuffer = outputBuffer;
            mimeType = 'image/jpeg';
          } catch (convertError) {
            throw new Error('HEIC dosyası dönüştürülemedi');
          }
        }
                
        // Google Document AI ile SADECE TEXT EXTRACTION
        // documentAiService değil, direkt Document AI client kullanacağız
        const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
        
        // Document AI credentials
        const credentials = {
          type: process.env.DOCUMENT_AI_TYPE,
          project_id: process.env.DOCUMENT_AI_PROJECT_ID,
          private_key_id: process.env.DOCUMENT_AI_PRIVATE_KEY_ID,
          private_key: process.env.DOCUMENT_AI_PRIVATE_KEY,
          client_email: process.env.DOCUMENT_AI_CLIENT_EMAIL,
          client_id: process.env.DOCUMENT_AI_CLIENT_ID,
          auth_uri: process.env.DOCUMENT_AI_AUTH_URI,
          token_uri: process.env.DOCUMENT_AI_TOKEN_URI,
          auth_provider_x509_cert_url: process.env.DOCUMENT_AI_AUTH_PROVIDER_X509_CERT_URL,
          client_x509_cert_url: process.env.DOCUMENT_AI_CLIENT_X509_CERT_URL,
          universe_domain: process.env.DOCUMENT_AI_UNIVERSE_DOMAIN
        };

        const client = new DocumentProcessorServiceClient({ credentials });
        
        const name = `projects/${process.env.DOCUMENT_AI_PROJECT_ID}/locations/${process.env.DOCUMENT_AI_LOCATION}/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`;
        
        const request = {
          name,
          rawDocument: {
            content: fileBuffer,
            mimeType: mimeType, // Normalized mimetype
          },
        };

        const [result] = await client.processDocument(request);
        const { document } = result;

        // Ham OCR text'i al (document.text)
        const ocrText = document.text || '';        
        // Debug: İlk 500 karakter göster
        if (ocrText.length > 0) {
        }

        if (ocrText.length > 0) {
          // İlk önce standart parsing dene
          let parsed = excelOcrParser.parseOcrText(ocrText, file.originalname);


          // Eğer hiç ürün bulunamadıysa esnek parsing dene
          if (parsed.totalProducts === 0) {
            parsed = excelOcrParser.parseOcrTextFlexible(ocrText, file.originalname);
          }

          // Eğer hiç ürün bulunamadıysa esnek parsing dene
          if (parsed.totalProducts === 0) {
            parsed = excelOcrParser.parseOcrTextFlexible(ocrText, file.originalname);
          }

          // Ürünleri ekle
          if (parsed.totalProducts > 0) {
            for (let j = 0; j < parsed.totalProducts; j++) {
              allProducts.push({
                article: parsed.articles[j] || '',
                composition: parsed.compositions[j] || '',
                weight: parsed.weights[j] || '',
                width: parsed.widths[j] || '',
              });
            }
            totalProcessed++;
          } else {
            totalFailed++;
          }

        } else {
          console.warn('⚠️ OCR text boş');
          totalFailed++;
        }

        // Geçici dosyayı sil
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

      } catch (error) {
        totalFailed++;

        // Geçici dosyayı sil
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    console.log(`\n📊 İşlem Özeti:`);
    console.log(`   Toplam: ${files.length}`);
    console.log(`   Başarılı: ${totalProcessed}`);
    console.log(`   Başarısız: ${totalFailed}`);
    console.log(`   Bulunan Ürün: ${allProducts.length}`);

    if (allProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Hiçbir fotoğraftan ürün verisi çıkarılamadı. Lütfen fotoğrafların açık ve net olduğundan emin olun.',
        hint: 'OCR verisi çıkarıldı ancak Article, Composition, Weight veya Width bilgileri bulunamadı.',
        suggestion: 'Fotoğraflarda şu bilgilerin görünür olması gerekiyor: Article (Ürün kodu), Composition (Karışım), Weight (Gramaj), Width (En)',
        details: {
          totalPhotos: files.length,
          processed: totalProcessed,
          failed: totalFailed,
          productsFound: allProducts.length
        }
      });
    }

    // Excel dosyası oluştur
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Sütun başlıkları
    worksheet.columns = [
      { header: 'ARTICLE', key: 'article', width: 25 },
      { header: 'COMPOSITION', key: 'composition', width: 40 },
      { header: 'WEIGHT', key: 'weight', width: 15 },
      { header: 'WIDTH', key: 'width', width: 15 }
    ];

    // Başlık satırını stillendir
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Verileri ekle
    allProducts.forEach(product => {
      worksheet.addRow(product);
    });

    // Hücrelere border ekle
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Excel dosyasını kaydet
    const timestamp = Date.now();
    const excelFilename = `products.xlsx`;
    const excelPath = path.join(excelsDir, excelFilename);

    await workbook.xlsx.writeFile(excelPath);

    res.json({
      success: true,
      message: 'Excel dosyası başarıyla oluşturuldu',
      data: {
        filename: excelFilename,
        downloadUrl: `/api/excel/download/${excelFilename}`,
        stats: {
          totalPhotos: files.length,
          processedPhotos: totalProcessed,
          failedPhotos: totalFailed,
          totalProducts: allProducts.length
        }
      }
    });

  } catch (error) {
    // Geçici dosyaları temizle
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Excel oluşturulurken bir hata oluştu',
      error: error.message
    });
  }
};

/**
 * GET /api/excel/download/:filename
 * Excel dosyasını indir
 */
const downloadExcel = async (req, res) => {
  try {
    const { filename } = req.params;

    // Güvenlik: sadece .xlsx dosyalarına izin ver
    if (!filename.endsWith('.xlsx')) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz dosya formatı'
      });
    }

    const filePath = path.join(excelsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }

    console.log(` Excel indiriliyor: ${filename} (User: ${req.user?.email})`);

    // Dosyayı indir
    res.download(filePath, filename, (err) => {
      if (err) {
      } else {
      }
    });

  } catch (error) {
    console.error(' Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya indirilemedi',
      error: error.message
    });
  }
};

/**
 * GET /api/excel/list
 * Oluşturulan Excel dosyalarını listele
 */
const listExcelFiles = async (req, res) => {
  try {
    const files = fs.readdirSync(excelsDir)
      .filter(file => file.endsWith('.xlsx'))
      .map(file => {
        const stats = fs.statSync(path.join(excelsDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          downloadUrl: `/api/excel/download/${file}`
        };
      })
      .sort((a, b) => b.created - a.created); // En yeni en üstte

    res.json({
      success: true,
      count: files.length,
      files
    });

  } catch (error) {
    console.error(' List error:', error);
    res.status(500).json({
      success: false,
      message: 'Dosyalar listelenemedi',
      error: error.message
    });
  }
};

/**
 * DELETE /api/excel/:filename
 * Excel dosyasını sil
 */
const deleteExcel = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename.endsWith('.xlsx')) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz dosya formatı'
      });
    }

    const filePath = path.join(excelsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Dosya bulunamadı'
      });
    }
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Dosya başarıyla silindi'
    });

  } catch (error) {
    console.error(' Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya silinemedi',
      error: error.message
    });
  }
};

module.exports = {
  createExcelFromPhotos,
  downloadExcel,
  listExcelFiles,
  deleteExcel
};
