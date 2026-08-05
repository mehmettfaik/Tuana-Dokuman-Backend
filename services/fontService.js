const fs = require('fs');
const path = require('path');

// Global cache for font bytes (Buffer)
const fontBufferCache = {};

class FontService {
  constructor() {
    this.fontsPath = path.join(__dirname, '../assets/fonts');
  }

  // Helper to read and cache buffer
  _getFontBuffer(fontFileName, relativePath = '') {
    const cacheKey = `custom-${fontFileName}`;
    if (fontBufferCache[cacheKey]) {
      return fontBufferCache[cacheKey];
    }
    
    const fontPath = relativePath 
      ? path.join(this.fontsPath, relativePath)
      : path.join(this.fontsPath, fontFileName);
      
    if (fs.existsSync(fontPath)) {
      const fontBytes = fs.readFileSync(fontPath);
      fontBufferCache[cacheKey] = fontBytes;
      return fontBytes;
    }
    return null;
  }

  // Özel font dosyası yükle (TTF/OTF)
  async loadCustomFont(pdfDoc, fontFileName) {
    try {
      const fontBytes = this._getFontBuffer(fontFileName);
      if (fontBytes) {
        return await pdfDoc.embedFont(fontBytes);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue UltraLight (Açık) font dosyasını yükle
  async loadHelveticaNeueUltraLight(pdfDoc) {
    try {
      const fontBytes = this._getFontBuffer('HelveticaNeueUltraLight.otf', 'helvetica-neue-5/HelveticaNeueUltraLight.otf');
      if (fontBytes) {
        return await pdfDoc.embedFont(fontBytes);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue UltraLight Italic (Açık İtalik) font dosyasını yükle
  async loadHelveticaNeueUltraLightItalic(pdfDoc) {
    try {
      const fontBytes = this._getFontBuffer('HelveticaNeueUltraLightItalic.otf', 'helvetica-neue-5/HelveticaNeueUltraLightItalic.otf');
      if (fontBytes) {
        return await pdfDoc.embedFont(fontBytes);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Helvetica Neue Light Italic font dosyasını yükle
  async loadHelveticaNeueLightItalic(pdfDoc) {
    try {
      const fontBytes = this._getFontBuffer('HelveticaNeueLightItalic.otf', 'helvetica-neue-5/HelveticaNeueLightItalic.otf');
      if (fontBytes) {
        return await pdfDoc.embedFont(fontBytes);
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
    try {
      await this.loadHelveticaNeueUltraLight(pdfDoc);
      await this.loadHelveticaNeueUltraLightItalic(pdfDoc);
    } catch (error) {
      // Silently fail
    }
  }
}

module.exports = FontService;
