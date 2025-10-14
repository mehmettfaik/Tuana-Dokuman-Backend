const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class HangersShipmentTemplate extends BasePdfTemplate {
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
      this.tuanaFont = this.fontItalic; // Fallback
    }
  }

  /**
   * Türkçe sayı formatlaması - binlik ayraçlı (1.250,23)
   * @param {number} number - Formatlanacak sayı
   * @returns {string} - Türkçe formatlanmış sayı
   */
  formatTurkishNumber(number) {
    if (!number && number !== 0) return '';
    
    const numericValue = typeof number === 'string' ? parseFloat(number.replace(',', '.')) : number;
    if (isNaN(numericValue)) return '';
    
    // Türkçe locale ile formatla (binlik ayraçları ile)
    return numericValue.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  async createHangersShipment(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // HANGERS SHIPMENT HEADER (Invoice stil)
    this.drawHangersShipmentHeader(page, pageWidth, y, formData);
    y -= 70;

    // HANGERS SHIPMENT başlığı - Invoice ile aynı stil
    const title = this.language === 'tr' ? 'ASKILI SEVKİYAT' : 'HANGERS SHIPMENT';
    page.drawText(title, {
      x: 55,
      y: y + 30,
      size: 20,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    y -= 10;

    // ISSUER, RECIPIENT ve DELIVERY ADDRESS bölümleri
    y = this.drawCompanyInfoSection(page, pageWidth, y, formData);
    y -= 10;

    // HANGERS ITEMS tablosu
    const tableResult = this.drawHangersTable(page, pageWidth, y, formData);
    
    // NOTES bölümü - sadece ilk sayfada ve sabit pozisyonda
    this.drawNotesSection(page, pageWidth, formData);

    // FOOTER - dinamik pozisyon (ilk sayfada)
    this.drawHangersShipmentFooter(page, pageWidth, null, formData);

    return this.pdfDoc;
  }

  drawHangersShipmentHeader(page, pageWidth, y, formData) {
    // TUANA TEKSTIL başlığı (Invoice ile aynı stil)
    this.drawSafeText(page, 'TUANA TEKSTIL', {
      x: 55,
      y: y - 5,
      size: 35,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Logo (Invoice ile aynı pozisyon ve boyut)
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

    // Ana çizgi (Invoice ile aynı)
    page.drawLine({
      start: { x: 50, y: y - 15 },
      end: { x: pageWidth - 50, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Date, Tracking Code ve Courier bilgileri (Invoice number pozisyonunda)
    const currentDate = formData['DATE'] || new Date().toLocaleDateString('en-GB');
    const trackingCode = formData['TRACKING CODE'] || '';
    const courier = formData['COURIER'] || '';
    
    let rightY = y + 15; // Başlangıç pozisyonu daha yukarıda
    
    // DATE bilgisi (en üstte)
    const dateLabel = this.language === 'tr' ? 'TARİH' : 'DATE';
    page.drawText(`${dateLabel}: ${currentDate}`, {
      x: pageWidth - 185,
      y: rightY,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });
    rightY -= 10;
    
    if (trackingCode) {
      const trackingLabel = this.language === 'tr' ? 'TAKİP KODU' : 'TRACKING CODE';
      page.drawText(`${trackingLabel}: ${trackingCode}`, {
        x: pageWidth - 185,
        y: rightY,
        size: 7,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
      rightY -= 10;
    }

    if (courier) {
      const courierLabel = this.language === 'tr' ? 'KARGO' : 'COURIER';
      page.drawText(`${courierLabel}: ${courier}`, {
        x: pageWidth - 185,
        y: rightY,
        size: 7,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // Dikey çizgi (DATE alanını da kapsayacak şekilde genişletildi)
    page.drawLine({
      start: { x: pageWidth - 190, y: y + 35 },
      end: { x: pageWidth - 190, y: y - 15 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  }

  drawCompanyInfoSection(page, pageWidth, y, formData) {
    const startY = y;
    
    // ISSUER bölümü (üstte tek başına - merkezi) - Invoice ile aynı stil
    const issuerLabel = this.language === 'tr' ? 'GÖNDEREN' : 'ISSUER';
    page.drawText(issuerLabel, {
      x: 55,
      y: y + 25,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // ISSUER bilgileri (Invoice ile aynı)
    const issuerInfo = [
      'TUANA TEKSTIL SANAYI VE TICARET LIMITED SIRKETI',
      'A3 BLOK NUMARA 53 TEKSTILKENT ESENLER',
      'ISTANBUL TURKEY 34235',
      `${this.languageService.getText('vatTax', this.language)}: ATISALANI TR8590068726`,
      `${this.languageService.getText('responsiblePerson', this.language)}: ${formData['RESPONSIBLE PERSON'] || formData.responsiblePerson || 'NURAN YELMEN'}`,
      `${this.languageService.getText('telephone', this.language)}: ${formData.TELEPHONE || formData.telephone || '+90 530 285 71 71'}`,
      `${this.languageService.getText('email', this.language)}: ${formData.EMAIL || formData.email || 'NURAN@TUANATEX.COM'}`
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

    const nextSectionY = issuerY - 10;

    // RECIPIENT bölümü (sol tarafta) - Invoice ile aynı stil
    const recipientLabel = this.language === 'tr' ? 'ALICI' : 'RECIPIENT';
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

    // DELIVERY ADDRESS bölümü (sağ tarafta - RECIPIENT ile aynı seviyede) - dil desteği ile
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

    return Math.min(recipientY, deliveryY) - 35;
  }

  drawHangersTable(page, pageWidth, y, formData) {
    // HANGERS SHIPMENT ITEMS üstünde çizgi
    page.drawLine({
      start: { x: 47, y: y + 50 },
      end: { x: pageWidth - 50, y: y + 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // HANGERS SHIPMENT ITEMS başlığı
    const hangersItemsLabel = this.language === 'tr' ? 'ASKI SİPARİŞİ KALEMLERI' : 'CONTENTS';
    page.drawText(hangersItemsLabel, {
      x: 50,
      y: y + 37,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    y += 25;

    // Hangers items array'ini al
    const hangersItems = formData.hangersItems || [];
    
    // Tablo başlıkları - Invoice stilinde
    const tableHeaders = [
      { text: this.language === 'tr' ? 'ÜRÜN KODU' : 'ARTICLE NUMBER', x: 55, width: 130 },
      { text: this.language === 'tr' ? 'TİP' : 'TYPE', x: 120, width: 80 },
      { text: this.language === 'tr' ? 'KOMPOZİSYON' : 'COMPOSITION', x: 150, width: 90 },
      { text: this.language === 'tr' ? 'ASKI ÖLÇÜSÜ' : 'HANGER DIMENSION', x: 350, width: 70 },
      { text: this.language === 'tr' ? 'ADET' : 'PIECES', x: 420, width: 35 },
      { text: this.language === 'tr' ? 'GTİP KODU' : 'HS CODE', x: 450, width: 55 }
    ];

    // Başlık satırı arka planı (Invoice stilinde)
    page.drawRectangle({
      x: 50,
      y: y - 15,
      width: pageWidth - 105,
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

    // Dikey çizgiler başlık satırında (Invoice stilinde)
    const verticalLines = [115, 145, 345, 415, 445];
    verticalLines.forEach(x => {
      page.drawLine({
        start: { x: x, y: y + 5 },
        end: { x: x, y: y - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    y -= 20;

    // Ürün satırları - Sayfalama ile
    let totalPieces = 0;
    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // İlk sayfada 12 ürün, diğer sayfalarda 30 ürün
    let processedItems = 0;
    let pageIndex = 0;
    
    while (processedItems < hangersItems.length) {
      // İlk sayfa için 12 ürün, diğer sayfalar için 30 ürün
      const itemsPerPage = pageIndex === 0 ? 12 : 30;
      const startIndex = processedItems;
      const endIndex = Math.min(startIndex + itemsPerPage, hangersItems.length);
      const pageItems = hangersItems.slice(startIndex, endIndex);
      
      processedItems = endIndex;
      
      // Yeni sayfa gerekiyorsa oluştur (ilk sayfa hariç)
      if (pageIndex > 0) {
        currentPage = this.pdfDoc.addPage([595, 842]);
        pageNumber++;
        currentY = 750; // Yeni sayfa başlangıcı
        
        // Yeni sayfada tablo başlığı
        currentPage.drawLine({
          start: { x: 47, y: currentY + 50 },
          end: { x: pageWidth - 50, y: currentY + 50 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });

        // Yeni sayfada tablo başlığı - devamı
        const hangersItemsContinuedLabel = this.language === 'tr' ? 'ASKI SİPARİŞİ KALEMLERI' : 'CONTENTS';
        currentPage.drawText(hangersItemsContinuedLabel, {
          x: 50,
          y: currentY + 37,
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
      pageItems.forEach((item, index) => {
        // Dinamik satır yüksekliği hesaplama
        const articleText = item['ARTICLE NUMBER'] || '';
        const words = articleText.split(' ');
        let lineCount = 1;
        let currentLine = '';
        
        for (let word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const textWidth = this.font.widthOfTextAtSize(testLine, 6);
          
          if (textWidth > 55 && currentLine) {
            lineCount++;
            currentLine = word;
            if (lineCount >= 2) break; // Maksimum 2 satır
          } else {
            currentLine = testLine;
          }
        }
        
        // Dinamik satır yüksekliği (minimum 20, uzun metinler için daha fazla)
        const rowHeight = Math.max(20, lineCount * 10 + 8);
        
        // Satır arka planı (Invoice stilinde)
        currentPage.drawRectangle({
          x: 50,
          y: currentY - rowHeight + 5,
          width: pageWidth - 105,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Ürün bilgileri
        this.drawWrappedText(currentPage, item['ARTICLE NUMBER'] || '', {
          x: 55,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 55,
          lineHeight: 8
        });

        this.drawSafeText(currentPage, item['TYPE'] || '', {
          x: 120,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['COMPOSITION'] || '', {
          x: 150,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['HANGER DIMENSION'] || '', {
          x: 350,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['PIECES'] || '', {
          x: 420,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, item['HS (CUSTOMS) CODE'] || '', {
          x: 450,
          y: currentY - 10,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // Dikey çizgiler (Invoice stilinde)
        verticalLines.forEach(lineX => {
          currentPage.drawLine({
            start: { x: lineX, y: currentY + 5 },
            end: { x: lineX, y: currentY - rowHeight + 5 },
            thickness: 1,
            color: rgb(0, 0, 0),
          });
        });

        // Toplam hesaplamaları
        const pieces = parseInt(item['PIECES'] || '0');
        totalPieces += pieces;

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

    const totalAmountLabel = this.language === 'tr' ? 'TOPLAM ADET' : 'TOTAL AMOUNT';
    currentPage.drawText(totalAmountLabel, {
      x: 55,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(totalPieces.toString(), {
      x: 420,
      y: currentY - 10,
      size: 6,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Son dikey çizgiler toplam satırında
    const totalVerticalLines = [115, 145, 345, 415, 445]; // Sadece PIECES kolonu öncesi
    totalVerticalLines.forEach(x => {
      currentPage.drawLine({
        start: { x: x, y: currentY + 5 },
        end: { x: x, y: currentY - 15 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    });

    return currentY - 20;
  }

  drawNotesSection(page, pageWidth, formData) {
    // NOTES sabit pozisyonu - sayfa altından 180px yukarıda
    const notesStartY = 140;
    
    // NOTES üstünde çizgi (Invoice stilinde)
    page.drawLine({
      start: { x: 50, y: notesStartY + 20 },
      end: { x: pageWidth - 50, y: notesStartY + 20 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    let noteY = notesStartY + 10; // NOTES başlığı pozisyonu

    // NOTES başlığı - küçük font (Invoice stilinde)
    const notesLabel = this.languageService.getText('note', this.language);
    page.drawText(notesLabel, {
      x: 55,
      y: noteY,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    noteY -= 15; // NOTES içeriği başlangıcı
    
    // Notes içeriği - frontend'den gelen Notlar alanını kullan
    if (formData['NOTLAR'] && formData['NOTLAR'].trim()) {
      const notesLines = formData['NOTLAR'].split('\n');
      notesLines.forEach(line => {
        this.drawSafeText(page, line.trim(), {
          x: 55,
          y: noteY,
          size: 8,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        noteY -= 12;
      });
    } else if (this.notes && this.notes.trim() !== '') {
      this.drawSafeText(page, this.notes, {
        x: 55,
        y: noteY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      noteY -= 12;
    }

    // NOTES altında çizgi (Invoice stilinde)
    const lineY = noteY - 8;


    return lineY - 10; // Return pozisyonu
  }

  drawHangersShipmentFooter(page, pageWidth, startY = null, formData = {}) {
    // Sabit footer pozisyonu - sayfa altından 120px yukarıda
    let y = 120;
    
    // Ana çizgi (Invoice stilinde)
    page.drawLine({
      start: { x: 50, y: y + 5 },
      end: { x: pageWidth - 50, y: y + 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Alt çizgi (Invoice stilinde)
    page.drawLine({
      start: { x: 50, y: y - 5 },
      end: { x: pageWidth - 50, y: y - 5 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // İki çizgi arasına TUANA yazısı - normal ve ters (Invoice stilinde)
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

    // Payment & Shipping Details - Dinamik yapı (Invoice stilinde)
    const paymentShippingDetails = this.buildPaymentShippingDetails(formData);
    
    let footerY = y;
    paymentShippingDetails.forEach(info => {
      page.drawText(info, {
        x: 55,
        y: footerY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      footerY -= 12;
    });

    // Signature ve Stamp bölümleri (Invoice stilinde)
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

    // Dikey çizgiler (Invoice stilinde)
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

    // Sayfa numarası (Invoice stilinde)
    page.drawText('1', {
      x: pageWidth / 2,
      y: 30,
      size: 12,
      font: this.font,
      color: rgb(0, 0, 0),
    });
  }
  

  /**
   * PAYMENT & SHIPPING DETAILS alanlarını dinamik olarak oluştur
   * @param {Object} formData - Form verileri
   * @returns {Array} Dolu olan alanlar
   */
  buildPaymentShippingDetails(formData) {
    const fields = [];
    
    // Debug: formData içeriğini kontrol et
    console.log('HangersShipment buildPaymentShippingDetails - formData keys:', Object.keys(formData));
    console.log('Payment related fields:', {
      paymentTerms: formData.paymentTerms,
      'Payment Terms': formData['Payment Terms'],
      transportType: formData.transportType,
      'Transport Type': formData['Transport Type'],
      'TRANSPORT TYPE': formData['TRANSPORT TYPE'],
      countryOfOrigin: formData.countryOfOrigin,
      'Country of Origin': formData['Country of Origin'],
      'COUNTRY OF ORIGIN': formData['COUNTRY OF ORIGIN']
    });
    
    // PAYMENT TERMS - Multiple field name support
    const paymentTermsValue = formData.paymentTerms || formData['Payment Terms'] || '';
    if (paymentTermsValue.trim()) {
      const label = this.language === 'tr' ? 'ÖDEME KOŞULLARI:' : 'PAYMENT TERMS:';
      fields.push(`${label} ${paymentTermsValue.trim()}`);
    }

    // TRANSPORT TYPE - Multiple field name support (daha fazla varyasyon)
    const transportTypeValue = formData.transportType || formData['Transport Type'] || formData['TRANSPORT TYPE'] || '';
    if (transportTypeValue.trim()) {
      const label = this.language === 'tr' ? 'TAŞIMA TİPİ:' : 'TRANSPORT TYPE:';
      fields.push(`${label} ${transportTypeValue.trim()}`);
    } else {
      // TEST: Boş olsa bile göster
    }

    // COUNTRY OF ORIGIN - Multiple field name support (daha fazla varyasyon)
    const countryOfOriginValue = formData.countryOfOrigin || formData['Country of Origin'] || formData['COUNTRY OF ORIGIN'] || '';
    if (countryOfOriginValue.trim()) {
      const label = this.language === 'tr' ? 'MENŞE ÜLKESİ:' : 'COUNTRY OF ORIGIN:';
      fields.push(`${label} ${countryOfOriginValue.trim()}`);
    } else {
      // TEST: Boş olsa bile göster
    }

    // GROSS WEIGHT - Multiple field name support
    const grossWeightValue = formData.grossWeight || formData['Gross Weight'] || '';
    if (grossWeightValue.trim()) {
      const label = this.language === 'tr' ? 'BRÜT AĞIRLIK:' : 'GROSS WEIGHT:';
      fields.push(`${label} ${grossWeightValue.trim()}`);
    }

    // NET WEIGHT - Multiple field name support
    const netWeightValue = formData.netWeight || formData['Net Weight'] || '';
    if (netWeightValue.trim()) {
      const label = this.language === 'tr' ? 'NET AĞIRLIK:' : 'NET WEIGHT:';
      fields.push(`${label} ${netWeightValue.trim()}`);
    }

    // ROLLS - Multiple field name support
    const rollsValue = formData.rolls || formData['Rolls'] || '';
    if (rollsValue.trim()) {
      const label = this.language === 'tr' ? 'TOP SAYISI:' : 'ROLLS:';
      fields.push(`${label} ${rollsValue.trim()}`);
    }

    // LEAD TIME - Multiple field name support
    const leadTimeValue = formData.leadTime || formData['Lead Time'] || '';
    if (leadTimeValue.trim()) {
      const label = this.language === 'tr' ? 'TESLİM SÜRESİ:' : 'LEAD TIME:';
      fields.push(`${label} ${leadTimeValue.trim()}`);
    }

    return fields;
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
      lineCount++;
    }
    
    return lineCount * lineHeight;
  }

  // Genel metin sarma metodu - yükseklik döndürür
  drawWrappedText(page, text, options) {
    if (!text) return 12;
    
    const { x, y, size, font, color, maxWidth, lineHeight = 12 } = options;
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    let totalHeight = 0;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, {
          x: x,
          y: currentY,
          size: size,
          font: font,
          color: color,
        });
        
        currentLine = words[i];
        currentY -= lineHeight;
        totalHeight += lineHeight;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size: size,
        font: font,
        color: color,
      });
      totalHeight += lineHeight;
    }
    
    return totalHeight;
  }

  // Metin genişliği hesaplama
  getTextWidth(text, fontSize, font) {
    return font.widthOfTextAtSize(text, fontSize);
  }

  // Metin kesme metodu
  truncateText(text, maxWidth, fontSize, font) {
    if (!text) return '';
    
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    if (textWidth <= maxWidth) return text;
    
    let truncated = text;
    while (font.widthOfTextAtSize(truncated + '...', fontSize) > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    
    return truncated + (truncated.length < text.length ? '...' : '');
  }

  /**
   * PDF oluştur
   * @param {Object} formData - Form verileri
   * @returns {Promise}
   */
  async generate(formData) {
    await this.initialize();
    await this.createHangersShipment(formData, this.language);
  }
}

module.exports = HangersShipmentTemplate;