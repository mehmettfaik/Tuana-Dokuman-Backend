const BasePdfTemplate = require('../BasePdfTemplate');
const { rgb } = require('pdf-lib');
const LanguageService = require('../../services/languageService');

/**
 * CekiListesiLabelTemplate - Çeki Listesi Etiket şablonu
 * ProductLabelTemplate ile aynı tasarım ölçülerine sahip
 * 102mm x 70mm boyutunda etiketler oluşturur
 */
class CekiListesiLabelTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage, language = 'tr') {
    super(pdfDoc, logoImage, language);
    this.pageWidth = 289.13; // 102mm in points
    this.pageHeight = 198.43; // 70mm in points
    this.margin = 15;
    this.languageService = new LanguageService();
  }

  /**
   * Ana belge oluşturma metodu
   * @param {Object} formData - Form verileri (rows array içerir)
   * @param {string} language - Dil seçimi (tr/en)
   * @returns {Promise<PDFDocument>}
   */
  async generateDocument(formData, language = 'tr') {
    try {
      const { PDFDocument } = require('pdf-lib');
      const fontkit = require('fontkit');
      const LogoService = require('../../services/logoService');
      
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      
      // Logo yükle
      const logoImage = await LogoService.loadLogo(doc);
      
      // Template'i initialize et
      this.pdfDoc = doc;
      this.logoImage = logoImage;
      this.language = language;
      
      // Font'ları yükle
      await this.loadFonts();
      
      // Form verilerini normalize et
      const normalizedData = this.normalizeFormData(formData);
      
      // rows array'inden etiketleri oluştur
      let rows = normalizedData.rows || [];
      
      // Eğer rows boşsa, metreler ve lotlar array'lerinden oluştur
      if (rows.length === 0 && normalizedData.metreler && normalizedData.metreler.length > 0) {
        const metreler = normalizedData.metreler;
        const lotlar = normalizedData.lotlar || [];
        
        for (let i = 0; i < metreler.length; i++) {
          const metre = metreler[i];
          // Boş olmayan satırlar için etiket oluştur
          if (metre !== undefined && metre !== null && String(metre).trim() !== '') {
            rows.push({
              topNo: i + 1,
              metre: metre,
              lot: lotlar[i] || ''
            });
          }
        }
      }
      
      // Her satır için bir etiket sayfası oluştur
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const labelData = {
          artikelKodu: normalizedData.artikelKodu || '',
          siparisNo: normalizedData.faturaNo || '', // Fatura No = Sipariş Numarası
          karisim: normalizedData.karisim || '',
          renkKodu: normalizedData.renkKodu || '',
          desenNo: normalizedData.desenNo || '',
          topNo: row.topNo || row.topNumarasi || (i + 1),
          lotNo: row.lot || row.lotNo || '',
          uzunluk: row.metre || row.uzunluk || '',
          tarih: normalizedData.tarih || '',
          musteri: normalizedData.musteriAdi || ''
        };
        
        await this.createLabelPage(doc, labelData, language);
      }

      return doc;
    } catch (error) {
      console.error('CekiListesiLabelTemplate generation error:', error);
      throw error;
    }
  }

  /**
   * Frontend'den gelen farklı veri yapılarını normalize et
   */
  normalizeFormData(rawData = {}) {
    // Eğer formData iç içe geldiyse düzelt
    let baseData = rawData;
    if (rawData.formData && typeof rawData.formData === 'object') {
      baseData = { ...rawData, ...rawData.formData };
    }
    
    // rows array'ini al
    let rows = rawData.rows || baseData.rows || [];
    let metreler = [];
    let lotlar = [];
    
    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach(row => {
        metreler.push(row.metre || row.meter || row.METRE || '');
        lotlar.push(row.lot || row.LOT || '');
      });
    }
    
    // Eğer metreler hala boşsa, diğer kaynaklardan dene
    if (metreler.length === 0) {
      metreler = baseData.metreler || baseData['METRELER'] || baseData.meters || [];
      lotlar = baseData.lotlar || baseData['LOTLAR'] || baseData.lots || [];
    }
    
    // String ise array'e çevir
    if (typeof metreler === 'string') {
      metreler = metreler.split(',').map(m => m.trim());
    }
    if (typeof lotlar === 'string') {
      lotlar = lotlar.split(',').map(l => l.trim());
    }
    
    return {
      // Form bilgileri
      musteriAdi: baseData.musteriAdi || baseData['MÜŞTERİ'] || baseData.musteri || '',
      faturaNo: baseData.faturaNo || baseData['FATURA NO'] || baseData.invoiceNo || '',
      irsaliyeNo: baseData.irsaliyeNo || baseData['İRSALİYE NO'] || baseData.dispatchNo || '',
      tarih: baseData.tarih || baseData['TARIH'] || baseData.date || '',
      
      // Ürün bilgileri
      artikelKodu: baseData.artikelKodu || baseData['ARTİKEL KODU'] || baseData.articleCode || '',
      karisim: baseData.karisim || baseData['KARIŞIM'] || baseData.composition || '',
      renkKodu: baseData.renkKodu || baseData['RENK NO'] || baseData.colorNo || '',
      desenNo: baseData.desenNo || baseData['DESEN NO'] || baseData.patternNo || '',
      
      // Tablo verileri
      metreler: metreler,
      lotlar: lotlar,
      rows: rows
    };
  }

  /**
   * Tek bir etiket sayfası oluştur
   * ProductLabelTemplate tasarımı ile aynı
   */
  async createLabelPage(doc, labelData, language) {
    const page = doc.addPage([this.pageWidth, this.pageHeight]);
    
    await this.drawLogo(page);
    await this.drawProductInfo(page, labelData, language);
    await this.drawBottomInfo(page, labelData, language);
  }

  /**
   * Logo ve TUANA yazısını çiz
   */
  async drawLogo(page) {
    try {
      if (this.logoImage) {
        const logoSize = 30; // Kare olacak şekilde
        
        page.drawImage(this.logoImage, {
          x: this.margin,
          y: this.pageHeight - this.margin + 7 - logoSize,
          width: logoSize,
          height: logoSize,
        });
        
        // Logo yanına "TUANA" yazısı ekle
        page.drawText('TUANA', {
          x: this.margin + logoSize + 8,
          y: this.pageHeight - this.margin - logoSize + 12,
          size: 25,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      }
    } catch (error) {
      console.warn('Logo drawing failed:', error);
    }
  }

  /**
   * Ürün bilgilerini çiz
   */
  async drawProductInfo(page, labelData, language) {
    const startY = this.pageHeight - 55;
    let currentY = startY;
    const lineHeight = 10;
    const fontSize = 9;
    
    // Üst çizgi
    page.drawLine({
      start: { x: this.margin, y: currentY + 13 },
      end: { x: this.pageWidth - this.margin, y: currentY + 13 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // TUANA ARTIKEL KOD
    const artikelLabel = this.languageService.getText('tuanaArtikelKod', language);
    if (labelData.artikelKodu) {
      page.drawText(`${artikelLabel}: ${labelData.artikelKodu}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // SİPARİŞ NUMARASI (Fatura No değeri)
    const siparisLabel = this.languageService.getText('siparisNumarasi', language);
    if (labelData.siparisNo) {
      page.drawText(`${siparisLabel}: ${labelData.siparisNo}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // KARIŞIM
    const karisimLabel = this.languageService.getText('karisimLabel', language);
    if (labelData.karisim) {
      page.drawText(`${karisimLabel}: ${labelData.karisim}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // RENK NO
    const renkLabel = this.languageService.getText('renkNoLabel', language);
    if (labelData.renkKodu) {
      page.drawText(`${renkLabel}: ${labelData.renkKodu}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // DESEN NO
    const desenLabel = this.languageService.getText('desenNoLabel', language);
    if (labelData.desenNo) {
      page.drawText(`${desenLabel}: ${labelData.desenNo}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // TOP NUMARASI
    const topLabel = this.languageService.getText('topNumarasiLabel', language);
    page.drawText(`${topLabel}: ${labelData.topNo}`, {
      x: this.margin,
      y: currentY,
      size: fontSize,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // LOT NUMARASI
    const lotLabel = this.languageService.getText('lotNumarasiLabel', language);
    if (labelData.lotNo) {
      page.drawText(`${lotLabel}: ${labelData.lotNo}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // UZUNLUK
    const uzunlukLabel = this.languageService.getText('uzunlukLabel', language);
    const uzunlukUnit = language === 'tr' ? 'METRE' : 'METER';
    if (labelData.uzunluk) {
      page.drawText(`${uzunlukLabel}: ${labelData.uzunluk} ${uzunlukUnit}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // TARİH
    const tarihLabel = this.languageService.getText('tarihLabel', language);
    const formattedDate = this.formatDate(labelData.tarih);
    page.drawText(`${tarihLabel}: ${formattedDate}`, {
      x: this.margin,
      y: currentY,
      size: fontSize,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Alt bilgileri çiz (Müşteri ve Uyarı)
   */
  async drawBottomInfo(page, labelData, language) {
    const bottomY = 40;
    const fontSize = 9;
    let currentY = bottomY;
    const lineHeight = 9;
    
    // Orta çizgi
    page.drawLine({
      start: { x: this.margin, y: currentY + 9 },
      end: { x: this.pageWidth - this.margin, y: currentY + 9 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // MÜŞTERİ
    const musteriLabel = this.languageService.getText('musteriEtiketLabel', language);
    if (labelData.musteri) {
      page.drawText(`${musteriLabel}: ${labelData.musteri}`, {
        x: this.margin,
        y: currentY - 2,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // Alt çizgi
    page.drawLine({
      start: { x: this.margin, y: currentY + 2 },
      end: { x: this.pageWidth - this.margin, y: currentY + 2 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    currentY -= 8;

    // UYARI METNİ - HelveticaNeueThinItalic ile
    const warningText = this.languageService.getText('cekiListesiWarning', language);
    const words = warningText.split(' ');
    const maxCharsPerLine = 45; // Daha uzun Türkçe metin için ayarlandı
    
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          page.drawText(currentLine, {
            x: this.margin,
            y: currentY,
            size: 8,
            font: this.fontItalic || this.font,
            color: rgb(0, 0, 0),
          });
          currentY -= lineHeight;
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: this.margin,
        y: currentY,
        size: 8,
        font: this.fontItalic || this.font,
        color: rgb(0, 0, 0),
      });
    }
  }

  /**
   * Tarih formatla
   */
  formatDate(dateStr) {
    if (!dateStr) {
      const today = new Date();
      return today.toLocaleDateString('tr-TR');
    }
    
    // YYYY-MM-DD formatını DD.MM.YYYY'ye çevir
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
    }
    
    return String(dateStr);
  }
}

module.exports = CekiListesiLabelTemplate;
