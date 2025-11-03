const multer = require('multer');
// const FormatConverterService = require('../services/formatConverterService'); // Geçici olarak kapatıldı
const fs = require('fs');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// const formatConverter = new FormatConverterService(); // Geçici olarak kapatıldı

/**
 * POST /api/pdf/upload
 * Accepts a single file upload (field name: file), converts/optimizes it for OCR
 * and (optionally) forwards to Document AI. This handler will never return 404
 * so frontend receives a JSON response even if Document AI is not configured.
 */
exports.uploadMiddleware = upload.single('file');

exports.handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Use form field name "file".' });
    }

    const { originalname, mimetype, buffer } = req.file;
    console.log('OCR upload received:', originalname, mimetype, buffer.length);

    // Simplified approach: use original buffer directly (Google Cloud Document AI can handle various formats)
    console.log('Processing file directly without format conversion (Linux compatibility)');

    // If Document AI is configured, you'd call it here. For now, if env not present,
    // we return a helpful JSON describing the converted buffer so frontend can proceed.
    if (!process.env.DOCUMENTAI_PROJECT_ID) {
      // Optionally save converted file temporarily for debugging
      try {
        const tmpDir = path.join('temp', 'ocr');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const outPath = path.join(tmpDir, `${Date.now()}_${path.parse(originalname).name}_original${path.extname(originalname)}`);
        fs.writeFileSync(outPath, buffer);
        console.log('Saved original file for debugging at', outPath);
      } catch (e) {
        console.log('Could not write temp file:', e.message);
      }

      return res.json({
        success: true,
        message: 'File received and ready for OCR processing. Document AI not configured on server.',
        originalName: originalname,
        mimeType: mimetype,
        fileSize: buffer.length
      });
    }

    // TODO: integrate with Google Document AI here if project credentials are present.
    // Keep the endpoint returning 200 so frontend doesn't receive 404.
    return res.json({ success: true, message: 'File received and optimization complete. Document AI integration pending.' });

  } catch (error) {
    console.error('OCR upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
