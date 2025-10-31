const { StandardFonts, rgb } = require('pdf-lib');
const FontService = require('../services/fontService');
const LanguageService = require('../services/languageService');

/**
 * Base PDF Template Class
 * Tüm PDF şablonları için ortak fonksiyonalite
 */
class BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'en') {
    this.pdfDoc = pdfDoc;
    this.logoImage = logoImage;
    this.language = language;
    this.font = null;
    this.fontBold = null;
    this.fontItalic = null;
    this.fontService = new FontService();
    this.languageService = new LanguageService();
  }

  /**
   * Font yükleme - tüm template'lar için ortak
   */
  async loadFonts() {
    // Font durumunu logla
    await this.fontService.logFontStatus(this.pdfDoc);
    
    // Önce Helvetica Neue Light fontunu yüklemeyi dene
    const helveticaNeueLight = await this.fontService.loadCustomFont(this.pdfDoc, "helvetica-neue-5/HelveticaNeueLight.otf");
    const helveticaNeueLightItalic = await this.fontService.loadCustomFont(this.pdfDoc, "helvetica-neue-5/HelveticaNeueLightItalic.otf");
    const helveticaNeueBold = await this.fontService.loadCustomFont(this.pdfDoc, "helvetica-neue-5/HelveticaNeueBold.otf");
    
    if (helveticaNeueLight) {
      // Helvetica Neue Light başarıyla yüklendi
      this.font = helveticaNeueLight;
      this.fontBold = helveticaNeueBold || helveticaNeueLight; // Bold varsa kullan
      this.fontItalic = helveticaNeueLightItalic || helveticaNeueLight;
      //console.log('✅ Using Helvetica Neue Light font');
      //console.log('✅ Bold font loaded:', !!helveticaNeueBold);
    } else {
      // Helvetica Neue UltraLight fontlarını yüklemeyi dene
      const helveticaNeueUltraLight = await this.fontService.loadHelveticaNeueUltraLight(this.pdfDoc);
      const helveticaNeueUltraLightItalic = await this.fontService.loadHelveticaNeueUltraLightItalic(this.pdfDoc);
      
      if (helveticaNeueUltraLight) {
        // Helvetica Neue UltraLight başarıyla yüklendi
        this.font = helveticaNeueUltraLight;        // Normal text için UltraLight
        this.fontBold = helveticaNeueUltraLight;    // Bold yerine yine UltraLight
        this.fontItalic = helveticaNeueUltraLightItalic || helveticaNeueUltraLight; // İtalik varsa kullan
        //console.log('✅ Using Helvetica Neue UltraLight fonts (Açık)');
      } else {
        // Fallback olarak standart fontları kullan
        this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
        this.fontBold = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
        this.fontItalic = await this.pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        //console.log('⚠️  Using standard Helvetica fonts (custom font not found)');
      }
    }
  }

  /**
   * Türkçe karakterleri değiştir
   */
  replaceTurkishChars(text) {
    return text
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
      .replace(/ü/g, 'u').replace(/Ü/g, 'U')
      .replace(/ş/g, 's').replace(/Ş/g, 'S')
      .replace(/ı/g, 'i').replace(/İ/g, 'I')
      .replace(/ö/g, 'o').replace(/Ö/g, 'O')
      .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  }

  /**
   * Güvenli metin çizme - Türkçe karakterler için
   */
  drawSafeText(page, text, options) {
    try {
      page.drawText(text, options);
    } catch (error) {
      //console.log('Font does not support Turkish characters, converting:', error.message);
      const convertedText = this.replaceTurkishChars(text);
      page.drawText(convertedText, options);
    }
  }

  /**
   * Ortak header çizimi
   */
  drawHeader(page, pageWidth, y, title) {
    // TUANA TEKSTIL başlığı
    this.drawSafeText(page, 'TUANA TEKSTIL', {
      x: 55,
      y: y - 5,
      size: 35,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Logo
    if (this.logoImage) {
      const logoWidth = 25;
      const logoHeight = 25;
      page.drawImage(this.logoImage, {
        x: pageWidth - 285,
        y: y - 5,
        width: logoWidth,
        height: logoHeight,
      });
    }

    // Ana çizgi
    page.drawLine({
      start: { x: 50, y: y - 20 },
      end: { x: pageWidth - 50, y: y - 20 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // ISSUE DATE
    const currentDate = new Date().toLocaleDateString('en-GB');
    const issueDateLabel = this.languageService.getText('issueDate', this.language);
    page.drawText(`${issueDateLabel}: ${currentDate}`, {
      x: pageWidth - 145,
      y: y + 15,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi
    page.drawLine({
      start: { x: pageWidth - 150, y: y + 25 },
      end: { x: pageWidth - 150, y: y - 20 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Ortak footer çizimi
   */
  drawFooter(page, pageWidth) {
    let y = 130;
    
    // 2 çizgi
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: pageWidth - 50, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 50, y: y - 10 },
      end: { x: pageWidth - 50, y: y - 10 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Footer metinleri
    const issuedByTuanaLabel = this.languageService.getText('issuedByTuanaTechnical', this.language);
    const responsibleTechnicianNuranLabel = this.languageService.getText('responsibleTechnicianNuran', this.language);
    const signatureLabel = this.languageService.getText('signature', this.language);
    const stampLabel = this.languageService.getText('stamp', this.language);
    
    page.drawText(issuedByTuanaLabel, {
      x: 50,
      y: y - 25,
      size: 8,
      font: this.fontItalic,
      color: rgb(0, 0, 0),
    });

    page.drawText(responsibleTechnicianNuranLabel, {
      x: 50,
      y: y - 40,
      size: 8,
      font: this.fontItalic,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${signatureLabel}:`, {
      x: 50,
      y: y - 55,
      size: 8,
      font: this.fontItalic,
      color: rgb(0, 0, 0),
    });

    page.drawText(stampLabel, {
      x: pageWidth / 2 + 10,
      y: y - 25,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi
    page.drawLine({
      start: { x: pageWidth / 2, y: y - 10 },
      end: { x: pageWidth / 2, y: y - 65 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Sayfa numarası
    page.drawText('1', {
      x: pageWidth / 2,
      y: 30,
      size: 12,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Generate metodu - her template bu metodu override etmeli
   * @param {Object} formData - Form verileri
   * @returns {Promise}
   */
  async generate(formData) {
    throw new Error('generate method must be implemented by subclass');
  }
}

module.exports = BasePdfTemplate;
