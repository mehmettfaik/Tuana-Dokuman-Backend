const fs = require('fs');
const path = require('path');

// Global cache for signature and stamp buffers
let cachedSignatureBytes = null;
let cachedStampBytes = null;
let pathsInitialized = false;
let globalSignaturePath = '';
let globalStampPath = '';

class SignatureService {
  constructor() {
    if (!pathsInitialized) {
      // Önce optimize edilmiş dosyaları dene, yoksa orijinalleri kullan
      const optimizedSignaturePath = path.join(__dirname, '../assets/optimized/signature/imza.png');
      const optimizedStampPath = path.join(__dirname, '../assets/optimized/signature/kase.png');
      
      globalSignaturePath = fs.existsSync(optimizedSignaturePath) 
        ? optimizedSignaturePath 
        : path.join(__dirname, '../assets/signature/imza.png');
      
      globalStampPath = fs.existsSync(optimizedStampPath) 
        ? optimizedStampPath 
        : path.join(__dirname, '../assets/signature/kase.png');
        
      pathsInitialized = true;
    }
    
    this.signaturePath = globalSignaturePath;
    this.stampPath = globalStampPath;
  }

  /**
   * Load signature image from assets folder
   * @param {PDFDocument} pdfDoc - PDF document instance
   * @returns {Promise<Object|null>} - Embedded image object or null if not found
   */
  async loadSignature(pdfDoc) {
    try {
      if (!cachedSignatureBytes) {
        if (fs.existsSync(this.signaturePath)) {
          cachedSignatureBytes = fs.readFileSync(this.signaturePath);
        } else {
          console.log('Signature image not found at:', this.signaturePath);
          return null;
        }
      }
      return await pdfDoc.embedPng(cachedSignatureBytes);
    } catch (error) {
      console.error('Error loading signature:', error);
      return null;
    }
  }

  /**
   * Load stamp (kaşe) image from assets folder
   * @param {PDFDocument} pdfDoc - PDF document instance
   * @returns {Promise<Object|null>} - Embedded image object or null if not found
   */
  async loadStamp(pdfDoc) {
    try {
      if (!cachedStampBytes) {
        if (fs.existsSync(this.stampPath)) {
          cachedStampBytes = fs.readFileSync(this.stampPath);
        } else {
          console.log('Stamp image not found at:', this.stampPath);
          return null;
        }
      }
      return await pdfDoc.embedPng(cachedStampBytes);
    } catch (error) {
      console.error('Error loading stamp:', error);
      return null;
    }
  }

  /**
   * Draw signature and stamp on page if enabled
   * @param {Object} page - PDF page object
   * @param {Object} signatureImage - Embedded signature image
   * @param {Object} stampImage - Embedded stamp image
   * @param {number} signatureX - X position for signature
   * @param {number} signatureY - Y position for signature
   * @param {number} stampX - X position for stamp
   * @param {number} stampY - Y position for stamp
   * @param {number} width - Width for both images (default: 80)
   * @param {number} height - Height for both images (default: 60)
   */
  drawSignatureAndStamp(page, signatureImage, stampImage, signatureX, signatureY, stampX, stampY, width = 80, height = 60) {
    if (signatureImage) {
      page.drawImage(signatureImage, {
        x: signatureX,
        y: signatureY,
        width: width,
        height: height,
      });
    }

    if (stampImage) {
      page.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width: width,
        height: height,
      });
    }
  }
}

module.exports = SignatureService;
