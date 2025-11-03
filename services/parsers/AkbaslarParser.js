const BaseParser = require('./BaseParser');

/**
AKBAŞLAR format ayrıştırıcısı
MÜŞTERİ SİPARİŞ NO, KOMPOZİSYON, Parti No, Top No, Miktar (Metre), Brüt Ağırlık, Net Ağırlık alanlarını işler
*/
class AkbaslarParser extends BaseParser {
  constructor() {
    super();
    this.companyName = 'AKBASLAR';
    this.formatKeywords = [
      'CUSTOMER ORDER NO',
      'COMPOSITION', 
      'Batch No',
      'Roll No',
      'Quantity Meter',
      'Gross Weight',
      'Net Weight'
    ];
  }

  /**
   * Parse AKBASLAR format text
   * @param {string} text - OCR extracted text
   * @returns {Array} - Array of parsed products
   */
  parse(text) {
    this.log('Parsing AKBASLAR format...');
    
// (örneğin, 1. sayfada T-16666 ve 2. sayfada T-16665) korunmuş olur.
    const fullText = text || '';

    const headerMarkerRegex = /CUSTOMER\s*ORDER\s*NO/gi;
    const headerPositions = [];
    let m;
    while ((m = headerMarkerRegex.exec(fullText)) !== null) {
      headerPositions.push(m.index);
    }

// Eğer başlık işaretleri bulunamazsa, tüm metni kullanarak orijinal davranışa geri dön.
    if (headerPositions.length === 0) {
      const customerOrderNo = this.extractHeaderField(fullText, 'CUSTOMER\\s*ORDER\\s*NO');
      const composition = this.extractHeaderField(fullText, 'COMPOSITION');
      this.log(`Header - Customer Order: "${customerOrderNo}", Composition: "${composition}"`);

      const tableRows = this.parseAkbaslarTableData(fullText);
      if (tableRows.length === 0) {
        this.log('No table data found, creating single product from header', 'warn');
        return [{
          'CUSTOMER ORDER NO': customerOrderNo,
          'COMPOSITION': composition,
          'Batch No': '',
          'Roll No': '',
          'Quantity Meter': '',
          'Gross Weight': '',
          'Net Weight': ''
        }];
      }

      const products = tableRows.map(row => ({
        'CUSTOMER ORDER NO': customerOrderNo,
        'COMPOSITION': composition,
        'Batch No': row['Batch No'] || '',
        'Roll No': row['Roll No'] || '',
        'Quantity Meter': row['Quantity Meter'] || '',
        'Gross Weight': row['Gross Weight'] || '',
        'Net Weight': row['Net Weight'] || ''
      }));

      this.log(`Successfully parsed ${products.length} AKBASLAR products`);
      return products;
    }

// Başlık konumları arasındaki bölümleri oluştur (bölümün başlangıcına başlığı dahil et).
    const segments = [];
    for (let i = 0; i < headerPositions.length; i++) {
      const start = headerPositions[i];
      const end = (i + 1 < headerPositions.length) ? headerPositions[i + 1] : fullText.length;
      const segmentText = fullText.slice(start, end).trim();
      segments.push(segmentText);
    }

    const allProducts = [];
    segments.forEach((segment, idx) => {
// Bu bölüm için başlık alanlarını çıkar.
      const customerOrderNo = this.extractHeaderField(segment, 'CUSTOMER\\s*ORDER\\s*NO') || '';
      const composition = this.extractHeaderField(segment, 'COMPOSITION') || '';
      this.log(`Segment ${idx + 1} header - Customer Order: "${customerOrderNo}", Composition: "${composition}"`);

// Bölüm içindeki tablo satırlarını ayrıştır.
      const rows = this.parseAkbaslarTableData(segment);
      if (rows.length === 0) {
        this.log(`No table rows found in segment ${idx + 1}, creating fallback product`, 'warn');
        allProducts.push({
          'CUSTOMER ORDER NO': customerOrderNo,
          'COMPOSITION': composition,
          'Batch No': '',
          'Roll No': '',
          'Quantity Meter': '',
          'Gross Weight': '',
          'Net Weight': ''
        });
      } else {
        rows.forEach(row => {
          allProducts.push({
            'CUSTOMER ORDER NO': customerOrderNo,
            'COMPOSITION': composition,
            'Batch No': row['Batch No'] || '',
            'Roll No': row['Roll No'] || '',
            'Quantity Meter': row['Quantity Meter'] || '',
            'Gross Weight': row['Gross Weight'] || '',
            'Net Weight': row['Net Weight'] || ''
          });
        });
      }
    });

    this.log(`Successfully parsed ${allProducts.length} AKBASLAR products across ${segments.length} segments`);
    return allProducts;
  }

