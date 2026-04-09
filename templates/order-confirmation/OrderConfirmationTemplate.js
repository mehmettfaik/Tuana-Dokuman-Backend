const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class OrderConfirmationTemplate extends BasePdfTemplate {
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
      this.tuanaFont = this.fontItalic; 
    }
  }

  /**
   * @param {number} number - Formatlanacak sayı
   * @returns {string} - Türkçe formatlanmış sayı
   */
  formatTurkishNumber(number) {
    if (!number && number !== 0) return '';
    
    const numericValue = typeof number === 'string' ? parseFloat(number.replace(',', '.')) : number;
    if (isNaN(numericValue)) return '';
    
    // Türkçe locale ile formatla
    return numericValue.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  async createOrderConfirmation(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; 

    // ORDER CONFIRMATION IÇIN ÖZEL HEADER (TUANA TEKSTIL + Logo + Order Confirmation Date + Order Confirmation Number)
    this.drawOrderConfirmationHeader(page, pageWidth, y, formData);
    y -= 70;

    // ORDER CONFIRMATION başlığı - dil desteği ile
    const orderConfirmationTitle = this.languageService.getText('orderConfirmation', this.language);
    page.drawText(orderConfirmationTitle, {
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

    // DESCRIPTION OF GOODS tablosu
    y = this.drawGoodsTable(page, pageWidth, y, formData);
    
    // SABİT POZİSYONLAR - Dinamik hesaplama yok
    this.drawFrontendNotesSection(page, pageWidth, 300, formData);

    // NOTES AND GENERAL CONDITIONS bölümü - SABİT POZİSYON  
    this.drawNotesSection(page, pageWidth, 220, formData);
    
    // Sonraki bölümler için sabit Y değeri
    y = 80;

    // KUR BİLGİSİ ve BANKA BİLGİLERİ bölümü (varsa)
    y = this.drawCurrencyAndBankInfoSection(page, pageWidth, y, formData);
    y -= 30;

    // FOOTER (Payment terms, signature, stamp) 
    this.drawOrderConfirmationFooter(page, pageWidth, y, formData);

    return this.pdfDoc;
  }

  drawOrderConfirmationHeader(page, pageWidth, y, formData) {
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

    // Order Confirmation Date
    const currentDate = new Date().toLocaleDateString('en-GB');
    const orderConfirmationDateLabel = this.languageService.getText('orderConfirmationDate', this.language);
    page.drawText(`${orderConfirmationDateLabel}: ${currentDate}`, {
      x: pageWidth - 205,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Order Confirmation Number
    const orderConfirmationNumber = formData['ORDER CONFIRMATION NUMBER'] || 'OC-2025-001';
    const orderConfirmationNumberLabel = this.languageService.getText('orderConfirmationNumber', this.language);
    page.drawText(`${orderConfirmationNumberLabel}: ${orderConfirmationNumber}`, {
      x: pageWidth - 205,
      y: y + 5,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgi
    page.drawLine({
      start: { x: pageWidth - 210, y: y + 25 },
      end: { x: pageWidth - 210, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  drawCompanyInfoSection(page, pageWidth, y, formData) {
    const startY = y;
    
    // ISSUER bölümü
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

    // ISSUER'dan sonra boşluk
    let nextSectionY = issuerY - 15;

    // RECIPIENT bölümü
    const recipientLabel = this.languageService.getText('recipient', this.language);
    page.drawText(recipientLabel, {
      x: 55,
      y: nextSectionY,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // RECIPIENT bilgilerini dinamik
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

    // İlçe, İl, Ülke bilgileri - yeni satır
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
      `${this.languageService.getText('vatTax', this.language)}: ${formData['RECIPIENT Vat'] || formData.recipientVat || '---'}`,
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

    // DELIVERY ADDRESS bölümü
    const deliveryAddressLabel = this.languageService.getText('deliveryAddress', this.language);
    page.drawText(deliveryAddressLabel, {
      x: 320,
      y: nextSectionY,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // DELIVERY ADDRESS bilgilerini dinamik
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

    // İlçe, İl, Ülke bilgileri - yeni satır
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

  drawGoodsTable(page, pageWidth, y, formData) {
    // DESCRIPTION OF GOODS üstünde çizgi
    page.drawLine({
      start: { x: 47, y: y + 50 },
      end: { x: pageWidth - 50, y: y + 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // DESCRIPTION OF GOODS başlığı
    const descriptionOfGoodsLabel = this.languageService.getText('descriptionOfGoods', this.language);
    page.drawText(descriptionOfGoodsLabel, {
      x: 50,
      y: y + 37,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    y += 25;

    // Tablo başlıkları
    const tableHeaders = [
      { text: this.languageService.getText('articleNumber', this.language), x: 55, width: 200 },
      { text: this.languageService.getText('weightWidth', this.language), x: 260, width: 90 },
      { text: this.languageService.getText('quantityMeters', this.language), x: 355, width: 75 },
      { text: this.languageService.getText('price', this.language), x: 435, width: 40 },
      { text: this.languageService.getText('amount', this.language), x: 480, width: 40 }
    ];

    // Tablo dış çerçevesi başlangıcı
    const tableStartY = y;
    
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
      page.drawText(header.text, {
        x: header.x,
        y: y - 10,
        size: 6,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
    });

    // Dikey çizgiler başlık satırında
    const verticalLines = [255, 350, 430, 475];
    verticalLines.forEach(x => {
      page.drawLine({
        start: { x: x, y: y + 5 },
        end: { x: x, y: y - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    y -= 20;

    // Ürün satırları - Frontend'den gelen goods array'ini kullan
    const goods = formData.goods || [
      {
        id: 1,
        'ARTICLE NUMBER': 'T-16487 BLAU 100% MODAL FABRIC (HS CODE 1111.11.11.11.11)',
        'WEIGHT / WIDHT': '100 GR/M2 / 200 CM',
        'QUANTITY (METERS)': '400',
        'PRICE': '5,00',
        'AMOUNT': '2000,00'
      },
      {
        id: 2,
        'ARTICLE NUMBER': 'T-16487 BLAU 100% MODAL FABRIC',
        'WEIGHT / WIDHT': '100 GR/M2 / 200 CM',
        'QUANTITY (METERS)': '400',
        'PRICE': '5,00',
        'AMOUNT': '2000,00'
      }
    ];

    let totalAmount = 0;
    let totalQuantity = 0;
    let totalCurrency = 'EUR'; 
    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // İlk sayfada 7 ürün, diğer sayfalarda 27 ürün
    let processedItems = 0;
    let pageIndex = 0;
    
    while (processedItems < goods.length) {
      // İlk sayfa için 7 ürün, diğer sayfalar için 27 ürün
      const itemsPerPage = pageIndex === 0 ? 6 : 27;
      const startIndex = processedItems;
      const endIndex = Math.min(startIndex + itemsPerPage, goods.length);
      const pageGoods = goods.slice(startIndex, endIndex);
      
      processedItems = endIndex;
      
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

        const descriptionOfGoodsContinuedLabel = this.languageService.getText('descriptionOfGoodsContinued', this.language);
        currentPage.drawText(descriptionOfGoodsContinuedLabel, {
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
          currentPage.drawText(header.text, {
            x: header.x,
            y: currentY - 10,
            size: 6,
            font: this.fontBold,
            color: rgb(0, 0, 0),
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

      // Bu sayfadaki ürünleri çiz
      pageGoods.forEach((good, index) => {
        // ARTICLE NUMBER için gerekli satır sayısını hesapla
        const articleText = good['ARTICLE NUMBER'] || '';
        const words = articleText.split(' ');
        let lineCount = 1;
        let currentLine = '';
        
        for (let word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = this.font.widthOfTextAtSize(testLine, 8);
          
          if (textWidth > 195 && currentLine) {
            lineCount++;
            currentLine = word;
            if (lineCount >= 2) break;
          } else {
            currentLine = testLine;
          }
        }
        
        // Dinamik satır yüksekliği (minimum 20, uzun metinler için daha fazla)
        const rowHeight = Math.max(20, lineCount * 12 + 8);
        
        // Satır arka planı
        currentPage.drawRectangle({
          x: 50,
          y: currentY - rowHeight + 5,
          width: pageWidth - 105,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Ürün bilgileri
        this.drawWrappedText(currentPage, good['ARTICLE NUMBER'] || '', {
          x: 55,
          y: currentY - 10,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 195,
          lineHeight: 10
        });

        this.drawSafeText(currentPage, good['WEIGHT / WIDHT'] || '', {
          x: 260,
          y: currentY - 10,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, good['QUANTITY (METERS)'] || '', {
          x: 355,
          y: currentY - 10,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, good['PRICE'] || '', {
          x: 435,
          y: currentY - 10,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // AMOUNT (currency ile birlikte)
        const currency = good['CURRENCY'] || 'EUR';
        const amountValue = good['AMOUNT'] || '';
        const displayAmount = amountValue ? `${amountValue} ${currency}` : '';
        
        this.drawSafeText(currentPage, displayAmount, {
          x: 480,
          y: currentY - 10,
          size: 7,
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
        const amount = parseFloat((good['AMOUNT'] || '0').replace(',', '.'));
        totalAmount += amount;
        
        const quantity = parseFloat((good['QUANTITY (METERS)'] || '0').replace(',', '.'));
        totalQuantity += quantity;
        
        // Currency bilgisini al (ilk ürünün currency'sini kullan)
        if (!totalCurrency || totalCurrency === 'EUR') {
          totalCurrency = good['CURRENCY'] || 'EUR';
        }
        
        currentY -= rowHeight;
      });

      // Sayfa numarası ekle (her sayfaya)
      currentPage.drawText(pageNumber.toString(), {
        x: pageWidth / 2,
        y: 30,
        size: 12,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      
      pageIndex++;
    }

    // TOTAL AMOUNT - sadece son sayfada
    currentPage.drawRectangle({
      x: 50,
      y: currentY - 15,
      width: pageWidth - 105, 
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const totalAmountLabel = this.languageService.getText('totalAmount', this.language);
    currentPage.drawText(totalAmountLabel, {
      x: 55,
      y: currentY - 10,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(`${this.formatTurkishNumber(totalQuantity)} ${"MT"}`, {
      x: 355,
      y: currentY - 10,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(`${this.formatTurkishNumber(totalAmount)} ${totalCurrency}`, {
      x: 480,
      y: currentY - 10,
      size: 7,
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

    // KDV hesaplama (sadece son sayfada)
    const kdvEnabled = formData['KDV Ekle Enabled'];
    const kdvOrani = parseFloat(formData['KDV'] || 0);
    if (kdvEnabled && kdvOrani > 0) {
      // KDV satırı - tablo formatında
      currentPage.drawRectangle({
        x: 50,
        y: currentY - 15,
        width: pageWidth - 105,
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // KDV yazısı ve oranı - QUANTITY sütununda
      const vatLabel = this.languageService.getText('vat', this.language);
      currentPage.drawText(`% ${kdvOrani} ${vatLabel}`, {
        x: 355,
        y: currentY - 10,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // KDV tutarı - AMOUNT sütununda
      const kdvTutari = (totalAmount * kdvOrani) / 100;
      currentPage.drawText(this.formatTurkishNumber(kdvTutari), {
        x: 480,
        y: currentY - 10,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // Sadece gerekli dikey çizgiler
      const kdvVerticalLines = [350, 475]; 
      kdvVerticalLines.forEach(x => {
        currentPage.drawLine({
          start: { x: x, y: currentY + 5 },
          end: { x: x, y: currentY - 15 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      });

      currentY -= 20;

      // GENEL TOPLAM satırı - tablo formatında
      currentPage.drawRectangle({
        x: 50,
        y: currentY - 15,
        width: pageWidth - 105, 
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const generalTotalLabel = this.languageService.getText('generalTotal', this.language);
      currentPage.drawText(generalTotalLabel, {
        x: 355,
        y: currentY - 10,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      const genelToplam = totalAmount + kdvTutari;
      currentPage.drawText(this.formatTurkishNumber(genelToplam), {
        x: 480,
        y: currentY - 10,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      // Sadece gerekli dikey çizgiler GENEL TOPLAM satırında
      const genelToplamVerticalLines = [350, 475];
      genelToplamVerticalLines.forEach(x => {
        currentPage.drawLine({
          start: { x: x, y: currentY + 5 },
          end: { x: x, y: currentY - 15 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      });

      currentY -= 20;

      // KUR BİLGİSİ'ni son sayfada GENEL TOPLAM ile aynı seviyede
      this.drawCurrencyInfo(currentPage, currentY + 10, formData);
    } else {
      // KDV yoksa da KUR BİLGİSİ'ni son sayfada TOTAL AMOUNT'un altında
      this.drawCurrencyInfo(currentPage, currentY - 10, formData);
    }

    return currentY + 10;
  }

  // Uzun metinleri sarma metodu
  drawWrappedText(page, text, options) {
    if (!text) return;
    
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
        
        // Maksimum 2 satır ile sınırla
        if (lineCount >= 2) {
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
    const maxLines = options.maxLines || 3;
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
        
        // Maksimum satır sayısını caller belirtebilir (adresler için default 3)
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
    
    // Kullanılan toplam yüksekliği döndür
    return (lineCount + 1) * lineHeight;
  }

  // Frontend'den gelen notlar için ayrı NOTES bölümü - SABİT POZİSYON
  drawFrontendNotesSection(page, pageWidth, fixedY, formData) {
    // Frontend'den gelen Notlar alanı varsa çiz
    if (!formData['Notlar'] || !formData['Notlar'].trim()) {
      return; 
    }

    // SABİT POZİSYON
    const startY = 340;

    // NOTES üstünde çizgi - SABİT POZİSYON
    page.drawLine({
      start: { x: 50, y: startY },
      end: { x: pageWidth - 50, y: startY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // NOTES başlığı - SABİT POZİSYON
    const notesLabel = this.languageService.getText('note', this.language);
    page.drawText(notesLabel, {
      x: 55,
      y: startY - 10,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // NOTES içeriği - SABİT POZİSYON
    let noteContentY = startY - 20;
    const notLines = formData['Notlar'].split('\n');
    let totalLineCount = 0;
    
    notLines.forEach(line => {
      if (line.trim() && totalLineCount < 8 && noteContentY > 240) { // Maksimum 8 toplam satır (sarılmış dahil)
        // Her bir satırı sarmalı metin olarak çiz
        const beforeY = noteContentY;
        this.drawWrappedNotesText(page, line.trim(), {
          x: 55,
          y: noteContentY,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: pageWidth - 110,
          lineHeight: 10,
          maxLines: 8 - totalLineCount 
        });
        
        // Kullanılan satır sayısını hesapla
        const usedLines = Math.ceil((beforeY - noteContentY + 10) / 10);
        totalLineCount += usedLines;
        noteContentY -= (usedLines * 10) + 2;
      }
    });
  }

  // Notlar için özel sarma metodu - maksimum satır sayısını dikkate alır
  drawWrappedNotesText(page, text, options) {
    if (!text) return;
    
    const { x, y, size, font, color, maxWidth, lineHeight = 10, maxLines = 8 } = options;
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
        
        // Maksimum satır sayısını aş
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
    if (currentLine && lineCount < maxLines) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size: size,
        font: font,
        color: color,
      });
    }
  }

  // Kur bilgisi ve banka bilgileri bölümü
  drawCurrencyAndBankInfoSection(page, pageWidth, y, formData) {
    // Sadece BANKA BİLGİLERİ için sabit pozisyon
    let currentY = 215;
    const leftColumnX = 55;
    const bankaBilgileri = formData['Banka Bilgileri'];
    
    // Sadece BANKA BİLGİLERİ'ni çiz - sabit pozisyonda
    if (bankaBilgileri) {
      // BANKA BİLGİLERİ başlığı
      const bankInformationsLabel = this.languageService.getText('bankInformations', this.language);
      page.drawText(bankInformationsLabel, {
        x: leftColumnX,
        y: currentY,
        size: 10,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      currentY -= 15;

      // Banka hesap bilgilerini al
      const bankaHesapBilgileri = this.getBankAccountInfo(bankaBilgileri);
      
      if (bankaHesapBilgileri) {
        const bankaLines = bankaHesapBilgileri.split('\n');
        bankaLines.forEach(line => {
          if (line.trim()) {
            this.drawSafeText(page, line.trim(), {
              x: leftColumnX,
              y: currentY,
              size: 8,
              font: this.font,
              color: rgb(0, 0, 0),
            });
            currentY -= 12;
          }
        });
      }
    }

    return 170;
  }

  // KUR BİLGİSİ'ni dinamik pozisyonda çizen ayrı metod
  drawCurrencyInfo(targetPage, y, formData) {
    const kurBilgisiEnabled = formData['Kur Bilgisi Enabled'];
    const kurBilgisi = formData['Kur Bilgisi'];
    
    if (kurBilgisiEnabled && kurBilgisi) {
      // KUR BİLGİSİ başlığı ve değeri yan yana - sol başlangıçta
      const currencyInfoLabel = this.languageService.getText('currencyInfo', this.language);
      targetPage.drawText(`${currencyInfoLabel}:`, {
        x: 55, 
        y: y, 
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      // Kur bilgisi değeri - yanında
      this.drawSafeText(targetPage, kurBilgisi, {
        x: 135,
        y: y,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Banka hesap bilgilerini döndüren yardımcı metod
//   getBankAccountInfo(currency) {
//     const bankAccounts = {
//       'TRY': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
// TEB (TÜRKIYE EKONOMI BANKASI)
// ŞUBE: MERTER (032)
// HESAP NO: 962246
// IBAN :TR78 0003 2000 0320 0000 9622 46`,
      
//       'USD': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
// TEB (TURKIYE EKONOMI BANKASI)
// BRANCH: MERTER (032)
// ACCOUNT NO: 967978
// IBAN: TR29 0003 2000 0320 0000 9679 78
// SWIFT: TEBUTRIS 032`,
      
//       'EUR': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
// TEB (TURKIYE EKONOMI BANKASI)
// BRANCH: MERTER (032)
// ACCOUNT NO: 967979
// IBAN: TR02 0003 2000 0320 0000 9679 79
// SWIFT: TEBUTRIS 032`
//     };

//     return bankAccounts[currency] || '';
//   }

  drawNotesSection(page, pageWidth, fixedY, formData) {
    const startY = 310;
    
    // NOTES AND GENERAL CONDITIONS üstünde çizgi - SABİT POZİSYON
    page.drawLine({
      start: { x: 50, y: startY-5 },
      end: { x: pageWidth - 50, y: startY-5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // NOTES AND GENERAL CONDITIONS başlığı - SABİT POZİSYON
    const notesAndConditionsLabel = this.languageService.getText('generalConditions', this.language) || 'NOTES AND GENERAL CONDITIONS';
    page.drawText(notesAndConditionsLabel, {
      x: 55,
      y: startY - 15,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    let noteY = startY - 30;
    
    // Order Confirmation notes içeriği - dil desteği ile
    const orderConfirmationNotes = this.languageService.getText('orderConfirmationNotes', this.language) || [];

    orderConfirmationNotes.forEach((line, index) => {
      // Eğer satır rakamla başlıyorsa (yeni madde), ekstra boşluk ekle
      if (line.match(/^\d+\./)) {
        if (index > 0) { // İlk madde için ekstra boşluk ekleme
          noteY -= 3; // Maddeler arası ekstra boşluk
        }
      }
      
      this.drawSafeText(page, line, {
        x: 55,
        y: noteY,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      noteY -= 10;
    });

    // NOTES AND GENERAL CONDITIONS altında çizgi - SABİT POZİSYON
   
  }

  drawOrderConfirmationFooter(page, pageWidth, startY = null, formData = {}) {
    // Dinamik pozisyon kullan veya varsayılan değer
    let y = startY ? Math.min(startY - 30, 200) : 200;
    
    const minFooterY = 120;
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
    const tuanaFont = this.tuanaFont || this.fontItalic; 
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

    // Payment terms ve diğer bilgiler
    const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
    const transportTypeLabel = this.languageService.getText('transportType', this.language);
    const countryOfOriginLabel = this.languageService.getText('countryOfOrigin', this.language);
    const grossWeightLabel = this.languageService.getText('grossWeight', this.language);
    const netWeightLabel = this.languageService.getText('netWeight', this.language);
    const rollsLabel = this.languageService.getText('rolls', this.language);
    const leadTimeLabel = this.languageService.getText('leadTime', this.language);
    
    // Dinamik payment & shipping details
    const footerInfo = this.buildPaymentShippingDetails(formData);

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

    // Signature ve Stamp bölümleri
    const signatureLabel = this.languageService.getText('signature', this.language);
    page.drawText(signatureLabel, {
      x: 215,
      y: y,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    const stampLabel = this.languageService.getText('stamp', this.language);
    page.drawText(stampLabel, {
      x: 395,
      y: y,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgiler
    page.drawLine({
      start: { x: 210, y: y + 15 },
      end: { x: 210, y: y - 80 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: 390, y: y + 15 },
      end: { x: 390, y: y - 80 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Sayfa numarası
    page.drawText('1', {
      x: pageWidth / 2,
      y: 30,
      size: 12,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }

  /**
   * Generate metodu - PDF oluşturmak için ana metod
   * @param {Object} formData - Form verileri
   * @returns {Promise}
   */
  async generate(formData) {
    await this.initialize();
    await this.createOrderConfirmation(formData, this.language);
  }
  /**
   * PAYMENT & SHIPPING DETAILS alanlarını dinamik olarak oluştur
   * @param {Object} formData - Form verileri
   * @returns {Array} Dolu olan alanlar
   */
  buildPaymentShippingDetails(formData) {
    const fields = [];

    // PAYMENT TERMS
    const paymentTermsValue = formData['Payment Terms'] || formData.paymentTerms || '';
    if (paymentTermsValue.trim()) {
      const translatedPaymentTerms = this.languageService.getText('paymentTermsValues', this.language)?.[paymentTermsValue] || paymentTermsValue;
      const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
      fields.push(`${paymentTermsLabel}: ${translatedPaymentTerms}`);
    }

    // TRANSPORT TYPE
    const transportTypeValue = formData['Transport Type'] || formData.transportType || '';
    if (transportTypeValue.trim()) {
      const transportTypeLabel = this.languageService.getText('transportType', this.language);
      fields.push(`${transportTypeLabel}: ${transportTypeValue}`);
    }

    // COUNTRY OF ORIGIN
    const countryOfOriginValue = formData['Country of Origin'] || formData.countryOfOrigin || '';
    if (countryOfOriginValue.trim()) {
      const countryOfOriginLabel = this.languageService.getText('countryOfOrigin', this.language);
      fields.push(`${countryOfOriginLabel}: ${countryOfOriginValue}`);
    }

    // GROSS WEIGHT
    const grossWeightValue = formData['Gross Weight'] || formData.grossWeight || '';
    if (grossWeightValue.trim()) {
      const grossWeightLabel = this.languageService.getText('grossWeight', this.language);
      fields.push(`${grossWeightLabel}: ${grossWeightValue}`);
    }

    // NET WEIGHT
    const netWeightValue = formData['Net Weight'] || formData.netWeight || '';
    if (netWeightValue.trim()) {
      const netWeightLabel = this.languageService.getText('netWeight', this.language);
      fields.push(`${netWeightLabel}: ${netWeightValue}`);
    }

    // ROLLS
    const rollsValue = formData['Rolls'] || formData.rolls || '';
    if (rollsValue.trim()) {
      const rollsLabel = this.languageService.getText('rolls', this.language);
      fields.push(`${rollsLabel}: ${rollsValue}`);
    }

    // LEAD TIME
    const leadTimeValue = formData['Lead Time'] || formData.leadTime || '';
    if (leadTimeValue.trim()) {
      const leadTimeLabel = this.languageService.getText('leadTime', this.language);
      fields.push(`${leadTimeLabel}: ${leadTimeValue}`);
    }

    return fields;
  }
}

module.exports = OrderConfirmationTemplate;
