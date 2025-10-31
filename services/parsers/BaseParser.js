/**
 * Base Parser class - All company-specific parsers inherit from this
 * Contains common parsing utilities and abstract methods
 */
class BaseParser {
  constructor() {
    this.companyName = '';
    this.formatKeywords = [];
  }

  /**
   * Abstract method - must be implemented by each parser
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    throw new Error('parse() method must be implemented by subclass');
  }

  /**
   * Abstract method - returns format detection keywords
   * @returns {Array} - Array of keywords for format detection
   */
  getFormatKeywords() {
    return this.formatKeywords;
  }

  /**
   * Common utility: Extract table data using pattern matching
   * @param {string} text - Text to parse
   * @param {RegExp} pattern - Regex pattern to match table rows
   * @returns {Array} - Array of matched table rows
   */
  parseTableData(text, pattern) {
    const rows = [];
    const lines = text.split('\n');
    const fullText = lines.join('\n');
    
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      rows.push(match);
    }
    
    console.log(`📊 Found ${rows.length} table rows with pattern`);
    return rows;
  }

  /**
   * Common utility: Find header information in text
   * @param {string} text - Text to search in
   * @param {string} fieldName - Field name to search for
   * @param {RegExp} pattern - Optional custom pattern
   * @returns {string} - Extracted field value
   */
  extractHeaderField(text, fieldName, pattern = null) {
    if (!pattern) {
      // Default pattern: "FIELD NAME: value" or "FIELD NAME value"
      pattern = new RegExp(`${fieldName}\\s*[:：]?\\s*([^\\n\\r]+)`, 'i');
    }
    
    const match = text.match(pattern);
    const value = match ? match[1].trim() : '';
    
    if (value) {
      console.log(`📋 Found ${fieldName}: "${value}"`);
    }
    
    return value;
  }

  /**
   * Common utility: Extract numbers from text with validation
   * @param {string} text - Text to extract from
   * @param {Object} options - Extraction options
   * @returns {Array} - Array of valid numbers
   */
  extractNumbers(text, options = {}) {
    const {
      minValue = 0,
      maxValue = 100000,
      decimalAllowed = true,
      minLength = 1
    } = options;

    const pattern = decimalAllowed ? /\b\d+[.,]?\d*\b/g : /\b\d+\b/g;
    const allNumbers = text.match(pattern) || [];
    
    return allNumbers.filter(num => {
      if (num.length < minLength) return false;
      
      const parsed = parseFloat(num.replace(',', '.'));
      return parsed >= minValue && parsed <= maxValue;
    });
  }

  /**
   * Common utility: Clean and normalize OCR text
   * @param {string} text - Raw OCR text
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    return text
      .replace(/\s+/g, ' ')           // Multiple spaces to single space
      .replace(/\r\n/g, '\n')         // Normalize line endings
      .replace(/\r/g, '\n')           // Mac line endings to Unix
      .replace(/[,]/g, '.')           // Comma to dot for numbers
      .trim();
  }

  /**
   * Common utility: Split text into lines and filter empty ones
   * @param {string} text - Text to split
   * @returns {Array} - Array of non-empty lines
   */
  getLines(text) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Common utility: Create empty product template
   * @returns {Object} - Empty product object
   */
  createEmptyProduct() {
    return {
      'ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE': '',
      'ROLL NUMBER ROLL DIMENSIONS': '',
      'QUANTITY (METERS)': '',
      'GROSS WEIGHT(KG)': '',
      'NET WEIGHT (KG)': '',
      'LOT': ''
    };
  }

  /**
   * Log parser activity with company prefix
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    const prefix = `[${this.companyName}]`;
    
    switch (level) {
      case 'warn':
        console.log(`⚠️ ${prefix} ${message}`);
        break;
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
      default:
        console.log(`📋 ${prefix} ${message}`);
    }
  }
}

module.exports = BaseParser;