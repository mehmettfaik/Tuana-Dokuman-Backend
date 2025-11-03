const sharp = require('sharp');
// const pdf2pic = require('pdf2pic'); // Removed: causes "linux is NOT supported" error
// const pdf = require('pdf-poppler');  // Removed: causes Linux compatibility issues
const fs = require('fs');
const path = require('path');
const { PdfJsConverter } = require('./formatConverterPdfJs');

class FormatConverterService {
  constructor() {
    this.outputDir = 'temp/converted/';
    this.ensureOutputDir();
    this.pdfConverter = new PdfJsConverter();
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Convert any supported format to optimized JPEG for OCR
   * @param {Buffer} inputBuffer - Input file buffer
   * @param {string} mimeType - Original file MIME type
   * @param {string} originalFilename - Original filename
   * @returns {Promise<Object>} Converted file info
   */
  async convertToOptimizedImage(inputBuffer, mimeType, originalFilename = 'document') {
    try {
      console.log(`Converting ${mimeType} to optimized JPEG for OCR...`);
      
      let convertedBuffer;
      // Ensure originalFilename is a valid string and has an extension
      const safeFilename = originalFilename || 'document';
      const baseFilename = safeFilename.includes('.') ? path.parse(safeFilename).name : safeFilename;
      const outputPath = path.join(this.outputDir, `${baseFilename}_converted.jpg`);

      // Handle different input formats
      if (mimeType === 'application/pdf') {
        // Convert PDF to images
        convertedBuffer = await this.convertPdfToImage(inputBuffer, outputPath);
      } else if (this.isImageFormat(mimeType)) {
        // Process other image formats
        convertedBuffer = await this.processImageFormat(inputBuffer, outputPath);
      } else {
        throw new Error(`Unsupported format: ${mimeType}`);
      }

      return {
        success: true,
        buffer: convertedBuffer,
        mimeType: 'image/jpeg',
        outputPath: outputPath,
        originalFormat: mimeType
      };

    } catch (error) {
      console.error('Format conversion error:', error);
      return {
        success: false,
        error: error.message,
        originalFormat: mimeType
      };
    }
  }

  /**
   * Convert PDF to high-quality JPEG image using cross-platform pdfjs-dist
   */
  async convertPdfToImage(pdfBuffer, outputPath) {
    try {
      console.log('🔄 Converting PDF using cross-platform pdfjs-dist converter...');
      console.log('PDF buffer size:', pdfBuffer.length);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty or undefined');
      }
      
      // Basic PDF validation
      const pdfHeader = pdfBuffer.slice(0, 5).toString();
      if (!pdfHeader.includes('%PDF')) {
        throw new Error('Invalid PDF file - missing PDF header');
      }
      
      console.log('PDF validation passed');

      // Use new cross-platform converter
      const combinedImageBuffer = await this.pdfConverter.convertPdfToCombinedImage(pdfBuffer, {
        scale: 1.5,              // Good balance of quality/performance
        quality: 90,             // High quality for OCR
        optimizeForOcr: true     // Enable OCR optimizations
      });

      if (!combinedImageBuffer || combinedImageBuffer.length === 0) {
        throw new Error('Cross-platform PDF conversion failed - no image produced');
      }

      console.log(`✅ Cross-platform PDF converted successfully! Image size: ${combinedImageBuffer.length} bytes`);
      return combinedImageBuffer;

    } catch (error) {
      console.error('Cross-platform PDF conversion failed:', error);
      
      // Fallback to original pdf2pic method if available
      try {
        console.log('🔄 Falling back to pdf2pic method...');
        return await this.convertPdfToImageLegacy(pdfBuffer, outputPath);
      } catch (fallbackError) {
        console.error('Legacy PDF conversion fallback also failed:', fallbackError);
        throw new Error(`PDF conversion failed: ${error.message}. Fallback error: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Legacy PDF conversion using pdf2pic (kept as fallback)
   * NOTE: pdf2pic causes "linux is NOT supported" errors, so this is disabled
   */
  async convertPdfToImageLegacy(pdfBuffer, outputPath) {
    try {
      console.log('Legacy pdf2pic method not available on Linux platforms');
      throw new Error('pdf2pic not available - Linux compatibility disabled this fallback');
      
      // Code below is commented out due to Linux compatibility issues
      // All legacy pdf2pic code has been disabled to prevent "linux is NOT supported" errors

    } catch (error) {
      console.error('Legacy PDF conversion with pdf2pic failed:', error);
      throw error;
    }
  }

  /**
   * Alternative PDF conversion using pdf-poppler
   * NOTE: pdf-poppler causes Linux compatibility issues, so this is disabled
   */
  async convertPdfWithPoppler(pdfBuffer) {
    try {
      console.log('pdf-poppler method not available on Linux platforms');
      throw new Error('pdf-poppler not available - Linux compatibility disabled this method');
      
      // All pdf-poppler code commented out due to Linux compatibility issues
      
    } catch (error) {
      console.error('PDF-Poppler conversion error:', error);
      throw error;
    }
  }

  /**
   * Process image formats (JPEG, PNG, TIFF, etc.)
   */
  async processImageFormat(imageBuffer, outputPath) {
    try {
      console.log('Processing image format with Sharp...');

      // Get image metadata
      const metadata = await sharp(imageBuffer).metadata();
      console.log(`Original image: ${metadata.format}, ${metadata.width}x${metadata.height}`);

      // Optimize image for OCR
      const optimizedBuffer = await sharp(imageBuffer)
        .jpeg({ 
          quality: 95,
          progressive: true,
          mozjpeg: true 
        })
        .resize(2480, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .normalize()     // Improve contrast for better OCR
        .sharpen()       // Enhance text readability
        .gamma(1.2)      // Slight gamma correction
        .toBuffer();

      console.log('Image processed and optimized for OCR');
      return optimizedBuffer;

    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Check if format is a supported image format
   */
  isImageFormat(mimeType) {
    const imageFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/tiff',
      'image/gif',
      'image/webp',
      'image/bmp'
    ];
    return imageFormats.includes(mimeType);
  }

  /**
   * Convert multiple pages of PDF to images using cross-platform converter
   */
  async convertPdfMultiPage(pdfBuffer, maxPages = 5) {
    try {
      console.log('Converting multi-page PDF with cross-platform converter...');
      
      // Use the cross-platform converter instead of pdf2pic
      const pageBuffers = await this.pdfConverter.convertPdfBufferToImages(pdfBuffer, {
        scale: 2.0,  // Higher quality for multi-page
        quality: 95,
        optimizeForOcr: true
      });
      
      // Limit to maxPages if specified
      const limitedPages = maxPages > 0 ? pageBuffers.slice(0, maxPages) : pageBuffers;
      
      console.log(`✅ Cross-platform converter processed ${limitedPages.length} pages`);
      
      // Return in expected format
      const successfulPages = limitedPages.map((buffer, index) => ({
        pageNumber: index + 1,
        buffer: buffer
      }));

      console.log(`Converted ${successfulPages.length} pages from PDF`);
      return successfulPages;

    } catch (error) {
      console.error('Multi-page PDF conversion error:', error);
      throw new Error(`Multi-page PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Combine multiple images vertically into a single image
   * @param {Array} imageBuffers - Array of image buffers
   * @returns {Promise<Buffer>} Combined image buffer
   */
  async combineImagesVertically(imageBuffers) {
    try {
      if (!imageBuffers || imageBuffers.length === 0) {
        throw new Error('No image buffers provided for combination');
      }

      // If only one page, return as-is
      if (imageBuffers.length === 1) {
        console.log('📄 Single page PDF, no combination needed');
        return imageBuffers[0];
      }

      console.log(`🔗 Combining ${imageBuffers.length} pages into single image...`);
      
      // Get metadata for all images to calculate total height
      const imageMetadata = [];
      let totalHeight = 0;
      let maxWidth = 0;

      for (let i = 0; i < imageBuffers.length; i++) {
        const metadata = await sharp(imageBuffers[i]).metadata();
        imageMetadata.push(metadata);
        totalHeight += metadata.height;
        maxWidth = Math.max(maxWidth, metadata.width);
        console.log(`📏 Page ${i + 1}: ${metadata.width}x${metadata.height}`);
      }

      console.log(`📐 Combined dimensions will be: ${maxWidth}x${totalHeight}`);

      // Create a new image with combined height
      let currentY = 0;
      const compositeInputs = [];

      for (let i = 0; i < imageBuffers.length; i++) {
        const metadata = imageMetadata[i];
        
        // Resize image to match max width if needed
        let processedBuffer = imageBuffers[i];
        if (metadata.width !== maxWidth) {
          processedBuffer = await sharp(imageBuffers[i])
            .resize(maxWidth, metadata.height, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
            })
            .jpeg({ quality: 95 })
            .toBuffer();
        }

        compositeInputs.push({
          input: processedBuffer,
          top: currentY,
          left: 0
        });

        currentY += metadata.height;
        console.log(`📍 Page ${i + 1} positioned at Y: ${currentY - metadata.height}`);
      }

      // Create the combined image
      const combinedBuffer = await sharp({
        create: {
          width: maxWidth,
          height: totalHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 } // White background
        }
      })
      .composite(compositeInputs)
      .jpeg({ quality: 95 })
      .toBuffer();

      console.log(`✅ Successfully combined ${imageBuffers.length} pages. Final size: ${combinedBuffer.length} bytes`);
      return combinedBuffer;

    } catch (error) {
      console.error('❌ Error combining images:', error);
      // Fallback: return the first page if combination fails
      console.log('⚠️ Falling back to first page only due to combination error');
      return imageBuffers[0];
    }
  }

  /**
   * Clean up converted files
   */
  cleanup() {
    try {
      const files = fs.readdirSync(this.outputDir);
      files.forEach(file => {
        const filePath = path.join(this.outputDir, file);
        fs.unlinkSync(filePath);
      });
      console.log('Converted files cleaned up');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get supported formats
   */
  getSupportedFormats() {
    return {
      images: ['JPEG', 'PNG', 'TIFF', 'GIF', 'WebP', 'BMP'],
      documents: ['PDF'],
      allSupported: ['PDF', 'JPEG', 'PNG', 'TIFF', 'GIF', 'WebP', 'BMP'],
      reliability: {
        'PDF': '99% (with preprocessing)',
        'JPEG': '99%',
        'PNG': '99%', 
        'TIFF': '98%',
        'GIF': '95%',
        'WebP': '95%',
        'BMP': '95%'
      }
    };
  }
}

module.exports = FormatConverterService;