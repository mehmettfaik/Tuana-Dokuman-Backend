const fs = require('fs');
const path = require('path');

// Global cache for washing icon buffers
let globalWashingIconBytes = null;
let globalWashingIconIsJpg = false;
let globalWashingIconInitialized = false;

const specificIconsCache = {};

class WashingIconsService {
  constructor() {
    this.iconsPath = path.join(__dirname, '../assets/washing-icons');
  }

  // Tek washing icons resmi yükle
  async loadWashingIconsImage(pdfDoc) {
    try {
      if (!globalWashingIconInitialized) {
        let iconPath = path.join(this.iconsPath, 'washing-icons.png');
        let isJpg = false;

        if (fs.existsSync(iconPath)) {
          globalWashingIconBytes = fs.readFileSync(iconPath);
        } else {
          // JPG dosyasını dene
          iconPath = path.join(this.iconsPath, 'washing-icons.jpg');
          if (fs.existsSync(iconPath)) {
            globalWashingIconBytes = fs.readFileSync(iconPath);
            isJpg = true;
          }
        }
        globalWashingIconIsJpg = isJpg;
        globalWashingIconInitialized = true;
      }

      if (globalWashingIconBytes) {
        if (globalWashingIconIsJpg) {
          return await pdfDoc.embedJpg(globalWashingIconBytes);
        } else {
          return await pdfDoc.embedPng(globalWashingIconBytes);
        }
      } else {
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
      if (!specificIconsCache[iconFileName]) {
        const iconPath = path.join(this.iconsPath, iconFileName);
        
        if (!fs.existsSync(iconPath)) {
          return null;
        }

        const iconBytes = fs.readFileSync(iconPath);
        
        // Dosya içeriğini kontrol ederek gerçek formatı belirle
        const isPNG = iconBytes.length >= 8 && 
                     iconBytes[0] === 0x89 && iconBytes[1] === 0x50 && 
                     iconBytes[2] === 0x4e && iconBytes[3] === 0x47 &&
                     iconBytes[4] === 0x0d && iconBytes[5] === 0x0a && 
                     iconBytes[6] === 0x1a && iconBytes[7] === 0x0a;

        const isJPEG = iconBytes.length >= 2 && 
                      iconBytes[0] === 0xff && iconBytes[1] === 0xd8;

        specificIconsCache[iconFileName] = {
          bytes: iconBytes,
          isPNG,
          isJPEG
        };
      }

      const cached = specificIconsCache[iconFileName];
      if (cached.isPNG) {
        return await pdfDoc.embedPng(cached.bytes);
      } else if (cached.isJPEG) {
        return await pdfDoc.embedJpg(cached.bytes);
      } else {
        return null;
      }
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
