const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class PriceOfferTemplate extends BasePdfTemplate {
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

  async createPriceOffer(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // PRICE OFFER IÇIN ÖZEL HEADER (TUANA TEKSTIL + Logo + Issue Date + Price Offer Number)
    this.drawPriceOfferHeader(page, pageWidth, y, formData);
    y -= 70;

    // PRICE OFFER başlığı - dil desteği ile
    const priceOfferTitle = this.languageService.getText('priceOffer', this.language);
    page.drawText(priceOfferTitle, {
      x: 55,
      y: y + 30,
      size: 20,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    y -= 10;

    // FROM ve TO Company bölümleri
    y = this.drawCompanyInfoSection(page, pageWidth, y, formData);
    y -= 30;

    // PRICE ITEMS tablosu
    y = this.drawPriceItemsTable(page, pageWidth, y, formData);
    y -= 10; // Tablonun sonrası minimal boşluk

    // NOTES bölümü
    y = this.drawNotesSection(page, pageWidth, y, formData);
    y -= 40; // NOTES'tan sonra daha fazla boşluk

    // FOOTER (Payment terms, transport type, signature, stamp) - dinamik pozisyon
    this.drawPriceOfferFooter(page, pageWidth, y, formData);

    return this.pdfDoc;
  }

  drawPriceOfferHeader(page, pageWidth, y, formData) {
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

    // Issue Date (sağ üst köşe) - Tarih formatını dd/mm/yyyy olarak dönüştür - dil desteği ile
    let issueDate = formData['ISSUE DATE'] || formData['issueDate'] || new Date().toLocaleDateString('en-GB');
    
    // Eğer tarih yyyy-mm-dd formatındaysa dd/mm/yyyy formatına çevir
    if (issueDate.includes('-') && issueDate.length === 10) {
      const dateParts = issueDate.split('-');
      if (dateParts.length === 3) {
        issueDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
    }
    
    const issueDateLabel = this.languageService.getText('issueDate', this.language);
    page.drawText(`${issueDateLabel}: ${issueDate}`, {
      x: pageWidth - 185,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Price Offer Number (sağ üst köşe, Issue Date'in altında) - dil desteği ile
    const priceOfferNumber = formData['PRICE OFFER NUMBER'] || formData['priceOfferNumber'] || '';
    const priceOfferNumberLabel = this.languageService.getText('priceOfferNumber', this.language);
    page.drawText(`${priceOfferNumberLabel}: ${priceOfferNumber}`, {
      x: pageWidth - 185,
      y: y + 5,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Sağ üstte dikey çizgi
    page.drawLine({
      start: { x: pageWidth - 190, y: y + 25 },
      end: { x: pageWidth - 190, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  drawCompanyInfoSection(page, pageWidth, y, formData) {
    // FROM ve TO tek satırda, görüntüdeki gibi - dil desteği ile
    const fromCompanyName = formData['FROM'] || 'CENK YELMEN, TUANA TEKSTIL';
    const toCompanyName = formData['TO'] || 'HELENA BENAC, HOLY FASHION GROUP';
    
    const fromLabel = this.languageService.getText('from', this.language);
    const toLabel = this.languageService.getText('to', this.language);
    
    // FROM Company - HelveticaNeueLightItalic font kullan
    page.drawText(`${fromLabel}:`, {
      x: 55,
      y: y + 20,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    this.drawSafeText(page, fromCompanyName, {
      x: 115,
      y: y + 20,
      size: 9,
      font: this.tuanaFont || this.fontItalic, // HelveticaNeueLightItalic kullan
      color: rgb(0, 0, 0),
    });

    // TO Company - HelveticaNeueLightItalic font kullan
    page.drawText(`${toLabel}:`, {
      x: 55,
      y: y + 10,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    this.drawSafeText(page, toCompanyName, {
      x: 115,
      y: y + 10,
      size: 9,
      font: this.tuanaFont || this.fontItalic, // HelveticaNeueLightItalic kullan
      color: rgb(0, 0, 0),
    });

    return y - 20;
  }

  drawPriceItemsTable(page, pageWidth, y, formData) {
    // PRICE ITEMS üstünde çizgi
    page.drawLine({
      start: { x: 47, y: y + 50 },
      end: { x: pageWidth - 50, y: y + 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

        // PRICE ITEMS başlığı - dil desteği ile
    const priceItemsTitle = this.languageService.getText('priceItems', this.language);
    page.drawText(priceItemsTitle, {
      x: 50,
      y: y + 37,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    y += 25;

    // Price Offer için özel tablo başlıkları - dil desteği ile
    const tableHeaders = [
      { text: this.languageService.getText('articleNumber', this.language), x: 55, width: 80 },
      { text: this.languageService.getText('pricePerMeter', this.language), x: 140, width: 60 },
      { text: this.languageService.getText('bulkMoq', this.language), x: 215, width: 50 },
      { text: this.languageService.getText('samplingAvailability', this.language), x: 290, width: 60 },
      { text: this.languageService.getText('leadTime', this.language), x: 424, width: 50 },
      { text: this.languageService.getText('process', this.language), x: 468, width: 60 },
      { text: this.languageService.getText('certifiable', this.language), x: 503, width: 65 }
    ];

    // Başlık satırı arka planı
    page.drawRectangle({
      x: 50,
      y: y - 15,
      width: pageWidth - 100,
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
    const verticalLines = [135, 210, 285, 420, 465, 500];
    verticalLines.forEach(x => {
      page.drawLine({
        start: { x: x, y: y + 5 },
        end: { x: x, y: y - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    y -= 20;

    // Price Items - Frontend'den gelen priceItems array'ini kullan
    const priceItems = formData.priceItems || [
      {
        articleNumber: 'T-16487',
        pricePerMeter: '$5.50',
        bulkMoq: '1000M',
        samplingAvailability: 'Available',
        leadTime: '30 Days',
        process: 'Dyeing',
        certifiable: 'OEKO-TEX'
      }
    ];

    //console.log('Drawing price items table with data:', priceItems);

    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // Price items'ları çiz
    const itemsPerPage = 13;
    for (let pageIndex = 0; pageIndex < Math.ceil(priceItems.length / itemsPerPage); pageIndex++) {
      const startIndex = pageIndex * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, priceItems.length);
      const pageItems = priceItems.slice(startIndex, endIndex);
      
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

        currentPage.drawText('PRICE OFFER (Continued)', {
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
          width: pageWidth - 100,
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

      // Bu sayfadaki price items'ları çiz
      pageItems.forEach((item, index) => {
        const rowHeight = 20;
        
        // Satır arka planı
        currentPage.drawRectangle({
          x: 50,
          y: currentY - rowHeight + 5,
          width: pageWidth - 100,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Price item bilgileri - Frontend'den gelen alan isimleriyle eşleştir
        this.drawSafeText(currentPage, item['ARTICLE NUMBER'] || item.articleNumber || '', {
          x: 55,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['PRICE (PER METER)'] || item.pricePerMeter || '', {
          x: 140,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['BULK MOQ (METERS)'] || item.bulkMoq || '', {
          x: 215,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['SAMPLING AVAILABILITY (1-100 METERS)'] || item.samplingAvailability || '', {
          x: 290,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['LEAD TIME'] || item.leadTime || '', {
          x: 424,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['PROCESS'] || item.process || '', {
          x: 468,
          y: currentY - 7,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // CERTIFIABLE değerini çevir
        const certifiableValue = item['CERTIFIABLE'] || item.certifiable || '';
        const translatedCertifiable = this.languageService.getCertifiableTranslation(certifiableValue, this.language);
        
        this.drawSafeText(currentPage, translatedCertifiable, {
          x: 503,
          y: currentY - 7,
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

    return currentY + 10;
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

  drawNotesSection(page, pageWidth, y, formData) {
    // NOTES üstünde çizgi - daha aşağıya kaydırılmış pozisyon
    const notesLineY = 340;
    const notesTitleY = 330;
    
    page.drawLine({
      start: { x: 50, y: notesLineY },
      end: { x: pageWidth - 50, y: notesLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    let noteY = notesTitleY; // NOTES başlığı pozisyonu

        // NOTES başlığı - dil desteği ile
    const notesTitle = this.languageService.getText('notes', this.language);
    page.drawText(notesTitle, {
      x: 55,
      y: noteY,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    noteY -= 15; // NOTES içeriği başlangıcı
    
    // Price Offer için özel notes içeriği - dil desteği ile
    const priceOfferNotes = this.languageService.getText('priceOfferNotes', this.language);

    priceOfferNotes.forEach((line, index) => {
      // Eğer satır rakamla başlıyorsa (yeni madde), ekstra boşluk ekle
      if (line.match(/^\d+\./)) {
        if (index > 0) { // İlk madde için ekstra boşluk ekleme
          noteY -= 5; // Maddeler arası ekstra boşluk
        }
      }
      
      this.drawSafeText(page, line, {
        x: 55,
        y: noteY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      noteY -= 10;
    });

    // Sabit pozisyon döndür - NOTES aşağıya kaydırıldığı için daha düşük değer
    return 170;
  }

  drawPriceOfferFooter(page, pageWidth, startY = null, formData = {}) {
    // Dinamik pozisyon kullan veya varsayılan değer
    let y = startY ? Math.min(startY - 30, 200) : 200;
    
    // Minimum footer pozisyonu (sayfa altından 120px yukarıda)
    const minFooterY = 120;
    if (y < minFooterY) {
      y = minFooterY;
    }

     page.drawLine({
      start: { x: 50, y: y + 17 },
      end: { x: pageWidth - 50, y: y + 17 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    // VALIDITY OF THE PRICE OFFER yazısı - NOTES'tan sonra, TUANA'dan önce
    const validityText = this.languageService.getText('validityOfPriceOffer', this.language);
    const validityFont = this.tuanaFont || this.fontItalic; // HelveticaNeueLightItalic kullan
    
    page.drawText(validityText, {
      x: 55,
      y: y + 8,
      size: 8,
      font: validityFont,
      color: rgb(0, 0, 0),
    });
    
    // Ana çizgi
    page.drawLine({
      start: { x: 50, y: y + 5 },
      end: { x: pageWidth - 50, y: y + 5 },
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

    // Payment terms ve diğer bilgiler - dil desteği ile
    const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
    const transportTypeLabel = this.languageService.getText('transportType', this.language);
    
    // Payment terms değerini çevir
    const paymentTermsValue = formData['PAYMENT TERMS'] || '---';
    const translatedPaymentTerms = paymentTermsValue !== '---' ? 
      this.languageService.getText('paymentTermsValues', this.language)?.[paymentTermsValue] || paymentTermsValue : 
      paymentTermsValue;
    
    const footerInfo = [
      `${paymentTermsLabel}: ${translatedPaymentTerms}`,
      `${transportTypeLabel}: ${formData['TRANSPORT TYPE'] || formData['transportType'] || '---'}`
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

    // Signature ve Stamp bölümleri - dil desteği ile
    const signatureLabel = this.languageService.getText('signature', this.language);
    const stampLabel = this.languageService.getText('stamp', this.language);
    
    page.drawText(signatureLabel, {
      x: 305,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // page.drawText(stampLabel, {
    //   x: 395,
    //   y: y,
    //   size: 9,
    //   font: this.fontBold,
    //   color: rgb(0, 0, 0),
    // });

    // Dikey çizgiler
    page.drawLine({
      start: { x: pageWidth / 2, y: y + 15 },
      end: { x: pageWidth / 2, y: y - 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // page.drawLine({
    //   start: { x: 390, y: y + 15 },
    //   end: { x: 390, y: y - 50 },
    //   thickness: 1,
    //   color: rgb(0, 0, 0),
    // });

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

module.exports = PriceOfferTemplate;
