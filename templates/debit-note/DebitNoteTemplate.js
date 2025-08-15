const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class DebitNoteTemplate extends BasePdfTemplate {
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

  async createDebitNote(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // DEBIT NOTE IÇIN ÖZEL HEADER (TUANA TEKSTIL + Logo + Debit Note Date)
    this.drawDebitNoteHeader(page, pageWidth, y, formData);
    y -= 70;

    // DEBIT NOTE başlığı - dil desteği ile
    const debitNoteTitle = this.languageService.getText('debitNote', this.language);
    page.drawText(debitNoteTitle, {
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
    y -= 10; // KDV sonrası minimal boşluk

    // NOTES bölümü
    y = this.drawNotesSection(page, pageWidth, y, formData);
    y -= 40; // NOTES'tan sonra daha fazla boşluk

    // KUR BİLGİSİ ve BANKA BİLGİLERİ bölümü (varsa)
    y = this.drawCurrencyAndBankInfoSection(page, pageWidth, y, formData);
    y -= 30;

    // FOOTER (Payment terms, signature, stamp) - dinamik pozisyon
    this.drawDebitNoteFooter(page, pageWidth, y, formData);

    return this.pdfDoc;
  }

  drawDebitNoteHeader(page, pageWidth, y, formData) {
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

    // Debit Note Date ve Numbers (sağ üst köşe)
    const currentDate = new Date().toLocaleDateString('en-GB');
    const debitNoteDateLabel = this.languageService.getText('debitNoteDate', this.language);
    page.drawText(`${debitNoteDateLabel}: ${currentDate}`, {
      x: pageWidth - 183,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Invoice Number ve Debit Note Number bilgileri
    const invoiceNumberLabel = this.languageService.getText('invoiceNumber', this.language);
    page.drawText(`${invoiceNumberLabel}: ${formData['INVOICE NUMBER'] || ''}`, {
      x: pageWidth - 183,
      y: y + 5,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    const debitNoteNumberLabel = this.languageService.getText('debitNoteNumber', this.language);
    page.drawText(`${debitNoteNumberLabel}: ${formData['DEBIT NOTE NUMBER'] || ''}`, {
      x: pageWidth - 183,
      y: y - 5,
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
    const vatLabel = this.languageService.getText('vatTax', this.language);
    const responsiblePersonLabel = this.languageService.getText('responsiblePerson', this.language);
    const telephoneLabel = this.languageService.getText('telephone', this.language);
    const emailLabel = this.languageService.getText('email', this.language);
    
    const issuerInfo = [
      'TUANA TEKSTIL SANAYI VE TICARET LIMITED SIRKETI',
      'A3 BLOK NUMARA 53 TEKSTILKENT ESENLER',
      'ISTANBUL TURKEY 34235',
      `${vatLabel}: ATISALANI TR8590068726`,
      `${responsiblePersonLabel}: ${formData['RESPONSIBLE PERSON'] || formData.responsiblePerson || 'CENK YELMEN'}`,
      `${telephoneLabel}: ${formData.TELEPHONE || formData.telephone || '+90 333 234 45 38'}`,
      `${emailLabel}: ${formData.EMAIL || formData.email || 'CENK@TUANATEX.COM'}`
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
      maxWidth: 250, // RECIPIENT için maksimum genişlik
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
      `${vatLabel}: ${formData['RECIPIENT Vat'] || formData.recipientVat || '---'}`,
      `${responsiblePersonLabel}: ${formData['RECIPIENT Sorumlu Kişi'] || formData.recipientPerson || '---'}`,
      `${telephoneLabel}: ${formData['RECIPIENT Telefon'] || formData.recipientPhone || '---'}`,
      `${emailLabel}: ${formData['RECIPIENT Email'] || formData.recipientEmail || '---'}`
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
      maxWidth: 250, // DELIVERY ADDRESS için maksimum genişlik
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
      `${vatLabel}: ${formData['DELIVERY ADDRESS Vat'] || formData.deliveryVat || '---'}`,
      `${responsiblePersonLabel}: ${formData['DELIVERY ADDRESS Sorumlu Kişi'] || formData.deliveryPerson || '---'}`,
      `${telephoneLabel}: ${formData['DELIVERY ADDRESS Telefon'] || formData.deliveryPhone || '---'}`,
      `${emailLabel}: ${formData['DELIVERY ADDRESS Email'] || formData.deliveryEmail || '---'}`
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

    // DESCRIPTION OF GOODS başlığı - Debit Note için özel format
    const invoiceNumber = formData['INVOICE NUMBER'] || '';
    const descriptionOfGoodsLabel = this.languageService.getText('descriptionOfGoodsRegardingOrder', this.language);
    const goodsTitle = `${descriptionOfGoodsLabel}: ${invoiceNumber}`;
    page.drawText(goodsTitle, {
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
      width: pageWidth - 105, // 100'den 120'ye çıkardık (20px daha dar)
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      // Arka plan rengi yok - beyaz
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

    //console.log('Drawing goods table with data:', goods);

    let totalAmount = 0;
    let totalQuantity = 0;
    let totalCurrency = 'EUR'; // Default currency
    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // İlk 7 ürünü işle
    const itemsPerPage = 7;
    for (let pageIndex = 0; pageIndex < Math.ceil(goods.length / itemsPerPage); pageIndex++) {
      const startIndex = pageIndex * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, goods.length);
      const pageGoods = goods.slice(startIndex, endIndex);
      
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

        const invoiceNumber = formData['INVOICE NUMBER'] || '';
        const goodsTitle = `DESCRIPTION OF GOODS REGARDING THE ORDER: "${invoiceNumber}" (Devamı)`;
        currentPage.drawText(goodsTitle, {
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
            if (lineCount >= 2) break; // Maksimum 2 satır
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
          width: pageWidth - 105, // 100'den 120'ye çıkardık
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

    // TOTAL AMOUNT - sadece son sayfada
    currentPage.drawRectangle({
      x: 50,
      y: currentY - 15,
      width: pageWidth - 105, // 100'den 120'ye çıkardık
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const totalAmountLabel = this.languageService.getText('totalAmount', this.language);
    currentPage.drawText(totalAmountLabel, {
      x: 55,
      y: currentY - 10,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(`${totalQuantity.toFixed(2).replace('.', ',')} ${"Mt"}`, {
      x: 355,
      y: currentY - 10,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(`${totalAmount.toFixed(2).replace('.', ',')} ${totalCurrency}`, {
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
        width: pageWidth - 105, // 100'den 120'ye çıkardık
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // KDV yazısı ve oranı - QUANTITY sütununda
      const vatLabel = this.languageService.getText('vatTax', this.language);
      currentPage.drawText(`% ${kdvOrani} ${vatLabel}`, {
        x: 355,
        y: currentY - 10,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // KDV tutarı - AMOUNT sütununda
      const kdvTutari = (totalAmount * kdvOrani) / 100;
      currentPage.drawText(kdvTutari.toFixed(2).replace('.', ','), {
        x: 480,
        y: currentY - 10,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // Sadece gerekli dikey çizgiler (ARTICLE NUMBER ve WEIGHT/WIDTH arasını kaldır)
      const kdvVerticalLines = [350, 475]; // İlk iki sütun arası çizgiyi kaldırdık
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
        width: pageWidth - 105, // 100'den 120'ye çıkardık
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const generalTotalLabel = this.languageService.getText('generalTotal', this.language);
      currentPage.drawText(generalTotalLabel, {
        x: 355,
        y: currentY - 10,
        size: 7,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      const genelToplam = totalAmount + kdvTutari;
      currentPage.drawText(genelToplam.toFixed(2).replace('.', ','), {
        x: 480,
        y: currentY - 10,
        size: 7,
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

  // Kur bilgisi ve banka bilgileri bölümü
  drawCurrencyAndBankInfoSection(page, pageWidth, y, formData) {
    // Sadece BANKA BİLGİLERİ için sabit pozisyon
    let currentY = 215; // Sabit Y pozisyonu
    const leftColumnX = 55;
    const bankaBilgileri = formData['Banka Bilgileri'];
    
    // Sadece BANKA BİLGİLERİ'ni çiz - sabit pozisyonda
    if (bankaBilgileri) {
      // BANKA BİLGİLERİ başlığı
      page.drawText('BANK INFORMATIONS', {
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

    // Sabit pozisyon döndür
    return 170;
  }

  // KUR BİLGİSİ'ni dinamik pozisyonda çizen ayrı metod
  drawCurrencyInfo(targetPage, y, formData) {
    const kurBilgisiEnabled = formData['Kur Bilgisi Enabled'];
    const kurBilgisi = formData['Kur Bilgisi'];
    
    if (kurBilgisiEnabled && kurBilgisi) {
      // KUR BİLGİSİ başlığı ve değeri yan yana - sol başlangıçta
      targetPage.drawText('KUR BİLGİSİ:', {
        x: 55, // Sol başlangıç
        y: y, // GENEL TOPLAM ile aynı seviyede
        size: 7,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      // Kur bilgisi değeri - yanında
      this.drawSafeText(targetPage, kurBilgisi, {
        x: 135, // KUR BİLGİSİ: yazısından sonra
        y: y,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Banka hesap bilgilerini döndüren yardımcı metod
  getBankAccountInfo(currency) {
    const bankAccounts = {
      'TRY': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
TEB (TÜRKIYE EKONOMI BANKASI)
ŞUBE: MERTER (032)
HESAP NO: 962246
IBAN :TR78 0003 2000 0320 0000 9622 46`,
      
      'USD': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
TEB (TURKIYE EKONOMI BANKASI)
BRANCH: MERTER (032)
ACCOUNT NO: 967978
IBAN: TR29 0003 2000 0320 0000 9679 78
SWIFT: TEBUTRIS 032`,
      
      'EUR': `TUANA TEKSTIL SAN. VE TIC. LTD. STI.
TEB (TURKIYE EKONOMI BANKASI)
BRANCH: MERTER (032)
ACCOUNT NO: 967979
IBAN: TR29 0003 2000 0320 0000 9679 79
SWIFT: TEBUTRIS 032`
    };

    return bankAccounts[currency] || '';
  }

  drawNotesSection(page, pageWidth, y, formData) {
    // BANKA BİLGİLERİ varlığını kontrol et
    const bankaBilgileri = formData['Banka Bilgileri'];
    
    // BANKA BİLGİLERİ varsa normal pozisyon, yoksa daha aşağı
    const notesLineY = bankaBilgileri ? 265 : 173;
    const notesTitleY = bankaBilgileri ? 255 : 160;
    
    // NOTES üstünde çizgi - dinamik pozisyon
    page.drawLine({
      start: { x: 50, y: notesLineY },
      end: { x: pageWidth - 50, y: notesLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    let noteY = notesTitleY; // NOTES başlığı pozisyonu - dinamik

    // NOTES başlığı - küçük font
    const debitNoteExplanationLabel = this.languageService.getText('debitNoteExplanation', this.language);
    page.drawText(debitNoteExplanationLabel, {
      x: 55,
      y: noteY,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    noteY -= 10; // NOTES içeriği başlangıcı
    
    // Notes içeriği - frontend'den gelen Notlar alanını kullan
    if (formData['Notlar'] && formData['Notlar'].trim()) {
      // Debit Note için özel mesaj ekle
      const debitNoteMessage = `${formData['Notlar'].trim()}`;
      
      // Notları çok satırlı olarak ekle
      const notLines = debitNoteMessage.split('\n');
      notLines.forEach((line, index) => {
        if (line.trim()) {
          this.drawSafeText(page, line.trim(), {
            x: 55,
            y: noteY,
            size: 8,
            font: this.font,
            color: rgb(0, 0, 0),
          });
          noteY -= 12;
        }
      });
    } else if (formData.notes && Array.isArray(formData.notes)) {
      // Fallback: eski array formatını da destekle
      formData.notes.forEach(note => {
        if (note && note.trim()) {
          this.drawSafeText(page, note, {
            x: 55,
            y: noteY,
            size: 8,
            font: this.font,
            color: rgb(0, 0, 0),
          });
          noteY -= 12;
        }
      });
    } else {
      // Default debit note mesajı (boş bırak)
      noteY -= 12;
    }

    // NOTES altında çizgi - sabit pozisyon
    // const lineY = noteY - 8;
    // page.drawLine({
    //   start: { x: 50, y: lineY  },
    //   end: { x: pageWidth - 50, y: lineY },
    //   thickness: 1,
    //   color: rgb(0, 0, 0),
    // });

    // Sabit pozisyon döndür
    return 240; // Sabit return değeri
  }

  drawDebitNoteFooter(page, pageWidth, startY = null, formData = {}) {
    // Dinamik pozisyon kullan veya varsayılan değer
    let y = startY ? Math.min(startY - 30, 200) : 200;
    
    // Minimum footer pozisyonu (sayfa altından 120px yukarıda)
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

    // Payment terms ve diğer bilgiler
    const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
    const transportTypeLabel = this.languageService.getText('transportType', this.language);
    const countryOfOriginLabel = this.languageService.getText('countryOfOrigin', this.language);
    const grossWeightLabel = this.languageService.getText('grossWeight', this.language);
    const netWeightLabel = this.languageService.getText('netWeight', this.language);
    const rollsLabel = this.languageService.getText('rolls', this.language);
    
    // Payment Terms değerini çevir
    const originalPaymentTerms = formData['Payment Terms'] || formData.paymentTerms || '90 Days';
    const paymentTermsValues = this.languageService.getText('paymentTermsValues', this.language);
    const translatedPaymentTerms = paymentTermsValues[originalPaymentTerms] || originalPaymentTerms;
    
    const footerInfo = [
      `${paymentTermsLabel}: ${translatedPaymentTerms}`,
      `${transportTypeLabel}: ${formData['Transport Type'] || formData.transportType || 'CIF, FOB, EXW, DAP'}`,
      `${countryOfOriginLabel}: ${formData['Country of Origin'] || formData.countryOfOrigin || 'TURKEY'}`,
      `${grossWeightLabel}: ${formData['Gross Weight'] || formData.grossWeight || ''}`,
      `${netWeightLabel}: ${formData['Net Weight'] || formData.netWeight || ''}`,
      `${rollsLabel}: ${formData['Rolls'] || formData.rolls || ''}`
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

    // Signature ve Stamp bölümleri
    const signatureLabel = this.languageService.getText('signature', this.language);
    page.drawText(signatureLabel, {
      x: 215,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

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
}

module.exports = DebitNoteTemplate;
