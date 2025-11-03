/**
 * Field Mappings Configuration for Different Companies
 * Bu dosya firma bazında OCR çıktısındaki header'ları frontend standardına çevirir
 */

const fieldMappings = {
  AKBASLAR: {
    keywords: ["CUSTOMER ORDER NO", "COMPOSITION", "Batch No", "Roll No", "Quantity Meter"],
    mapping: {
      "CUSTOMER ORDER NO": "ARTICLE NUMBER", 
      "COMPOSITION": "COMPOSITION", // CUSTOMER ORDER NO ve COMPOSITION birleştirilip ARTICLE NUMBER/COMPOSITION/CUSTOMS CODE satırına yazılacak
      "Batch No": "LOT",
      "Roll No": "ROLL NUMBER ROLL DIMENSIONS",
      "Quantity Meter": "QUANTITY (METERS)",
      "Gross Weight": "GROSS WEIGHT (KG)",
      "Net Weight": "NET WEIGHT (KG)"
    }
  },
  
  //ADA VE SÜZER AYNI FİRMA İÇİN AYRI MAPPING
  ADA: {
    keywords: ["Müşt. Referansı", "Komp", "Barkod-TopNo", "Kalite-Lot", "Metre", "Gramaj"],
    mapping: {
      "Müşt. Referansı": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Komp": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Barkod-TopNo": "ROLL NUMBER ROLL DIMENSIONS", 
      "Kalite-Lot": "LOT",
      "Metre": "QUANTITY (METERS)",
      "Gramaj": "GROSS WEIGHT (KG)",
      "Net Weight": "NET WEIGHT (KG)" // Bu field boş kalacak TUANA için
    }
  },

  // SAFİRA FİRMASI İÇİN MAPPING
  SAFIRA: {
    keywords: ["Top No", "Miktar Metre", "Miktar Kg", "Parti No", "Kumaş Cinsi"],
    mapping: {
      "Kumaş Cinsi": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Miktar Metre": "QUANTITY (METERS)",
      "Top No": "ROLL NUMBER ROLL DIMENSIONS",
      "Parti No": "LOT", 
      "Miktar Kg": "GROSS WEIGHT (KG)",
      "Net Weight": "NET WEIGHT (KG)" // Bu field boş kalacak TUANA için
    }
  },

  // BEZ FİRMASI İÇİN MAPPING
  BEZ: {
    keywords: ["Tip", "Top Metre", "TopAdı", "Dispo No", "kalite", "lot", "Kumaş Sevk Listesi"],
    mapping: {
      "Tip": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Top Metre": "QUANTITY (METERS)",
      "TopAdı": "ROLL NUMBER ROLL DIMENSIONS",
      "Dispo No": "LOT",
      "kalite": "", // Boş bırak - ağırlık olarak kullanma
      "lot": "", // Boş bırak - ağırlık olarak kullanma
      "En": "", // Boş bırak - ağırlık bilgisi değil
      "FABRIC WEIGHT / WIDTH": "", // Boş bırak
      "GROSS WEIGHT(KG)": "", // Boş bırak
      "NET WEIGHT (KG)": "" // Boş bırak
    }
  },

  // HARPUT FİRMASI İÇİN MAPPING
  HARPUT: {
    keywords: ["TOP LİSTESİ", "Top Kodu", "Etiket Mt.", "Brüt Kg.", "Net Kg.", "Dok. Desen", "Parti No", "HARPUT"],
    mapping: {
      "Dok. Desen": "ARTICLE NUMBER",
      "Etiket Mt.": "QUANTITY (METERS)",
      "Top Kodu": "ROLL NUMBER ROLL DIMENSIONS",
      "Parti No": "LOT",
      "Brüt Kg.": "GROSS WEIGHT (KG)",
      "Net Kg.": "NET WEIGHT (KG)",
      "Kalite No": "", // Boş bırak - weight field değil
      "Gramaj": "", // Boş bırak - weight field değil
      "Parça Ad.": "", // Boş bırak - weight field değil
      "FABRIC WEIGHT / WIDTH": "", // Boş bırak
    }
  },

  ADIL_UCAR: {
    keywords: ["ÇEKİ LİSTESİ", "Stok Kodu", "Kalitesi", "Top No", "Miktar1", "Adil Uçar"],
    mapping: {
      "ARTICLE NUMBER / COMPOSITION": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "QUANTITY(METERS)": "QUANTITY (METERS)",
      "ROLL NUMBER ROLL DIMENSIONS": "ROLL NUMBER ROLL DIMENSIONS",
    }
  },

  DEFAULT: {
    keywords: [],
    mapping: {
      // Format 1 (AKBASLAR) fields
      "CUSTOMER ORDER NO": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "COMPOSITION": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Batch No": "LOT",
      "Roll No": "ROLL NUMBER ROLL DIMENSIONS", 
      "Quantity Meter": "QUANTITY (METERS)",
      "Gross Weight": "GROSS WEIGHT (KG)",
      "Net Weight": "NET WEIGHT (KG)",
      
      // Genel fallback mapping'ler
      "Order No": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Article": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Composition": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Comp": "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE",
      "Batch": "LOT",
      "Lot": "LOT", 
      "Roll": "ROLL NUMBER ROLL DIMENSIONS",
      "Quantity": "QUANTITY (METERS)",
      "Qty": "QUANTITY (METERS)",
      "Weight": "GROSS WEIGHT (KG)",
      "Gross": "GROSS WEIGHT (KG)",
      "Net": "NET WEIGHT (KG)"
    }
  }
};

