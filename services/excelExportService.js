const ExcelJS = require('exceljs');
const LanguageService = require('./languageService');
const fs = require('fs');
const path = require('path');

/**
 * Excel Export Service
 */
class ExcelExportService {
  constructor() {
    this.languageService = new LanguageService();
  }

  /**
   * Invoice verisini Excel formatına çevir
   * @param {Object} formData - Form verileri
   * @param {String} language - Dil ('tr' veya 'en')
   * @returns {Promise<Buffer>} Excel dosyası buffer
   */
  async generateInvoiceExcel(formData, language = 'en') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      language === 'tr' ? 'Fatura' : 'Invoice'
    );

    // Excel sütun genişlikleri
    worksheet.columns = [
      { width: 45 }, // A - Article Number
      { width: 22 }, // B - Weight/Width
      { width: 18 }, // C - Quantity
      { width: 15 }, // D - Price
      { width: 18 }, // E - Amount
    ];

    let currentRow = 1;

    // ============================================================================
    // HEADER SECTION
    // ============================================================================
    
    // TUANA TEKSTIL başlığı
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'TUANA TEKSTIL';
    titleCell.font = { size: 32, bold: false, name: 'Helvetica Neue' };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Logo
    try {
      let logoPath = path.join(__dirname, '..', 'logo.png');
      let logoBuffer = null;
      let logoExtension = 'png';
      
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      } else {
        // JPG logo dene
        logoPath = path.join(__dirname, '..', 'logo.jpg');
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          logoExtension = 'jpeg';
        }
      }
      
      if (logoBuffer) {
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: logoExtension,
        });
        
        // Logo pozisyonu - B sütununda, TUANA TEKSTIL'in yanında
        worksheet.addImage(logoId, {
          tl: { col: 1, row: 0.3 }, // B sütunu, row 1 (0-indexed)
          ext: { width: 45, height: 45 } // Logo boyutu
        });
      }
    } catch (logoError) {
      // Logo yüklenemezse devam et
      console.log('Logo could not be loaded:', logoError.message);
    }
    
    // Invoice Date ve Number
    const invoiceDateLabel = this.languageService.getText('invoiceDate', language);
    const invoiceNumberLabel = this.languageService.getText('invoiceNumber', language);
    const currentDate = new Date().toLocaleDateString('en-GB');
    const invoiceNumber = formData['INVOICE NUMBER'] || 'INV-2025-001';
    
    const dateCell = worksheet.getCell(`D${currentRow}`);
    dateCell.value = `${invoiceDateLabel}: ${currentDate}`;
    dateCell.font = { size: 9, bold: true };
    dateCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    const numberCell = worksheet.getCell(`E${currentRow}`);
    numberCell.value = `${invoiceNumberLabel}: ${invoiceNumber}`;
    numberCell.font = { size: 9, bold: true };
    numberCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    currentRow++;
    
    // Üst çizgi 
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const lineCell = worksheet.getCell(`A${currentRow}`);
    lineCell.border = {
      bottom: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;

    // Boş satır
    currentRow++;

    // ============================================================================
    // ISSUER SECTION
    // ============================================================================
    
    const issuerLabel = this.languageService.getText('issuer', language);
    const issuerCell = worksheet.getCell(`A${currentRow}`);
    issuerCell.value = issuerLabel;
    issuerCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    currentRow++;

    const issuerInfo = [
      'TUANA TEKSTIL SANAYI VE TICARET LIMITED SIRKETI',
      'A3 BLOK NUMARA 53 TEKSTILKENT ESENLER',
      'ISTANBUL TURKEY 34235',
      `${this.languageService.getText('vatTax', language)}: ATISALANI TR8590068726`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['RESPONSIBLE PERSON'] || formData.responsiblePerson || 'CENK YELMEN'}`,
      `${this.languageService.getText('telephone', language)}: ${formData.TELEPHONE || formData.telephone || '+90 333 234 45 38'}`,
      `${this.languageService.getText('email', language)}: ${formData.EMAIL || formData.email || 'CENK@TUANATEX.COM'}`
    ];

    issuerInfo.forEach(info => {
      const cell = worksheet.getCell(`A${currentRow}`);
      cell.value = info;
      cell.font = { size: 9, name: 'Helvetica Neue' };
      currentRow++;
    });

    // Boş satır
    currentRow++;

    // ============================================================================
    // RECIPIENT ve DELIVERY ADDRESS
    // ============================================================================
    
    const recipientStartRow = currentRow;
    
    // RECIPIENT (Sol taraf)
    const recipientLabel = this.languageService.getText('recipient', language);
    const recipientHeaderCell = worksheet.getCell(`A${currentRow}`);
    recipientHeaderCell.value = recipientLabel;
    recipientHeaderCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    
    // DELIVERY ADDRESS
    const deliveryAddressLabel = this.languageService.getText('deliveryAddress', language);
    const deliveryHeaderCell = worksheet.getCell(`C${currentRow}`);
    deliveryHeaderCell.value = deliveryAddressLabel;
    deliveryHeaderCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    
    currentRow++;

    // RECIPIENT bilgileri (Sol - A, B, C sütunları)
    const recipientInfo = [
      formData['RECIPIENT Şirket Adı'] || formData.recipientCompany || '---',
      formData['RECIPIENT Adres'] || formData.recipientAddress || '---',
      formData['RECIPIENT İlçe İl Ülke'] || formData.recipientLocation || '---',
      `${this.languageService.getText('vatTax', language)}: ${formData['RECIPIENT Vat'] || formData.recipientVat || '---'}`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['RECIPIENT Sorumlu Kişi'] || formData.recipientPerson || '---'}`,
      `${this.languageService.getText('telephone', language)}: ${formData['RECIPIENT Telefon'] || formData.recipientPhone || '---'}`,
      `${this.languageService.getText('email', language)}: ${formData['RECIPIENT Email'] || formData.recipientEmail || '---'}`
    ];

    // DELIVERY ADDRESS bilgileri (Sağ - D, E sütunları)
    const deliveryInfo = [
      formData['DELIVERY ADDRESS Şirket Adı'] || formData.deliveryCompany || '---',
      formData['DELIVERY ADDRESS Adres'] || formData.deliveryAddress || '---',
      formData['DELIVERY ADDRESS İlçe İl Ülke'] || formData.deliveryLocation || '---',
      `${this.languageService.getText('vatTax', language)}: ${formData['DELIVERY ADDRESS Vat'] || formData.deliveryVat || '---'}`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['DELIVERY ADDRESS Sorumlu Kişi'] || formData.deliveryPerson || '---'}`,
      `${this.languageService.getText('telephone', language)}: ${formData['DELIVERY ADDRESS Telefon'] || formData.deliveryPhone || '---'}`,
      `${this.languageService.getText('email', language)}: ${formData['DELIVERY ADDRESS Email'] || formData.deliveryEmail || '---'}`
    ];

    // Her iki sütunu aynı anda doldur
    const maxRows = Math.max(recipientInfo.length, deliveryInfo.length);
    for (let i = 0; i < maxRows; i++) {
      if (i < recipientInfo.length) {
        worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
        const recipientCell = worksheet.getCell(`A${currentRow}`);
        recipientCell.value = recipientInfo[i];
        recipientCell.font = { size: 9, name: 'Helvetica Neue' };
        recipientCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
      
      if (i < deliveryInfo.length) {
        worksheet.mergeCells(`C${currentRow}:E${currentRow}`);
        const deliveryCell = worksheet.getCell(`C${currentRow}`);
        deliveryCell.value = deliveryInfo[i];
        deliveryCell.font = { size: 9, name: 'Helvetica Neue' };
        deliveryCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      }
      
      currentRow++;
    }

    // Boş satır
    currentRow++;

    // ============================================================================
    // GOODS TABLE 
    // ============================================================================
    
    // Üst çizgi
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const topBorderCell = worksheet.getCell(`A${currentRow}`);
    topBorderCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    const descriptionOfGoodsLabel = this.languageService.getText('descriptionOfGoods', language);
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const goodsHeaderCell = worksheet.getCell(`A${currentRow}`);
    goodsHeaderCell.value = descriptionOfGoodsLabel;
    goodsHeaderCell.font = { bold: true, size: 10, name: 'Helvetica Neue' };
    goodsHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;

    // Tablo başlıkları
    const tableHeaders = [
      this.languageService.getText('articleNumber', language),
      this.languageService.getText('weightWidth', language),
      this.languageService.getText('quantityMeters', language),
      this.languageService.getText('price', language),
      this.languageService.getText('amount', language)
    ];

    const headerRow = worksheet.getRow(currentRow);
    tableHeaders.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 8, name: 'Helvetica Neue' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    headerRow.height = 25; 
    currentRow++;

    // Ürün satırları
    const goods = formData.goods || [];
    let totalAmount = 0;
    let totalQuantity = 0;
    let totalCurrency = 'EUR';

    goods.forEach((good, index) => {
      const dataRow = worksheet.getRow(currentRow);
      
      // Article Number
      const articleCell = dataRow.getCell(1);
      articleCell.value = good['ARTICLE NUMBER'] || '';
      articleCell.font = { size: 9, name: 'Helvetica Neue' };
      articleCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // Weight/Width
      const weightCell = dataRow.getCell(2);
      weightCell.value = good['WEIGHT / WIDHT'] || '';
      weightCell.font = { size: 9, name: 'Helvetica Neue' };
      weightCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Quantity
      const quantity = parseFloat((good['QUANTITY (METERS)'] || '0').replace(',', '.'));
      const quantityCell = dataRow.getCell(3);
      quantityCell.value = quantity;
      quantityCell.numFmt = '#,##0.00';
      quantityCell.font = { size: 9, name: 'Helvetica Neue' };
      quantityCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalQuantity += quantity;
      
      // Price
      const price = parseFloat((good['PRICE'] || '0').replace(',', '.'));
      const priceCell = dataRow.getCell(4);
      priceCell.value = price;
      priceCell.numFmt = '#,##0.00';
      priceCell.font = { size: 8, name: 'Arial' };
      priceCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Amount + Currency
      const amount = parseFloat((good['AMOUNT'] || '0').replace(',', '.'));
      const currency = good['CURRENCY'] || 'EUR';
      const amountCell = dataRow.getCell(5);
      amountCell.value = `${amount.toFixed(2)} ${currency}`;
      amountCell.font = { size: 8, name: 'Arial' };
      amountCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalAmount += amount;
      
      if (good['CURRENCY']) {
        totalCurrency = good['CURRENCY'];
      }
      
      // Kenarlıklar
      [1, 2, 3, 4, 5].forEach(colNum => {
        dataRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      // Satır yüksekliğini içeriğe göre ayarla
      const articleLength = (good['ARTICLE NUMBER'] || '').length;
      if (articleLength > 60) {
        dataRow.height = 35;
      } else if (articleLength > 40) {
        dataRow.height = 25;
      } else {
        dataRow.height = 20;
      }
      
      currentRow++;
    });

    // ============================================================================
    // TOTAL AMOUNT
    // ============================================================================
    
    const totalRow = worksheet.getRow(currentRow);
    const totalAmountLabel = this.languageService.getText('totalAmount', language);
    
    totalRow.getCell(1).value = totalAmountLabel;
    totalRow.getCell(1).font = { bold: true, size: 9, name: 'Arial' };
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    
    totalRow.getCell(3).value = `${totalQuantity.toFixed(2)} MT`;
    totalRow.getCell(3).font = { bold: true, size: 8, name: 'Arial' };
    totalRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    
    totalRow.getCell(5).value = `${totalAmount.toFixed(2)} ${totalCurrency}`;
    totalRow.getCell(5).font = { bold: true, size: 8, name: 'Arial' };
    totalRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
    
    [1, 2, 3, 4, 5].forEach(colNum => {
      totalRow.getCell(colNum).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      totalRow.getCell(colNum).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
    });
    totalRow.height = 20;
    currentRow++;

    // ============================================================================
    // DISCOUNT (if enabled) 
    // ============================================================================
    
    let discountedAmount = totalAmount;
    const discountEnabled = formData['Discount Enabled'];
    const discountOrani = parseFloat(formData['Discount'] || 0);
    
    if (discountEnabled && discountOrani > 0) {
      const discountRow = worksheet.getRow(currentRow);
      const discountLabel = language === 'tr' ? 'İNDİRİM' : 'DISCOUNT';
      
      discountRow.getCell(3).value = `% ${discountOrani} ${discountLabel}`;
      discountRow.getCell(3).font = { size: 9, name: 'Arial' };
      discountRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      
      const discountTutari = (totalAmount * discountOrani) / 100;
      discountRow.getCell(5).value = `-${discountTutari.toFixed(2)} ${totalCurrency}`;
      discountRow.getCell(5).font = { size: 9, name: 'Arial' };
      discountRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Sadece gerekli hücrelere border
      [1, 2, 3, 4, 5].forEach(colNum => {
        discountRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      discountedAmount = totalAmount - discountTutari;
      discountRow.height = 20;
      currentRow++;
    }

    // ============================================================================
    // KDV (if enabled) 
    // ============================================================================
    
    const kdvEnabled = formData['KDV Ekle Enabled'];
    const kdvOrani = parseFloat(formData['KDV'] || 0);
    
    if (kdvEnabled && kdvOrani > 0) {
      const kdvRow = worksheet.getRow(currentRow);
      const vatLabel = this.languageService.getText('vatTax', language);
      
      kdvRow.getCell(3).value = `% ${kdvOrani} ${vatLabel}`;
      kdvRow.getCell(3).font = { size: 9, name: 'Arial' };
      kdvRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      
      const kdvTutari = (discountedAmount * kdvOrani) / 100;
      kdvRow.getCell(5).value = kdvTutari.toFixed(2);
      kdvRow.getCell(5).numFmt = '#,##0.00';
      kdvRow.getCell(5).font = { size: 9, name: 'Arial' };
      kdvRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Sadece gerekli hücrelere border
      [1, 2, 3, 4, 5].forEach(colNum => {
        kdvRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      kdvRow.height = 20;
      currentRow++;
      
      // GENEL TOPLAM
      const genelToplamRow = worksheet.getRow(currentRow);
      const generalTotalLabel = this.languageService.getText('generalTotal', language);
      
      genelToplamRow.getCell(3).value = generalTotalLabel;
      genelToplamRow.getCell(3).font = { bold: true, size: 9, name: 'Arial' };
      genelToplamRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      
      const genelToplam = discountedAmount + kdvTutari;
      genelToplamRow.getCell(5).value = genelToplam.toFixed(2);
      genelToplamRow.getCell(5).numFmt = '#,##0.00';
      genelToplamRow.getCell(5).font = { bold: true, size: 9, name: 'Arial' };
      genelToplamRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      
      [1, 2, 3, 4, 5].forEach(colNum => {
        genelToplamRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      genelToplamRow.height = 20;
      currentRow++;
    } else if (discountEnabled && discountOrani > 0) {
      // Sadece discount varsa GENEL TOPLAM
      const genelToplamRow = worksheet.getRow(currentRow);
      const generalTotalLabel = this.languageService.getText('generalTotal', language);
      
      genelToplamRow.getCell(3).value = generalTotalLabel;
      genelToplamRow.getCell(3).font = { bold: true, size: 9, name: 'Arial' };
      genelToplamRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      
      genelToplamRow.getCell(5).value = `${discountedAmount.toFixed(2)} ${totalCurrency}`;
      genelToplamRow.getCell(5).font = { bold: true, size: 9, name: 'Arial' };
      genelToplamRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      
      [1, 2, 3, 4, 5].forEach(colNum => {
        genelToplamRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      genelToplamRow.height = 20;
      currentRow++;
    }

    // Boş satır
    currentRow++;

    // ============================================================================
    // CURRENCY INFO
    // ============================================================================
    
    const kurBilgisiEnabled = formData['Kur Bilgisi Enabled'];
    const kurBilgisi = formData['Kur Bilgisi'];
    
    if (kurBilgisiEnabled && kurBilgisi) {
      const currencyInfoLabel = this.languageService.getText('currencyInfo', language);
      const currencyCell = worksheet.getCell(`A${currentRow}`);
      currencyCell.value = `${currencyInfoLabel}: ${kurBilgisi}`;
      currencyCell.font = { bold: true, size: 9, name: 'Arial' };
      currentRow++;
      currentRow++;
    }

    // ============================================================================
    // NOTES
    // ============================================================================
    
    // Üst çizgi
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const notesTopBorderCell = worksheet.getCell(`A${currentRow}`);
    notesTopBorderCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    if (formData['Notlar'] && formData['Notlar'].trim()) {
      const notesLabel = this.languageService.getText('notes', language);
      const notesHeaderCell = worksheet.getCell(`A${currentRow}`);
      notesHeaderCell.value = notesLabel;
      notesHeaderCell.font = { bold: true, size: 9, name: 'Arial' };
      currentRow++;
      
      const notLines = formData['Notlar'].split('\n');
      notLines.forEach(line => {
        if (line.trim()) {
          const noteCell = worksheet.getCell(`A${currentRow}`);
          noteCell.value = line.trim();
          noteCell.font = { size: 9, name: 'Arial' };
          currentRow++;
        }
      });
    }
    
    // Alt çizgi
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const notesBottomBorderCell = worksheet.getCell(`A${currentRow}`);
    notesBottomBorderCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    currentRow++;

    // ============================================================================
    // BANK INFORMATION
    // ============================================================================
    
    const bankaBilgileri = formData['Banka Bilgileri'];
    if (bankaBilgileri) {
      const bankInformationsLabel = this.languageService.getText('bankInformations', language);
      const bankHeaderCell = worksheet.getCell(`A${currentRow}`);
      bankHeaderCell.value = bankInformationsLabel;
      bankHeaderCell.font = { bold: true, size: 9, name: 'Arial' };
      currentRow++;
      
      const bankaHesapBilgileri = this.getBankAccountInfo(bankaBilgileri);
      if (bankaHesapBilgileri) {
        const bankaLines = bankaHesapBilgileri.split('\n');
        bankaLines.forEach(line => {
          if (line.trim()) {
            const bankCell = worksheet.getCell(`A${currentRow}`);
            bankCell.value = line.trim();
            bankCell.font = { size: 9, name: 'Arial' };
            currentRow++;
          }
        });
      }
      
      currentRow++;
    }

    // ============================================================================
    // PAYMENT & SHIPPING DETAILS 
    // ============================================================================
    
    const paymentShippingDetails = this.buildPaymentShippingDetails(formData, language);
    if (paymentShippingDetails.length > 0) {
      paymentShippingDetails.forEach(info => {
        const detailCell = worksheet.getCell(`A${currentRow}`);
        detailCell.value = info;
        detailCell.font = { size: 9, name: 'Arial' };
        currentRow++;
      });
    }
    
    // ============================================================================
    // FOOTER
    // ============================================================================
    
    currentRow++;
    
    // Alt çizgi (TUANA'dan önce)
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const footerTopBorderCell = worksheet.getCell(`A${currentRow}`);
    footerTopBorderCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    // TUANA yazısı - merkezi
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const tuanaCell = worksheet.getCell(`A${currentRow}`);
    tuanaCell.value = 'TUANA';
    tuanaCell.font = { size: 9, italic: true, name: 'Arial' };
    tuanaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
    
    // Alt çizgi (TUANA'dan sonra)
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const footerBottomBorderCell = worksheet.getCell(`A${currentRow}`);
    footerBottomBorderCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    currentRow++;
    
    // Signature ve Stamp bölümleri
    const signatureLabel = this.languageService.getText('signature', language);
    const stampLabel = this.languageService.getText('stamp', language);
    
    worksheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const signatureHeaderCell = worksheet.getCell(`A${currentRow}`);
    signatureHeaderCell.value = signatureLabel;
    signatureHeaderCell.font = { bold: true, size: 10, name: 'Arial' };
    signatureHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.mergeCells(`D${currentRow}:E${currentRow}`);
    const stampHeaderCell = worksheet.getCell(`D${currentRow}`);
    stampHeaderCell.value = stampLabel;
    stampHeaderCell.font = { bold: true, size: 10, name: 'Arial' };
    stampHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Signature ve Stamp için boş alan (5 satır)
    for (let i = 0; i < 5; i++) {
      currentRow++;
    }

    // Excel buffer'ı oluştur ve döndür
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Banka hesap bilgilerini döndür
   * @param {String} currency - Para birimi
   * @returns {String} Banka bilgileri
   */
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
IBAN: TR02 0003 2000 0320 0000 9679 79
SWIFT: TEBUTRIS 032`
    };

    return bankAccounts[currency] || '';
  }

  /**
   * Ödeme ve sevkiyat detaylarını oluştur
   * @param {Object} formData - Form verileri
   * @param {String} language - Dil
   * @returns {Array} Detay satırları
   */
  buildPaymentShippingDetails(formData, language) {
    const fields = [];

    // PAYMENT TERMS
    const paymentTermsValue = formData.paymentTerms || formData['Payment Terms'] || '';
    if (paymentTermsValue.trim()) {
      const label = language === 'tr' ? 'ÖDEME KOŞULLARI:' : 'PAYMENT TERMS:';
      fields.push(`${label} ${paymentTermsValue.trim()}`);
    }

    // TRANSPORT TYPE
    const transportTypeValue = formData.transportType || formData['Transport Type'] || '';
    if (transportTypeValue.trim()) {
      const label = language === 'tr' ? 'TAŞIMA TİPİ:' : 'TRANSPORT TYPE:';
      fields.push(`${label} ${transportTypeValue.trim()}`);
    }

    // COUNTRY OF ORIGIN
    const countryOfOriginValue = formData.countryOfOrigin || formData['Country of Origin'] || '';
    if (countryOfOriginValue.trim()) {
      const label = language === 'tr' ? 'MENŞE ÜLKESİ:' : 'COUNTRY OF ORIGIN:';
      fields.push(`${label} ${countryOfOriginValue.trim()}`);
    }

    // GROSS WEIGHT
    const grossWeightValue = formData.grossWeight || formData['Gross Weight'] || '';
    if (grossWeightValue.trim()) {
      const label = language === 'tr' ? 'BRÜT AĞIRLIK:' : 'GROSS WEIGHT:';
      fields.push(`${label} ${grossWeightValue.trim()}`);
    }

    // NET WEIGHT
    const netWeightValue = formData.netWeight || formData['Net Weight'] || '';
    if (netWeightValue.trim()) {
      const label = language === 'tr' ? 'NET AĞIRLIK:' : 'NET WEIGHT:';
      fields.push(`${label} ${netWeightValue.trim()}`);
    }

    // ROLLS
    const rollsValue = formData.rolls || formData['Rolls'] || '';
    if (rollsValue.trim()) {
      const label = language === 'tr' ? 'TOP SAYISI:' : 'ROLLS:';
      fields.push(`${label} ${rollsValue.trim()}`);
    }

    // LEAD TIME
    const leadTimeValue = formData.leadTime || formData['Lead Time'] || '';
    if (leadTimeValue.trim()) {
      const label = language === 'tr' ? 'TESLİM SÜRESİ:' : 'LEAD TIME:';
      fields.push(`${label} ${leadTimeValue.trim()}`);
    }

    return fields;
  }

  /**
   * Proforma Invoice verisini Excel formatına çevir
   * @param {Object} formData - Form verileri
   * @param {String} language - Dil ('tr' veya 'en')
   * @returns {Promise<Buffer>} Excel dosyası buffer
   */
  async generateProformaExcel(formData, language = 'en') {
    // Proforma Invoice da Invoice ile aynı yapıda, sadece başlık farklı
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      language === 'tr' ? 'Proforma Fatura' : 'Proforma Invoice'
    );

    // Excel sütun genişliklerini ayarla
    worksheet.columns = [
      { width: 45 }, // A - Article Number
      { width: 22 }, // B - Weight/Width
      { width: 18 }, // C - Quantity
      { width: 15 }, // D - Price
      { width: 18 }, // E - Amount
    ];

    let currentRow = 1;

    // HEADER SECTION
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'TUANA TEKSTIL';
    titleCell.font = { size: 32, bold: false, name: 'Helvetica Neue' };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Logo ekleme
    try {
      let logoPath = path.join(__dirname, '..', 'logo.png');
      let logoBuffer = null;
      let logoExtension = 'png';
      
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      } else {
        logoPath = path.join(__dirname, '..', 'logo.jpg');
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          logoExtension = 'jpeg';
        }
      }
      
      if (logoBuffer) {
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: logoExtension,
        });
        
        worksheet.addImage(logoId, {
          tl: { col: 1, row: 0.3 },
          ext: { width: 45, height: 45 }
        });
      }
    } catch (logoError) {
      console.log('Logo could not be loaded:', logoError.message);
    }
    
    // Proforma Invoice Date ve Number
    const proformaDateLabel = language === 'tr' ? 'Proforma Fatura Tarihi' : 'Proforma Invoice Date';
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    const dateCell = worksheet.getCell(`D${currentRow}`);
    dateCell.value = `${proformaDateLabel}: ${currentDate}`;
    dateCell.font = { size: 9, bold: true };
    dateCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    const numberCell = worksheet.getCell(`E${currentRow}`);
    numberCell.font = { size: 9, bold: true };
    numberCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    currentRow++;
    
    // Üst çizgi
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    const lineCell = worksheet.getCell(`A${currentRow}`);
    lineCell.border = {
      bottom: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    currentRow++;

    // Proforma için Invoice metodunu kullan (aynı yapı)
    // ISSUER, RECIPIENT, DELIVERY, GOODS TABLE, TOTALS vb. aynı
    return this.generateInvoiceExcel(formData, language);
  }

  /**
   * Packing List verisini Excel formatına çevir
   * @param {Object} formData - Form verileri
   * @param {String} language - Dil ('tr' veya 'en')
   * @returns {Promise<Buffer>} Excel dosyası buffer
   */
  async generatePackingListExcel(formData, language = 'en') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(
      language === 'tr' ? 'Paketleme Listesi' : 'Packing List'
    );

    // Excel sütun genişlikleri
    worksheet.columns = [
      { width: 45 }, // A - Article Number
      { width: 22 }, // B - Weight/Width
      { width: 18 }, // C - Quantity
      { width: 15 }, // D - Carton No
      { width: 18 }, // E - Net Weight
    ];

    let currentRow = 1;

    // HEADER
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = 'TUANA TEKSTIL';
    titleCell.font = { size: 32, bold: false, name: 'Helvetica Neue' };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Logo
    try {
      let logoPath = path.join(__dirname, '..', 'logo.png');
      let logoBuffer = null;
      let logoExtension = 'png';
      
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      } else {
        logoPath = path.join(__dirname, '..', 'logo.jpg');
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath);
          logoExtension = 'jpeg';
        }
      }
      
      if (logoBuffer) {
        const logoId = workbook.addImage({
          buffer: logoBuffer,
          extension: logoExtension,
        });
        
        // Logo pozisyonu - D sütununda, TUANA TEKSTIL'in yanında
        worksheet.addImage(logoId, {
          tl: { col: 2, row: 0.5 },
          ext: { width: 45, height: 45 }
        });
      }
    } catch (logoError) {
      console.log('Logo could not be loaded:', logoError.message);
    }
    
    // Packing List Date ve Number - sağda, G sütununda
    const packingListDateLabel = language === 'tr' ? 'Paketleme Listesi Tarihi' : 'Packing List Date';
    const packingListNumberLabel = language === 'tr' ? 'Paketleme Listesi No' : 'Packing List Number';
    const currentDate = new Date().toLocaleDateString('en-GB');
    const packingListNumber = formData['INVOICE NUMBER'] || 'PL-2025-001';
    
    const dateCell = worksheet.getCell(`F${currentRow}`);
    dateCell.value = `${packingListDateLabel}: ${currentDate}`;
    dateCell.font = { size: 9, bold: true };
    dateCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    const numberCell = worksheet.getCell(`G${currentRow}`);
    numberCell.value = `${packingListNumberLabel}: ${packingListNumber}`;
    numberCell.font = { size: 9, bold: true };
    numberCell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true };
    
    currentRow++;
    
    // Üst çizgi - 7 sütun için
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const lineCell = worksheet.getCell(`A${currentRow}`);
    lineCell.border = {
      bottom: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    currentRow++;

    // ISSUER SECTION
    const issuerLabel = this.languageService.getText('issuer', language);
    const issuerCell = worksheet.getCell(`A${currentRow}`);
    issuerCell.value = issuerLabel;
    issuerCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    currentRow++;

    const issuerInfo = [
      'TUANA TEKSTIL SANAYI VE TICARET LIMITED SIRKETI',
      'A3 BLOK NUMARA 53 TEKSTILKENT ESENLER',
      'ISTANBUL TURKEY 34235',
      `${this.languageService.getText('vatTax', language)}: ATISALANI TR8590068726`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['RESPONSIBLE PERSON'] || formData.responsiblePerson || 'CENK YELMEN'}`,
      `${this.languageService.getText('telephone', language)}: ${formData.TELEPHONE || formData.telephone || '+90 333 234 45 38'}`,
      `${this.languageService.getText('email', language)}: ${formData.EMAIL || formData.email || 'CENK@TUANATEX.COM'}`
    ];

    issuerInfo.forEach(info => {
      const cell = worksheet.getCell(`A${currentRow}`);
      cell.value = info;
      cell.font = { size: 9, name: 'Helvetica Neue' };
      currentRow++;
    });

    currentRow++;

    // RECIPIENT ve DELIVERY ADDRESS - PDF gibi yan yana, D sütununda
    const recipientLabel = this.languageService.getText('recipient', language);
    const recipientHeaderCell = worksheet.getCell(`A${currentRow}`);
    recipientHeaderCell.value = recipientLabel;
    recipientHeaderCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    
    const deliveryAddressLabel = this.languageService.getText('deliveryAddress', language);
    const deliveryHeaderCell = worksheet.getCell(`D${currentRow}`);
    deliveryHeaderCell.value = deliveryAddressLabel;
    deliveryHeaderCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    
    currentRow++;

    const recipientInfo = [
      formData['RECIPIENT Şirket Adı'] || formData.recipientCompany || '---',
      formData['RECIPIENT Adres'] || formData.recipientAddress || '---',
      formData['RECIPIENT İlçe İl Ülke'] || formData.recipientLocation || '---',
      `${this.languageService.getText('vatTax', language)}: ${formData['RECIPIENT Vat'] || formData.recipientVat || '---'}`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['RECIPIENT Sorumlu Kişi'] || formData.recipientPerson || '---'}`,
      `${this.languageService.getText('telephone', language)}: ${formData['RECIPIENT Telefon'] || formData.recipientPhone || '---'}`,
      `${this.languageService.getText('email', language)}: ${formData['RECIPIENT Email'] || formData.recipientEmail || '---'}`
    ];

    const deliveryInfo = [
      formData['DELIVERY ADDRESS Şirket Adı'] || formData.deliveryCompany || '---',
      formData['DELIVERY ADDRESS Adres'] || formData.deliveryAddress || '---',
      formData['DELIVERY ADDRESS İlçe İl Ülke'] || formData.deliveryLocation || '---',
      `${this.languageService.getText('vatTax', language)}: ${formData['DELIVERY ADDRESS Vat'] || formData.deliveryVat || '---'}`,
      `${this.languageService.getText('responsiblePerson', language)}: ${formData['DELIVERY ADDRESS Sorumlu Kişi'] || formData.deliveryPerson || '---'}`,
      `${this.languageService.getText('telephone', language)}: ${formData['DELIVERY ADDRESS Telefon'] || formData.deliveryPhone || '---'}`,
      `${this.languageService.getText('email', language)}: ${formData['DELIVERY ADDRESS Email'] || formData.deliveryEmail || '---'}`
    ];

    const maxRows = Math.max(recipientInfo.length, deliveryInfo.length);
    for (let i = 0; i < maxRows; i++) {
      if (i < recipientInfo.length) {
        worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
        const recipientCell = worksheet.getCell(`A${currentRow}`);
        recipientCell.value = recipientInfo[i];
        recipientCell.font = { size: 9, name: 'Helvetica Neue' };
        recipientCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
      
      if (i < deliveryInfo.length) {
        worksheet.mergeCells(`D${currentRow}:G${currentRow}`);
        const deliveryCell = worksheet.getCell(`D${currentRow}`);
        deliveryCell.value = deliveryInfo[i];
        deliveryCell.font = { size: 9, name: 'Helvetica Neue' };
        deliveryCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
      
      currentRow++;
    }

    currentRow++;

    // PACKING DETAILS başlık - PDF gibi
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const topBorderCell = worksheet.getCell(`A${currentRow}`);
    topBorderCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    const packingDetailsLabel = language === 'tr' ? 'PAKETLEME DETAYLARI' : 'PACKING DETAILS';
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const packingHeaderCell = worksheet.getCell(`A${currentRow}`);
    packingHeaderCell.value = packingDetailsLabel;
    packingHeaderCell.font = { bold: true, size: 11, name: 'Helvetica Neue' };
    packingHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow++;
    currentRow++;

    // Tablo başlıkları - Packing List için özel 7 sütun
    const tableHeaders = [
      this.languageService.getText('articleNumberCompositionCustomsCode', language),
      this.languageService.getText('fabricWeightWidth', language),
      this.languageService.getText('quantityMeters', language),
      this.languageService.getText('rollNumberRollDimensions', language),
      this.languageService.getText('lot', language),
      this.languageService.getText('grossWeightKg', language),
      this.languageService.getText('netWeightKg', language)
    ];

    // Sütun genişliklerini güncelle - A4'e sığacak şekilde
    worksheet.columns = [
      { width: 32 }, // A - Article Number/Composition/Customs Code
      { width: 16 }, // B - Fabric Weight/Width
      { width: 12 }, // C - Quantity
      { width: 16 }, // D - Roll Number/Dimensions
      { width: 8 }, // E - Lot
      { width: 12 }, // F - Gross Weight
      { width: 12 }, // G - Net Weight
    ];

    const headerRow = worksheet.getRow(currentRow);
    tableHeaders.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 8, name: 'Helvetica Neue' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    headerRow.height = 25;
    currentRow++;

    // Ürün satırları - packingItems kullan
    const packingItems = formData.packingItems || [];
    let totalQuantity = 0;
    let totalGrossWeight = 0;
    let totalNetWeight = 0;

    packingItems.forEach((item) => {
      const dataRow = worksheet.getRow(currentRow);
      
      // Article Number / Composition / Customs Code
      const articleCell = dataRow.getCell(1);
      articleCell.value = item['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE'] || '';
      articleCell.font = { size: 9, name: 'Helvetica Neue' };
      articleCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // Fabric Weight / Width
      const fabricCell = dataRow.getCell(2);
      fabricCell.value = item['FABRIC WEIGHT / WIDHT'] || '';
      fabricCell.font = { size: 9, name: 'Helvetica Neue' };
      fabricCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Quantity (Meters)
      const quantity = parseFloat((item['QUANTITY (METERS)'] || '0').replace(',', '.'));
      const quantityCell = dataRow.getCell(3);
      quantityCell.value = quantity;
      quantityCell.numFmt = '#,##0.00';
      quantityCell.font = { size: 9, name: 'Helvetica Neue' };
      quantityCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalQuantity += quantity;
      
      // Roll Number / Roll Dimensions
      const rollCell = dataRow.getCell(4);
      rollCell.value = item['ROLL NUMBER ROLL DIMENSIONS'] || '';
      rollCell.font = { size: 8, name: 'Helvetica Neue' };
      rollCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      
      // Lot
      const lotCell = dataRow.getCell(5);
      lotCell.value = item['LOT'] || '';
      lotCell.font = { size: 8, name: 'Helvetica Neue' };
      lotCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Gross Weight
      const grossWeight = parseFloat((item['GROSS WEIGHT(KG)'] || '0').replace(',', '.'));
      const grossWeightCell = dataRow.getCell(6);
      grossWeightCell.value = grossWeight;
      grossWeightCell.numFmt = '#,##0.00';
      grossWeightCell.font = { size: 8, name: 'Helvetica Neue' };
      grossWeightCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalGrossWeight += grossWeight;
      
      // Net Weight
      const netWeight = parseFloat((item['NET WEIGHT (KG)'] || '0').replace(',', '.'));
      const netWeightCell = dataRow.getCell(7);
      netWeightCell.value = netWeight;
      netWeightCell.numFmt = '#,##0.00';
      netWeightCell.font = { size: 8, name: 'Helvetica Neue' };
      netWeightCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalNetWeight += netWeight;
      
      [1, 2, 3, 4, 5, 6, 7].forEach(colNum => {
        dataRow.getCell(colNum).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      const articleLength = (item['ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE'] || '').length;
      dataRow.height = articleLength > 80 ? 45 : articleLength > 60 ? 35 : articleLength > 40 ? 25 : 20;
      
      currentRow++;
    });

    // TOTAL ROW
    const totalRow = worksheet.getRow(currentRow);
    const totalLabel = language === 'tr' ? 'TOPLAM' : 'TOTAL';
    
    totalRow.getCell(1).value = totalLabel;
    totalRow.getCell(1).font = { bold: true, size: 9, name: 'Helvetica Neue' };
    totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    
    totalRow.getCell(3).value = `${totalQuantity.toFixed(2)} MT`;
    totalRow.getCell(3).font = { bold: true, size: 8, name: 'Helvetica Neue' };
    totalRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    
    totalRow.getCell(6).value = `${totalGrossWeight.toFixed(2)} KG`;
    totalRow.getCell(6).font = { bold: true, size: 8, name: 'Helvetica Neue' };
    totalRow.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
    
    totalRow.getCell(7).value = `${totalNetWeight.toFixed(2)} KG`;
    totalRow.getCell(7).font = { bold: true, size: 8, name: 'Helvetica Neue' };
    totalRow.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
    
    [1, 2, 3, 4, 5, 6, 7].forEach(colNum => {
      totalRow.getCell(colNum).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      totalRow.getCell(colNum).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' }
      };
    });
    totalRow.height = 20;
    currentRow++;
    currentRow++;

    // PAYMENT TERMS, TRANSPORT TYPE, COUNTRY OF ORIGIN - PDF gibi footer üstü
    const paymentShippingDetails = [];
    
    const paymentTermsValue = formData['Payment Terms'] || formData.paymentTerms || '';
    if (paymentTermsValue.trim()) {
      const paymentTermsLabel = this.languageService.getText('paymentTerms', language);
      paymentShippingDetails.push(`${paymentTermsLabel}: ${paymentTermsValue}`);
    }
    
    const transportTypeValue = formData['Transport Type'] || formData.transportType || '';
    if (transportTypeValue.trim()) {
      const transportTypeLabel = this.languageService.getText('transportType', language);
      paymentShippingDetails.push(`${transportTypeLabel}: ${transportTypeValue}`);
    }
    
    const countryOfOriginValue = formData['Country of Origin'] || formData.countryOfOrigin || '';
    if (countryOfOriginValue.trim()) {
      const countryOfOriginLabel = this.languageService.getText('countryOfOrigin', language);
      paymentShippingDetails.push(`${countryOfOriginLabel}: ${countryOfOriginValue}`);
    }
    
    // Bu bilgileri ekrana yaz
    paymentShippingDetails.forEach(detail => {
      worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
      const detailCell = worksheet.getCell(`A${currentRow}`);
      detailCell.value = detail;
      detailCell.font = { size: 9, name: 'Helvetica Neue' };
      detailCell.alignment = { horizontal: 'left', vertical: 'middle' };
      currentRow++;
    });
    
    if (paymentShippingDetails.length > 0) {
      currentRow++;
    }

    // FOOTER - 7 sütun için
    currentRow++;
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerTopBorderCell = worksheet.getCell(`A${currentRow}`);
    footerTopBorderCell.border = {
      top: { style: 'thick', color: { argb: 'FF000000' } }
    };
    currentRow++;
    
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const tuanaCell = worksheet.getCell(`A${currentRow}`);
    tuanaCell.value = 'TUANA';
    tuanaCell.font = { size: 9, italic: true, name: 'Helvetica Neue' };
    tuanaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow++;
    
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerBottomBorderCell = worksheet.getCell(`A${currentRow}`);
    footerBottomBorderCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = ExcelExportService;
