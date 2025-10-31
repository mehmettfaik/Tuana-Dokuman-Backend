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
        
    // Pattern: "2 1 11052179 100009650445 51,55 17.500 17.000 2"
    // Gruplar: sıra, sack, batch_no, roll_no, quantity, gross_weight, net_weight, pcs
    const tablePattern = /(\d+)\s+(\d+)\s+(\d{7,})\s+(\d{9,})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+(\d+)/g;
    
    let match;
    while ((match = tablePattern.exec(fullText)) !== null) {
      const row = {
        'Batch No': match[3], // Batch number (7-8 digits)
        'Roll No': match[4],  // Roll number (9+ digits)
        'Quantity Meter': match[5], // Quantity with comma
        'Gross Weight': match[6],   // Gross weight
        'Net Weight': match[7]      // Net weight
      };
      
      rows.push(row);
      this.log(`Found table row: Batch="${match[3]}", Roll="${match[4]}", Qty="${match[5]}", Net="${match[7]}"`);
    }
    
// Alternatif: Bozuk format ayrıştırma (çok satırlı veri)
    if (rows.length === 0) {
      this.log('Trying alternative parsing for broken format...');
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line1 = lines[i].trim();
        const line2 = lines[i + 1].trim();
        
        // Pattern: line1 = "11052179", line2 = "100009650445 51,55"
        const batchMatch = line1.match(/^(\d{7,})$/);
        const rollDataMatch = line2.match(/^(\d{9,})\s+([0-9.,]+)$/);
        
        if (batchMatch && rollDataMatch) {
          // Ağırlıkları bir sonraki satırlarda ara
          let grossWeight = '';
          let netWeight = '';
          
          if (i + 2 < lines.length) {
            const weightLine1 = lines[i + 2].trim();
            if (weightLine1.match(/^[0-9.,]+$/)) {
              grossWeight = weightLine1;
            }
          }
          
          if (i + 3 < lines.length) {
            const weightLine2 = lines[i + 3].trim();
            if (weightLine2.match(/^[0-9.,]+$/)) {
              netWeight = weightLine2;
            }
          }
          
          const row = {
            'Batch No': batchMatch[1],
            'Roll No': rollDataMatch[1],
            'Quantity Meter': rollDataMatch[2],
            'Gross Weight': grossWeight,
            'Net Weight': netWeight
          };
          
          rows.push(row);
          this.log(`Alternative parsing - Batch="${batchMatch[1]}", Roll="${rollDataMatch[1]}"`);
          i += 3; 
        }
      }
    }
    
    this.log(`Total table rows found: ${rows.length}`);
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