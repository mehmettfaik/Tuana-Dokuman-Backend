const BaseParser = require('./BaseParser');

/**
 * HARPUT format parser
 * Handles TOP LİSTESİ, Top Kodu, Etiket Mt., Brüt Kg., Net Kg., Dok. Desen, Parti No
 */
class HarputParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'HARPUT';
    this.formatKeywords = [
      'TOP LİSTESİ',
      'Top Kodu',
      'Etiket Mt.',
      'Brüt Kg.',
      'Net Kg.',
      'Dok. Desen',
      'Parti No',
      'HARPUT'
    ];
  }

  /**
   * Parse HARPUT format text
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    this.log('Parsing HARPUT format - REAL OCR DATA VERSION');
    
    const products = [];
    const normalizedText = this.normalizeText(text);
    const lines = this.getLines(normalizedText);

    let dokDesen = '';
    let partiNo = '';

    // === 1️⃣ Dok. Desen (ARTICLE NUMBER)
    dokDesen = this.extractDokDesen(normalizedText);
    this.log(`Found ARTICLE NUMBER (Dok. Desen): ${dokDesen}`);

    // === 2️⃣ Parti No (LOT)
    partiNo = this.extractPartiNo(normalizedText);
    this.log(`Found LOT (Parti No): ${partiNo}`);

    // === 3️⃣ Ürün satırlarını bul (H koduna göre)
    const productData = this.extractProducts(normalizedText, dokDesen, partiNo);
    products.push(...productData);

    // === 4️⃣ Benzersiz hale getir
    const uniqueProducts = this.removeDuplicateProducts(products);

    this.log(`TOTAL PRODUCTS FOUND: ${uniqueProducts.length}`);
    return uniqueProducts;
  }

  /**
   * Extract Dok. Desen (Article Number) from text
   * @param {string} text - Normalized text
   * @returns {string} - Dok. Desen value
   */
  extractDokDesen(text) {
    const lines = this.getLines(text);
    
    for (const line of lines) {
      if (/Dok\.?\s*Desen/i.test(line)) {
        const match = line.match(/Dok\.?\s*Desen\s*[:\s]\s*([A-Za-z0-9\-]+)/i);
        if (match) {
          return match[1];
        }
      } else if (/T-\d+/i.test(line)) {
        const match = line.match(/T-\d+/i);
        if (match) {
          return match[0];
        }
      }
    }
    
    return '';
  }

  /**
   * Extract Parti No (LOT) from text
   * @param {string} text - Normalized text
   * @returns {string} - Parti No value
   */
  extractPartiNo(text) {
    // Document AI "Parti No"yu parça parça döndürebilir, o yüzden birleştirip arayacağız.
    const joinedText = text.replace(/\s+/g, ' ');
    
    // Öncelik sırası: doğrudan eşleşme → alternatif → bağlamsal tarama
    
    // Pattern 1: Parti No: 12345678
    const partiRegex = /Parti\s*No\s*[:\s]*([0-9]{5,9})/i;
    if (partiRegex.test(joinedText)) {
      return joinedText.match(partiRegex)[1];
    }
    
    // Pattern 2: Parti : No 12345678
    const partiAltRegex = /Parti\s*[:\s]*No\s*[:\s]*([0-9]{5,9})/i;
    if (partiAltRegex.test(joinedText)) {
      return joinedText.match(partiAltRegex)[1];
    }
    
    // Pattern 3: Bağlamsal tarama - "Parti" kelimesinden sonraki 8 haneli sayı
    const allNumbers = [...joinedText.matchAll(/[Pp]arti[\s\S]{0,20}?(\d{5,9})/g)];
    
    if (allNumbers.length > 0) {
      const candidate = allNumbers[0][1];
      // Ama "Sipariş Emri"nin geçtiği yakın bir bölgede değilse
      const context = joinedText.slice(
        Math.max(allNumbers[0].index - 20, 0),
        allNumbers[0].index + 40
      );
      if (!/Sipariş\s*Emri/i.test(context)) {
        return candidate;
      }
    }
    
    return '';
  }

  /**
   * Extract products from text using H code pattern
   * @param {string} text - Normalized text
   * @param {string} dokDesen - Article number
   * @param {string} partiNo - Lot number
   * @returns {Array} - Array of products
   */
  extractProducts(text, dokDesen, partiNo) {
    const products = [];
    const joinedText = text.replace(/\s+/g, ' ');
    
    const rollPattern = /H\d{6,}/g;
    const rollMatches = [...joinedText.matchAll(rollPattern)];

    for (const match of rollMatches) {
      const rollCode = match[0];
      const startIndex = match.index || 0;
      const sliceText = joinedText.slice(startIndex, startIndex + 120);

      const numMatch = [...sliceText.matchAll(/([\d.]+)/g)].map(m => m[1]);
      const [quantity, gross, net] = numMatch.slice(1, 4);

      const product = {
        'ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE': dokDesen || '',
        'ROLL NUMBER ROLL DIMENSIONS': rollCode,
        'QUANTITY (METERS)': quantity || '',
        'GROSS WEIGHT(KG)': gross || '',
        'NET WEIGHT (KG)': net || '',
        'LOT': partiNo || ''
      };

      products.push(product);
      this.log(`Found product: Roll="${rollCode}", Qty="${quantity}", Net="${net}"`);
    }

    return products;
  }

  /**
   * Remove duplicate products based on roll number
   * @param {Array} products - Products array
   * @returns {Array} - Unique products array
   */
  removeDuplicateProducts(products) {
    return Array.from(
      new Map(products.map(p => [p['ROLL NUMBER ROLL DIMENSIONS'], p])).values()
    );
  }

  /**
   * Get format detection keywords
   * @returns {Array} - Array of keywords for format detection
   */
  getFormatKeywords() {
    return this.formatKeywords;
  }
}

module.exports = HarputParser;