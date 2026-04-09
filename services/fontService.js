const fs = require('fs');
const path = require('path');

class FontService {
  constructor() {
    this.fontsPath = path.join(__dirname, '../assets/fonts');
    this.loadedFonts = {};
  }

  // Özel font dosyası yükle (TTF/OTF)
  async loadCustomFont(pdfDoc, fontFileName) {
    try {
      // Cache'den kontrol et
      const cacheKey = `custom-${fontFileName}`;
      if (this.loadedFonts[cacheKey]) {
        return this.loadedFonts[cacheKey];
      }

      // Font dosyasının yolunu oluştur
      const fontPath = path.join(this.fontsPath, fontFileName);
      
      // Dosya var mı kontrol et
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);
        
        // Cache'e kaydet
        this.loadedFonts[cacheKey] = customFont;
        return customFont;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue UltraLight (Açık) font dosyasını yükle
  async loadHelveticaNeueUltraLight(pdfDoc) {
    try {
      // Cache'den kontrol et
      if (this.loadedFonts['helvetica-neue-ultralight']) {
        return this.loadedFonts['helvetica-neue-ultralight'];
      }

      // Önce kendi fonts klasörümüzden dene
      const fontPath = path.join(this.fontsPath, 'helvetica-neue-5/HelveticaNeueUltraLight.otf');
      
      // TTF dosyası varsa onu kullan
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);
        
        // Cache'e kaydet
        this.loadedFonts['helvetica-neue-ultralight'] = customFont;
        return customFont;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue UltraLight Italic (Açık İtalik) font dosyasını yükle
  async loadHelveticaNeueUltraLightItalic(pdfDoc) {
    try {
      // Cache'den kontrol et
      if (this.loadedFonts['helvetica-neue-ultralight-italic']) {
        return this.loadedFonts['helvetica-neue-ultralight-italic'];
      }

      // Önce kendi fonts klasörümüzden dene
      const fontPath = path.join(this.fontsPath, 'helvetica-neue-5/HelveticaNeueUltraLightItalic.otf');
      
      // TTF dosyası varsa onu kullan
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);
        
        // Cache'e kaydet
        this.loadedFonts['helvetica-neue-ultralight-italic'] = customFont;
        return customFont;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue Light Italic font dosyasını yükle
  async loadHelveticaNeueLightItalic(pdfDoc) {
    try {
      // Cache'den kontrol et
      if (this.loadedFonts['helvetica-neue-light-italic']) {
        return this.loadedFonts['helvetica-neue-light-italic'];
      }

      // Önce kendi fonts klasörümüzden dene
      const fontPath = path.join(this.fontsPath, 'helvetica-neue-5/HelveticaNeueLightItalic.otf');
      
      // OTF dosyası varsa onu kullan
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        const customFont = await pdfDoc.embedFont(fontBytes);
        
        // Cache'e kaydet
        this.loadedFonts['helvetica-neue-light-italic'] = customFont;
        return customFont;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Font dosyalarının varlığını kontrol et
  checkFontAvailability() {
    const ultraLightPath = path.join(this.fontsPath, 'helvetica-neue-5/HelveticaNeueUltraLight.otf');
    const ultraLightItalicPath = path.join(this.fontsPath, 'helvetica-neue-5/HelveticaNeueUltraLightItalic.otf');
    
    return {
      ultraLight: fs.existsSync(ultraLightPath),
      ultraLightItalic: fs.existsSync(ultraLightItalicPath),
      ultraLightPath: ultraLightPath,
      ultraLightItalicPath: ultraLightItalicPath
    };
  }

  // Helvetica Neue fontlarının durumunu logla
  async logFontStatus(pdfDoc) {
    const availability = this.checkFontAvailability();

    try {
      const ultraLight = await this.loadHelveticaNeueUltraLight(pdfDoc);
      const ultraLightItalic = await this.loadHelveticaNeueUltraLightItalic(pdfDoc);
    } catch (error) {
      // Silently fail
    }
  }
}

module.exports = FontService;
