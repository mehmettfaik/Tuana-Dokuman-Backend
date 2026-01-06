const { rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class CekiListesiTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'tr') {
    super(pdfDoc, logoImage);
    this.fontService = new FontService();
    this.languageService = new LanguageService();
    this.language = language;
  }

  async initialize() {
    // Base sınıftan font yükleme metodunu kullan
    await this.loadFonts();
    
    // TUANA yazısı için özel HelveticaNeueLightItalic fontunu yükle
    this.tuanaFont = await this.fontService.loadHelveticaNeueLightItalic(this.pdfDoc);
    if (!this.tuanaFont) {
      this.tuanaFont = this.fontItalic; // Fallback
    }
  }

  async generate(formData = {}) {
    await this.initialize();
      
    // Veri yapısını normalize et
    const normalizedData = this.normalizeFormData(formData);
    
    // FormType'ı ekle (geçmiş belgeler için)
    normalizedData.formType = 'ceki-listesi';
    
    return await this.createCekiListesi(normalizedData);
  }

  /**
   * Frontend'den gelen farklı veri yapılarını normalize et
   */
  normalizeFormData(rawData = {}) {
    // Eğer formData iç içe geldiyse düzelt
    let baseData = rawData;
    if (rawData.formData && typeof rawData.formData === 'object') {
      baseData = { ...rawData, ...rawData.formData };
    }
    
    // rows array'inden metreler ve lotlar'ı çıkar
    let rows = rawData.rows || baseData.rows || [];
    let metreler = [];
    let lotlar = [];
    
    if (Array.isArray(rows) && rows.length > 0) {
      rows.forEach(row => {
        metreler.push(row.metre || row.meter || row.METRE || '');
        lotlar.push(row.lot || row.LOT || '');
      });
    }
    
    // Eğer metreler hala boşsa, diğer kaynaklardan dene
    if (metreler.length === 0) {
      metreler = baseData.metreler || baseData['METRELER'] || baseData.meters || [];
      lotlar = baseData.lotlar || baseData['LOTLAR'] || baseData.lots || [];
    }
    
    // String ise array'e çevir
    if (typeof metreler === 'string') {
      metreler = metreler.split(',').map(m => m.trim());
    }
    if (typeof lotlar === 'string') {
      lotlar = lotlar.split(',').map(l => l.trim());
    }
    
    return {
      // Form bilgileri
      musteriAdi: baseData.musteriAdi || baseData['MÜŞTERİ'] || baseData.musteri || '',
      faturaNo: baseData.faturaNo || baseData['FATURA NO'] || baseData.invoiceNo || '',
      irsaliyeNo: baseData.irsaliyeNo || baseData['İRSALİYE NO'] || baseData.dispatchNo || '',
      tarih: baseData.tarih || baseData['TARIH'] || baseData.date || '',
      notlar: baseData.notlar || baseData['NOTLAR'] || baseData.notes || baseData.not || baseData['NOT'] || '',
      
      // Ürün bilgileri
      artikelKodu: baseData.artikelKodu || baseData['ARTİKEL KODU'] || baseData.articleCode || '',
      karisim: baseData.karisim || baseData['KARIŞIM'] || baseData.composition || '',
      renkKodu: baseData.renkKodu || baseData['RENK NO'] || baseData.colorNo || '',
      desenNo: baseData.desenNo || baseData['DESEN NO'] || baseData.patternNo || '',
      
      // Tablo verileri
      metreler: metreler,
      lotlar: lotlar
    };
  }

  async createCekiListesi(formData = {}) {
    // Tek sayfa oluştur (tüm veriler normalize edildi)
    await this.createProductPage(formData, formData, 1, 1);
    return this.pdfDoc;
  }

  async createProductPage(productData, formData, pageNum, totalPages) {
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // Header çiz (Invoice tarzında)
    y = this.drawCekiListesiHeader(page, pageWidth, y, formData);

    // ÇEKİ LİSTESİ başlığı
    y -= 15;
    const cekiListesiTitle = this.languageService.getText('cekiListesi', this.language);
    this.drawSafeText(page, cekiListesiTitle, {
      x: 55,
      y: y,
      size: 20,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Müşteri bilgileri bölümü
    y -= 10;
    y = this.drawCustomerInfoSection(page, pageWidth, y, formData, productData);

    // Müşteri bilgileri ile top tabloları arasına ayırıcı çizgi
    y -= 10;
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: pageWidth - 50, y: y },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });

    // Top tabloları
    y -= 8;
    y = this.drawTopTables(page, pageWidth, y, productData);

    // Genel Toplam bölümü
    y -= 25;
    y = this.drawTotalSection(page, pageWidth, y, productData);

    // Notlar bölümü
    y -= 10;
    y = this.drawNotesSection(page, pageWidth, y, formData);

    // Footer (sayfa numarası)
    this.drawCekiListesiFooter(page, pageWidth, pageNum, totalPages);

    return this.pdfDoc;
  }

  drawCekiListesiHeader(page, pageWidth, y, formData) {
    // TUANA TEKSTIL başlığı (Invoice tarzında)
    this.drawSafeText(page, 'TUANA TEKSTIL', {
      x: 55,
      y: y - 5,
      size: 35,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Logo (Invoice'daki pozisyonda)
    if (this.logoImage) {
      const logoWidth = 25;
      const logoHeight = 25;
      page.drawImage(this.logoImage, {
        x: pageWidth - 285,
        y: y - 5,
        width: logoWidth,
        height: logoHeight,
      });
    }

    // Ana çizgi
    page.drawLine({
      start: { x: 50, y: y - 15 },
      end: { x: pageWidth - 50, y: y - 15 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });

    // TARİH (sağ üst köşe - Invoice tarzında) - normalize edilmiş veriden
    const dateLabel = this.languageService.getText('tarih', this.language);
    const dateValue = this.formatDate(formData.tarih || '');
    
    this.drawSafeText(page, `${dateLabel}: ${dateValue}`, {
      x: pageWidth - 145,
      y: y + 15,
      size: 8,
      font: this.fontBold || this.font,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi (Invoice tarzında)
    page.drawLine({
      start: { x: pageWidth - 150, y: y + 25 },
      end: { x: pageWidth - 150, y: y - 15 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    return y - 25;
  }

  drawCustomerInfoSection(page, pageWidth, y, formData, productData) {
    const startX = 60;
    const labelWidth = 90;
    const valueX = startX + labelWidth;
    const lineHeight = 16;
    const sectionWidth = pageWidth - 110;

    // Bilgi kutusu çerçevesi
    const boxHeight = 7 * lineHeight;
    page.drawRectangle({
      x: startX - 5,
      y: y - boxHeight,
      width: sectionWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    // Yatay çizgiler
    for (let i = 1; i <= 6; i++) {
      page.drawLine({
        start: { x: startX - 5, y: y - (i * lineHeight) },
        end: { x: startX + sectionWidth - 5, y: y - (i * lineHeight) },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }

    // Dikey çizgi (label ve değer arasında)
    page.drawLine({
      start: { x: valueX - 5, y: y },
      end: { x: valueX - 5, y: y - boxHeight },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    let currentY = y;

    // MÜŞTERİ (ilk satır - bold/highlight) - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('musteriLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.musteriAdi || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // FATURA NO - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('faturaNoLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.faturaNo || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // İRSALİYE NO - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('irsaliyeNoLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.irsaliyeNo || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // ARTİKEL KODU - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('artikelKoduLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.artikelKodu || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // KARIŞIM - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('karisimLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.karisim || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // RENK NO - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('renkNoLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.renkKodu || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    // DESEN NO - normalize edilmiş veriden
    this.drawSafeText(page, this.languageService.getText('desenNoLabel', this.language), {
      x: startX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    this.drawSafeText(page, formData.desenNo || '', {
      x: valueX,
      y: currentY - 11,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    currentY -= lineHeight;

    return currentY;
  }

  drawTopTables(page, pageWidth, y, productData) {
    // Normalize edilmiş veriden metreler ve lotları al
    let metreler = productData.metreler || [];
    let lotlar = productData.lotlar || [];
    
    // Array değilse boş array yap
    if (!Array.isArray(metreler)) metreler = [];
    if (!Array.isArray(lotlar)) lotlar = [];

    // Sol tablo için veriler (1-24)
    const leftData = [];
    for (let i = 0; i < 24; i++) {
      leftData.push({
        topNo: i + 1,
        metre: metreler[i] || '',
        lot: lotlar[i] || ''
      });
    }

    // Sağ tablo için veriler (25-48)
    const rightData = [];
    for (let i = 24; i < 48; i++) {
      rightData.push({
        topNo: i + 1,
        metre: metreler[i] || '',
        lot: lotlar[i] || ''
      });
    }

    // Tablo boyutları
    const tableStartX = 55;
    const colWidths = { topNo: 75, metre: 55, lot: 55 };
    const rowHeight = 14;
    const headerHeight = 16;

    // Sol tablo
    this.drawSingleTable(page, tableStartX, y, leftData, colWidths, rowHeight, headerHeight);

    // Sağ tablo
    const rightTableX = pageWidth / 2 + 55;
    this.drawSingleTable(page, rightTableX, y, rightData, colWidths, rowHeight, headerHeight);

    // Tablo yüksekliğini hesapla
    const tableHeight = headerHeight + (24 * rowHeight);
    
    return y - tableHeight;
  }

  drawSingleTable(page, startX, startY, data, colWidths, rowHeight, headerHeight) {
    const totalWidth = colWidths.topNo + colWidths.metre + colWidths.lot;
    const tableHeight = headerHeight + (data.length * rowHeight);
    const tableBottom = startY - tableHeight;
    const lineThickness = 0.5;
    
    // Tablo dış çerçevesi - 4 ayrı çizgi ile çiz (eşit kalınlık için)
    // Üst çizgi
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: startX + totalWidth, y: startY },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });
    // Alt çizgi
    page.drawLine({
      start: { x: startX, y: tableBottom },
      end: { x: startX + totalWidth, y: tableBottom },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });
    // Sol çizgi
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: startX, y: tableBottom },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });
    // Sağ çizgi
    page.drawLine({
      start: { x: startX + totalWidth, y: startY },
      end: { x: startX + totalWidth, y: tableBottom },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });

    // Header arka planı (beyaz)
    page.drawRectangle({
      x: startX + 0.25,
      y: startY - headerHeight,
      width: totalWidth - 0.5,
      height: headerHeight - 0.25,
      color: rgb(1, 1, 1),
    });

    // Header alt çizgisi
    page.drawLine({
      start: { x: startX, y: startY - headerHeight },
      end: { x: startX + totalWidth, y: startY - headerHeight },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });

    // Header yazıları
    let headerX = startX;
    
    this.drawSafeText(page, this.languageService.getText('topNumarasi', this.language), {
      x: headerX + 3,
      y: startY - 11,
      size: 7,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    headerX += colWidths.topNo;

    // Dikey çizgi 1 (TOP NUMARASI | METRE arası)
    page.drawLine({
      start: { x: headerX, y: startY },
      end: { x: headerX, y: tableBottom },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });

    this.drawSafeText(page, this.languageService.getText('metre', this.language), {
      x: headerX + 3,
      y: startY - 11,
      size: 7,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    headerX += colWidths.metre;

    // Dikey çizgi 2 (METRE | LOT arası)
    page.drawLine({
      start: { x: headerX, y: startY },
      end: { x: headerX, y: tableBottom },
      thickness: lineThickness,
      color: rgb(0, 0, 0),
    });

    this.drawSafeText(page, this.languageService.getText('lot', this.language), {
      x: headerX + 3,
      y: startY - 11,
      size: 7,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Data satırları
    let currentY = startY - headerHeight;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Satır alt çizgisi
      if (i < data.length - 1) {
        page.drawLine({
          start: { x: startX, y: currentY - rowHeight },
          end: { x: startX + totalWidth, y: currentY - rowHeight },
          thickness: lineThickness,
          color: rgb(0, 0, 0),
        });
      }

      let cellX = startX;

      // Top Numarası
      this.drawSafeText(page, String(row.topNo), {
        x: cellX + 3,
        y: currentY - 10,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      cellX += colWidths.topNo;

      // Metre
      const metreStr = row.metre !== undefined && row.metre !== null && row.metre !== '' 
        ? String(row.metre) : '';
      this.drawSafeText(page, metreStr, {
        x: cellX + 3,
        y: currentY - 10,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      cellX += colWidths.metre;

      // Lot
      const lotStr = row.lot !== undefined && row.lot !== null && row.lot !== '' 
        ? String(row.lot) : '';
      this.drawSafeText(page, lotStr, {
        x: cellX + 3,
        y: currentY - 10,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      currentY -= rowHeight;
    }

    return currentY;
  }

  drawTotalSection(page, pageWidth, y, productData) {
    const startX = 55;
    const sectionWidth = pageWidth - 110;
    
    // Normalize edilmiş veriden metreler'i al
    let metreler = productData.metreler || [];
    if (!Array.isArray(metreler)) metreler = [];

    // Toplam metreleri hesapla
    let totalMetre = 0;
    metreler.forEach(metre => {
      if (metre !== undefined && metre !== null && metre !== '') {
        const numValue = parseFloat(String(metre).replace(',', '.'));
        if (!isNaN(numValue)) {
          totalMetre += numValue;
        }
      }
    });

    // Top sayısı (boş olmayanları say)
    const rolikCount = metreler.filter(m => m !== undefined && m !== null && String(m).trim() !== '').length;

    // Üst çizgi
    page.drawLine({
      start: { x: startX - 5, y: y },
      end: { x: startX + sectionWidth - 5, y: y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    // GENEL TOPLAM yazısı
    this.drawSafeText(page, this.languageService.getText('genelToplam', this.language), {
      x: startX,
      y: y - 12,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // METRE değeri
    const metreFormatted = this.formatNumber(totalMetre);
    this.drawSafeText(page, `${this.languageService.getText('metreLabel', this.language)}: ${metreFormatted}`, {
      x: pageWidth - 220,
      y: y - 12,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // ROLİK değeri
    this.drawSafeText(page, `${this.languageService.getText('rolikLabel', this.language)}: ${rolikCount}`, {
      x: pageWidth - 110,
      y: y - 12,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Alt çizgi
    page.drawLine({
      start: { x: startX - 5, y: y - 18 },
      end: { x: startX + sectionWidth - 5, y: y - 18 },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });

    return y - 18;
  }

  drawNotesSection(page, pageWidth, y, formData) {
    const startX = 55;
    const maxWidth = pageWidth - 110; // Maksimum genişlik
    const lineHeight = 12; // Satır yüksekliği
    const fontSize = 8;

    // NOTLAR başlığı
    this.drawSafeText(page, `${this.languageService.getText('notlar', this.language)}:`, {
      x: startX,
      y: y - 12,
      size: 11,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Notlar içeriği - normalize edilmiş veriden (başlığın altından başla)
    const notesText = formData.notlar || '';
    let linesUsed = 1;
    
    if (notesText) {
      // Metni satırlara böl
      const lines = this.wrapText(String(notesText), maxWidth, fontSize);
      
      lines.forEach((line, index) => {
        this.drawSafeText(page, line, {
          x: startX,
          y: y - 12 - lineHeight - (index * lineHeight),
          size: fontSize,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      });
      
      linesUsed = Math.max(1, lines.length) + 1; // +1 for the title line
    }

    return y - (linesUsed * lineHeight) - 8;
  }

  /**
   * Metni belirli genişliğe göre satırlara böl
   */
  wrapText(text, maxWidth, fontSize) {
    if (!text) return [];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Yaklaşık karakter genişliği (font bağımlı)
    const avgCharWidth = fontSize * 0.5;
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length > maxCharsPerLine && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Maksimum 5 satır ile sınırla
    return lines.slice(0, 5);
  }

  drawCekiListesiFooter(page, pageWidth, pageNum, totalPages) {
    const y = 50;
    
    // Alt çizgi - iki çizgi (Invoice tarzında)
    page.drawLine({
      start: { x: 50, y: y + 17 },
      end: { x: pageWidth - 50, y: y + 17 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 50, y: y + 25 },
      end: { x: pageWidth - 50, y: y + 25 },
      thickness: 0.7,
      color: rgb(0, 0, 0),
    });

    // İki çizgi arasına TUANA yazısı - normal ve ters (Invoice tarzında)
    const tuanaText = 'TUANA';
    const tuanaFont = this.tuanaFont || this.fontItalic || this.font;
    const textWidth = tuanaFont.widthOfTextAtSize(tuanaText, 8);
    const centerX = pageWidth / 2;
    
    // Normal TUANA yazısı (sol taraf)
    page.drawText(tuanaText, {
      x: centerX - textWidth + 222,
      y: y + 18,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
    });
    
    // Ters TUANA yazısı (sağ taraf) - 180 derece döndürülmüş
    page.drawText(tuanaText, {
      x: centerX + textWidth + 219,
      y: y + 24,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 180 },
    });

    // Sayfa numarası (orta alt)
    const pageNumStr = String(pageNum || 1);
    this.drawSafeText(page, pageNumStr, {
      x: pageWidth / 2 - 5,
      y: 25,
      size: 10,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }

  formatDate(dateStr) {
    if (!dateStr) {
      const today = new Date();
      return today.toLocaleDateString('tr-TR');
    }
    
    // YYYY-MM-DD formatını DD/MM/YYYY'ye çevir
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    
    return String(dateStr);
  }

  formatNumber(num) {
    if (typeof num === 'number') {
      return num.toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return String(num || 0);
  }
}

module.exports = CekiListesiTemplate;
