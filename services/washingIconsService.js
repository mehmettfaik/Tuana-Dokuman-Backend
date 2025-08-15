const fs = require('fs');
const path = require('path');

class WashingIconsService {
  constructor() {
    this.iconsPath = path.join(__dirname, '../assets/washing-icons');
    this.loadedIcon = null;
    this.loadedIcons = {}; // Bireysel ikonlar için cache
  }

  // Tek washing icons resmi yükle
  async loadWashingIconsImage(pdfDoc) {
    try {
      // Cache'den kontrol et
      if (this.loadedIcon) {
        return this.loadedIcon;
      }

      // PNG dosyasını dene
      let iconPath = path.join(this.iconsPath, 'washing-icons.png');
      let iconBytes = null;
      let isJpg = false;

      if (fs.existsSync(iconPath)) {
        iconBytes = fs.readFileSync(iconPath);
      } else {
        // JPG dosyasını dene
        iconPath = path.join(this.iconsPath, 'washing-icons.jpg');
        if (fs.existsSync(iconPath)) {
          iconBytes = fs.readFileSync(iconPath);
          isJpg = true;
        }
      }

      if (iconBytes) {
        let iconImage;
        if (isJpg) {
          iconImage = await pdfDoc.embedJpg(iconBytes);
        } else {
          iconImage = await pdfDoc.embedPng(iconBytes);
        }
        
        // Cache'e kaydet
        this.loadedIcon = iconImage;
        //console.log(`Washing icons image loaded from: ${iconPath}`);
        return iconImage;
      } else {
        //console.log('Washing icons image not found');
        return null;
      }
    } catch (error) {
      console.error('Error loading washing icons image:', error.message);
      return null;
    }
  }

  // Belirli bir washing icon resmini yükle
  async loadSpecificWashingIcon(pdfDoc, iconFileName) {
    try {
      // Cache'den kontrol et
      if (this.loadedIcons[iconFileName]) {
        return this.loadedIcons[iconFileName];
      }

      const iconPath = path.join(this.iconsPath, iconFileName);
      
      if (!fs.existsSync(iconPath)) {
        //console.log(`Washing icon not found: ${iconFileName}`);
        return null;
      }

      const iconBytes = fs.readFileSync(iconPath);
      let iconImage;

      // Dosya içeriğini kontrol ederek gerçek formatı belirle
      const isPNG = iconBytes.length >= 8 && 
                   iconBytes[0] === 0x89 && iconBytes[1] === 0x50 && 
                   iconBytes[2] === 0x4e && iconBytes[3] === 0x47 &&
                   iconBytes[4] === 0x0d && iconBytes[5] === 0x0a && 
                   iconBytes[6] === 0x1a && iconBytes[7] === 0x0a;

      const isJPEG = iconBytes.length >= 2 && 
                    iconBytes[0] === 0xff && iconBytes[1] === 0xd8;

      if (isPNG) {
        iconImage = await pdfDoc.embedPng(iconBytes);
        //console.log(`Loading as PNG: ${iconFileName}`);
      } else if (isJPEG) {
        iconImage = await pdfDoc.embedJpg(iconBytes);
        //console.log(`Loading as JPEG: ${iconFileName}`);
      } else {
        //console.log(`Unknown image format for: ${iconFileName}`);
        return null;
      }
      
      // Cache'e kaydet
      this.loadedIcons[iconFileName] = iconImage;
      //console.log(`Specific washing icon loaded: ${iconFileName}`);
      return iconImage;
    } catch (error) {
      console.error(`Error loading specific washing icon ${iconFileName}:`, error.message);
      return null;
    }
  }

  // Dosya var mı kontrol et
  isWashingIconsAvailable() {
    const pngPath = path.join(this.iconsPath, 'washing-icons.png');
    const jpgPath = path.join(this.iconsPath, 'washing-icons.jpg');
    return fs.existsSync(pngPath) || fs.existsSync(jpgPath);
  }
}

module.exports = WashingIconsService;