/**
 * Firma adını normalize eder (büyük harf, özel karakter temizleme)
 */
function normalizeCompanyName(companyName) {
  if (!companyName) return 'DEFAULT';
  
  return companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Belirli bir firma için mapping configuration'ını getirir
 */
function getCompanyMapping(companyName) {
  const normalizedName = normalizeCompanyName(companyName);
  
  // Bilinen firmalar
  if (fieldMappings[normalizedName]) {
    return fieldMappings[normalizedName];
  }
  
  // Fuzzy matching için firma adında anahtar kelimeler ara
  for (const [key, config] of Object.entries(fieldMappings)) {
    if (key === 'DEFAULT') continue;
    
    const companyKeywords = key.split('_');
    const hasMatch = companyKeywords.some(keyword => 
      normalizedName.includes(keyword) || keyword.includes(normalizedName.split('_')[0])
    );
    
    if (hasMatch) {
      return config;
    }
  }
  
  console.log(`⚠️ No specific mapping found for ${companyName}, using DEFAULT`);
  return fieldMappings.DEFAULT;
}

/**
 * OCR çıktısındaki field'ları frontend standardına çevirir
 */
function mapOcrFieldsToStandard(ocrData, companyName) {
  const companyConfig = getCompanyMapping(companyName);
  const { mapping } = companyConfig;
  
  console.log(`🔄 Mapping fields for company: ${companyName}`);
  console.log(`📋 Input OCR Data Count: ${ocrData ? ocrData.length : 0}`);
  console.log(`📋 Company Config:`, companyConfig);
  
  if (!ocrData || !Array.isArray(ocrData)) {
    console.log('❌ Invalid OCR data provided:', typeof ocrData);
    return [];
  }
  
  // Log sample input data
  if (ocrData.length > 0) {
    console.log('📋 Sample Input Data:', JSON.stringify(ocrData[0], null, 2));
  }
  
  const result = ocrData.map(item => {
    const mappedItem = {};
    const processedFields = new Set(); // Hangi field'ların işlendiğini takip et
    
    // OCR'dan gelen her field için mapping'e bak
    Object.keys(item).forEach(ocrField => {
      if (processedFields.has(ocrField)) return; // Zaten işlendi
      
      let standardField = null;
      
      // Exact match ara
      if (mapping[ocrField]) {
        standardField = mapping[ocrField];
      } else {
        // Fuzzy match ara (kısmi eşleşme)
        const fuzzyMatch = Object.keys(mapping).find(mappingKey => 
          ocrField.toLowerCase().includes(mappingKey.toLowerCase()) ||
          mappingKey.toLowerCase().includes(ocrField.toLowerCase())
        );
        
        if (fuzzyMatch) {
          standardField = mapping[fuzzyMatch];
        }
      }
      
      // Mapping bulundu ise kullan
      if (standardField) {
        const targetField = standardField;
        
        // ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE için özel handling
        if (targetField === "ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE") {
          let combinedValue = '';
          
          // AKBASLAR: CUSTOMER ORDER NO ve COMPOSITION field'larını birleştir
          if (ocrField === "CUSTOMER ORDER NO" || ocrField === "COMPOSITION") {
            const customerOrderNo = item["CUSTOMER ORDER NO"] || '';
            const composition = item["COMPOSITION"] || '';
            
            if (customerOrderNo && composition) {
              combinedValue = `${customerOrderNo} / ${composition}`;
            } else if (customerOrderNo) {
              combinedValue = customerOrderNo;
            } else if (composition) {
              combinedValue = composition;
            } else {
              combinedValue = item[ocrField] || '';
            }
            
            mappedItem[targetField] = combinedValue;
            
            // Her iki field'ı da işlendi olarak işaretle
            processedFields.add("CUSTOMER ORDER NO");
            processedFields.add("COMPOSITION");
            
            console.log(`🔗 Combined AKBASLAR fields: "${targetField}" = "${combinedValue}"`);
          }
          // ADA: Müşt. Referansı ve Komp field'larını birleştir
          else if (ocrField === "Müşt. Referansı" || ocrField === "Komp") {
            const mustReferansi = item["Müşt. Referansı"] || '';
            const komp = item["Komp"] || '';
            
            if (mustReferansi && komp) {
              combinedValue = `${mustReferansi} / ${komp}`;
            } else if (mustReferansi) {
              combinedValue = mustReferansi;
            } else if (komp) {
              combinedValue = komp;
            } else {
              combinedValue = item[ocrField] || '';
            }
            
            mappedItem[targetField] = combinedValue;
            
            // Her iki field'ı da işlendi olarak işaretle
            processedFields.add("Müşt. Referansı");
            processedFields.add("Komp");
            
            console.log(`🔗 Combined ADA fields: "${targetField}" = "${combinedValue}"`);
          }
          // SAFİRA: Kumaş Cinsi doğrudan mapping
          else if (ocrField === "Kumaş Cinsi") {
            mappedItem[targetField] = item[ocrField] || '';
            processedFields.add("Kumaş Cinsi");
            
            console.log(`🔗 SAFİRA field: "${targetField}" = "${item[ocrField]}"`);
          }
          else {
            mappedItem[targetField] = item[ocrField];
            processedFields.add(ocrField);
          }
        } else {
          mappedItem[targetField] = item[ocrField];
          processedFields.add(ocrField);
        }
      } else {
        // Mapping bulunamadı, orijinal field adını koru
        mappedItem[ocrField] = item[ocrField];
        processedFields.add(ocrField);
      }
    });
    
    return mappedItem;
  });
  
  // Log final mapping result
  console.log(`📦 Mapping completed: ${result.length} items processed`);
  if (result.length > 0) {
    console.log('📋 Sample Mapped Item:', JSON.stringify(result[0], null, 2));
  } else {
    console.error('❌ NO MAPPED ITEMS PRODUCED - MAPPING FAILED');
  }
  
  return result;
}

/**
 * Firmaya göre beklenen field'ları kontrol eder
 */
function validateCompanyFields(ocrData, companyName) {
  const companyConfig = getCompanyMapping(companyName);
  const { keywords } = companyConfig;
  
  if (keywords.length === 0) {
    return { isValid: true, missingFields: [], confidence: 0.5 };
  }
  
  // OCR'dan gelen field'ları topla
  const ocrFields = new Set();
  ocrData.forEach(item => {
    Object.keys(item).forEach(field => ocrFields.add(field));
  });
  
  // Kaç tane keyword bulundu
  const foundKeywords = keywords.filter(keyword => 
    Array.from(ocrFields).some(field => 
      field.toLowerCase().includes(keyword.toLowerCase()) ||
      keyword.toLowerCase().includes(field.toLowerCase())
    )
  );
  
  const confidence = foundKeywords.length / keywords.length;
  const missingFields = keywords.filter(keyword => !foundKeywords.includes(keyword));
  
  console.log(`Company validation for ${companyName}:`);
  console.log(`   Found: ${foundKeywords.length}/${keywords.length} keywords`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
  
  return {
    isValid: confidence >= 0.5, // En az %50 eşleşme gerekli
    missingFields,
    confidence,
    foundKeywords
  };
}

module.exports = {
  fieldMappings,
  normalizeCompanyName,
  getCompanyMapping,
  mapOcrFieldsToStandard,
  validateCompanyFields
};
