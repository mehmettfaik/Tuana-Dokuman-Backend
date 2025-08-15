const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class SiparisTemplate extends BasePdfTemplate {
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

  async createSiparis(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // SİPARİŞ IÇIN ÖZEL HEADER (TUANA TEKSTIL + Logo + Sipariş Date + Sipariş Number)
    this.drawSiparisHeader(page, pageWidth, y, formData);
    y -= 70;

    // SİPARİŞ başlığı - dil desteği ile
    const siparisTitle = this.languageService.getText('siparis', this.language);
    page.drawText(siparisTitle, {
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
    y -= 10; // Tablonun sonrası minimal boşluk

    // NOTES bölümü
    y = this.drawNotesSection(page, pageWidth, y, formData);
    y -= 40; // NOTES'tan sonra daha fazla boşluk

    // FOOTER (Payment terms, signature, stamp) - dinamik pozisyon
    this.drawSiparisFooter(page, pageWidth, y, formData);

    return this.pdfDoc;
  }

  drawSiparisHeader(page, pageWidth, y, formData) {
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

    // Sipariş Date (sağ üst köşe)
    const siparisGunu = formData['SİPARİŞ GÜNÜ'] || formData['ORDER DAY'] || new Date().toLocaleDateString('en-GB');
    
    // Tarih formatını düzelt (YYYY-MM-DD -> DD/MM/YYYY)
    let formattedDate = siparisGunu;
    if (typeof siparisGunu === 'string' && siparisGunu.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = siparisGunu.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }
    
    const orderDateLabel = this.languageService.getText('orderDate', this.language);
    page.drawText(`${orderDateLabel}: ${formattedDate}`, {
      x: pageWidth - 185,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Sipariş Number (sağ üst köşe, Sipariş Date'in altında)
    const siparisNumarasi = formData['SİPARİŞ NUMARASI'] || formData['ORDER NUMBER'] || '';
    const orderNumberLabel = this.languageService.getText('orderNumber', this.language);
    page.drawText(`${orderNumberLabel}: ${siparisNumarasi}`, {
      x: pageWidth - 185,
      y: y + 5,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Tedarikçi Number (sağ üst köşe, Sipariş Number'ın altında)
    const tedarikciNumarasi = formData['TEDARİKÇİ NUMARASI'] || formData['SUPPLIER NUMBER'] || '';
    if (tedarikciNumarasi) {
      const supplierNumberLabel = this.language === 'tr' ? 'TEDARİKÇİ NUMARASI' : 'SUPPLIER NUMBER';
      page.drawText(`${supplierNumberLabel}: ${tedarikciNumarasi}`, {
        x: pageWidth - 185,
        y: y - 5,
        size: 7,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // Sağ üstte dikey çizgi
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
      'TUANA TEKSTİL SANAYİ VE TİCARET LIMITED ŞİRKETİ',
      'A3 BLOK NUMARA 53 TEKSTİLKENT ESENLER',
      'İSTANBUL TÜRKİYE 34235',
      `${vatLabel}: ATIŞALANI 8590068726`,
      `${responsiblePersonLabel}: ${formData['RESPONSIBLE PERSON'] || 'CENK YELMEN'}`,
      `${telephoneLabel}: ${formData['TELEPHONE'] || '+90 333 234 45 38'}`,
      `${emailLabel}: ${formData['EMAIL'] || 'CENK@TUANATEX.COM'}`
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
    this.drawSafeText(page, formData['RECIPIENT Şirket Adı'] || '---', {
      x: 55,
      y: recipientY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    recipientY -= 12;

    // Adres - dinamik sarma ile
    const recipientAddress = formData['RECIPIENT Adres'] || '---';
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
    const recipientLocationInfo = formData['RECIPIENT İlçe İl Ülke'] || '---';
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
      `${vatLabel}: ${formData['RECIPIENT Vat'] || '---'}`,
      `${responsiblePersonLabel}: ${formData['RECIPIENT Sorumlu Kişi'] || '---'}`,
      `${telephoneLabel}: ${formData['RECIPIENT Telefon'] || '---'}`,
      `${emailLabel}: ${formData['RECIPIENT Email'] || '---'}`
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

    // DELIVERY ADDRESS bölümü (sağ tarafta - ALICI ile aynı seviyede)
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
    this.drawSafeText(page, formData['DELIVERY ADDRESS Şirket Adı'] || '---', {
      x: 320,
      y: deliveryY,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    deliveryY -= 12;

    // Adres - dinamik sarma ile
    const deliveryAddress = formData['DELIVERY ADDRESS Adres'] || '---';
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
    const deliveryLocationInfo = formData['DELIVERY ADDRESS İlçe İl Ülke'] || '---';
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
      `${vatLabel}: ${formData['DELIVERY ADDRESS Vat'] || '---'}`,
      `${responsiblePersonLabel}: ${formData['DELIVERY ADDRESS Sorumlu Kişi'] || '---'}`,
      `${telephoneLabel}: ${formData['DELIVERY ADDRESS Telefon'] || '---'}`,
      `${emailLabel}: ${formData['DELIVERY ADDRESS Email'] || '---'}`
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

    // ÜRÜN AÇIKLAMASI başlığı
    const descriptionOfGoodsLabel = this.languageService.getText('descriptionOfGoods', this.language);
    page.drawText(descriptionOfGoodsLabel, {
      x: 50,
      y: y + 37,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    y += 25;

    // Sipariş için özel tablo başlıkları - yeniden düzenlenmiş genişlikler
    const tableHeaders = [
      { text: this.languageService.getText('artikelNumber', this.language), x: 55, width: 90 },      // 110'dan 90'a düşürüldü
      { text: this.languageService.getText('gramajEn', this.language), x: 150, width: 50 },          // x: 170'den 150'ye
      { text: this.languageService.getText('composition', this.language), x: 215, width: 80 },          // x: 235'den 205'e, width: 65'den 80'e
      { text: this.languageService.getText('season', this.language), x: 305, width: 35 },                // x: 305'den 290'a
      { text: this.languageService.getText('termin', this.language), x: 338, width: 35 },               // x: 350'den 330'a
      { text: this.languageService.getText('process', this.language), x: 380, width: 50 },                // x: 385'den 370'e, width: 30'dan 50'ye
      { text: this.languageService.getText('meter', this.language), x: 475, width: 50 },         // x: 420'den 425'e
      { text: this.languageService.getText('price', this.language), x: 515, width: 30 }                 // x: 475'den 480'e, width: 35'den 30'a
    ];

    // Tablo dış çerçevesi başlangıcı
    const tableStartY = y;
    
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

    // Dikey çizgiler başlık satırında - yeniden düzenlenmiş pozisyonlar
    const verticalLines = [145, 210, 300, 335, 375, 470, 510];
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
        'ARTIKEL NUMARASI': 'T-16487 BLAU',
        'GRAMAJ / EN': '100 GR/M2 / 200 CM',
        'KOMPOZISYON': '100% MODAL',
        'SEZON': 'S/S 2024',
        'TERMİN': 'PLAIN',
        'İŞLEM': 'DYE',
        'ADET (METRE)': '400',
        'FIYAT': '5,00',
        'AMOUNT': '2000,00'
      }
    ];

    //console.log('Drawing siparis goods table with data:', goods);

    let totalAmount = 0;
    let totalQuantity = 0;
    let currentPage = page;
    let currentY = y;
    let pageNumber = 1;

    // İlk 6 ürünü işle
    const itemsPerPage = 6;
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

        currentPage.drawText(descriptionOfGoodsLabel, {
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

      // Bu sayfadaki ürünleri çiz
      pageGoods.forEach((good, index) => {
        // Tüm alanlar için gerekli satır sayısını hesapla
        let maxLineCount = 1;
        
        // ARTIKEL NUMARASI için satır sayısı
        const artikelText = good['ARTIKEL NUMARASI'] || '';
        const artikelLines = this.calculateLineCount(artikelText, 85, 7);
        maxLineCount = Math.max(maxLineCount, artikelLines);
        
        // KOMPOZISYON için satır sayısı
        const kompozisyonText = good['KOMPOZISYON'] || '';
        const kompozisyonLines = this.calculateLineCount(kompozisyonText, 75, 6);
        maxLineCount = Math.max(maxLineCount, kompozisyonLines);
        
        // İŞLEM için satır sayısı
        const islemText = good['İŞLEM'] || '';
        const islemLines = this.calculateLineCount(islemText, 85, 6);
        maxLineCount = Math.max(maxLineCount, islemLines);
        
        // Dinamik satır yüksekliği (minimum 25, uzun metinler için daha fazla)
        const rowHeight = Math.max(20, maxLineCount * 10 + 15);
        
        // Satır arka planı
        currentPage.drawRectangle({
          x: 50,
          y: currentY - rowHeight + 5,
          width: pageWidth - 100,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Ürün bilgileri - yeniden düzenlenmiş pozisyonlar (metinleri satır ortasına yerleştir)
        const textBaseY = currentY - (rowHeight / 2) + 9; // Satırın ortasına yakın pozisyon
        
        this.drawWrappedText(currentPage, good['ARTIKEL NUMARASI'] || '', {
          x: 55,
          y: textBaseY,
          size: 7,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 85,
          lineHeight: 10
        });

        this.drawSafeText(currentPage, good['GRAMAJ / EN'] || '', {
          x: 150,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // KOMPOZISYON için wrapped text kullan
        this.drawWrappedText(currentPage, good['KOMPOZISYON'] || '', {
          x: 215,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 75,
          lineHeight: 8
        });

        this.drawSafeText(currentPage, good['SEZON'] || '', {
          x: 305,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        
        // TERMİN bilgisini date formatından string'e çevir
        let terminText = '';
        const terminValue = good['TERMIN'];
        if (terminValue) {
          try {
            //console.log('TERMİN değeri:', terminValue, 'Tipi:', typeof terminValue);
            
            // Eğer zaten string formatındaysa direkt kullan
            if (typeof terminValue === 'string' && terminValue.includes('-')) {
              // ISO date format (YYYY-MM-DD) kontrolü
              const dateMatch = terminValue.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (dateMatch) {
                const [, year, month, day] = dateMatch;
                terminText = `${day}.${month}.${year}`;
              } else {
                terminText = terminValue;
              }
            } else {
              // Date objesine çevirmeyi dene
              const terminDate = new Date(terminValue);
              if (!isNaN(terminDate.getTime())) {
                // Geçerli bir date ise, DD.MM.YYYY formatında göster
                const day = terminDate.getDate().toString().padStart(2, '0');
                const month = (terminDate.getMonth() + 1).toString().padStart(2, '0');
                const year = terminDate.getFullYear();
                terminText = `${day}.${month}.${year}`;
              } else {
                // Date değilse olduğu gibi göster
                terminText = String(terminValue);
              }
            }
          } catch (error) {
            console.error('TERMİN date dönüştürme hatası:', error);
            terminText = String(terminValue);
          }
        }
                
        this.drawSafeText(currentPage, terminText, {
          x: 340,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        // İŞLEM için wrapped text kullan
        this.drawWrappedText(currentPage, good['İŞLEM'] || '', {
          x: 380,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 85,
          lineHeight: 8
        });

        this.drawSafeText(currentPage, good['ADET (METRE)'] || '', {
          x: 475,
          y: textBaseY,
          size: 6,
          font: this.font,
          color: rgb(0, 0, 0),
        });

        this.drawSafeText(currentPage, good['FIYAT'] || '', {
          x: 515,
          y: textBaseY,
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

        // Toplam hesaplamaları - sadece quantity hesapla, amount hesaplama kaldırıldı
        const quantity = parseFloat((good['ADET (METRE)'] || '0').replace(',', '.'));
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

    // TOTAL AMOUNT - sadece son sayfada
    currentPage.drawRectangle({
      x: 50,
      y: currentY - 15,
      width: pageWidth - 100,
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const totalLabel = this.languageService.getText('total', this.language);
    currentPage.drawText(totalLabel, {
      x: 55,
      y: currentY - 10,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    currentPage.drawText(totalQuantity.toFixed(2).replace('.', ','), {
      x: 475,  
      y: currentY - 10,
      size: 8,
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

  // Satır sayısını hesaplayan yardımcı metod
  calculateLineCount(text, maxWidth, fontSize) {
    if (!text) return 1;
    
    const words = text.split(' ');
    let lineCount = 1;
    let currentLine = '';
    
    for (let word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const textWidth = this.font.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > maxWidth && currentLine) {
        lineCount++;
        currentLine = word;
        
        // Maksimum 3 satır ile sınırla
        if (lineCount >= 3) {
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    return lineCount;
  }

  // Uzun metinleri sarma metodu - ortalanmış hizalama ile
  drawWrappedText(page, text, options) {
    if (!text) return;
    
    const { x, y, size, font, color, maxWidth, lineHeight = 12 } = options;
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    
    // Önce tüm satırları hesapla
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const textWidth = font.widthOfTextAtSize(testLine, size);
      
      if (textWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
        
        // Maksimum 3 satır ile sınırla
        if (lines.length >= 3) {
          if (i < words.length - 1) {
            currentLine += '...';
          }
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // Son satırı ekle
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Satırları ortalayarak çiz
    const totalTextHeight = (lines.length - 1) * lineHeight;
    let startY = y + (totalTextHeight / 2) - 5;
    
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: x,
        y: startY - (index * lineHeight),
        size: size,
        font: font,
        color: color,
      });
    });
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
    // NOTES üstünde çizgi - sabit pozisyon (Invoice template'de olduğu gibi)
    const notesLineY = 180;
    const notesTitleY = 170;
    
    page.drawLine({
      start: { x: 50, y: notesLineY },
      end: { x: pageWidth - 50, y: notesLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    let noteY = notesTitleY; // NOTES başlığı pozisyonu

    // NOTES başlığı
    const notesLabel = this.languageService.getText('notes', this.language);
    page.drawText(notesLabel, {
      x: 55,
      y: noteY,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    noteY -= 10; // NOTES içeriği başlangıcı
    
    // Frontend'den gelen Notlar verisini kullan
    const notlar = formData['Notlar'] || '';
    
    if (notlar && notlar.trim()) {
      // Notları satırlara böl ve çiz
      const noteLines = notlar.split('\n');
      noteLines.forEach(line => {
        if (line.trim()) {
          this.drawSafeText(page, line.trim(), {
            x: 55,
            y: noteY,
            size: 8,
            font: this.font,
            color: rgb(0, 0, 0),
          });
          noteY -= 10;
        }
      });
    }

    return noteY - 10;
  }

  drawSiparisFooter(page, pageWidth, startY = null, formData = {}) {
    // Dinamik pozisyon kullan veya varsayılan değer
    let y = startY ? Math.min(startY - 30, 200) : 200;
    
    // Minimum footer pozisyonu (sayfa altından 120px yukarıda)
    const minFooterY = 120;
    if (y < minFooterY) {
      y = minFooterY;
    }
    
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

    y -= 18;

    // Ödeme şartları ve diğer bilgiler
    const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
    const transportTypeLabel = this.languageService.getText('transportType', this.language);
    
    // Payment terms değerini çevir
    const paymentTermsValue = formData['Payment Terms'] || '-';
    const translatedPaymentTerms = this.languageService.getPaymentTermsTranslation(paymentTermsValue, this.language);
    
    const footerInfo = [
      `${paymentTermsLabel}: ${translatedPaymentTerms}`,
      `${transportTypeLabel}: ${formData['Transport Type'] || 'CIF, FOB, EXW, DAP'}`
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
    const signatureLabel = this.language === 'tr' ? 'SORUMLU KİŞİ İMZASI' : 'RESPONSIBLE BUYER SIGNATURE';
    const stampLabel = this.languageService.getText('stamp', this.language);
    
    page.drawText(signatureLabel, {
      x: 215,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    page.drawText(stampLabel, {
      x: 395,
      y: y,
      size: 9,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Dikey çizgiler
    page.drawLine({
      start: { x: 210, y: y + 13 },
      end: { x: 210, y: y - 50 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: 390, y: y + 13 },
      end: { x: 390, y: y - 50 },
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

module.exports = SiparisTemplate;
