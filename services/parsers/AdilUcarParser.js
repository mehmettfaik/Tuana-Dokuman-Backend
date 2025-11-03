const BaseParser = require('./BaseParser');

/**
 * ADİL UÇAR format parser
 * Handles ÇEKİ LİSTESİ, Stok Kodu, Kalitesi, Top No, Miktar1
 */
class AdilUcarParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'ADİL UÇAR';
    this.formatKeywords = [
      'ÇEKİ LİSTE',
      'ÇEKİ LİSTESİ', 
      'Stok Kodu',
      'Kalitesi',
      'Top No',
      'Miktar1',
      'Adil Uçar',
      'TEXTILE'
    ];
  }

  /**
   * Parse ADİL UÇAR format text - Updated parsing strategy
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    this.log('Parsing ADİL UÇAR format - UPDATED STRATEGY...');
    
    const products = [];
    const normalizedText = this.normalizeText(text);
        // Split text into lines for processing
    // Special handling for ADİL UÇAR: OCR might come as single line, so also split on key phrases
    let lines = this.getLines(normalizedText);
    
    // If we got just one long line, try to split it on common ADİL UÇAR phrases
    if (lines.length === 1 && lines[0].length > 100) {
      const singleLine = lines[0];
      const splitPatterns = [
        /ÇEKİ LİSTESİ/g,
        /Top No \d+/g,
        /MAMÜL KUMAŞ/g,
        /Çeki No:/g,
        /Sıra No Stok Türü/g,
        /NOT:/g,
        /Düzenleyen:/g,
        /İmza:/g,
        /Onaylayan:/g,
        /Teslim Alan:/g
      ];
      
      let splitText = singleLine;
      splitPatterns.forEach(pattern => {
        splitText = splitText.replace(pattern, '\n$&');
      });
      
      lines = splitText.split('\n').filter(line => line.trim());
      this.log(`Split single line into ${lines.length} lines using pattern matching`);
    }

    this.log('Full normalized text for ADİL UÇAR processing:', normalizedText);
    this.log(`Total lines to analyze: ${lines.length}`);

    // Debug: Show first 20 lines
    this.log('First 20 lines for debugging:');
    lines.slice(0, 20).forEach((line, index) => {
      this.log(`Line ${index + 1}: "${line}"`);
    });

    // Strategy 1: Parse table-based format
    const tableProducts = this.parseTableFormat(lines);
    if (tableProducts.length > 0) {
      products.push(...tableProducts);
    }

    // Strategy 2: Parse vertical format (fallback)
    if (products.length === 0) {
      const verticalProducts = this.parseVerticalFormat(lines);
      products.push(...verticalProducts);
    }

    // Strategy 3: Parse any MAMÜL KUMAŞ entries directly
    if (products.length === 0) {
      const mamulProducts = this.parseMamulEntries(lines);
      products.push(...mamulProducts);
    }
    
    this.log(`Total ADİL UÇAR products found: ${products.length}`);
    
    // If still no products, create fallback from available data
    if (products.length === 0) {
      this.log('No products found, creating fallback product...', 'warn');
      const fallbackProduct = this.createFallbackProduct(lines);
      if (fallbackProduct) {
        products.push(fallbackProduct);
      }
    }
    
    // Remove duplicates
    const uniqueProducts = this.removeDuplicateProducts(products);

    this.log(`Final ADİL UÇAR products after deduplication: ${uniqueProducts.length}`);
    uniqueProducts.forEach((product, index) => {
      this.log(`Product ${index + 1}: ${JSON.stringify(product)}`);
    });

    return uniqueProducts;
  }

  /**
   * Parse table-based format where data is in tabular structure
   * @param {Array} lines - Text lines
   * @returns {Array} - Array of products
   */
  parseTableFormat(lines) {
    this.log('Attempting table format parsing...');
    const products = [];
    
    let inTableSection = false;
    let headerFound = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for table headers
      if (line.includes('Sıra No') && line.includes('Stok')) {
        headerFound = true;
        inTableSection = true;
        this.log(`Found table header at line ${i + 1}: "${line}"`);
        continue;
      }
      
      // If we're in table section, look for data rows
      if (inTableSection && headerFound) {
        // Look for rows starting with numbers (Sıra No)
        if (line.match(/^\d+\s+/)) {
          this.log(`Found potential data row at line ${i + 1}: "${line}"`);
          
          // Try to extract product data from this row and following lines
          const product = this.extractProductFromTableRow(lines, i);
          if (product) {
            products.push(product);
            this.log(`Extracted table product: ${JSON.stringify(product)}`);
          }
        }
      }
    }
    
    this.log(`Table format parsing found ${products.length} products`);
    return products;
  }

  /**
   * Extract product data from table row and subsequent lines
   * @param {Array} lines - All lines
   * @param {number} startIndex - Starting line index
   * @returns {Object|null} - Product data or null
   */
  extractProductFromTableRow(lines, startIndex) {
    let stokKodu = '';
    let kalitesi = '';
    let renkAdi = '';
    let miktar = '';
    
    // Current line might contain: "1 MAMÜL KUMAŞ STOK_CODE"
    const currentLine = lines[startIndex];
    
    // Extract from current line
    const mamulMatch = currentLine.match(/^\d+\s+MAMÜL\s+KUMAŞ?\s*(.*)$/i);
    if (mamulMatch) {
      stokKodu = mamulMatch[1].trim();
    }
    
    // Look in next few lines for additional data
    for (let j = startIndex + 1; j < Math.min(startIndex + 5, lines.length); j++) {
      const nextLine = lines[j].trim();
      
      // Skip empty lines
      if (!nextLine) continue;
      
      // Quality pattern (%100 PAMUK, etc.)
      if (!kalitesi && nextLine.match(/^%\d+\s+(PAMUK|COTTON|COTON|LI|EA)/i)) {
        kalitesi = nextLine;
        this.log(`Found kalitesi: "${kalitesi}"`);
      }
      
      // Color pattern (color names)
      if (!renkAdi && nextLine.match(/^[A-ZÇĞıİÖŞÜ\s]+$/i) && !nextLine.match(/^\d/) && nextLine.length > 2) {
        renkAdi = nextLine;
        this.log(`Found renk: "${renkAdi}"`);
      }
      
      // Quantity pattern (numbers followed by MT, KG, etc.)
      if (!miktar && nextLine.match(/^\d+(\.\d+)?\s*(MT|KG|M)?$/i)) {
        miktar = nextLine.replace(/\s*(MT|KG|M)/i, '').trim();
        this.log(`Found miktar: "${miktar}"`);
      }
      
      // Stop if we hit another row number
      if (nextLine.match(/^\d+\s+MAMÜL/i)) {
        break;
      }
    }
    
    // Create product if we have minimum required data
    if (stokKodu || kalitesi) {
      return {
        'ARTICLE NUMBER / COMPOSITION': stokKodu && kalitesi ? 
          `${stokKodu} ${kalitesi}`.trim() : 
          (stokKodu || kalitesi || 'N/A'),
        'QUANTITY(METERS)': miktar || '',
        'ROLL NUMBER ROLL DIMENSIONS': renkAdi || '',
        'COLOR': renkAdi || ''
      };
    }
    
    return null;
  }

  /**
   * Parse vertical format where fields are on separate lines
   * @param {Array} lines - Text lines
   * @returns {Array} - Array of products
   */
  parseVerticalFormat(lines) {
    this.log('Attempting vertical format parsing...');
    const products = [];
    
    const allData = {
      stokKodlari: [],
      topNumbers: [],
      miktarlar: []
    };
    
    // Collect all data types with enhanced patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // MAMÜL KUMAŞ lines with composition
      const mamulMatch = line.match(/MAMÜL\s+KUMAŞ?\s*(.+)$/i);
      if (mamulMatch) {
        const fullComposition = mamulMatch[1].trim();
        allData.stokKodlari.push(fullComposition);
        this.log(`Found stok kodu: "${fullComposition}"`);
      }
      
      // Top No patterns (look for 9-digit numbers)
      const topNoMatch = line.match(/Top\s+No\s+(\d{9})/i);
      if (topNoMatch) {
        allData.topNumbers.push(topNoMatch[1]);
        this.log(`Found Top No: "${topNoMatch[1]}"`);
      }
      
      // Miktar patterns (MT units specifically)
      const miktarMatch = line.match(/(\d{1,3})\s+MT/i);
      if (miktarMatch) {
        allData.miktarlar.push(miktarMatch[1]);
        this.log(`Found miktar: "${miktarMatch[1]}" MT`);
      }
    }
    
    this.log(`Collected data - Stok: ${allData.stokKodlari.length}, Top: ${allData.topNumbers.length}, Miktar: ${allData.miktarlar.length}`);
    
    // Create products by combining data in order
    const maxProducts = Math.max(allData.stokKodlari.length, allData.topNumbers.length, allData.miktarlar.length);
    
    for (let i = 0; i < maxProducts; i++) {
      const stokKodu = allData.stokKodlari[i] || '';
      const topNo = allData.topNumbers[i] || '';
      const miktar = allData.miktarlar[i] || '';
      
      if (stokKodu || topNo || miktar) {
        const product = {
          'ARTICLE NUMBER / COMPOSITION': stokKodu || 'ADİL UÇAR Product',
          'QUANTITY(METERS)': miktar,
          'ROLL NUMBER ROLL DIMENSIONS': topNo,
          'COLOR': ''
        };
        
        products.push(product);
        this.log(`Created vertical product ${i + 1}: ${JSON.stringify(product)}`);
      }
    }
    
    this.log(`Vertical format parsing found ${products.length} products`);
    return products;
  }

  /**
   * Parse MAMÜL entries directly
   * @param {Array} lines - Text lines
   * @returns {Array} - Array of products
   */
  parseMamulEntries(lines) {
    this.log('Attempting direct MAMÜL entry parsing...');
    const products = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('MAMÜL') && line.includes('KUMAŞ')) {
        const mamulMatch = line.match(/MAMÜL\s+KUMAŞ?\s*(.*)$/i);
        if (mamulMatch) {
          const stokKodu = mamulMatch[1].trim();
          
          // Look for related data in nearby lines
          let kalitesi = '';
          let miktar = '';
          
          for (let j = Math.max(0, i - 3); j < Math.min(i + 5, lines.length); j++) {
            if (j === i) continue;
            
            const nearbyLine = lines[j];
            
            // Quality
            if (!kalitesi && nearbyLine.match(/^%\d+\s+(PAMUK|COTTON|COTON)/i)) {
              kalitesi = nearbyLine;
            }
            
            // Quantity
            if (!miktar && nearbyLine.match(/^\d+(\.\d+)?\s*(MT|KG)?$/)) {
              miktar = nearbyLine.replace(/\s*(MT|KG)/i, '').trim();
            }
          }
          
          const product = {
            'ARTICLE NUMBER / COMPOSITION': stokKodu && kalitesi ? 
              `${stokKodu} ${kalitesi}`.trim() : 
              (stokKodu || 'N/A'),
            'QUANTITY(METERS)': miktar || '',
            'ROLL NUMBER ROLL DIMENSIONS': '',
            'COLOR': ''
          };
          
          products.push(product);
          this.log(`Found MAMÜL product: ${JSON.stringify(product)}`);
        }
      }
    }
    
    this.log(`MAMÜL entry parsing found ${products.length} products`);
    return products;
  }

  /**
   * Create fallback product from any available data
   * @param {Array} lines - Text lines  
   * @returns {Object|null} - Fallback product or null
   */
  createFallbackProduct(lines) {
    this.log('Creating fallback product from available data...');
    
    let stokKodu = '';
    let kalitesi = '';
    let miktar = '';
    
    for (const line of lines) {
      // Any line containing fabric/textile terms
      if (!stokKodu && (line.includes('MAMÜL') || line.includes('KUMAŞ'))) {
        const match = line.match(/MAMÜL\s+KUMAŞ?\s*(.*)$/i);
        stokKodu = match ? match[1].trim() : 'Textile Product';
      }
      
      // Any percentage composition
      if (!kalitesi && line.match(/%\d+/)) {
        kalitesi = line;
      }
      
      // Any standalone number that could be quantity
      if (!miktar && line.match(/^\d{1,4}(\.\d+)?$/)) {
        const num = parseFloat(line);
        if (num > 0 && num < 10000) { // Reasonable quantity range
          miktar = line;
        }
      }
    }
    
    // If we found anything, create a product
    if (stokKodu || kalitesi) {
      const fallback = {
        'ARTICLE NUMBER / COMPOSITION': stokKodu && kalitesi ? 
          `${stokKodu} ${kalitesi}`.trim() : 
          (stokKodu || kalitesi || 'ADİL UÇAR Textile Product'),
        'QUANTITY(METERS)': miktar || '',
        'ROLL NUMBER ROLL DIMENSIONS': '',
        'COLOR': ''
      };
      
      this.log(`Created fallback product: ${JSON.stringify(fallback)}`);
      return fallback;
    }
    
    return null;
  }



  /**
   * Remove duplicate products
   * @param {Array} products - Products array
   * @returns {Array} - Unique products array
   */
  removeDuplicateProducts(products) {
    return products.filter((product, index, self) => 
      index === self.findIndex(p => 
        p['ARTICLE NUMBER / COMPOSITION'] === product['ARTICLE NUMBER / COMPOSITION'] &&
        p['ROLL NUMBER ROLL DIMENSIONS'] === product['ROLL NUMBER ROLL DIMENSIONS']
      )
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

module.exports = AdilUcarParser;