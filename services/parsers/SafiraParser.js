const BaseParser = require('./BaseParser');

/**
 * SAFİRA format parser
 * Handles Top No, Miktar Metre, Miktar Kg, Renk, En, Parti No, Kumaş Cinsi
 */
class SafiraParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'SAFİRA';
    this.formatKeywords = [
      'Top No',
      'Miktar Metre',
      'Miktar Kg',
      'Parti No',
      'Kumaş Cinsi'
    ];
  }

  /**
   * Parse SAFİRA format text
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    this.log('Parsing SAFİRA format...');
    this.log('Full OCR text for SAFİRA:');
    this.log('=====================================');
    this.log(text);
    this.log('=====================================');
    
    const products = [];
    const lines = text.split('\n');
    
    this.log('Analyzing all lines for SAFİRA products...');
    this.log(`Total lines: ${lines.length}`);
    
    // SAFİRA'da iki farklı format var:
    // Format 1: Horizontal table (bizim test formatımız)
    // Format 2: Vertical format (gerçek OCR çıktısı)
    
    // Format 2 (Vertical) için: 6 haneli sayıları bul ve sonraki satırları parse et
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 6 haneli sayı (Top No) arayalım
      if (line.match(/^\d{6}$/)) {
        const productData = this.parseVerticalProduct(lines, i);
        if (productData) {
          products.push(productData);
          this.log(`Found SAFİRA product ${products.length} (vertical): TopNo="${productData['Top No']}", Metre="${productData['Miktar Metre']}", Kg="${productData['Miktar Kg']}", PartiNo="${productData['Parti No']}", Kumaş="${productData['Kumaş Cinsi']}"`);
        }
        continue;
      }
      
      // Horizontal format da dene (eski kod)
      // Table header'ını tespit et
      if (line.includes('Top No') && line.includes('Miktar Metre') && line.includes('Miktar Kg')) {
        const horizontalProducts = this.parseHorizontalProducts(lines, i);
        products.push(...horizontalProducts);
        break; // Horizontal table işlendi
      }
    }
    
    this.log(`Total SAFİRA products found: ${products.length}`);
    
    // Eğer hiç ürün bulunamadıysa fallback kullan
    if (products.length === 0) {
      this.log('No products found in SAFİRA table format, trying fallback parsing', 'warn');
      
      const fallbackProduct = this.createFallbackProduct(text);
      if (fallbackProduct) {
        products.push(fallbackProduct);
        this.log('SAFİRA Fallback product created');
      }
    }
    
    this.log('Final SAFİRA products:');
    products.forEach((product, index) => {
      this.log(`Product ${index + 1}: ${JSON.stringify(product)}`);
    });
    
    return products;
  }

  /**
   * Parse vertical format product
   * @param {Array} lines - All text lines
   * @param {number} startIndex - Index of Top No line
   * @returns {Object|null} - Product data or null
   */
  parseVerticalProduct(lines, startIndex) {
    // Bu Top No için sonraki satırlardan bilgileri topla
    const topNo = lines[startIndex].trim();
    let miktar_metre = '';
    let miktar_kg = '';
    let renk = '';
    let parti_no = '';
    let kumas_cinsi = '';
    
    // Sonraki 15 satırı kontrol et (product bilgileri yakınlarda olmalı)
    for (let j = startIndex + 1; j < Math.min(startIndex + 15, lines.length); j++) {
      const nextLine = lines[j].trim();
      
      // Miktar (Metre) - ondalık sayı
      if (!miktar_metre && nextLine.match(/^\d+[.,]\d+$/) && parseFloat(nextLine.replace(',', '.')) > 50) {
        miktar_metre = nextLine;
        continue;
      }
      
      // Miktar (Kg) - ondalık sayı (genellikle metre'den sonra)
      if (miktar_metre && !miktar_kg && nextLine.match(/^\d+[.,]\d+$/) && parseFloat(nextLine.replace(',', '.')) < 100) {
        miktar_kg = nextLine;
        continue;
      }
      
      // Renk - IN- ile başlayan veya harfler içeren
      if (!renk && (nextLine.match(/^IN-/i) || nextLine.match(/[A-Z]{2,}/))) {
        renk = nextLine;
        continue;
      }
      
      // Parti No - T ile başlayan kod
      if (!parti_no && nextLine.match(/^T\d{3}-\d{3}$/)) {
        parti_no = nextLine;
        continue;
      }
      
      // Kumaş Cinsi - T- ile başlayan kod
      if (!kumas_cinsi && nextLine.match(/^T-\d+$/)) {
        kumas_cinsi = nextLine;
        continue;
      }
      
      // Combo line kontrol et (T005-001 T-5549 gibi)
      if (nextLine.match(/^T\d{3}-\d{3}\s+T-\d+$/)) {
        const comboParts = nextLine.split(/\s+/);
        if (!parti_no) {
          parti_no = comboParts[0];
        }
        if (!kumas_cinsi) {
          kumas_cinsi = comboParts[1];
        }
        continue;
      }
      
      // Başka bir Top No bulduysak dur
      if (nextLine.match(/^\d{6}$/)) {
        break;
      }
    }
    
    // Product oluştur
    if (miktar_metre || miktar_kg) {
      return {
        'Top No': topNo,
        'Miktar Metre': miktar_metre,
        'Miktar Kg': miktar_kg,
        'Renk': renk,
        'En': '',
        'Parti No': parti_no,
        'Kumaş Cinsi': kumas_cinsi
      };
    }
    
    return null;
  }

  /**
   * Parse horizontal format products
   * @param {Array} lines - All text lines
   * @param {number} headerIndex - Index of header line
   * @returns {Array} - Array of products
   */
  parseHorizontalProducts(lines, headerIndex) {
    const products = [];
    
    // Horizontal format için sonraki satırları kontrol et
    for (let k = headerIndex + 1; k < lines.length; k++) {
      const tableLine = lines[k].trim();
      if (!tableLine) continue;
      
      // Toplam satırına geldiyse dur
      if (tableLine.includes('Toplam') || tableLine.includes('Total')) break;
      
      // Horizontal table row pattern
      const safiraRowMatch = tableLine.match(/^(\d{6})\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)\s+([A-Z0-9\-\s]+?)\s+\d*\s*([A-Z0-9\-]+)\s+([A-Z0-9\-]+)$/);
      
      if (safiraRowMatch) {
        const product = {
          'Top No': safiraRowMatch[1].trim(),
          'Miktar Metre': safiraRowMatch[2].trim(),
          'Miktar Kg': safiraRowMatch[3].trim(),
          'Renk': safiraRowMatch[4].trim(),
          'En': '',
          'Parti No': safiraRowMatch[5].trim(),
          'Kumaş Cinsi': safiraRowMatch[6].trim()
        };
        
        products.push(product);
        this.log(`Found SAFİRA product ${products.length + 1} (horizontal): TopNo="${product['Top No']}", Metre="${product['Miktar Metre']}", Kg="${product['Miktar Kg']}", PartiNo="${product['Parti No']}", Kumaş="${product['Kumaş Cinsi']}"`);
      }
    }
    
    return products;
  }

  /**
   * Create fallback product from text
   * @param {string} text - Text to parse
   * @returns {Object|null} - Fallback product or null
   */
  createFallbackProduct(text) {
    // Tüm 6 haneli sayıları Top No olarak kabul et
    const sixDigitNumbers = text.match(/\b\d{6}\b/g) || [];
    const allNumbers = this.extractNumbers(text, { decimalAllowed: true, minValue: 1 });
    
    if (sixDigitNumbers.length > 0) {
      return {
        'Top No': sixDigitNumbers[0],
        'Miktar Metre': allNumbers[0] || '',
        'Miktar Kg': allNumbers[1] || '',
        'Renk': '',
        'En': '',
        'Parti No': '',
        'Kumaş Cinsi': ''
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

module.exports = SafiraParser;