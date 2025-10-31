const BasePdfTemplate = require('../BasePdfTemplate');
const { rgb } = require('pdf-lib');

class ProductLabelTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage, language = 'en') {
    super(pdfDoc, logoImage, language);
    this.pageWidth = 289.13; // 102mm in points
    this.pageHeight = 198.43; // 70mm in points
    this.margin = 15; 
  }

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
      
      // Veri yapılarını destekle
      let products = [];
      if (formData.products) {
        products = formData.products;
      } else if (formData.items) {
        products = formData.items;
      } else {
        products = [formData];
      }
      
      for (const product of products) {
        await this.createProductLabelPage(doc, product, language, formData);
      }

      return doc;
    } catch (error) {
      console.error('ProductLabelTemplate generation error:', error);
      throw error;
    }
  }

  async createProductLabelPage(doc, productData, language, formData = {}) {
    const page = doc.addPage([this.pageWidth, this.pageHeight]);
    
    await this.drawLogo(page, productData);
    await this.drawProductInfo(page, productData, language, formData);
    await this.drawBottomInfo(page, productData, language, formData);
  }

  async drawLogo(page, productData) {
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
          x: this.margin + logoSize + 8, // Logo'dan 8 point boşluk
          y: this.pageHeight - this.margin - logoSize + 12, // Logo ortasında hizala
          size: 27,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      }
    } catch (error) {
      console.warn('Logo drawing failed:', error);
    }
  }

  async drawProductInfo(page, productData, language, formData = {}) {
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
    
    // Article Number parse et
    const fullArticleNumber = productData.articleCode || 
                             productData['TUANA ARTICLE CODE'] || 
                             productData.articleNumber || '';
    
    let tuanaArticleCode = '';
    let composition = '';
    
    if (fullArticleNumber) {
      const parts = fullArticleNumber.split('/');
      tuanaArticleCode = parts[0]?.trim() || '';
      composition = parts[1]?.trim() || '';
    }
    
    // TUANA ARTICLE CODE
    if (tuanaArticleCode) {
      page.drawText(`TUANA ARTICLE CODE: ${tuanaArticleCode}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // ORDER NUMBER
    const orderNumber = productData.orderNumber || 
                       productData['ORDER NUMBER'] || 
                       formData.invoiceNumber || '';
    
    if (orderNumber) {
      page.drawText(`ORDER NUMBER: ${orderNumber}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // COMPOSITION
    const finalComposition = composition || 
                             productData.composition || 
                             productData['COMPOSITION'] || 
                             productData.fabricWeight || '';
    
    if (finalComposition) {
      page.drawText(`COMPOSITION: ${finalComposition}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // WEIGHT
    const weight = productData.rollWeight || 
                  productData['ROLL WEIGHT'] || 
                  productData.grossWeight ||
                  productData.netWeight || '';
    
    if (weight) {
      page.drawText(`ROLL WEIGHT: ${weight}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // WIDTH
    const width = productData.width || 
                 productData['WIDTH'] || '';
    
    if (width) {
      page.drawText(`WIDTH: ${width}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // ROLL NUMBER
    const rollNumber = productData.rollNumber || 
                      productData['ROLL NUMBER'] || '';
    
    if (rollNumber) {
      page.drawText(`ROLL NUMBER: ${rollNumber}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // BATCH NUMBER (LOT bilgisi)
    const batchNumber = productData.lot || 
                       productData['LOT'] || 
                       productData.batchNumber || 
                       productData['BATCH NUMBER'] || '';
    
    if (batchNumber) {
      page.drawText(`BATCH NUMBER: ${batchNumber}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // FABRIC WEIGHT / WIDTH (tek satırda)
    const fabricWeight = productData.fabricWeight || 
                        productData['FABRIC WEIGHT'] || 
                        productData.grossWeight ||
                        productData.netWeight || '';
    
    const fabricWidth = productData.width || 
                       productData['WIDTH'] || 
                       productData.fabricWidth || '';
    
    if (fabricWeight || fabricWidth) {
      const fabricInfo = `WEIGHT / WIDTH: ${fabricWeight || 'N/A'}`;
      page.drawText(fabricInfo, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // QUANTITY
    const quantity = productData.quantity || 
                    productData['QUANTITY'] || '';
    
    if (quantity) {
      page.drawText(`QUANTITY: ${quantity}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // QUALITY
    const quality = productData.quality || 
                   productData['QUALITY'] || '1';
    
    if (quality) {
      page.drawText(`QUALITY: ${quality}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // DATE
    const date = productData.date || 
                productData['DATE'] || 
                new Date().toLocaleDateString('tr-TR');
    
    if (date) {
      page.drawText(`DATE: ${date}`, {
        x: this.margin,
        y: currentY,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }
  }

  async drawBottomInfo(page, productData, language, formData = {}) {  
    const bottomY = 40;
    const fontSize = 9;
    let currentY = bottomY;
    const lineHeight = 9;
    

    
    // Article Number parse et
    const fullArticleNumber = productData.articleCode || 
                             productData['TUANA ARTICLE CODE'] || 
                             productData.articleNumber || '';
    
    let tuanaArticleCode = '';
    if (fullArticleNumber) {
      const parts = fullArticleNumber.split('/');
      tuanaArticleCode = parts[0]?.trim() || '';
    }
    
    // Orta çizgi
    page.drawLine({
      start: { x: this.margin, y: currentY + 9 },
      end: { x: this.pageWidth - this.margin, y: currentY + 9 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // CLIENT - client objesi içindeki companyName'i kontrol et
    const client = formData.client?.companyName || 
                  formData['RECIPIENT Şirket Adı'] || 
                  formData.recipientCompany || 
                  productData.client || 
                  productData['CLIENT'] || 
                  'CLIENT COMPANY NAME';
    
    if (client) {
      page.drawText(`CLIENT: ${client}`, {
        x: this.margin,
        y: currentY - 2,
        size: fontSize,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      currentY -= lineHeight;
    }

    // CLIENT ARTICLE CODE
    const clientArticleCode = productData.clientArticleCode || 
                             productData['CLIENT ARTICLE CODE'] || 
                             tuanaArticleCode || '';
    
    if (clientArticleCode) {
      page.drawText(`CLIENT ARTICLE CODE: ${clientArticleCode}`, {
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

    // ATTENTION - HelveticaNeueThinItalic ile
    const warningText = "ATTENTION! NO CLAIMS WILL BE ACCEPTED AFTER THE FABRIC HAS BEEN CUT.";
    const words = warningText.split(' ');
    const maxWidth = this.pageWidth - (this.margin * 2);
    
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      
      if (testLine.length <= 40) { // Basit karakter sayısı kontrolü
        currentLine = testLine;
      } else {
        if (currentLine) {
          page.drawText(currentLine, {
            x: this.margin,
            y: currentY,
            size: fontSize,
            font: this.fontItalic, // HelveticaNeueThinItalic
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
        size: fontSize,
        font: this.fontItalic, // HelveticaNeueThinItalic
        color: rgb(0, 0, 0),
      });
    }
  }
}

module.exports = ProductLabelTemplate;