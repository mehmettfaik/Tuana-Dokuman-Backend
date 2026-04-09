const fs = require('fs');
const path = require('path');

class LogoService {
  static async loadLogo(pdfDoc) {
    try {
      // PNG logo dene
      let logoPath = path.join(__dirname, '..', 'logo.png');
      let logoBytes = null;
      let isJpg = false;
      
      if (fs.existsSync(logoPath)) {
        logoBytes = fs.readFileSync(logoPath);
      } else {
        // JPG logo dene
        logoPath = path.join(__dirname, '..', 'logo.jpg');
        if (fs.existsSync(logoPath)) {
          logoBytes = fs.readFileSync(logoPath);
          isJpg = true;
        }
      }
      
      if (logoBytes) {
        let logoImage;
        if (isJpg) {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        } else {
          logoImage = await pdfDoc.embedPng(logoBytes);
        }
        return logoImage;
      } else {
        return null;
      }
    } catch (logoError) {
      return null;
    }
  }
}

module.exports = LogoService;
