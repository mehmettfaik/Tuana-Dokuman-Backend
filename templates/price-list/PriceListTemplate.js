const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');
const SignatureService = require('../../services/signatureService');

class PriceListTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'en') {
    super(pdfDoc, logoImage);
    this.fontService = new FontService();
    this.languageService = new LanguageService();
    this.signatureService = new SignatureService();
    this.language = language;
  }

  async initialize() {
    // Base sınıftan font yükleme metodunu kullan
    await this.loadFonts();

    this.tuanaFont = await this.fontService.loadHelveticaNeueLightItalic(this.pdfDoc);
    if (!this.tuanaFont) {
      this.tuanaFont = this.fontItalic; // Fallback
    }
  }

  async createPriceList(formData = {}, language = null) {
    if (language) {
      this.language = language;
    }

    let signatureImage = null;
    let stampImage = null;
    const includeSignatureStamp = formData['İmza ve Kaşe'] || formData.imzaVeKase || false;

    if (includeSignatureStamp) {
      signatureImage = await this.signatureService.loadSignature(this.pdfDoc);
      stampImage = await this.signatureService.loadStamp(this.pdfDoc);
    }

    const allArticles = formData.articles || [];
    let page, pageWidth, pageHeight, y;
    let pageIndex = 0;

    const drawTopBoilerplate = () => {
      page = this.pdfDoc.addPage([595, 842]);
      pageWidth = page.getWidth();
      pageHeight = page.getHeight();
      y = pageHeight - 60;

      // HEADER
      this.drawPriceListHeader(page, pageWidth, y, formData);
      y -= 70;

      // PRICE LIST başlığı
      const priceListTitle = this.languageService.getText('priceList', this.language);
      page.drawText(priceListTitle, {
        x: 55,
        y: y + 30,
        size: 20,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      y -= 10;

      // ISSUER, RECIPIENT ve DELIVERY ADDRESS bölümleri
      y = this.drawCompanyInfoSection(page, pageWidth, y, formData);
      y += 5;

      // VALIDITY satırı
      y = this.drawValiditySection(page, pageWidth, y, formData);
      y -= 13;

      // ARTICLE çizgisi ve başlığı
      page.drawLine({
        start: { x: 50, y: y + 21 },
        end: { x: pageWidth - 50, y: y + 21 },
        thickness: 1,
        color: rgb(0, 0, 0),
      });

      const articleLabel = this.languageService.getText('article', this.language);
      page.drawText(articleLabel, {
        x: 55,
        y: y + 4,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      y -= 10;
    };

    drawTopBoilerplate();

    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];

      // Calculate estimated height
      let leftLines = 1;
      if (article['COMPOSITION']) leftLines++;
      if (article['STANDARD BULK MOQ']) leftLines++;
      if (article['PERSONALIZED SAMPLING MOQ']) leftLines++;
      if (article['NOTES']) {
        const notLines = article['NOTES'].split('\n');
        leftLines += Math.min(notLines.length, 3);
      }
      const rightLines = Math.max(1, (article.priceTiers || []).length);
      const articleHeight = Math.max(leftLines, rightLines) * 11 + 15;

      const neededY = 135; // Leave room for fixed footer at bottom

      if (y - articleHeight < neededY && i > 0) {
        // Draw full footer for the current page before moving to next page
        this.drawPriceListFooter(page, pageWidth, 115, formData, signatureImage, stampImage, true);

        drawTopBoilerplate();
        pageIndex++;
      }

      y = this.drawSingleArticle(page, pageWidth, y, article, i, allArticles.length);
    }

    if (allArticles.length === 0) {
      y -= 10;
    }

    // FOOTER (Payment terms, signature, stamp) ALWAYS ON THE LAST PAGE AT FIXED POSITION
    this.drawPriceListFooter(page, pageWidth, 115, formData, signatureImage, stampImage, true);

    return this.pdfDoc;
  }

  drawPriceListHeader(page, pageWidth, y, formData) {
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

    // Tarih
    const dateInput = formData['PRICE LIST DATE'] || formData.priceListDate || null;
    let currentDate = new Date().toLocaleDateString('en-GB');
    if (dateInput && typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy && mm && dd) {
          currentDate = `${dd}.${mm}.${yyyy}`;
        }
      }
    }
    const dateLabel = this.languageService.getText('priceListDate', this.language);
    page.drawText(`${dateLabel}: ${currentDate}`, {
      x: pageWidth - 185,
      y: y + 15,
      size: 7,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Price List Number
    const priceListNumber = formData['PRICE LIST NUMBER'] || '';
    const numberLabel = this.languageService.getText('priceListNumber', this.language);
    page.drawText(`${numberLabel}: ${priceListNumber}`, {
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

    // ISSUER başlığı
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
      `${this.languageService.getText('telephone', this.language)}: ${formData.TELEPHONE || formData.telephone || '+39 333 289 46 99'}`,
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

    // RECIPIENT bilgileri
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

    // Adres
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

    // İlçe, İl, Ülke
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

    // Adres
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

    // İlçe, İl, Ülke
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

    return Math.min(recipientY, deliveryY) - 5;
  }

  drawValiditySection(page, pageWidth, y, formData) {
    // Validity çizgisi
    page.drawLine({
      start: { x: 50, y: y + 7 },
      end: { x: pageWidth - 50, y: y + 7 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    const validityDays = formData['VALIDITY DAYS'] || formData.validityDays || '60';
    const validityPrefix = this.languageService.getText('validityText', this.language);
    const validitySuffix = this.languageService.getText('validityFromIssueDate', this.language);

    // Prefix normal metin
    this.drawSafeText(page, validityPrefix, {
      x: 55,
      y: y - 5,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    // Gün sayısı - bold
    const prefixWidth = this.font.widthOfTextAtSize(validityPrefix + '  ', 8);
    const daysText = `${validityDays} ${this.language === 'tr' ? 'GUN' : 'DAYS'}`;
    this.drawSafeText(page, daysText, {
      x: 55 + prefixWidth,
      y: y - 5,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // Suffix normal metin
    const daysWidth = this.fontBold.widthOfTextAtSize(daysText + ' ', 8);
    this.drawSafeText(page, validitySuffix, {
      x: 55 + prefixWidth + daysWidth,
      y: y - 5,
      size: 8,
      font: this.font,
      color: rgb(0, 0, 0),
    });

    return y - 20;
  }

  drawSingleArticle(page, pageWidth, currentY, article, articleIndex, totalArticles) {
    let leftY = currentY;
    let rightY = currentY;
    const lineHeight = 11;

    // Artikel bilgisi satırı (Sol)
    const articleInfo = article['ARTICLE INFO'] || article.articleInfo || '';
    this.drawSafeText(page, articleInfo, {
      x: 55,
      y: leftY,
      size: 8,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });
    leftY -= lineHeight;

    // Composition (Sol)
    const composition = article['COMPOSITION'] || article.composition || '';
    if (composition) {
      this.drawSafeText(page, composition, {
        x: 55,
        y: leftY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      leftY -= lineHeight;
    }

    // Standard Bulk MOQ (Sol)
    const bulkMoq = article['STANDARD BULK MOQ'] || article.standardBulkMoq || '';
    if (bulkMoq) {
      const bulkMoqLabel = this.languageService.getText('standardBulkMoq', this.language);
      this.drawSafeText(page, `${bulkMoqLabel}`, {
        x: 55,
        y: leftY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      const labelWidth = this.font.widthOfTextAtSize(bulkMoqLabel + ' ', 8);
      this.drawSafeText(page, bulkMoq, {
        x: 55 + labelWidth,
        y: leftY,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
      leftY -= lineHeight;
    }

    // Personalized Sampling MOQ (Sol)
    const samplingMoq = article['PERSONALIZED SAMPLING MOQ'] || article.personalizedSamplingMoq || '';
    if (samplingMoq) {
      const samplingMoqLabel = this.languageService.getText('personalizedSamplingMoq', this.language);
      this.drawSafeText(page, `${samplingMoqLabel}`, {
        x: 55,
        y: leftY,
        size: 8,
        font: this.font,
        color: rgb(0, 0, 0),
      });
      const labelWidth = this.font.widthOfTextAtSize(samplingMoqLabel + ' ', 8);
      this.drawSafeText(page, samplingMoq, {
        x: 55 + labelWidth,
        y: leftY,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
      leftY -= lineHeight;
    }

    // Article Notes (Sol)
    const notes = article['NOTES'] || article.notes || '';
    if (notes.trim()) {
      const notesLabel = 'Note: ';
      this.drawSafeText(page, notesLabel, {
        x: 55,
        y: leftY,
        size: 8,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });
      const labelWidth = this.fontBold.widthOfTextAtSize(notesLabel, 8);

      const notLines = notes.split('\n');
      const maxWidth = pageWidth - 260; // Bırakılan boşluk (sağdaki fiyatları ezmemesi için)
      let linesDrawn = 0;

      for (let i = 0; i < notLines.length && linesDrawn < 3; i++) {
        const line = notLines[i];
        if (line.trim()) {
          const words = line.trim().split(' ');
          let currentLine = '';

          for (let j = 0; j < words.length && linesDrawn < 3; j++) {
            const testLine = currentLine + (currentLine ? ' ' : '') + words[j];
            const textWidth = this.font.widthOfTextAtSize(testLine, 8);

            if (textWidth > maxWidth && currentLine) {
              this.drawSafeText(page, currentLine, {
                x: linesDrawn === 0 ? 55 + labelWidth : 55,
                y: leftY,
                size: 8,
                font: this.font,
                color: rgb(0, 0, 0),
              });
              currentLine = words[j];
              leftY -= lineHeight;
              linesDrawn++;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine && linesDrawn < 3) {
            this.drawSafeText(page, currentLine, {
              x: linesDrawn === 0 ? 55 + labelWidth : 55,
              y: leftY,
              size: 8,
              font: this.font,
              color: rgb(0, 0, 0),
            });
            leftY -= lineHeight;
            linesDrawn++;
          }
        }
      }
    }

    // Sağ tarafta fiyat kademeleri başlıkları
    const priceTiers = article.priceTiers || [];
    priceTiers.forEach((tier) => {
      const tierLabel = tier.range || '';
      this.drawSafeText(page, tierLabel, {
        x: pageWidth - 200,
        y: rightY,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      // Fiyat
      const tierPrice = tier.price || '';
      const currency = article['CURRENCY'] || article.currency || 'EUR';
      const currencySymbol = currency === 'USD' ? '$' : currency === 'TRY' ? 'TL' : '€';
      this.drawSafeText(page, `${tierPrice}${currencySymbol}`, {
        x: pageWidth - 125,
        y: rightY,
        size: 7,
        font: this.font,
        color: rgb(0, 0, 0),
      });

      rightY -= lineHeight;
    });

    if (priceTiers.length === 0) {
      rightY -= lineHeight;
    }

    // Determine the bottom of this article
    currentY = Math.min(leftY, rightY);

    // Ürünler arası çizgi çizme
    if (articleIndex < totalArticles - 1) {
      currentY -= 3; // Boşluk
      page.drawLine({
        start: { x: 55, y: currentY + 5 },
        end: { x: pageWidth - 55, y: currentY + 5 },
        thickness: 0.5,
        color: rgb(0, 0, 0 ), // Açık gri çizgi
      });
      currentY -= 9; // Çizgi altı boşluk
    } else {
      currentY -= 5;
    }

    return currentY;
  }

  // Adres alanları için özel sarma metodu - yükseklik döndürür
  drawWrappedAddress(page, text, options) {
    if (!text) return 12;

    const { x, y, size, font, color, maxWidth, lineHeight = 12 } = options;
    const words = text.split(' ');
    let currentLine = '';
    let currentY = y;
    let lineCount = 0;

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
        lineCount++;

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

    if (currentLine) {
      page.drawText(currentLine, {
        x: x,
        y: currentY,
        size: size,
        font: font,
        color: color,
      });
    }

    return (lineCount + 1) * lineHeight;
  }


  drawPriceListFooter(page, pageWidth, startY = null, formData = {}, signatureImage = null, stampImage = null, isLastPage = true) {
    let y = startY ? startY : 120;

    const minFooterY = 85;
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
    const tuanaFont = this.tuanaFont || this.fontItalic;
    const textWidth = tuanaFont.widthOfTextAtSize(tuanaText, 8);
    const centerX = pageWidth / 2;

    // Normal TUANA yazısı
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

    if (!isLastPage) return;

    y -= 20;

    // Payment & Shipping Details
    const paymentShippingDetails = this.buildPaymentShippingDetails(formData);

    let footerY = y;
    paymentShippingDetails.forEach(info => {
      if (typeof info === 'string') {
        const heightUsed = this.drawWrappedAddress(page, info, {
          x: 55,
          y: footerY,
          size: 8,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 150,
          lineHeight: 12
        });
        footerY -= heightUsed;
      } else {
        const labelStr = info.label;
        page.drawText(labelStr, {
          x: 55,
          y: footerY,
          size: 8,
          font: this.font,
          color: rgb(0, 0, 0),
        });
        
        const labelWidth = this.font.widthOfTextAtSize(labelStr + ' ', 8);
        
        const heightUsed = this.drawWrappedAddress(page, info.value, {
          x: 55 + labelWidth,
          y: footerY,
          size: 8,
          font: this.font,
          color: rgb(0, 0, 0),
          maxWidth: 155 - labelWidth,
          lineHeight: 12
        });
        footerY -= heightUsed;
      }
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

    // Draw signature image if available
    if (signatureImage) {
      page.drawImage(signatureImage, {
        x: 215,
        y: y - 70,
        width: 160,
        height: 60,
      });
    }

    // Draw stamp image if available
    if (stampImage) {
      page.drawImage(stampImage, {
        x: 395,
        y: y - 70,
        width: 160,
        height: 60,
      });
    }

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
    await this.createPriceList(formData, this.language);
  }

  /**
   * PAYMENT & SHIPPING DETAILS alanlarını dinamik olarak oluştur
   * @param {Object} formData - Form verileri
   * @returns {Array} 
   */
  buildPaymentShippingDetails(formData) {
    const fields = [];

    // PAYMENT TERMS
    const paymentTermsValue = formData.paymentTerms || formData['Payment Terms'] || '';
    if (paymentTermsValue.trim()) {
      let translatedPaymentTerms = this.languageService.getPaymentTermsTranslation(paymentTermsValue, this.language);
      if (translatedPaymentTerms === paymentTermsValue) {
         translatedPaymentTerms = this.languageService.getPaymentTermsTranslation(paymentTermsValue.trim().toUpperCase(), this.language);
      }
      if (translatedPaymentTerms === paymentTermsValue.trim().toUpperCase()) {
         translatedPaymentTerms = paymentTermsValue.toUpperCase();
      }

      const paymentTermsLabel = this.languageService.getText('paymentTerms', this.language);
      fields.push(`${paymentTermsLabel}: ${translatedPaymentTerms}`);
    }

    // TRANSPORT TYPE
    const transportTypeValue = formData.transportType || formData['Transport Type'] || '';
    if (transportTypeValue.trim()) {
      const label = this.language === 'tr' ? 'TASIMA TIPI:' : 'TRANSPORT TYPE:';
      fields.push(`${label} ${transportTypeValue.trim()}`);
    }

    return fields;
  }
}

module.exports = PriceListTemplate;
