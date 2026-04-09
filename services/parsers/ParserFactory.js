const AkbaslarParser = require('./AkbaslarParser');
const AdaParser = require('./AdaParser');
const SafiraParser = require('./SafiraParser');
const BezParser = require('./BezParser');
const HarputParser = require('./HarputParser');
const AdilUcarParser = require('./AdilUcarParser');

/**
 * ParserFactory - Manages and instantiates appropriate parsers based on detected format
 * Centralizes format detection and parser selection logic
 */
class ParserFactory {
  constructor() {
    // Initialize all available parsers
    this.parsers = {
      AKBASLAR: new AkbaslarParser(),
      ADA: new AdaParser(),
      SAFIRA: new SafiraParser(),
      BEZ: new BezParser(),
      HARPUT: new HarputParser(),
      ADILUCAR: new AdilUcarParser()
    };
  }

  /**
   * Detect document format and return appropriate parser
   * @param {string} text - OCR extracted text
   * @returns {Object} - { format, parser, confidence }
   */
  detectFormatAndGetParser(text) {
    console.log('Detecting document format...');
    
    const formatScores = {};
    
    // Calculate match scores for each parser
    for (const [formatName, parser] of Object.entries(this.parsers)) {
      const keywords = parser.getFormatKeywords();
      const matchedKeywords = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      const score = matchedKeywords.length;
      const percentage = (score / keywords.length) * 100;
      
      formatScores[formatName] = {
        score,
        percentage,
        matchedKeywords,
        parser,
        totalKeywords: keywords.length
      };
      
      console.log(`${formatName}: ${score}/${keywords.length} keywords matched (${percentage.toFixed(1)}%)`);
    }
    
    // Find the format with highest percentage match (minimum 30% match required)
    const formats = Object.entries(formatScores)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.percentage - a.percentage);

    console.log('Format detection results:');
    formats.forEach(format => {
      console.log(`  ${format.name}: ${format.percentage.toFixed(1)}% (${format.score}/${format.totalKeywords})`);
    });

    // Return the format with highest percentage - Lower threshold for production compatibility
    for (const format of formats) {
      // Lower threshold to 15% for better production compatibility
      if (format.percentage >= 15) {
        console.log(`Detected format: ${format.name} (${format.percentage.toFixed(1)}% confidence)`);
        return {
          format: format.name,
          parser: format.parser,
          confidence: format.percentage,
          matchedKeywords: format.matchedKeywords
        };
      }
    }
    
    // If still no match, try the highest scoring format even if below 15%
    if (formats.length > 0 && formats[0].percentage > 5) {
      const bestFormat = formats[0];
      console.log(`Using best available format: ${bestFormat.name} (${bestFormat.percentage.toFixed(1)}% confidence - low threshold)`);
      return {
        format: bestFormat.name,
        parser: bestFormat.parser,
        confidence: bestFormat.percentage,
        matchedKeywords: bestFormat.matchedKeywords
      };
    }
    
    console.log('No format detected with sufficient confidence, using general parsing');
    return {
      format: 'UNKNOWN',
      parser: null,
      confidence: 0,
      matchedKeywords: []
    };
  }

  /**
   * Parse document using detected format
   * @param {string} text - OCR extracted text
   * @returns {Object} - { success, data, format, confidence, error }
   */
  parseDocument(text) {
    try {
      // Detect format and get parser
      const detection = this.detectFormatAndGetParser(text);
      
      if (!detection.parser) {
        return {
          success: false,
          data: [],
          format: detection.format,
          confidence: detection.confidence,
          error: 'No suitable parser found for document format'
        };
      }

      // Parse document using detected parser
      console.log(`Parsing document with ${detection.format} parser...`);
      let parsedData = detection.parser.parse(text);

      // Enhanced fallback: If primary parser returns no products, try alternative parsers
      if (!parsedData || parsedData.length === 0) {
        console.log('Primary parser found no products, trying alternative parsers...');
        
        // Try all parsers except the one already tried
        const allFormats = Object.keys(this.parsers);
        for (const formatName of allFormats) {
          if (formatName !== detection.format) {
            console.log(`Trying ${formatName} parser as fallback...`);
            try {
              const alternativeData = this.parsers[formatName].parse(text);
              if (alternativeData && alternativeData.length > 0) {
                console.log(`${formatName} parser found ${alternativeData.length} products!`);
                return {
                  success: true,
                  data: alternativeData,
                  format: formatName,
                  confidence: detection.confidence,
                  matchedKeywords: detection.matchedKeywords,
                  fallbackUsed: true,
                  error: null
                };
              }
            } catch (altError) {
              console.log(`${formatName} parser failed: ${altError.message}`);
            }
          }
        }
        
        console.log('All parsers failed to find products');
      }

      return {
        success: true,
        data: parsedData || [],
        format: detection.format,
        confidence: detection.confidence,
        matchedKeywords: detection.matchedKeywords,
        error: parsedData && parsedData.length > 0 ? null : 'No products found in document'
      };

    } catch (error) {
      console.error('ParserFactory parsing error:', error);
      return {
        success: false,
        data: [],
        format: 'ERROR',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Get all available parsers
   * @returns {Object} - Object containing all parsers
   */
  getAllParsers() {
    return this.parsers;
  }

  /**
   * Get parser by format name
   * @param {string} formatName - Format name (AKBASLAR, ADA, etc.)
   * @returns {Object|null} - Parser instance or null
   */
  getParser(formatName) {
    return this.parsers[formatName.toUpperCase()] || null;
  }

  /**
   * Add or update a parser
   * @param {string} formatName - Format name
   * @param {Object} parser - Parser instance
   */
  addParser(formatName, parser) {
    this.parsers[formatName.toUpperCase()] = parser;
    console.log(`Added/Updated parser: ${formatName}`);
  }

  /**
   * Remove a parser
   * @param {string} formatName - Format name to remove
   */
  removeParser(formatName) {
    if (this.parsers[formatName.toUpperCase()]) {
      delete this.parsers[formatName.toUpperCase()];
      console.log(`Removed parser: ${formatName}`);
    }
  }

  /**
   * Get format detection statistics
   * @param {string} text - Text to analyze
   * @returns {Object} - Detection statistics for all formats
   */
  getFormatDetectionStats(text) {
    const stats = {};
    
    for (const [formatName, parser] of Object.entries(this.parsers)) {
      const keywords = parser.getFormatKeywords();
      const matchedKeywords = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      stats[formatName] = {
        totalKeywords: keywords.length,
        matchedKeywords: matchedKeywords.length,
        percentage: (matchedKeywords.length / keywords.length) * 100,
        keywords: keywords,
        matched: matchedKeywords
      };
    }
    
    return stats;
  }
}

module.exports = ParserFactory;