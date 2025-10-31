const BaseParser = require('./BaseParser');

/**
 * ADA format parser
 * Handles Müşt. Referansı, Komp, Barkod-TopNo, Kalite-Lot, Metre, Gramaj
 */
class AdaParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'ADA';
    this.formatKeywords = [
      'Müşt. Referansı',
      'Komp',
      'Barkod-TopNo',
      'Kalite-Lot',
      'Metre',
      'Gramaj'
    ];
  }

  /**
   * Parse ADA format text
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    this.log('Parsing ADA format...');
    
    // T-code ve composition'ı birlikte bul (header bilgileri)
    let mustReferansi = '';
    let komp = '';
    
    // Pattern 1: T-code ile başlayan tam satır
    const tCodeFullMatch = text.match(/(T-\d+[^0-9\n]*(?:\d+%[^0-9\n]*)+)/i);
    if (tCodeFullMatch) {
      const fullMatch = tCodeFullMatch[1].trim();
      this.log(`Found T-code line: "${fullMatch}"`);
      
      // T-code'u ve composition'ı ayır
      const parts = fullMatch.split(/\//).map(p => p.trim());
      if (parts.length >= 2) {
        mustReferansi = parts[0].trim();
        komp = parts.slice(1).join(' / ').trim();
      } else {
        // T-code ve composition aynı satırda ama / ile ayrılmamış
        const tMatch = fullMatch.match(/(T-\d+[^%]*)/);
        const compMatch = fullMatch.match(/(\d+%[^0-9]*\d+%[^0-9]*)/);
        
        mustReferansi = tMatch ? tMatch[1].trim() : fullMatch;
        komp = compMatch ? compMatch[1].trim() : '';
      }
    }
    
    // Pattern 2: Ayrı olarak T-code ara - MULTI-LINE SUPPORT
    if (!mustReferansi) {
      mustReferansi = this.extractMultilineTCode(text);
    }
    
    // Pattern 3: Composition'ı ayrı ara - MULTI-LINE SUPPORT
    if (!komp) {
      komp = this.extractMultilineComposition(text);
    }
    
    this.log(`ADA Header - Müşt. Referansı: "${mustReferansi}", Komp: "${komp}"`);
    
    // ÇOK ÖNEMLİ: Tablo satırlarını parse et - her satır ayrı ürün
    const products = this.parseADAProducts(text, mustReferansi, komp);
    
    this.log(`Successfully parsed ${products.length} ADA products`);
    return products;
  }

  /**
   * Extract T-code from multiline text
   * @param {string} text - Text to search in
   * @returns {string} - T-code value
   */
  extractMultilineTCode(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Müşt. Referansı: ile başlayan satır
      if (line.match(/Müşt\.?\s*Referans[ıi]\s*[:：]?\s*(.+)/i)) {
        const refMatch = line.match(/Müşt\.?\s*Referans[ıi]\s*[:：]?\s*(.+)/i);
        const value = refMatch[1].trim();
        this.log(`Found Müşt. Referansı: "${value}"`);
        return value;
      }
      
      // T- ile başlayan satır (standalone)
      else if (line.match(/^(T-\d+[^\n\r]*)/i)) {
        const value = line.trim();
        this.log(`Found T-code: "${value}"`);
        return value;
      }
    }
    return '';
  }

  /**
   * Extract composition from multiline text
   * @param {string} text - Text to search in
   * @returns {string} - Composition value
   */
  extractMultilineComposition(text) {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Komp: ile başlayan satır
      if (line.match(/^Komp\.?\s*[:：]?\s*(.+)/i)) {
        const kompStart = line.match(/^Komp\.?\s*[:：]?\s*(.+)/i)[1].trim();
        this.log(`Found Komp start line ${i + 1}: "${kompStart}"`);
        
        let fullKomp = kompStart;
        
        // Sonraki satırları kontrol et - composition devam edebilir
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          // Bu satır composition'ın devamı mı?
          // Pattern: 20%LI 1%EA, %CO %LI gibi
          if (nextLine.match(/^\d+%[A-Z]+(?:\s+\d+%[A-Z]+)*$/i)) {
            fullKomp += ' ' + nextLine;
            this.log(`Adding continuation line ${j + 1}: "${nextLine}"`);
          }
          // Boş satır veya composition olmayan satır - dur
          else if (nextLine && !nextLine.match(/^\s*$/)) {
            break;
          }
        }
        
        this.log(`Complete composition: "${fullKomp}"`);
        return fullKomp;
      }
      
      // Alternatif: Sadece composition pattern'ı (başında Komp: olmadan)
      else if (line.match(/^\d+%[A-Z]+(?:\s+\d+%[A-Z]+)*$/i) && !komp) {
        this.log(`Found standalone composition line ${i + 1} "${line}"`);
        
        let fullKomp = line;
        
        // Sonraki satırları kontrol et
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim();
          
          if (nextLine.match(/^\d+%[A-Z]+(?:\s+\d+%[A-Z]+)*$/i)) {
            fullKomp += ' ' + nextLine;
            this.log(`Adding continuation line ${j + 1}: "${nextLine}"`);
          } else if (nextLine && !nextLine.match(/^\s*$/)) {
            break;
          }
        }
        
        this.log(`Complete standalone composition: "${fullKomp}"`);
        return fullKomp;
      }
    }
    return '';
  }

  /**
   * Parse ADA products from text
   * @param {string} text - Text to parse
   * @param {string} mustReferansi - Header reference
   * @param {string} komp - Header composition
   * @returns {Array} - Array of products
   */
  parseADAProducts(text, mustReferansi, komp) {
    const products = [];
    const lines = text.split('\n');
    
    this.log('Analyzing all lines for ADA products...');
    this.log(`Total lines: ${lines.length}`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Table başlangıcını tespit et - SADECE barkod pattern'ı olan satırları al
      if (line.match(/^\d+#T\d+-\d+$/)) {
        // Bu bir barkod satırı, sonraki satırları kontrol et
        const barkod = line;
        this.log(`Found barkod line ${i + 1}: "${barkod}"`);
        
        // Sonraki satırları kontrol et
        let lot = '';
        let metre = '';
        let gramaj = '';
        
        // Lot numarasını bul (bir sonraki satır)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.match(/^\d{8,}(?:\s+LOT-\d+)?$/)) {
            lot = nextLine.replace(/\s+LOT-\d+/, '').trim();
            this.log(`Found lot: "${lot}"`);
          }
        }
        
        // Metre ve gramaj değerlerini sonraki satırlarda ara
        for (let j = i + 2; j < Math.min(i + 8, lines.length); j++) {
          const searchLine = lines[j].trim();
          
          // Skip boş satırlar ve header bilgileri
          if (!searchLine || searchLine === '157.0' || searchLine === '160.0' || searchLine === '1' || searchLine === 'M') {
            continue;
          }
          
          this.log(`Checking line ${j + 1}: "${searchLine}"`);
          
          // Metre pattern: 65.0, 75.0 M 29.7375, 74.0 M
          if (!metre) {
            const metreMatch = searchLine.match(/^(\d+\.?\d*)\s*(?:M\s*(\d+\.?\d*))?$/);
            if (metreMatch) {
              const metreValue = parseFloat(metreMatch[1]);
              // Metre range'ini genişlettik: 5-1000 metre arası makul
              if (metreValue > 5 && metreValue < 1000) {
                metre = metreMatch[1];
                this.log(`Found metre: "${metre}"`);
                if (metreMatch[2]) {
                  const gramajValue = parseFloat(metreMatch[2]);
                  // Gramaj için de genişletilmiş range
                  if (gramajValue > 1 && gramajValue < 500) {
                    gramaj = metreMatch[2];
                    this.log(`Found gramaj in same line: "${gramaj}"`);
                  }
                }
              }
            }
          }
          
          // Gramaj pattern (ayrı satırda): 29.7375, 25.7725, etc.
          if (!gramaj) {
            const gramajMatch = searchLine.match(/^(\d+\.?\d*)$/);
            if (gramajMatch) {
              const gramajValue = parseFloat(gramajMatch[1]);
              // Gramaj range'ini genişlettik: 1-500 kg arası makul
              if (gramajValue > 1 && gramajValue < 500) {
                gramaj = gramajMatch[1];
                this.log(`Found gramaj: "${gramaj}"`);
              }
            }
          }
          
          if (metre && gramaj) break;
        }
        
        if (lot) {
          const product = {
            'Müşt. Referansı': mustReferansi,
            'Komp': komp,
            'Barkod-TopNo': barkod,
            'Kalite-Lot': lot,
            'Metre': metre,
            'Gramaj': gramaj
          };
          
          products.push(product);
          this.log(`Found ADA product ${products.length}: Barkod="${barkod}", Lot="${lot}", Metre="${metre}", Gramaj="${gramaj}"`);
        }
      }
    }
    
    this.log(`Total ADA products found: ${products.length}`);
    
    // Eğer hiç ürün bulunamadıysa fallback kullan
    if (products.length === 0) {
      this.log('No products found in table format, creating single fallback product', 'warn');
      
      // Tüm metindeki sayıları topla
      const validNumbers = this.extractNumbers(text, { maxValue: 100000, minLength: 2 });
      
      const fallbackProduct = {
        'Müşt. Referansı': mustReferansi,
        'Komp': komp,
        'Barkod-TopNo': '',
        'Kalite-Lot': validNumbers[0] || '',
        'Metre': validNumbers[1] || '',
        'Gramaj': validNumbers[2] || ''
      };
      
      products.push(fallbackProduct);
    }
    
    this.log('Final ADA products:');
    products.forEach((product, index) => {
      this.log(`Product ${index + 1}: ${JSON.stringify(product)}`);
    });
    
    return products;
  }

  /**
   * Get format detection keywords
   * @returns {Array} - Array of keywords for format detection
   */
  getFormatKeywords() {
    return this.formatKeywords;
  }
}

module.exports = AdaParser;