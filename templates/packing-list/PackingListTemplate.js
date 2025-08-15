const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class PackingListTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'en') {
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
      //console.log('HelveticaNeueLightItalic font not found, using default italic font');
      this.tuanaFont = this.fontItalic; // Fallback
    }
  }

  async createPackingList(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // PACKING LIST IÇIN ÖZEL HEADER (TUANA TEKSTIL + Logo + Invoice Date + Invoice Number)
    this.drawPackingListHeader(page, pageWidth, y, formData);
    y -= 70;

    // PACKING LIST başlığı - dil desteği ile
    const packingListTitle = this.languageService.getText('packingList', this.language);
    page.drawText(packingListTitle, {
      x: 55,
      y: y + 30,
      size: 20,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    y -= 10;

    // ISSUER, RECIPIENT ve DELIVERY ADDRESS bölümleri
    y = this.drawCompanyInfoSection(page, pageWidth, y, formData);
    y -= 30;

    // PACKING DETAILS tablosu
    y = this.drawPackingTable(page, pageWidth, y, formData);
    y -= 10;

    // FOOTER (Payment terms, notes, stamp) - dinamik pozisyon
    this.drawPackingListFooter(page, pageWidth, y, formData);

    return this.pdfDoc;
  }

  drawPackingListHeader(page, pageWidth, y, formData) {
    // TUANA TEKSTIL başlığı
    this.drawSafeText(page, 'TUANA TEKSTIL', {
      x: 55,
      y: y - 5,
      size: 35,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Logo
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
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Packing List Date (sağ üst köşe)
    const currentDate = new Date().toLocaleDateString('en-GB');
    const invoiceDateLabel = this.languageService.getText('invoiceDate', this.language);
    page.drawText(`${invoiceDateLabel}: ${currentDate}`, {
      x: pageWidth - 185,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Invoice Number (sağ üst köşe - tarihten bir satır yukarı)
    const invoiceNumber = formData['INVOICE NUMBER'] || 'INV-2025-001';
    const invoiceNumberLabel = this.languageService.getText('invoiceNumber', this.language);
    page.drawText(`${invoiceNumberLabel}: ${invoiceNumber}`, {
      x: pageWidth - 185,
      y: y + 5,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi
    page.drawLine({
      start: { x: pageWidth - 190, y: y + 25 },
      end: { x: pageWidth - 190, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  drawCompanyInfoSection(page, pageWidth, y, formData) {
    const startY = y;
    
    // ISSUER bölümü (üstte tek başına - merkezi)
    const issuerLabel = this.languageService.getText('issuer', this.language);
    page.drawText(issuerLabel, {
      x: 55,
      y: y + 25,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // ISSUER bilgileri
    const issuerInfo = [
      'TUANA TEKSTIL SANAYI VE TICARET LIMITED SIRKETI',
      'A3 BLOK NUMARA 53 TEKSTILKENT ESENLER',
      'ISTANBUL TURKEY 34235',
      `${this.languageService.getText('vatTax', this.language)}: ATISALANI TR8590068726`,
      `${this.languageService.getText('responsiblePerson', this.language)}: ${formData['RESPONSIBLE PERSON'] || formData.responsiblePerson || 'CENK YELMEN'}`,
      `${this.languageService.getText('telephone', this.language)}: ${formData.TELEPHONE || formData.telephone || '+90 333 234 45 38'}`,
      `${this.languageService.getText('email', this.language)}: ${formData.EMAIL || formData.email || 'CENK@TUANATEX.COM'}`
    ];

    let issuerY = y + 10;
    issuerInfo.forEach(info => {
      this.drawSafeText(page, info, {
        x: 55,
        y: issuerY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      issuerY -= 12;
    });

    // ISSUER'dan sonra boşluk bırak
    let nextSectionY = issuerY - 15;

    // RECIPIENT bölümü (sol tarafta)
    const recipientLabel = this.languageService.getText('recipient', this.language);
    page.drawText(recipientLabel, {
      x: 55,
      y: nextSectionY,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // RECIPIENT bilgilerini dinamik olarak çiz
    let recipientY = nextSectionY - 15;
    
    // Şirket adı
    this.drawSafeText(page, formData['RECIPIENT Şirket Adı'] || formData.recipientCompany || '---', {
      x: 55,
      y: recipientY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    recipientY -= 12;

    // Adres - dinamik sarma ile
    const recipientAddress = formData['RECIPIENT Adres'] || formData.recipientAddress || '---';
    const recipientAddressHeight = this.drawWrappedAddress(page, recipientAddress, {
      x: 55,
      y: recipientY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
      maxWidth: 250,
      lineHeight: 12
    });
    recipientY -= recipientAddressHeight;

    // İlçe, İl, Ülke bilgileri
    const recipientLocationInfo = formData['RECIPIENT İlçe İl Ülke'] || formData.recipientLocation || '---';
    this.drawSafeText(page, recipientLocationInfo, {
      x: 55,
      y: recipientY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    recipientY -= 12;

    // Diğer RECIPIENT bilgileri
    const recipientOtherInfo = [
      `${this.languageService.getText('vatTax', this.language)}: ${formData['RECIPIENT Vat'] || formData.recipientVat || ''}`,
      `${this.languageService.getText('responsiblePerson', this.language)}: ${formData['RECIPIENT Sorumlu Kişi'] || formData.recipientPerson || '---'}`,
      `${this.languageService.getText('telephone', this.language)}: ${formData['RECIPIENT Telefon'] || formData.recipientPhone || '---'}`,
      `${this.languageService.getText('email', this.language)}: ${formData['RECIPIENT Email'] || formData.recipientEmail || '---'}`
    ];

    recipientOtherInfo.forEach(info => {
      this.drawSafeText(page, info, {
        x: 55,
        y: recipientY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      recipientY -= 12;
    });

    // DELIVERY ADDRESS bölümü (sağ tarafta - RECIPIENT ile aynı seviyede)
    const deliveryAddressLabel = this.languageService.getText('deliveryAddress', this.language);
    page.drawText(deliveryAddressLabel, {
      x: 320,
      y: nextSectionY,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // DELIVERY ADDRESS bilgilerini dinamik olarak çiz
    let deliveryY = nextSectionY - 15;
    
    // Şirket adı
    this.drawSafeText(page, formData['DELIVERY ADDRESS Şirket Adı'] || formData.deliveryCompany || '---', {
      x: 320,
      y: deliveryY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    deliveryY -= 12;

    // Adres - dinamik sarma ile
    const deliveryAddress = formData['DELIVERY ADDRESS Adres'] || formData.deliveryAddress || '---';
    const deliveryAddressHeight = this.drawWrappedAddress(page, deliveryAddress, {
      x: 320,
      y: deliveryY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
      maxWidth: 250,
      lineHeight: 12
    });
    deliveryY -= deliveryAddressHeight;

    // İlçe, İl, Ülke bilgileri
    const deliveryLocationInfo = formData['DELIVERY ADDRESS İlçe İl Ülke'] || formData.deliveryLocation || '---';
    this.drawSafeText(page, deliveryLocationInfo, {
      x: 320,
      y: deliveryY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    deliveryY -= 12;

    // Diğer DELIVERY ADDRESS bilgileri
    const deliveryOtherInfo = [
      `${this.languageService.getText('vatTax', this.language)}: ${formData['DELIVERY ADDRESS Vat'] || formData.deliveryVat || '---'}`,
      `${this.languageService.getText('responsiblePerson', this.language)}: ${formData['DELIVERY ADDRESS Sorumlu Kişi'] || formData.deliveryPerson || '---'}`,
      `${this.languageService.getText('telephone', this.language)}: ${formData['DELIVERY ADDRESS Telefon'] || formData.deliveryPhone || '---'}`,
      `${this.languageService.getText('email', this.language)}: ${formData['DELIVERY ADDRESS Email'] || formData.deliveryEmail || '---'}`
    ];

    deliveryOtherInfo.forEach(info => {
      this.drawSafeText(page, info, {
        x: 320,
        y: deliveryY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      deliveryY -= 12;
    });

    return Math.min(recipientY, deliveryY) - 20;
  }

  drawPackingTable(page, pageWidth, y, formData) {
    // PACKING DETAILS üstünde çizgi
    page.drawLine({
      start: { x: 47, y: y + 50 },
      end: { x: pageWidth - 50, y: y + 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // PACKING DETAILS başlığı
    const packingDetailsTitle = this.languageService.getText('packingDetails', this.language);
    page.drawText(packingDetailsTitle, {
      x: 50,
      y: y + 37,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    y += 25;

    // Tablo başlıkları - Packing List için özel
    const tableHeaders = [
      { text: this.languageService.getText('articleNumberCompositionCustomsCode', this.language), x: 55, width: 140 },
      { text: this.languageService.getText('fabricWeightWidth', this.language), x: 200, width: 70 },
      { text: this.languageService.getText('quantityMeters', this.language), x: 270, width: 55 },
      { text: this.languageService.getText('rollNumberRollDimensions', this.language), x: 335, width: 70 },
      { text: this.languageService.getText('lot', this.language), x: 410, width: 30 },
      { text: this.languageService.getText('grossWeightKg', this.language), x: 445, width: 50 },
      { text: this.languageService.getText('netWeightKg', this.language), x: 495, width: 50 }
    ];

    // Başlık satırı arka planı
    page.drawRectangle({
      x: 50,
      y: y - 15,
      width: pageWidth - 105,
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Başlık metinleri
    tableHeaders.forEach(header => {
      // Uzun başlıkları sarma
      this.drawWrappedText(page, header.text, {
        x: header.x,
        y: y - 4,
        size: 6,
        font: this.fontBold,
        color: rgb(0, 0, 0),
        maxWidth: header.width - 5,
        lineHeight: 6
      });
    });

    // Dikey çizgiler başlık satırında
    const verticalLines = [195, 265, 330, 405, 440, 490];
    verticalLines.forEach(x => {
      page.drawLine({
        start: { x: x, y: y + 5 },
        end: { x: x, y: y - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    y -= 20;

    // Packing items - Frontend'den gelen packingItems array'ini kullan
    const packingItems = formData.packingItems || [
      {
        id: 1,
        'ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE': 'T-16487 BLAU 100% MODAL FABRIC (HS CODE 1111.11.11.11.11)',
        'FABRIC WEIGHT / WIDHT': '100 GR/M2 / 200 CM',
        'QUANTITY (METERS)': '400',
        'ROLL NUMBER ROLL DIMENSIONS': '1-5 / 150x200',
        'LOT': 'A001',
        'GROSS WEIGHT(KG)': '45.5',
        'NET WEIGHT (KG)': '42.0'
      }
    ];

    //console.log('Drawing packing table with data:', packingItems);

    let totalGrossWeight = 0;
    let totalNetWeight = 0;
    let totalQuantity = 0;
    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // Items per page
    const itemsPerPage = 11;
    for (let pageIndex = 0; pageIndex < Math.ceil(packingItems.length / itemsPerPage); pageIndex++) {
      const startIndex = pageIndex * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, packingItems.length);
      const pageItems = packingItems.slice(startIndex, endIndex);
      
      // Yeni sayfa gerekiyorsa oluştur (ilk sayfa hariç)
      if (pageIndex > 0) {
        currentPage = this.pdfDoc.addPage([595, 842]);
        pageNumber++;
        currentY = 750; // Yeni sayfa başlangıcı
        
        // Yeni sayfada tablo başlığı
        currentPage.drawLine({
          start: { x: 50, y: currentY + 50 },
          end: { x: pageWidth - 50, y: currentY + 50 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        const packingDetailsContinued = this.languageService.getText('packingDetails', this.language) + ' (Devamı)';
        currentPage.drawText(packingDetailsContinued, {
          x: 55,
          y: currentY + 35,
          size: 8,
          font: this.fontBold,
          color: rgb(0, 0, 0),
        });

        currentY += 25;

        // Başlık satırı arka planı
        currentPage.drawRectangle({
          x: 50,
          y: currentY - 15,
          width: pageWidth - 105,
          height: 20,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Başlık metinleri
        tableHeaders.forEach(header => {
          this.drawWrappedText(currentPage, header.text, {
            x: header.x,
            y: currentY - 4, // Başlıkları yukarı çıkar
            size: 6,
            font: this.fontBold,
            color: rgb(0, 0, 0),
            maxWidth: header.width - 5,
            lineHeight: 6
          });
        });

        // Dikey çizgiler başlık satırında
        verticalLines.forEach(x => {
          currentPage.drawLine({
            start: { x: x, y: currentY + 5 },
            end: { x: x, y: currentY - 15 },
            thickness: 1,
            color: rgb(0, 0, 0),
          });
        });

        currentY -= 20;
      }

      // Bu sayfadaki items'ları çiz
      pageItems.forEach((item, index) => {
        const rowHeight = 25; // Sabit satır yüksekliği
        
        // Satır arka planı
        currentPage.drawRectangle({
          x: 50,
          y: currentY - rowHeight + 5,
          width: pageWidth - 105,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Item bilgileri
        this.drawWrappedText(currentPage, item['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE'] || '', {
          x: 55,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 135,
          lineHeight: 7
        });

        this.drawSafeText(currentPage, item['FABRIC WEIGHT / WIDHT'] || '', {
          x: 200,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['QUANTITY (METERS)'] || '', {
          x: 270,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawWrappedText(currentPage, item['ROLL NUMBER ROLL DIMENSIONS'] || '', {
          x: 335,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 65,
          lineHeight: 7
        });

        this.drawSafeText(currentPage, item['LOT'] || '', {
          x: 410,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['GROSS WEIGHT(KG)'] || '', {
          x: 445,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['NET WEIGHT (KG)'] || '', {
          x: 500,
          y: currentY - 5,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // Dikey çizgiler
        verticalLines.forEach(lineX => {
          currentPage.drawLine({
            start: { x: lineX, y: currentY + 5 },
            end: { x: lineX, y: currentY - rowHeight + 5 },
            thickness: 1,
            color: rgb(0, 0, 0),
          });
        });

        // Toplam hesaplamaları
        const grossWeight = parseFloat((item['GROSS WEIGHT(KG)'] || '0').replace(',', '.'));
        totalGrossWeight += grossWeight;
        
        const netWeight = parseFloat((item['NET WEIGHT (KG)'] || '0').replace(',', '.'));
        totalNetWeight += netWeight;
        
        const quantity = parseFloat((item['QUANTITY (METERS)'] || '0').replace(',', '.'));
        totalQuantity += quantity;
        
        currentY -= rowHeight;

        // Sayfa numarası ekle (her sayfaya)
        currentPage.drawText(pageNumber.toString(), {
          x: pageWidth / 2,
          y: 30,
          size: 12,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      });
    }

    // TOTAL AMOUNTS - sadece son sayfada
    currentPage.drawRectangle({
      x: 50,
      y: currentY - 15,
      width: pageWidth - 105,
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const totalLabel = this.languageService.getText('total', this.language);
    currentPage.drawText(totalLabel, {
      x: 55,
      y: currentY - 10,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // ROLL NUMBER ROLL DIMENSIONS sütununda toplam satır sayısı
    const rollsText = this.languageService.getText('rolls', this.language);
    currentPage.drawText(`${packingItems.length} ${rollsText}`, {
      x: 335,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    const metersText = this.languageService.getText('meters', this.language);
    currentPage.drawText(totalQuantity.toFixed(2).replace('.', ',') + ' ' + metersText, {
      x: 269,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    const kgText = this.languageService.getText('kg', this.language);
    currentPage.drawText(totalGrossWeight.toFixed(2).replace('.', ',') + ' ' + kgText, {
      x: 445,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    const kgsText = this.languageService.getText('kgs', this.language);
    currentPage.drawText(totalNetWeight.toFixed(2).replace('.', ',') + ' ' + kgsText, {
      x: 495,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Son dikey çizgiler toplam satırında
    verticalLines.forEach(x => {
      currentPage.drawLine({
        start: { x: x, y: currentY + 5 },
        end: { x: x, y: currentY - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    currentY -= 20;

    return currentY + 10;
  }

  // Uzun metinleri sarma metodu
  drawWrappedText(page, text, options) {
    if (!text) return;
    
    const { x, y, size, font, color, maxWidth, lineHeight = 8, maxLines = 2 } = options;
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    let lineCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && currentLine) {
        // Mevcut satırı çiz
        page.drawText(currentLine, {
          x: x,
          y: currentY,
          size: size,
          font: font,
          color: color,
        });
        
        // Yeni satıra geç
        currentLine = words[i];
        currentY -= lineHeight;
        lineCount++;
        
        // Maksimum satır sayısı ile sınırla
        if (lineCount >= maxLines) {
          if (i < words.length - 1) {
            currentLine += '...';
          }
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Son satırı çiz
    if (currentLine) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size: size,
        font: font,
        color: color,
      });
    }
  }

  // Adres alanları için özel sarma metodu - yükseklik döndürür
  drawWrappedAddress(page, text, options) {
    if (!text) return 12; // Varsayılan tek satır yüksekliği
    
    const { x, y, size, font, color, maxWidth, lineHeight = 12 } = options;
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    let lineCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && currentLine) {
        // Mevcut satırı çiz
        page.drawText(currentLine, {
          x: x,
          y: currentY,
          size: size,
          font: font,
          color: color,
        });
        
        // Yeni satıra geç
        currentLine = words[i];
        currentY -= lineHeight;
        lineCount++;
        
        // Maksimum 3 satır ile sınırla adresler için
        if (lineCount >= 3) {
          if (i < words.length - 1) {
            currentLine += '...';
          }
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Son satırı çiz
    if (currentLine) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size: size,
        font: font,
        color: color,
      });
    }
    
    // Kullanılan toplam yüksekliği döndür
    return (lineCount + 1) * lineHeight;
  }

  drawPackingListFooter(page, pageWidth, startY = null, formData = {}) {
    // Dinamik pozisyon kullan veya varsayılan değer - 50px aşağı kaydırıldı
    let y = startY ? Math.min(startY - 30, 130) : 130;
    
    // Minimum footer pozisyonu (sayfa altından 170px yukarıda) - 50px aşağı kaydırıldı
    const minFooterY = 30;
    if (y < minFooterY) {
      y = minFooterY;
    }
    
    // Ana çizgi
    page.drawLine({
      start: { x: 50, y: y+5 },
      end: { x: pageWidth - 50, y: y+5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Alt çizgi
    page.drawLine({
      start: { x: 50, y: y - 5 },
      end: { x: pageWidth - 50, y: y - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // İki çizgi arasına TUANA yazısı - normal ve ters
    const tuanaText = 'TUANA';
    const tuanaFont = this.tuanaFont || this.fontItalic; // HelveticaNeueLightItalic kullan
    const textWidth = tuanaFont.widthOfTextAtSize(tuanaText, 8);
    const centerX = pageWidth / 2;
    
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

    y -= 20;

    // Transport ve diğer bilgiler
    const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
    const transportTypeLabel = this.languageService.getText('transportType', this.language);
    const countryOfOriginLabel = this.languageService.getText('countryOfOrigin', this.language);
    
    // Payment terms value translation
    const paymentTermsValue = formData['Payment Terms'] || formData.paymentTerms || '90 Days';
    const translatedPaymentTerms = this.languageService.getText('paymentTermsValues', this.language)?.[paymentTermsValue] || paymentTermsValue;
    
    const footerInfo = [
      `${paymentTermsLabel}: ${translatedPaymentTerms}`,
      `${transportTypeLabel}: ${formData['Transport Type'] || formData.transportType || 'CIF, FOB, EXW, DAP'}`,
      `${countryOfOriginLabel}: ${formData['Country of Origin'] || formData.countryOfOrigin || 'TURKEY'}`
    ];

    let footerY = y;
    footerInfo.forEach(info => {
      page.drawText(info, {
        x: 55,
        y: footerY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      footerY -= 12;
    });

    // NOTES bölümü - SIGNATURE yerine
    const notesLabel = this.languageService.getText('notes', this.language);
    page.drawText(notesLabel, {
      x: 215,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Notes içeriği - frontend'den gelen notes alanını kullan
    let notesY = y - 10;
    if (formData['Notlar'] && formData['Notlar'].trim()) {
      // Notları metin sarma ile ekle
      this.drawWrappedText(page, formData['Notlar'].trim(), {
        x: 215,
        y: notesY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
        maxWidth: 170, // NOTES bölümünün genişliği (390 - 215 = 175, 5px margin)
        lineHeight: 10,
        maxLines: 4 // NOTES alanı için maksimum 4 satır
      });
    } else if (formData.notes && Array.isArray(formData.notes)) {
      // Fallback: eski array formatını da destekle
      const notesText = formData.notes.join(' ');
      this.drawWrappedText(page, notesText, {
        x: 215,
        y: notesY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
        maxWidth: 170,
        lineHeight: 10,
        maxLines: 4
      });
    } else if (formData.notes && typeof formData.notes === 'string') {
      // String formatında notes
      this.drawWrappedText(page, formData.notes.trim(), {
        x: 215,
        y: notesY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
        maxWidth: 170,
        lineHeight: 10,
        maxLines: 4
      });
    }

    const stampLabel = this.languageService.getText('stamp', this.language);
    page.drawText(stampLabel, {
      x: 395,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgiler
    page.drawLine({
      start: { x: 210, y: y + 15 },
      end: { x: 210, y: y - 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: 390, y: y + 15 },
      end: { x: 390, y: y - 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Sayfa numarası (eğer henüz eklenmemişse)
    page.drawText('1', {
      x: pageWidth / 2,
      y: 30,
      size: 12,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }
}

module.exports = PackingListTemplate;
