const fs = require('fs');
const path = require('path');

// Global cache for logo buffer
let cachedLogoBytes = null;
let cachedIsJpg = false;

class LogoService {
  static async loadLogo(pdfDoc) {
    try {
      if (!cachedLogoBytes) {
        // Önce optimize edilmiş logoyu dene
        let logoPath = path.join(__dirname, '../assets/optimized/logo.png');
        let isJpg = false;
        
        // Optimized logo yoksa orijinali kullan
        if (!fs.existsSync(logoPath)) {
          logoPath = path.join(__dirname, '..', 'logo.png');
        }
        
        if (fs.existsSync(logoPath)) {
          cachedLogoBytes = fs.readFileSync(logoPath);
        } else {
          // JPG logo dene
          logoPath = path.join(__dirname, '..', 'logo.jpg');
          if (fs.existsSync(logoPath)) {
            cachedLogoBytes = fs.readFileSync(logoPath);
            isJpg = true;
          }
        }
        cachedIsJpg = isJpg;
      }
      
      if (cachedLogoBytes) {
        if (cachedIsJpg) {
          return await pdfDoc.embedJpg(cachedLogoBytes);
        } else {
          return await pdfDoc.embedPng(cachedLogoBytes);
        }
      } else {
        return null;
      }
    } catch (logoError) {
      return null;
    }
  }
}

module.exports = LogoService;
