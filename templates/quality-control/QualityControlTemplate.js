const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class QualityControlTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'en') {
    super(pdfDoc, logoImage);
    this.fontService = new FontService();
    this.languageService = new LanguageService();
    this.language = language;
  }

  async initialize() {
    await this.loadFonts();
    this.tuanaFont = await this.fontService.loadHelveticaNeueLightItalic(this.pdfDoc);
    if (!this.tuanaFont) this.tuanaFont = this.fontItalic;
  }

  async createQualityControl(formData = {}, language = null) {
    if (language) this.language = language;

    const rolls = formData.rolls || [];
    const totalPages = rolls.length;
    
    // Her roll için ayrı sayfa oluştur
    rolls.forEach((roll, index) => {
      const page = this.pdfDoc.addPage([595, 842]);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      let y = pageHeight - 60;

      // Header
      this.drawQualityControlHeader(page, pageWidth, y, formData);
      y -= 70;

      // Title
      const title = this.languageService.getText('qualityControlReport', this.language);
      page.drawText(title, {
        x: 55,
        y: y + 30,
        size: 20,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      y -= 30;

      // General Information (her sayfada tekrar)
      y = this.drawGeneralInfoSection(page, pageWidth, y, formData);
      y -= 30;

      // Sadece bu roll'un bilgilerini çiz
      y = this.drawRollInfo(page, pageWidth, y, roll);
      y = this.drawMeasurementsTable(page, pageWidth, y, roll);

      // Sayfa numarası ve TUANA yazıları (footer)
      this.drawFooter(page, pageWidth, index + 1, totalPages);
    });

    return this.pdfDoc;
  }

  async generate(formData) {
    await this.initialize();
    await this.createQualityControl(formData, this.language);
  }

  drawQualityControlHeader(page, pageWidth, y, formData) {
    this.drawSafeText(page, 'TUANA TEKSTIL', {
      x: 55,
      y: y - 5,
      size: 35,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    if (this.logoImage) {
      page.drawImage(this.logoImage, {
        x: pageWidth - 285,
        y: y - 5,
        width: 25,
        height: 25,
      });
    }

    // Ana çizgi (alt çizgi)
    page.drawLine({
      start: { x: 50, y: y - 15 },
      end: { x: pageWidth - 50, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    const currentDate = formData.date || new Date().toLocaleDateString('en-GB');
    const dateLabel = this.languageService.getText('date', this.language);
    page.drawText(`${dateLabel}: ${currentDate}`, {
      x: pageWidth - 145,
      y: y + 7,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi (date kutusunu ayıran)
    page.drawLine({
      start: { x: pageWidth - 150, y: y + 19 },
      end: { x: pageWidth - 150, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  drawGeneralInfoSection(page, pageWidth, y, formData) {
    const lineHeight = 12;

    // Türkçe için daha geniş X konumları
    const valueXPositions = this.language === 'tr' ? {
      articleCodeOur: 116,
      articleCodeClient: 155,
      orderNumber: 132,
      client: 94,
      composition: 92,
      weight: 91,
      width: 72
    } : { // İngilizce için orijinal konumlar
      articleCodeOur: 139,
      articleCodeClient: 148,
      orderNumber: 123,
      client: 89,
      composition: 115,
      weight: 91,
      width: 86
    };

    const fields = [
      { label: this.languageService.getText('articleCodeOur', this.language) + ':', value: formData['Article Code (Our)'] || '', valueX: valueXPositions.articleCodeOur },
      { label: this.languageService.getText('articleCodeClient', this.language) + ':', value: formData['Article Code (Client)'] || '', valueX: valueXPositions.articleCodeClient },
      { label: this.languageService.getText('orderNumber', this.language) + ':', value: formData['Order Number'] || '', valueX: valueXPositions.orderNumber },
      { label: this.languageService.getText('client', this.language) + ':', value: formData['Client'] || '', valueX: valueXPositions.client },
      { label: this.languageService.getText('composition', this.language) + ':', value: formData['Composition'] || '', valueX: valueXPositions.composition },
      { label: this.languageService.getText('weight', this.language) + ':', value: formData['Weight'] || '', valueX: valueXPositions.weight },
      { label: this.languageService.getText('width', this.language) + ':', value: formData['Width'] || '', valueX: valueXPositions.width },
    ];

    fields.forEach((field, index) => {
      const currentY = y - (index * lineHeight);

      page.drawText(field.label, {
        x: 55,
        y: currentY + 40,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      this.drawSafeText(page, field.value, {
        x: field.valueX,
        y: currentY + 40,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
    });

    const bottomY = y - (fields.length * lineHeight) + 40;

    page.drawLine({
      start: { x: 49, y: bottomY },
      end: { x: pageWidth - 49, y: bottomY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    return bottomY - 20;
  }

  drawRollsSection(page, pageWidth, y, formData) {
    const rolls = formData.rolls || [];
    let currentY = y;

    rolls.forEach((roll, index) => {
      currentY = this.drawRollInfo(page, pageWidth, currentY, roll);
      currentY = this.drawMeasurementsTable(page, pageWidth, currentY, roll);
      
      // İki roll arasında boşluk ekle (son roll hariç)
      if (index < rolls.length - 1) {
        currentY -= 90;
      }
    });

    return currentY;
  }

  drawRollInfo(page, pageWidth, y, roll) {
    let currentY = y;

    // Roll başlığı - border-only kutu: explicit beyaz dolgu ile çiz
    page.drawRectangle({
      x: 50,
      y: currentY - 2,
      width: pageWidth - 100,
      height: 45,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1), // açıkça beyaz dolgu — siyah oluşmasını önler
    });

    const rollNumberLabel = this.languageService.getText('rollNumber', this.language);
    page.drawText(`${rollNumberLabel}: ${roll['Roll Number'] || ''}`, {
      x: 55,
      y: currentY + 32,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentY -= 13;

    const batchNumberLabel = this.languageService.getText('batchNumber', this.language);
    page.drawText(`${batchNumberLabel} ${roll['Batch Number'] || ''}`, {
      x: 55,
      y: currentY + 31,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentY -= 12;

    const rollLengthLabel = this.languageService.getText('rollLength', this.language);
    const metersLabel = this.languageService.getText('metersLabel', this.language);
    page.drawText(`${rollLengthLabel}: ${roll['Roll Length'] || ''} ${metersLabel}`, {
      x: 55,
      y: currentY + 29,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentY -= 25;
    return currentY;
  }

  drawMeasurementsTable(page, pageWidth, y, roll) {
    const measurements = roll.measurements || [];
    const startX = 50;
    const tableWidth = pageWidth - 100;

    const columnWidths = {
      meter: 100,
      description: tableWidth - 100 - 80,
      point: 80,
    };

    let currentY = y + 5;

    // Başlık kutusu: beyaz dolgu ve border 
    page.drawRectangle({
      x: startX,
      y: currentY + 20,
      width: tableWidth,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(1, 1, 1), 
    });

    const meterLabel = this.languageService.getText('meter', this.language);
    page.drawText(meterLabel, {
      x: startX + 5,
      y: currentY + 25,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: startX + columnWidths.meter, y: currentY + 35 },
      end: { x: startX + columnWidths.meter, y: currentY + 20 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    const descriptionLabel = this.languageService.getText('description', this.language);
    page.drawText(descriptionLabel, {
      x: startX + columnWidths.meter + 5,
      y: currentY + 25,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: startX + columnWidths.meter + columnWidths.description, y: currentY + 35 },
      end: { x: startX + columnWidths.meter + columnWidths.description, y: currentY + 20 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    const pointLabel = this.languageService.getText('point', this.language);
    page.drawText(pointLabel, {
      x: startX + columnWidths.meter + columnWidths.description + 5,
      y: currentY + 25,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentY += 8;

    const rowHeight = 12;

    measurements.forEach((measurement, index) => {
      // Zebra arka plan: açık gri dolgu (beyaz yerine açık gri okunabilirlik sağlar)
      if (index % 2 === 0) {
        page.drawRectangle({
          x: startX,
          y: currentY,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.96, 0.96, 0.96),
          borderWidth: 0,
        });
      }

      // Satır çerçevesi: beyaz dolgu + border (beyaz doldurma siyah dolgu riskini keser)
      page.drawRectangle({
        x: startX,
        y: currentY,
        width: tableWidth,
        height: rowHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });

      // METER değeri (yazı baseline currentY + 4)
      this.drawSafeText(page, String(measurement['Meter'] || ''), {
        x: startX + 5,
        y: currentY + 4,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // Dikey bölme - METER | DESCRIPTION
      page.drawLine({
        start: { x: startX + columnWidths.meter, y: currentY + rowHeight },
        end: { x: startX + columnWidths.meter, y: currentY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // DESCRIPTION değeri
      this.drawSafeText(page, String(measurement['Description'] || ''), {
        x: startX + columnWidths.meter + 5,
        y: currentY + 4,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // Dikey bölme - DESCRIPTION | POINT
      page.drawLine({
        start: { x: startX + columnWidths.meter + columnWidths.description, y: currentY + rowHeight },
        end: { x: startX + columnWidths.meter + columnWidths.description, y: currentY },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      // POINT değeri
      this.drawSafeText(page, String(measurement['Point (1-4)'] || ''), {
        x: startX + columnWidths.meter + columnWidths.description + 5,
        y: currentY + 4,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      currentY -= rowHeight;
    });

    return currentY - 10;
  }

  drawFooter(page, pageWidth, currentPage, totalPages) {
    const y = 30; // Footer pozisyonu (sayfanın altından 30px yukarıda)
    
    // Sayfa numarası (sol alt köşe)
    page.drawText(`Page ${currentPage} of ${totalPages}`, {
      x: 55,
      y: y - 4,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // TUANA yazıları (merkez)
    const tuanaText = 'TUANA';
    const tuanaFont = this.tuanaFont || this.fontItalic;
    const textWidth = tuanaFont.widthOfTextAtSize(tuanaText, 8);
    const centerX = pageWidth / 2;
    
      page.drawLine({
      start: { x: 50, y: y + 4 },
      end: { x: pageWidth - 50, y: y + 4 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Normal TUANA yazısı (sol taraf)
    page.drawText(tuanaText, {
      x: centerX - textWidth + 222,
      y: y - 3,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
    });
    
    // Ters TUANA yazısı (sağ taraf) - 180 derece döndürülmüş
    page.drawText(tuanaText, {
      x: centerX + textWidth + 220,
      y: y + 3,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 180 },
    });
  }
}

module.exports = QualityControlTemplate;
