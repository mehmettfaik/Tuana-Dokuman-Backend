const fs = require('fs');
const path = require('path');

class SignatureService {
  constructor() {
    this.signaturePath = path.join(__dirname, '../assets/signature/imza.png');
    this.stampPath = path.join(__dirname, '../assets/signature/kase.png');
  }

  /**
   * Load signature image from assets folder
   * @param {PDFDocument} pdfDoc - PDF document instance
   * @returns {Promise<Object|null>} - Embedded image object or null if not found
   */
  async loadSignature(pdfDoc) {
    try {
      if (fs.existsSync(this.signaturePath)) {
        const signatureBytes = fs.readFileSync(this.signaturePath);
        return await pdfDoc.embedPng(signatureBytes);
      }
      console.log('Signature image not found at:', this.signaturePath);
      return null;
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
      if (fs.existsSync(this.stampPath)) {
        const stampBytes = fs.readFileSync(this.stampPath);
        return await pdfDoc.embedPng(stampBytes);
      }
      console.log('Stamp image not found at:', this.stampPath);
      return null;
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