  /**
   * Parse AKBASLAR table data - AKBASLAR format için optimize edilmiş
   * @param {string} text - Text to parse
   * @returns {Array} - Array of table rows
   */
  parseAkbaslarTableData(text) {
    const rows = [];
    const lines = text.split('\n');
    const fullText = lines.join('\n');
    
    this.log('Starting AKBASLAR table parsing...');
    this.log(`Total lines to analyze: ${lines.length}`);
        
    // Strategy 1: Standard table pattern - tek satırda tüm veriler
    // Pattern: "2 1 11052179 100009650445 51,55 17.500 17.000 2"
    // Gruplar: sıra, sack, batch_no, roll_no, quantity, gross_weight, net_weight, pcs
    const standardPattern = /(\d+)\s+(\d+)\s+(\d{7,8})\s+(\d{9,12})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+(\d+)/g;
    
    let match;
    while ((match = standardPattern.exec(fullText)) !== null) {
      const row = {
        'Batch No': match[3],
        'Roll No': match[4],
        'Quantity Meter': match[5],
        'Gross Weight': match[6],
        'Net Weight': match[7]
      };
      
      rows.push(row);
      this.log(`[Strategy 1] Found: Batch="${match[3]}", Roll="${match[4]}", Qty="${match[5]}", Net="${match[7]}"`);
    }
    
    // Strategy 2: Daha esnek pattern - bazı boşluklar eksik olabilir
    // Batch ve Roll numaraları yan yana olabilir
    if (rows.length < 20) { // Eğer yeterince satır bulamadıysak
      this.log('Trying Strategy 2: Flexible spacing pattern...');
      
      const flexiblePattern = /(\d{7,8})\s*(\d{9,12})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)/g;
      const foundBatches = new Set(rows.map(r => r['Batch No'] + r['Roll No']));
      
      let flexMatch;
      while ((flexMatch = flexiblePattern.exec(fullText)) !== null) {
        const batchRollKey = flexMatch[1] + flexMatch[2];
        
        // Duplicate kontrolü
        if (!foundBatches.has(batchRollKey)) {
          const row = {
            'Batch No': flexMatch[1],
            'Roll No': flexMatch[2],
            'Quantity Meter': flexMatch[3],
            'Gross Weight': flexMatch[4],
            'Net Weight': flexMatch[5]
          };
          
          rows.push(row);
          foundBatches.add(batchRollKey);
          this.log(`[Strategy 2] Found: Batch="${flexMatch[1]}", Roll="${flexMatch[2]}", Qty="${flexMatch[3]}", Net="${flexMatch[5]}"`);
        }
      }
    }
    
    // Strategy 3: Satır satır analiz - en esnek yöntem
    if (rows.length < 20) {
      this.log('Trying Strategy 3: Line-by-line analysis...');
      
      const foundBatches = new Set(rows.map(r => r['Batch No'] + r['Roll No']));
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Batch number'ı ara (7-8 digits)
        const batchMatch = line.match(/\b(\d{7,8})\b/);
        if (!batchMatch) continue;
        
        const batchNo = batchMatch[1];
        
        // Aynı satırda veya yakın satırlarda Roll number ara (9-12 digits)
        for (let j = i; j <= i + 2 && j < lines.length; j++) {
          const searchLine = lines[j].trim();
          const rollMatch = searchLine.match(/\b(\d{9,12})\b/);
          
          if (rollMatch && rollMatch[1] !== batchNo) {
            const rollNo = rollMatch[1];
            const batchRollKey = batchNo + rollNo;
            
            if (foundBatches.has(batchRollKey)) continue;
            
            // Quantity, Gross, Net weight ara (decimal sayılar)
            const numbers = [];
            for (let k = i; k <= i + 5 && k < lines.length; k++) {
              const numLine = lines[k].trim();
              const numMatches = numLine.match(/\b([0-9]{1,3}[.,][0-9]+)\b/g);
              if (numMatches) {
                numbers.push(...numMatches);
              }
            }
            
            // En az 3 sayı olmalı (qty, gross, net)
            if (numbers.length >= 3) {
              const row = {
                'Batch No': batchNo,
                'Roll No': rollNo,
                'Quantity Meter': numbers[0] || '',
                'Gross Weight': numbers[1] || '',
                'Net Weight': numbers[2] || ''
              };
              
              rows.push(row);
              foundBatches.add(batchRollKey);
              this.log(`[Strategy 3] Found: Batch="${batchNo}", Roll="${rollNo}", Qty="${numbers[0]}", Net="${numbers[2]}"`);
              break;
            }
          }
        }
      }
    }
    
    this.log(`✅ Total table rows found: ${rows.length}`);
    return rows;
  }

  /**
   * Get format detection keywords
   * @returns {Array} - Array of keywords for format detection
   */
  getFormatKeywords() {
    return this.formatKeywords;
  }
}

module.exports = AkbaslarParser;