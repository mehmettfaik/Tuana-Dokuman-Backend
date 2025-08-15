const { StandardFonts, rgb } = require('pdf-lib');
const BasePdfTemplate = require('../BasePdfTemplate');
const WashingIconsService = require('../../services/washingIconsService');
const FontService = require('../../services/fontService');
const LanguageService = require('../../services/languageService');

class TechnicalSheetTemplate extends BasePdfTemplate {
  constructor(pdfDoc, logoImage = null, language = 'en') {
    super(pdfDoc, logoImage);
    this.washingIconsService = new WashingIconsService();
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
      // //console.log('HelveticaNeueLightItalic font not found, using default italic font');
      this.tuanaFont = this.fontItalic; // Fallback
    }
  }

  async createFabricTechnicalSheet(formData = {}, language = null) {
    // Language parametresi varsa kullan, yoksa constructor'dan al
    if (language) {
      this.language = language;
    }
    
    const page = this.pdfDoc.addPage([595, 842]); // A4 boyut
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    let y = pageHeight - 60; // Üst margin

    // HEADER
    this.drawHeader(page, pageWidth, y);
    y -= 70;

    // FABRIC TECHNICAL SHEET başlığı - dil desteği ile
    const technicalSheetTitle = this.languageService.getText('fabricTechnicalSheet', this.language);
    page.drawText(technicalSheetTitle, {
      x: 55,
      y: y + 25,
      size: 18,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    y += 15;

    // FORM TABLOSU
    y = this.drawFormTable(page, pageWidth, y, formData);
    y -= 40;

    // WASH AND CARE INSTRUCTIONS - tek resim ile
    y = await this.drawWashCareSection(page, pageWidth, y, formData);
    y -= 80; // Resim için daha fazla alan

    // NOTES bölümü
    y = this.drawNotesSection(page, pageWidth, y, formData);

    // FOOTER - formData ile
    this.drawFooter(page, pageWidth, formData);

    return this.pdfDoc;
  }

  // Ultra ince metin çizimi
  drawUltraLightText(page, text, options) {
    // Normal metni çiz (ince görünüm için)
    page.drawText(text, {
      x: options.x,
      y: options.y,
      size: options.size,
      font: options.font,
      color: options.color,
    });
    
    // Ekstra ince görünüm için hafif gri ton overlay (opsiyonel)
    // Bu, metni daha ince gösterir
  }

  drawFormTable(page, pageWidth, y, formData) {
    // //console.log('drawFormTable called with formData:', formData);
    
    // Field mapping for translations
    const fieldMappings = {
      'ARTICLE CODE:': 'articleCode',
      'COMPOSITION:': 'composition',
      'WEIGHT:': 'weight',
      'WIDTH / CUTABLE WIDTH:': 'widthCutableWidth',
      'CERTIFICATION:': 'certification',
      'CONSTRUCTION:': 'construction',
      'FINISH:': 'finishing',
      'COLOUR:': 'colour',
      'JACQUARD PATTERN NAME:': 'jacquardPatternName',
      'ORIGIN:': 'origin',
      'SHRINKAGE IN WARP:': 'shrinkageInWarp',
      'SHRINKAGE IN WEFT:': 'shrinkageInWeft',
      'CUSTOM TARIFF CODE:': 'customTariffCode',
      'WEAVE TYPE:': 'weaveType',
    };
    
    const allTableFields = [
      'ARTICLE CODE:',
      'COMPOSITION:',
      'WEIGHT:',
      'WIDTH / CUTABLE WIDTH:',
      'CERTIFICATION:',
      'CONSTRUCTION:',
      'FINISH:',
      'COLOUR:',
      'JACQUARD PATTERN NAME:',
      'ORIGIN:',
      'SHRINKAGE IN WARP:',
      'SHRINKAGE IN WEFT:',
      'CUSTOM TARIFF CODE:',
      'WEAVE TYPE:',
    ];

    // Sadece dolu olan alanları filtrele
    const tableFields = allTableFields.filter(field => {
      if (!formData) return false;
      
      let fieldKey = field.replace(':', '').trim();
      
      // WEAVE TYPE için özel mapping
      if (fieldKey === 'WEAVE TYPE') {
        fieldKey = 'WEAW TYPE'; // frontend'den gelen key format
      }
      
      // Yeni alanlar için mapping (gerekirse)
      if (fieldKey === 'ISSUED BY') {
        fieldKey = 'ISSUED BY'; // frontend key ile aynı (değişiklik yok)
      }
      if (fieldKey === 'RESPONSIBLE TECHNICIAN') {
        fieldKey = 'RESPONSIBLE TECHNICIAN'; // frontend key ile aynı (değişiklik yok)
      }
      
      const value = formData[fieldKey] || '';
      
      //console.log(`Field: ${field}, FieldKey: ${fieldKey}, Value: "${value}"`);
      
      // İmza alanları her zaman dahil et (boş olsa bile)
      if (fieldKey === 'ISSUED BY' || fieldKey === 'RESPONSIBLE TECHNICIAN') {
        return true;
      }
      
      // Diğer alanlar için boş olmayan değerleri dahil et
      return value.toString().trim() !== '';
    });

    // Eğer hiç dolu alan yoksa, minimum bir alan göster
    if (tableFields.length === 0) {
      tableFields.push('ARTICLE CODE:'); // En azından bir alan göster
    }

    // Tablo çerçevesi - dinamik yükseklik
    const tableHeight = tableFields.length * 25;
    const tableWidth = pageWidth - 100;

    page.drawRectangle({
      x: 50,
      y: y - tableHeight,
      width: tableWidth,
      height: tableHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Tablo satırları
    tableFields.forEach((field, index) => {
      const rowY = y - (index * 25);

      // Yatay çizgi
      if (index > 0) {
        page.drawLine({
          start: { x: 50, y: rowY },
          end: { x: 50 + tableWidth, y: rowY },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });
      }

      // Dikey çizgi (label ve value arasında)
      page.drawLine({
        start: { x: 220, y: rowY },
        end: { x: 220, y: rowY - 25 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });

      // Label metni - BOLD - dinamik çeviri ile
      const translationKey = fieldMappings[field];
      const translatedLabel = translationKey ? this.languageService.getText(translationKey, this.language) : field.replace(':', '');
      page.drawText(`${translatedLabel}:`, {
        x: 60,
        y: rowY - 18,
        size: 9,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      // Value metni (form verilerinden gelecek)
      if (formData) {
        let fieldKey = field.replace(':', '').trim();
        
        // WEAVE TYPE için özel mapping
        if (fieldKey === 'WEAVE TYPE') {
          fieldKey = 'WEAW TYPE'; // frontend'den gelen key format
        }
        
        // Yeni alanlar için mapping (gerekirse)
        if (fieldKey === 'ISSUED BY') {
          fieldKey = 'ISSUED BY'; // frontend key ile aynı
        }
        if (fieldKey === 'RESPONSIBLE TECHNICIAN') {
          fieldKey = 'RESPONSIBLE TECHNICIAN'; // frontend key ile aynı
        }
        
        const value = formData[fieldKey] || '';
        
        // Birim ekleme işlemleri
        let displayValue = value.toString();
        if (fieldKey === 'WEIGHT' && displayValue.trim() !== '') {
          // WEIGHT için sonuna GR/M2 ekle (eğer zaten yoksa)
          if (!displayValue.toLowerCase().includes('gr/m2')) {
            const grm2Unit = this.languageService.getText('grm2', this.language);
            displayValue = displayValue + ' ' + grm2Unit;
          }
        }
        if (fieldKey === 'WIDTH / CUTABLE WIDTH' && displayValue.trim() !== '') {
          // WIDTH için sonuna CM ekle (eğer zaten yoksa)
          if (!displayValue.toLowerCase().includes('cm')) {
            const cmUnit = this.languageService.getText('cm', this.language);
            displayValue = displayValue + ' ' + cmUnit;
          }
        }
        
        // Güvenli metin çizimi kullan
        this.drawSafeText(page, displayValue, {
          x: 230,
          y: rowY - 18,
          size: 9,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      }
    });

    return y - tableHeight;
  }

  async drawWashCareSection(page, pageWidth, y, formData) {
    // Alt çizgi
    page.drawLine({
      start: { x: 50, y: y + 10 },
      end: { x: pageWidth - 50, y: y + 10 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    const washAndCareInstructionsLabel = this.languageService.getText('washAndCareInstructions', this.language);
    page.drawText(washAndCareInstructionsLabel, {
      x: 55,
      y: y + 10,
      size: 16,
      font: this.font,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Tek washing icons resmi çiz
    await this.drawWashingIconsImage(page, y, formData);

    return y;
  }

  async drawWashingIconsImage(page, y, formData) {
    // Frontend'den gelen yıkama talimatları ID'lerini işle
    const careInstructionsMapping = {
      'wash_30': '30-derece.jpeg',
      'wash_40': '40-derece.jpeg',
      'wash_50': '50-derece.jpeg',
      'wash_60': '60-derece.jpeg',
      'cold_wash': 'cold-wash.jpeg',
      'hand_wash': 'hand-wash.jpeg',
      'machine_wash': 'machine-wash.jpeg',
      'delicate_wash': 'delicate-wash.jpeg',
      'narin_yikama': 'narin-yıkama.jpeg',
      'wash_hot': 'wash-hot.jpeg',
      'do_not_wash': 'do-not-wash.jpeg',
      'normal': 'normal.jpeg',
      'do_not_bleach': 'do-not-bleach.jpeg',
      'p_bleach': 'P.jpeg',
      'dry_low_heat': 'dry-low-heat.jpeg',
      'dry_medium_heat': 'dry-medium-heat.jpeg',
      'do_not_tumble': 'do-not-tumble.jpeg',
      'dry_flat': 'dry-flat.jpeg',
      'low_heat': 'low-heat.jpeg',
      'medium_heat': 'medium-heat.jpeg',
      'high_heat': 'high-heat.jpeg',
      'low_iron': 'low-iron.jpeg',
      'utu': 'utu.jpeg',
      'buhar': 'buhar.jpeg',
      'do_not_iron': 'do-not-iron.jpeg',
      'dry_clean': 'dry-clean.jpeg',
      'do_not_dry_clean': 'do-not-dry-clean.jpeg',
      'any_solvent': 'any-solvent.jpeg',
      'cleaning_pce_delicate': 'cleaning-PCE-delicate.jpeg',
      'cleaning_pce_very_delicate': 'cleaning-PCE-very-delicate.jpeg'
    };

    // Frontend'den gelen seçili yıkama talimatları
    const careInstructions = formData?.CARE_INSTRUCTIONS || [];
    
    if (careInstructions.length === 0) {
      // Hiç seçili talimata yoksa placeholder göster
      // page.drawRectangle({
      //   x: 55,
      //   y: y - 40,
      //   width: 400,
      //   height: 60,
      //   borderColor: rgb(0.8, 0.8, 0.8),
      //   borderWidth: 1,
      // });
      // page.drawText('NO CARE INSTRUCTIONS SELECTED', {
      //   x: 180,
      //   y: y - 20,
      //   size: 12,
      //   font: this.font,
      //   color: rgb(0.5, 0.5, 0.5),
      // });
      //console.log('No care instructions selected');
      return;
    }

    // Seçilen talimatları çevir
    const selectedCareInstructions = careInstructions.map(id => ({
      id: id,
      imagePath: careInstructionsMapping[id]
    })).filter(item => item.imagePath); // Sadece geçerli mapping'leri al

    //console.log('Selected care instructions:', selectedCareInstructions);

    // Maksimum 8 ikon sınırı
    const maxIcons = 8;
    const limitedCareInstructions = selectedCareInstructions.slice(0, maxIcons);
    
    if (selectedCareInstructions.length > maxIcons) {
      //console.log(`Warning: ${selectedCareInstructions.length} care instructions selected, showing only first ${maxIcons}`);
    }

    // Her bir yıkama talimatı görselini yükle ve çiz
    let startX = 55;
    let currentX = startX;
    let currentY = y - 30;
    const iconWidth = 45; // İkon genişliği (daha geniş)
    const iconHeight = 40; // İkon yüksekliği (kare)
    const iconSpacing = 55; // İkonlar arası boşluk
    const maxIconsPerRow = 8; // Satır başına maksimum ikon sayısı
    let iconsInCurrentRow = 0;

    for (let i = 0; i < limitedCareInstructions.length; i++) {
      const instruction = limitedCareInstructions[i];
      
      try {
        // Washing icon resmini yükle
        const iconImage = await this.washingIconsService.loadSpecificWashingIcon(this.pdfDoc, instruction.imagePath);
        
        if (iconImage) {
          // İkonu çiz - kare boyutlarla
          page.drawImage(iconImage, {
            x: currentX,
            y: currentY,
            width: iconWidth,
            height: iconHeight,
          });
          
          //console.log(`Care instruction icon drawn: ${instruction.imagePath} at (${currentX}, ${currentY}) with size ${iconWidth}x${iconHeight}`);
        } else {
          // İkon yüklenemezse placeholder çiz
          page.drawRectangle({
            x: currentX,
            y: currentY,
            width: iconWidth,
            height: iconHeight,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 1,
          });
          page.drawText('?', {
            x: currentX + iconWidth/2 - 8,
            y: currentY + iconHeight/2 - 8,
            size: 24,
            font: this.font,
            color: rgb(0.5, 0.5, 0.5),
          });
          //console.log(`Care instruction icon not found: ${instruction.imagePath}`);
        }
      } catch (error) {
        console.error(`Error loading care instruction icon ${instruction.imagePath}:`, error);
        // Hata durumunda placeholder çiz
        page.drawRectangle({
          x: currentX,
          y: currentY,
          width: iconWidth,
          height: iconHeight,
          borderColor: rgb(1, 0, 0),
          borderWidth: 1,
        });
      }
      
      // Sonraki ikon pozisyonunu hesapla
      currentX += iconSpacing;
      iconsInCurrentRow++;
      
      // Satır sonu kontrolü (8'den fazla ikon varsa alt satıra geç)
      if (iconsInCurrentRow >= maxIconsPerRow && i < limitedCareInstructions.length - 1) {
        currentX = startX;
        currentY -= iconHeight + 15; // Yeni satıra geç
        iconsInCurrentRow = 0;
      }
    }
  }

  drawNotesSection(page, pageWidth, y, formData) {
    //console.log('drawNotesSection called with formData:', formData);
    
    page.drawLine({
      start: { x: 50, y: y + 33 },
      end: { x: pageWidth - 50, y: y + 33 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    y += 15;

    const notesLabel = this.languageService.getText('notes', this.language);
    page.drawText(notesLabel, {
      x: 55,
      y: y,
      size: 12,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });
    y -= 30;

    // Notes satırları - formData'dan al
    const notes = [
      formData?.NOTE_1 || formData?.NOTE1 || '',
      formData?.NOTE_2 || formData?.NOTE2 || '',
      formData?.NOTE_3 || formData?.NOTE3 || ''
    ];

    //console.log('Notes to render:', notes);

    for (let i = 1; i <= 3; i++) {
      page.drawText(`${i}.`, {
        x: 55,
        y: y,
        size: 10,
        font: this.fontBold,
        color: rgb(0, 0, 0),
      });

      // Not varsa yaz
      const noteText = notes[i - 1];
      if (noteText && noteText.trim() !== '') {
        //console.log(`Rendering note ${i}: ${noteText}`);
        
        // Güvenli metin çizimi kullan
        this.drawSafeText(page, noteText, {
          x: 75,
          y: y,
          size: 10,
          font: this.font,
          color: rgb(0, 0, 0),
        });
      } else {
        //console.log(`Note ${i} is empty or undefined`);
      }
      
      y -= 15;
    }

    return y;
  }

  // TechnicalSheet için özel footer - sabit değerler yerine formData kullan
  drawFooter(page, pageWidth, formData = {}) {
    let y = 130;
    
    // 2 çizgi
    page.drawLine({
      start: { x: 50, y: y },
      end: { x: pageWidth - 50, y: y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    
    page.drawLine({
      start: { x: 50, y: y - 10 },
      end: { x: pageWidth - 50, y: y - 10 },
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
      y: y - 8,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
    });
    
    // Ters TUANA yazısı (sağ taraf) - 180 derece döndürülmüş
    page.drawText(tuanaText, {
      x: centerX + textWidth + 220,
      y: y - 2,
      size: 8,
      font: tuanaFont,
      color: rgb(0, 0, 0),
      rotate: { type: 'degrees', angle: 180 },
    });

    // Sol alt - Frontend'den gelen veriler - ITALIC
    const issuedBy = formData['ISSUED BY'] || '';
    const responsibleTechnician = formData['RESPONSIBLE TECHNICIAN'] || '';
    
    const issuedByLabel = this.languageService.getText('issuedBy', this.language);
    const responsibleTechnicianLabel = this.languageService.getText('responsibleTechnician', this.language);
    const signatureLabel = this.languageService.getText('signature', this.language);

    if (issuedBy.trim() !== '') {
      page.drawText(`${issuedByLabel}: ${issuedBy}`, {
        x: 50,
        y: y - 25,
        size: 8,
        font: this.fontItalic,
        color: rgb(0, 0, 0),
      });
    }

    if (responsibleTechnician.trim() !== '') {
      page.drawText(`${responsibleTechnicianLabel}: ${responsibleTechnician}`, {
        x: 50,
        y: y - 40,
        size: 8,
        font: this.fontItalic,
        color: rgb(0, 0, 0),
      });
    }

    page.drawText(`${signatureLabel}:`, {
      x: 50,
      y: y - 55,
      size: 8,
      font: this.fontItalic,
      color: rgb(0, 0, 0),
    });

    // Sağ alt - STAMP alanı - BOLD
    const stampLabel = this.languageService.getText('stamp', this.language);
    page.drawText(stampLabel, {
      x: pageWidth / 2 + 10,
      y: y - 25,
      size: 10,
      font: this.fontBold,
      color: rgb(0, 0, 0),
    });

    // İmza kaşe arasında çizgi
    page.drawLine({
      start: { x: pageWidth / 2, y: y - 10 },
      end: { x: pageWidth / 2, y: y - 65 },
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
    await this.createFabricTechnicalSheet(formData, this.language);
  }
}

module.exports = TechnicalSheetTemplate;
