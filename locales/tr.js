const { note } = require("./en");

module.exports = {
  // Common terms
  from: 'GÖNDEREN',
  to: 'ALICI',
  issueDate: 'TARİH',
  notes: 'NOTLAR VE GENEL KOŞULLAR',
  generalConditions: 'GENEL KOŞULLAR',
  paymentTerms: 'ÖDEME KOŞULLARI',
  transportType: 'TAŞIMA TİPİ',
  signature: 'SATIŞ TEMSİLCİSİ İMZASI',
  stamp: 'KAŞE',
  totalAmount: 'TOPLAM TUTAR',
  issuer: 'DÜZENLEYEN',
  recipient: 'ALICI',
  deliveryAddress: 'TESLİMAT ADRESİ',
  explanation: 'AÇIKLAMA',
  generalTotal: 'GENEL TOPLAM (KDV DAHİL)',
  responsiblePerson: 'SORUMLU KİŞİ',
  telephone: 'TELEFON',
  email: 'E-POSTA',
  note: 'NOT',
  
  // Price Offer specific
  priceOffer: 'FİYAT TEKLİFİ',
  priceOfferNumber: 'FİYAT TEKLİF NUMARASI',
  priceItems: 'ÜRÜN FİYATLARI',
  articleNumber: 'ARTİKEL NUMARASI',
  pricePerMeter: 'FİYAT (METRE)',
  bulkMoq: 'MİN. TOPLU SİPARİŞ',
  samplingAvailability: 'NUMUNE TEMİNİ (1-100 METRE)',
  leadTime: 'TERMİN',
  process: 'İŞLEM',
  certifiable: 'SERTİFİKA',
  validityOfPriceOffer: 'FİYAT TEKLİFİNİN GEÇERLİLİĞİ: DÜZENLEME TARİHİNDEN İTİBAREN 60 GÜN',
  
  // Invoice specific
  invoice: 'FATURA',
  invoiceNumber: 'FATURA NUMARASI',
  invoiceDate: 'FATURA TARİHİ',
  descriptionOfGoods: 'ÜRÜN AÇIKLAMASI',
  descriptionOfGoodsContinued: 'ÜRÜN AÇIKLAMASI',

  // Proforma specific
  proformaInvoice: 'PROFORMA FATURA',
  proformaNumber: 'PROFORMA NUMARASI',
  proformaDate: 'PROFORMA TARİHİ',
  
  // Order Confirmation specific
  orderConfirmation: 'SİPARİŞ ONAY FORMU',
  orderNumber: 'SİPARİŞ NUMARASI',
  orderDate: 'SİPARİŞ TARİHİ',
  orderConfirmationDate: 'SİPARİŞ ONAY TARİHİ',
  orderConfirmationNumber: 'SİPARİŞ ONAY NUMARASI',
  
  // Technical Sheet specific
  technicalSheet: 'TEKNİK BİLGİ FORMU',
  fabricTechnicalSheet: 'TEKNİK FÖY',
  fabricCode: 'KUMAŞ KODU',
  composition: 'KOMPOZİSYON',
  weight: 'GRAMAJ',
  width: 'EN',
  construction: 'KONSTRÜKSYON',
  finishing: 'FİNİSHİNG',
  washingInstructions: 'YIKAMA TALİMATLARI',
  washAndCareInstructions: 'YIKAMA VE BAKIM TALİMATLARI',
  issuedBy: 'DÜZENLEYEN',
  responsibleTechnician: 'SORUMLU TEKNİSYEN',
  signature: 'İMZA',
  articleCode: 'ARTİKEL KODU',
  widthCutableWidth: 'EN/KESİLEBİLİR EN',
  certification: 'SERTİFİKA',
  colour: 'RENK',
  jacquardPatternName: 'JAKAR DESEN ADI',
  origin: 'MENŞEİ',
  shrinkageInWarp: 'ÇÖZGÜ ÇEKMESİ',
  shrinkageInWeft: 'ATKÜ ÇEKMESİ',
  customTariffCode: 'GÜMRÜK KODU',
  weaveType: 'DOKUMA TİPİ',
  
  // Units
  grm2: 'GR/M2',
  cm: 'CM',
  
  // Common BasePdfTemplate terms
  issueDate: 'TARİH',
  issuedByTuanaTechnical: 'DÜZENLEYEN: TUANA TEKNİK DEPARTMANI',
  responsibleTechnicianNuran: 'SORUMLU TEKNİSYEN: NURAN YELMEN',
  
  // Packing List specific
  packingList: 'ÇEKİ LİSTESİ',
  packageNumber: 'PAKET NUMARASI',
  quantity: 'MİKTAR',
  totalQuantity: 'TOPLAM MİKTAR',
  packingDetails: 'PAKETLEME DETAYLARI',
  articleNumberCompositionCustomsCode: 'ARTİKEL NUMARASI / KOMPOZİSYON / GÜMRÜK KODU',
  fabricWeightWidth: 'AĞIRLIK / EN',
  quantityMeters: 'MİKTAR (METRE)',
  rollNumberRollDimensions: 'TOP NUMARASI TOP BOYUTLARI',
  lot: 'LOT',
  grossWeightKg: 'BRÜT AĞIRLIK(KG)',
  netWeightKg: 'NET AĞIRLIK (KG)',
  invoiceDate: 'FATURA TARİHİ',
  total: 'TOPLAM',
  meters: 'MT',
  rolls: 'TOP',
  kg: 'KG',
  kgs: 'KG',
  
  // Credit/Debit Note specific
  creditNote: 'CREDIT NOTE',
  debitNote: 'DEBIT NOTE',
  creditNumber: 'CREDIT NUMARASI',
  debitNumber: 'DEBIT NUMARASI',
  creditNoteDate: 'CREDIT NOTE TARİHİ',
  debitNoteDate: 'DEBIT NOTE TARİHİ',
  creditNoteNumber: 'CREDIT NOTE NUMARASI',
  debitNoteNumber: 'DEBIT NOTE NUMARASI',
  creditNoteExplanation: 'CREDIT NOTE AÇIKLAMASI',
  debitNoteExplanation: 'DEBIT NOTE AÇIKLAMASI',

  // Credit Note Template specific
  creditNoteTitle: 'CREDIT NOTE TARİHİ',
  invoiceNumber: 'FATURA NUMARASI',
  articleNumber: 'ARTİKEL NUMARASI',
  weightWidth: 'AĞIRLIK / GENİŞLİK',
  quantityMeters: 'MİKTAR (METRE)',
  price: 'FİYAT',
  amount: 'TUTAR',
  descriptionOfGoodsRegardingOrder: 'SİPARİŞE İLİŞKİN ÜRÜN TANIMI',
  bankInformations: 'BANKA BİLGİLERİ',
  currencyInfo: 'KUR BİLGİSİ',
  vatTax: 'VD',
  vat: 'KDV',
  generalTotalVatIncluded: 'GENEL TOPLAM (KDV DAHİL)',
  countryOfOrigin: 'MENŞE ÜLKESİ',
  grossWeight: 'BRÜT AĞIRLIK',
  netWeight: 'NET AĞIRLIK',
  rolls: 'TOP',
  
  // Siparis specific
  siparis: 'SİPARİŞ FORMU',
  siparisNo: 'SİPARİŞ NO',
  artikelNumber: 'ARTIKEL NUMARASI',
  gramajEn: 'GRAMAJ / EN',
  composition: 'KOMPOZİSYON',
  season: 'SEZON',
  termin: 'TERMİN',
  process: 'İŞLEM',
  meter: 'MT',
  price: 'FİYAT',
  total: 'TOPLAM',
  
  // Payment Terms translations
  paymentTermsValues: {
    '30 DAYS': '30 GÜN',
    '60 DAYS': '60 GÜN',
    '90 DAYS': '90 GÜN',
    '120 DAYS': '120 GÜN',
    '150 DAYS': '150 GÜN',
    '180 DAYS': '180 GÜN',
    'IMMEDIATELY': 'PEŞİN ÖDEME',
    'CASH IN ADVANCE': 'PEŞİN ÖDEME'
  },

  // Certifiable Values translations
  certifiableValues: {
    'Yes': 'EVET',
    'No': 'HAYIR',
    'Upon Request': 'TALEP ÜZERİNE'
  },

  // Notes content for Price Offer
priceOfferNotes: [
    '1. STANDART MİNİMUM ÜRETİM MİKTARININ (MOQ) ALTINDA OLAN BOYA SİPARİŞLERİNDE, PROSES SINIRLAMALARINDAN KAYNAKLI ',
    '    BAZI TEKNİK RİSKLER ORTAYA ÇIKABİLİR. BU RİSKLER; KUMAŞIN BOZULMASI, YAPISAL ZAYIFLAMA, BOYANIN EŞİT DAĞILMAMASI',
    '    VEYA BAZI DURUMLARDA KUMAŞIN TAMAMEN ZARAR GÖRMESİ GİBİ DURUMLARI İÇEREBİLİR. BU TÜR SORUNLARI EN AZA İNDİRMEK',
    '    İÇİN GEREKLİ TÜM ÖNLEMLERİ ALMAMIZA RAĞMEN, DÜŞÜK PARTİ KOŞULLARINDA BU İHTİMALLER HER ZAMAN MEVCUTTUR. DÜŞÜK',
    '    MİKTARLI BOYAMA TALEPLERİNDE BU HUSUSLARIN DİKKATE ALINMASINI TAVSİYE EDERİZ. BU ŞARTLAR ALTINDA YAPILAN ',
    '    BOYAMALARDA MEYDANA GELEBİLECEK HERHANGİ BİR KUMAŞ BOZULMASI VEYA ZARARDAN ŞİRKETİN SORUMLULUK KABUL ',
    '    ETMEDİĞİNİ LÜTFEN UNUTMAYIN.',
    '2. NUMUNE İÇİN KUMAŞ BULUNAMAMASI DURUMUNDA, ÜRETİM HATTININ MÜSAİTLİĞİNE BAĞLI OLARAK SİZİN İÇİN MİKRO ÜRETİM',
    '    YAPABİLİRİZ. İPLİK BULUNABİLİRLİĞİNE GÖRE EK ÜCRETLER UYGULANABİLİR.',
    '3. TESLİM SÜRESİ İLE KASTETTİĞİMİZ, KUMAŞIN İSTANBUL OFİSİMİZDEN SEVKİYATA HAZIR HALE GELECEĞİ SÜREYİ İFADE EDER.',
    '4. KOMPOZİSYONUNA BAĞLI OLARAK KUMAŞLARIMIZ ŞU SERTİFİKALARLA BELGELENDİRİLEBİLİR: OCS (ORGANIC CONTENT STANDARD),',
    '    GOTS (GLOBAL ORGANIC STANDARD), RCS (RECYCLED CLAIM STANDARD), GRS (GLOBAL RECYCLED STANDARD),',
    '    DİĞER BAZI SERTİFİKALAR İSE LENZING™ (TENCEL/LYOCELL, MODAL), ECOVERO™ VE EUROPEAN FLAX™’TIR.',
    '5. BURADA VERİLEN FİYAT TEKLİFLERİ FOB İSTANBUL FİYATLARIDIR. DEĞERLİ MÜŞTERİLERİMİZİN TALEBİ ÜZERİNE CIF FİYAT',
    '    TEKLİFLERİ DE SAĞLAYABİLİRİZ.'
],
  
  // Notes content for Order Confirmation
 orderConfirmationNotes: [
  '1. SÖZLEŞMEDE BELİRTİLEN FİYATLARA KDV DAHİL DEĞİLDİR. FATURALARDA, MALIN SEVK TARİHİNDEKİ T.C.M.B. SATIŞ KURU GEÇERLİ OLACAKTIR.',
  '2. FATURA BEDELİ, FATURA TARİHİNDEN İTİBAREN 5 İŞ GÜNÜ İÇİNDE HAVALE YOLUYLA TAHSİL EDİLİR. VADESİNİ AŞAN ÖDEMELERDE AYLIK %4 VADE FARKI',
  '    UYGULANIR. TÜM BANKA MASRAFLARI ALICIYA AİTTİR.',
  '3. ÖDEMELER, SİPARİŞ FORMUNDA BELİRTİLEN DÖVİZ CİNSİNDEN TAHSİL EDİLİR. TL İLE ÖDEME YAPILMASI DURUMUNDA T.C.M.B. SATIŞ KURU GEÇERLİ OLUP',
  '    KUR FARKI PEŞİN OLARAK TAHSİL EDİLİR.',
  '4. SÖZLEŞMEDE BELİRTİLEN FİYATLAR İSTANBUL TESLİM FİYATLARIDIR. İSTANBUL DIŞI TESLİMATLARDA NAKLİYE VE SİGORTA BEDELİ ALICIYA AİTTİR.',
  '    MALLAR ALICI SORUMLULUĞUNDA SEVK EDİLİR.',
  '5. SİPARİŞLER ±%5 TOLERANSLA SEVK EDİLEBİLİR. SEVK EDİLEN KUMAŞLARDA KALİTE KONTROL VE İTİRAZ SÜRESİ EN FAZLA 15 GÜNDÜR; BU SÜREDEN',
  '    SONRA YAPILAN İTİRAZLAR KABUL EDİLMEZ. REKLAMASYON KUMAŞLAR KESİLMEDEN ÖNCE DEĞERLENDİRİLMELİDİR. KESİLMİŞ KUMAŞLARLA İLGİLİ',
  '    REKLAMASYON KABUL EDİLMEZ.',
  '6. SİPARİŞİN ÖZEL BİR SERTİFİKASYONLA ALINMASI VEYA BEBEK/ÇOCUK ÜRÜNLERİNDE KULLANILMASI DURUMLARI SİPARİŞ ÖNCESİNDE BİLDİRİLMELİDİR.',
  '7. SİPARİŞİN KISMEN VEYA TAMAMEN İPTALİ YA DA SÖZLEŞME HÜKÜMLERİNİN İHLALİ HALİNDE, SİPARİŞ TOPLAM TUTARININ %30’UNDAN AZ OLMAMAK ',
  '    KAYDIYLA UĞRANILAN ZARAR TALEP EDİLEBİLİR.',
  '8. BU SÖZLEŞMEDEN DOĞABİLECEK İHTİLAFLARDA İSTANBUL MAHKEMELERİ VE İCRA DAİRELERİ YETKİLİDİR.',
],

  // Hangers Shipment specific
  hangersShipment: 'ASKILI SEVKİYAT',
  hangersShipmentNumber: 'SEVKİYAT NUMARASI',
  hangersItems: 'ASKI ÜRÜNLERİ',
  hangerDimension: 'ASKI ÖLÇÜSİ',
  pieces: 'ADET',
  hsCustomsCode: 'GTİP KODU',
  trackingCode: 'TAKİP KODU',
  courier: 'KARGO',

  // Quality Control specific
  qualityControlReport: 'KALİTE KONTROL RAPORU',
  articleCodeOur: 'ARTİKEL KODU',
  articleCodeClient: 'ARTİKEL KODU (MÜŞTERİ)',
  orderNumber: 'SİPARİŞ NUMARASI',
  client: 'MÜŞTERİ',
  composition: 'KARIŞIM',
  weight: 'AĞIRLIK',
  width: 'EN',
  rollNumber: 'TOP NUMARASI',
  batchNumber: 'LOT NUMARASI',
  rollLength: 'TOP UZUNLUĞU',
  meter: 'METRE',
  description: 'AÇIKLAMA',
  point: 'PUAN (1-4)',
  date: 'TARİH',
  meters: 'MT'

};
