const fs = require('fs');
const { createCanvas } = require('canvas');
const { Jimp } = require('jimp');
const pdfjsLib = require('pdfjs-dist');

/**
 * Cross-platform PDF to image converter using pdfjs-dist + canvas + jimp
 * Replaces pdf2pic/poppler dependencies for better platform compatibility
 */
class PdfJsConverter {
  constructor() {
    // Disable worker in Node.js environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = null;
  }

  /**
   * Convert PDF buffer to array of JPEG buffers (one per page)
   * @param {Buffer} pdfBuffer - PDF file as buffer
   * @param {Object} options - Conversion options
   * @param {number} options.scale - Render scale (1.5 default, higher = better quality)
   * @param {number} options.quality - JPEG quality 0-100 (85 default)
   * @param {boolean} options.optimizeForOcr - Optimize for OCR processing (default true)
   * @returns {Promise<Buffer[]>} Array of JPEG image buffers
   */
  async convertPdfBufferToImages(pdfBuffer, options = {}) {
    const { 
      scale = 1.5, 
      quality = 85, 
      optimizeForOcr = true 
    } = options;

    console.log(`🔄 Converting PDF with pdfjs-dist (${pdfBuffer.length} bytes)...`);
    
    try {
      // Load PDF document (convert Buffer to Uint8Array)
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        useSystemFonts: true,
        disableFontFace: false
      });

      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      console.log(`📄 PDF has ${numPages} pages`);

      const images = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        console.log(`🔄 Processing page ${pageNum}/${numPages}...`);
        
        const page = await pdfDoc.getPage(pageNum);
        
        // Get viewport at specified scale
        const viewport = page.getViewport({ scale });
        const { width, height } = viewport;

        // Create canvas with page dimensions
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        // Set white background for better OCR
        context.fillStyle = 'white';
        context.fillRect(0, 0, width, height);

        // Render page into canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          enableWebGL: false
        };

        await page.render(renderContext).promise;

        // Get PNG buffer from canvas
        const pngBuffer = canvas.toBuffer('image/png');
        console.log(`📋 Page ${pageNum} rendered: ${width}x${height} (${pngBuffer.length} bytes)`);

        // Create Jimp image from PNG buffer for optimization
        const jimpImage = await Jimp.read(pngBuffer);

        if (optimizeForOcr) {
          // OCR optimizations - Note: Jimp v1.6.0 has different method chaining
          jimpImage.contrast(0.1);      // Slight contrast boost
          jimpImage.brightness(0.02);   // Slight brightness boost
        }

        // Convert to JPEG - Jimp v1.6.0 uses getBuffer instead of getBufferAsync
        const jpegBuffer = await jimpImage.getBuffer('image/jpeg', { quality });

        images.push(jpegBuffer);
        console.log(`✅ Page ${pageNum} optimized: ${jpegBuffer.length} bytes`);

        // Clean up page resources
        page.cleanup && page.cleanup();
      }

      // Clean up PDF document
      pdfDoc.destroy && pdfDoc.destroy();

      console.log(`✅ Successfully converted ${numPages} pages to images`);
      return images;

    } catch (error) {
      console.error('❌ PDF conversion error:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF buffer to single combined image (vertical stack)
   * @param {Buffer} pdfBuffer - PDF file as buffer
   * @param {Object} options - Conversion options
   * @returns {Promise<Buffer>} Single JPEG buffer with all pages combined
   */
  async convertPdfToCombinedImage(pdfBuffer, options = {}) {
    const images = await this.convertPdfBufferToImages(pdfBuffer, options);
    
    if (images.length === 1) {
      return images[0];
    }

    console.log(`🔗 Combining ${images.length} pages into single image...`);

    // Load all images with Jimp
    const jimpImages = await Promise.all(
      images.map(buffer => Jimp.read(buffer))
    );

    // Calculate combined dimensions
    const maxWidth = Math.max(...jimpImages.map(img => img.bitmap.width));
    const totalHeight = jimpImages.reduce((sum, img) => sum + img.bitmap.height, 0);

    console.log(`📐 Combined dimensions: ${maxWidth}x${totalHeight}`);

    // Create combined image - Jimp v1.6.0 syntax
    const combined = new Jimp({ width: maxWidth, height: totalHeight, color: 0xffffff });

    let currentY = 0;
    jimpImages.forEach((img, index) => {
      console.log(`📍 Page ${index + 1} positioned at Y: ${currentY}`);
      combined.composite(img, 0, currentY);
      currentY += img.bitmap.height;
    });

    // Convert to JPEG - Jimp v1.6.0 uses getBuffer instead of getBufferAsync
    const combinedBuffer = await combined.getBuffer('image/jpeg', { quality: options.quality || 85 });

    console.log(`✅ Combined image created: ${combinedBuffer.length} bytes`);
    return combinedBuffer;
  }

  /**
   * Alternative method compatible with existing pdf2pic interface
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {Object} options - Options (scale, format, etc.)
   * @returns {Promise<Array>} Array of image objects with buffer property
   */
  async convert(pdfBuffer, options = {}) {
    const images = await this.convertPdfBufferToImages(pdfBuffer, options);
    
    // Return in pdf2pic compatible format
    return images.map((buffer, index) => ({
      page: index + 1,
      name: `page.${index + 1}.jpg`,
      buffer: buffer,
      path: null // We don't write to files, return buffer only
    }));
  }
}

module.exports = {
  PdfJsConverter,
  convertPdfBufferToImages: (buffer, options) => new PdfJsConverter().convertPdfBufferToImages(buffer, options),
  convertPdfToSingleImage: (buffer, options) => new PdfJsConverter().convertPdfToCombinedImage(buffer, options)
};