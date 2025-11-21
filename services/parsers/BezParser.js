const BaseParser = require('./BaseParser');

/**
 * BEZ format parser
 * Handles Tip, TopAdı, Tezgah No, Müş. No, Sip. No, Dispo No, Top Metre, En, kalite, lot
 */
class BezParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'BEZ';
    this.formatKeywords = [
      'Tip',
      'Top Metre',
      'TopAdı', 
      'Dispo No',
      'kalite',
      'lot',
      'Kumaş Sevk Listesi'
    ];
  }
//
  /**
   * Parse BEZ format text
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    
    const products = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    
    // 1. Find all Tip sections and their boundaries
    const tipSections = this.findTipSections(lines);
    
    // 2. Process each Tip section separately
    for (const section of tipSections) {
      
      // Find all TopAdı codes in this section
      const topAdıCodes = this.findTopAdiCodes(lines, section);
      
      if (topAdıCodes.length === 0) {
        continue;
      }
      
      // 3. Collect field data after TopAdı codes
      const fieldLines = this.collectFieldLines(lines, section, topAdıCodes);
      
      // 4. Parse grouped field data intelligently  
      const numTops = topAdıCodes.length;
      
      // Group repeating and constant fields
      const { repeatingFields, constantFields } = this.parseFieldGroups(fieldLines, numTops);
      
      // 5. Create products with extracted fields
      for (let topIdx = 0; topIdx < numTops; topIdx++) {
        const topAdı = topAdıCodes[topIdx].code;
        
        // Get fields for this TopAdı index
        const productFields = this.extractFieldsForProduct(repeatingFields, constantFields, topIdx, numTops);
        
        const product = {
          'Tip': section.tip,
          'TopAdı': topAdı,
          'Tezgah No': productFields.tezgahNo || '',
          'Müş. No': productFields.musNo || '',
          'Sip. No': productFields.sipNo || '',
          'Dispo No': productFields.dispoNo || '',
          'Top Metre': productFields.topMetre || '',
          'En': productFields.en || '',
          'kalite': productFields.kalite || '',
          'lot': productFields.lot || ''
        };
        
        products.push(product);
      }
    }
    
    
    // Fallback if no products found
    if (products.length === 0) {
      
      const fallbackProduct = this.createFallbackProduct(text, tipSections);
      if (fallbackProduct) {
        products.push(fallbackProduct);
      }
    }
    
    products.forEach((product, index) => {
    });
    
    return products;
  }

  /**
   * Find all Tip sections in the text
   * @param {Array} lines - Text lines
   * @returns {Array} - Array of tip sections with boundaries
   */
  findTipSections(lines) {
    const tipSections = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.match(/^Tip:\s*(.+)/i)) {
        const tipInfo = line.match(/^Tip:\s*(.+)/i)[1].trim();
        tipSections.push({
          tip: tipInfo,
          startLine: i,
          endLine: lines.length - 1
        });
      }
    }
    
    // Set end lines for each section
    for (let i = 0; i < tipSections.length - 1; i++) {
      tipSections[i].endLine = tipSections[i + 1].startLine - 1;
    }
    
    return tipSections;
  }

  /**
   * Find TopAdı codes in a section
   * @param {Array} lines - All text lines
   * @param {Object} section - Tip section object
   * @returns {Array} - Array of TopAdı codes with line indices
   */
  findTopAdiCodes(lines, section) {
    const topAdıCodes = [];
    
    for (let i = section.startLine; i <= section.endLine; i++) {
      const line = lines[i];
      if (line.match(/^\d+M\d+$/)) {
        topAdıCodes.push({
          code: line,
          lineIndex: i
        });
      }
    }
    
    return topAdıCodes;
  }

  /**
   * Collect field lines after TopAdı codes
   * @param {Array} lines - All text lines
   * @param {Object} section - Tip section
   * @param {Array} topAdıCodes - TopAdı codes array
   * @returns {Array} - Array of field lines
   */
  collectFieldLines(lines, section, topAdıCodes) {
    const fieldLines = [];
    const lastTopLine = topAdıCodes[topAdıCodes.length - 1].lineIndex;
    
    for (let i = lastTopLine + 1; i <= section.endLine; i++) {
      const line = lines[i];
      if (line && !line.match(/^Tip:/) && !line.match(/^\d+ Top$/) && !line.match(/^\d+[.,]\d+ Mt$/)) {
        fieldLines.push({ value: line, index: i });
      }
    }
    
    return fieldLines;
  }

  /**
   * Parse field groups into repeating and constant fields
   * @param {Array} fieldLines - Field lines array
   * @param {number} numTops - Number of TopAdı codes
   * @returns {Object} - Object with repeating and constant fields
   */
  parseFieldGroups(fieldLines, numTops) {
    const repeatingFields = []; // Fields that repeat for each product
    const constantFields = [];   // Fields that appear once per product
    
    for (let i = 0; i < fieldLines.length; i++) {
      const line = fieldLines[i].value;
      const prevLine = i > 0 ? fieldLines[i - 1].value : '';
      
      // Classify field types
      if (line.match(/^ter\d+$/i)) {
        repeatingFields.push({ type: 'tezgah', value: line, index: i });
      } else if (line.match(/^\d{1,3}$/) && parseInt(line) < 1000) {
        repeatingFields.push({ type: 'musNo', value: line, index: i });
      } else if (line.match(/^\d{6}$/)) {
        repeatingFields.push({ type: 'sipNo', value: line, index: i });
      } else if (line.match(/^\d{7}$/)) {
        repeatingFields.push({ type: 'dispoNo', value: line, index: i });
      } else if (line.match(/^\d{1,3}[.,]\d{2}$/)) {
        // Ondalıklı sayı - etiket veya pozisyondan anlamaya çalış
        const numValue = parseFloat(line.replace(',', '.'));
        
        // 1. Önceki satırda "Top Metre" veya "Metre" etiketi var mı?
        if (prevLine.match(/Top\s*Metre|Metre/i)) {
          constantFields.push({ type: 'topMetre', value: line, index: i });
        }
        // 2. Önceki satırda "En" veya "Width" etiketi var mı?
        else if (prevLine.match(/\bEn\b|Width/i)) {
          constantFields.push({ type: 'en', value: line, index: i });
        }
        // 3. Etiket yok - pozisyon bazlı: ilk ondalıklı sayı = Top Metre, ikinci = En
        else {
          // Kaç tane ondalıklı sayı var şimdiye kadar?
          const decimalCount = constantFields.filter(f => 
            f.type === 'topMetre' || f.type === 'en'
          ).length;
          
          // Her ürün için 2 ondalıklı sayı bekleniyor: Top Metre ve En
          const productIndex = Math.floor(decimalCount / 2);
          const isFirstInProduct = decimalCount % 2 === 0;
          
          if (isFirstInProduct) {
            constantFields.push({ type: 'topMetre', value: line, index: i });
          } else {
            constantFields.push({ type: 'en', value: line, index: i });
          }
        }
      } else if (line.match(/Kalite/i)) {
        constantFields.push({ type: 'kalite', value: line, index: i });
      } else if (line.match(/^[0-9]$/)) {
        constantFields.push({ type: 'lot', value: line, index: i });
      }
    }
    
    return { repeatingFields, constantFields };
  }

  /**
   * Extract fields for a specific product
   * @param {Array} repeatingFields - Repeating fields array
   * @param {Array} constantFields - Constant fields array
   * @param {number} productIndex - Product index
   * @param {number} totalProducts - Total number of products
   * @returns {Object} - Extracted fields for the product
   */
  extractFieldsForProduct(repeatingFields, constantFields, productIndex, totalProducts) {
    const fields = {
      tezgahNo: '', musNo: '', sipNo: '', dispoNo: '',
      topMetre: '', en: '', kalite: '', lot: ''
    };
    
    // Extract repeating fields (these repeat for each product)
    const repeatingFieldsPerProduct = Math.floor(repeatingFields.length / totalProducts);
    const repeatingStartIdx = productIndex * repeatingFieldsPerProduct;
    
    for (let i = 0; i < repeatingFieldsPerProduct; i++) {
      const fieldIdx = repeatingStartIdx + i;
      if (fieldIdx < repeatingFields.length) {
        const field = repeatingFields[fieldIdx];
        if (field.type === 'tezgah') fields.tezgahNo = field.value;
        else if (field.type === 'musNo') fields.musNo = field.value;
        else if (field.type === 'sipNo') fields.sipNo = field.value;
        else if (field.type === 'dispoNo') fields.dispoNo = field.value;
      }
    }
    
    // Extract constant fields (these appear once per product, in sequence)
    const constantFieldsPerProduct = Math.floor(constantFields.length / totalProducts);
    const constantStartIdx = productIndex * constantFieldsPerProduct;
    
    for (let i = 0; i < constantFieldsPerProduct; i++) {
      const fieldIdx = constantStartIdx + i;
      if (fieldIdx < constantFields.length) {
        const field = constantFields[fieldIdx];
        if (field.type === 'topMetre') fields.topMetre = field.value;
        else if (field.type === 'en') fields.en = field.value;
        else if (field.type === 'kalite') fields.kalite = field.value;
        else if (field.type === 'lot') fields.lot = field.value;
      }
    }
    
    return fields;
  }

  /**
   * Create fallback product from text
   * @param {string} text - Text to parse
   * @param {Array} tipSections - Tip sections array
   * @returns {Object|null} - Fallback product or null
   */
  createFallbackProduct(text, tipSections) {
    const topAdıPattern = text.match(/\b[A-Z0-9]+M\d+\b/g) || [];
    const allNumbers = this.extractNumbers(text, { decimalAllowed: true, minValue: 1 });
    
    if (topAdıPattern.length > 0) {
      const fallbackTip = tipSections.length > 0 ? tipSections[0].tip : '';
      
      return {
        'Tip': fallbackTip,
        'TopAdı': topAdıPattern[0],
        'Top Metre': allNumbers[0] || '',
        'Dispo No': '',
        'kalite': '',
        'lot': ''
      };
    }
    
    return null;
  }

  /**
   * Get format detection keywords
   * @returns {Array} - Array of keywords for format detection
   */
  getFormatKeywords() {
    return this.formatKeywords;
  }
}

module.exports = BezParser;