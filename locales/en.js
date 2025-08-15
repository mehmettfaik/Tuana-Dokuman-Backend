module.exports = {
  // Common terms
  from: 'FROM',
  to: 'TO',
  issueDate: 'ISSUE DATE',
  notes: 'NOTES AND GENERAL CONDITIONS',
  paymentTerms: 'PAYMENT TERMS',
  transportType: 'TRANSPORT TYPE',
  signature: 'SIGNATURE OF THE SALESPERSON',
  stamp: 'STAMP',
  totalAmount: 'TOTAL AMOUNT',
  issuer: 'ISSUER',
  recipient: 'RECIPIENT',
  deliveryAddress: 'DELIVERY ADDRESS',
  explanation: 'EXPLANATION',
  generalTotal: 'GENERAL TOTAL (VAT INCLUDED)',
  responsiblePerson: 'RESPONSIBLE PERSON',
  telephone: 'TELEPHONE',
  email: 'EMAIL',
  
  // Price Offer specific
  priceOffer: 'PRICE OFFER',
  priceOfferNumber: 'PRICE OFFER NUMBER',
  priceItems: 'PRICE LIST',
  articleNumber: 'ARTICLE NUMBER',
  pricePerMeter: 'PRICE (PER METER)',
  bulkMoq: 'BULK MOQ (METERS)',
  samplingAvailability: 'SAMPLING AVAILABILITY (1-100 METERS)',
  leadTime: 'LEAD TIME',
  process: 'PROCESS',
  certifiable: 'CERTIFIABLE',
  validityOfPriceOffer: 'VALIDITY OF THE PRICE OFFER: 60 DAYS FROM THE ISSUE DATE',
  
  // Invoice specific
  invoice: 'INVOICE',
  invoiceNumber: 'INVOICE NUMBER',
  invoiceDate: 'INVOICE DATE',
  descriptionOfGoods: 'DESCRIPTION OF GOODS',
  descriptionOfGoodsContinued: 'DESCRIPTION OF GOODS (Continued)',
  
  // Proforma specific
  proformaInvoice: 'PROFORMA INVOICE',
  proformaNumber: 'PROFORMA NUMBER',
  proformaDate: 'PROFORMA DATE',
  
  // Order Confirmation specific
  orderConfirmation: 'ORDER CONFIRMATION',
  orderNumber: 'ORDER NUMBER',
  orderDate: 'ORDER DATE',
  orderConfirmationDate: 'ORDER CONFIRMATION DATE',
  orderConfirmationNumber: 'ORDER CONFIRMATION NUMBER',
  
  // Technical Sheet specific
  technicalSheet: 'TECHNICAL SHEET',
  fabricTechnicalSheet: 'FABRIC TECHNICAL SHEET',
  fabricCode: 'FABRIC CODE',
  composition: 'COMPOSITION',
  weight: 'WEIGHT',
  width: 'WIDTH',
  construction: 'CONSTRUCTION',
  finishing: 'FINISHING',
  washingInstructions: 'WASHING INSTRUCTIONS',
  washAndCareInstructions: 'WASH AND CARE INSTRUCTIONS',
  issuedBy: 'ISSUED BY',
  responsibleTechnician: 'RESPONSIBLE TECHNICIAN',
  signature: 'SIGNATURE',
  articleCode: 'ARTICLE CODE',
  widthCutableWidth: 'WIDTH / CUTABLE WIDTH',
  certification: 'CERTIFICATION',
  colour: 'COLOUR',
  jacquardPatternName: 'JACQUARD PATTERN NAME',
  origin: 'ORIGIN',
  shrinkageInWarp: 'SHRINKAGE IN WARP',
  shrinkageInWeft: 'SHRINKAGE IN WEFT',
  customTariffCode: 'CUSTOM TARIFF CODE',
  weaveType: 'WEAVE TYPE',
  
  // Units
  grm2: 'GR/M2',
  cm: 'CM',
  
  // Common BasePdfTemplate terms
  issueDate: 'ISSUE DATE',
  issuedByTuanaTechnical: 'ISSUED BY: TUANA TECHNICAL DEPARTMENT',
  responsibleTechnicianNuran: 'RESPONSIBLE TECHNICIAN: NURAN YELMEN',
  
  // Packing List specific
  packingList: 'PACKING LIST',
  packageNumber: 'PACKAGE NUMBER',
  quantity: 'QUANTITY',
  totalQuantity: 'TOTAL QUANTITY',
  packingDetails: 'PACKING DETAILS',
  articleNumberCompositionCustomsCode: 'ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE',
  fabricWeightWidth: 'FABRIC WEIGHT / WIDTH',
  quantityMeters: 'QUANTITY (METERS)',
  rollNumberRollDimensions: 'ROLL NUMBER ROLL DIMENSIONS',
  lot: 'LOT',
  grossWeightKg: 'GROSS WEIGHT(KG)',
  netWeightKg: 'NET WEIGHT (KG)',
  invoiceDate: 'INVOICE DATE',
  total: 'TOTAL',
  meters: 'METERS',
  rolls: 'ROLLS',
  kg: 'KG',
  kgs: 'KG',
  
  // Credit/Debit Note specific
  creditNote: 'CREDIT NOTE',
  debitNote: 'DEBIT NOTE',
  creditNumber: 'CREDIT NUMBER',
  debitNumber: 'DEBIT NUMBER',
  creditNoteDate: 'CREDIT NOTE DATE',
  debitNoteDate: 'DEBIT NOTE DATE',
  creditNoteNumber: 'CREDIT NOTE NUMBER',
  debitNoteNumber: 'DEBIT NOTE NUMBER',
  creditNoteExplanation: 'CREDIT NOTE EXPLANATION',
  debitNoteExplanation: 'DEBIT NOTE EXPLANATION',
  
  // Credit Note Template specific
  creditNoteTitle: 'CREDIT NOTE DATE',
  invoiceNumber: 'INVOICE NUMBER',
  articleNumber: 'ARTICLE NUMBER',
  weightWidth: 'WEIGHT / WIDTH',
  quantityMeters: 'QUANTITY (METERS)',
  price: 'PRICE',
  amount: 'AMOUNT',
  descriptionOfGoodsRegardingOrder: 'DESCRIPTION OF GOODS REGARDING THE ORDER',
  bankInformations: 'BANK INFORMATIONS',
  currencyInfo: 'CURRENCY INFO',
  vatTax: 'VAT',
  vat: 'VAT',
  generalTotalVatIncluded: 'GENERAL TOTAL (VAT INCLUDED)',
  countryOfOrigin: 'COUNTRY OF ORIGIN',
  grossWeight: 'GROSS WEIGHT',
  netWeight: 'NET WEIGHT',
  rolls: 'ROLLS',
  
  // Siparis specific
  siparis: 'ORDER',
  siparisNo: 'ORDER NO',
  artikelNumber: 'ARTICLE NUMBER',
  gramajEn: 'WEIGHT / WIDTH',
  composition: 'COMPOSITION',
  season: 'SEASON',
  termin: 'LEAD TIME',
  process: 'PROCESS',
  meter: 'METER',
  price: 'PRICE',
  total: 'TOTAL',
  
  // Payment Terms translations
  paymentTermsValues: {
    '30 Days': '30 Days',
    '60 Days': '60 Days',
    '90 Days': '90 Days',
    '120 Days': '120 Days',
    '150 Days': '150 Days',
    '180 Days': '180 Days',
    'Immediately': 'Immediately',
    'Cash in Advance': 'Cash in Advance'
  },

  // Certifiable Values translations
  certifiableValues: {
    'Yes': 'Yes',
    'No': 'No',
    'Upon Request': 'Upon Request'
  },

  // Notes content for Price Offer
  priceOfferNotes: [
    '1. PLEASE NOTE THAT FOR DYEING ORDERS BELOW THE STANDARD MINIMUM PRODUCTION QUANTITY (MOQ), CERTAIN',
    '   TECHNICAL RISKS MAY ARISE DUE TO PROCESS LIMITATIONS. THESE MAY INCLUDE FABRIC DISTORTION, STRUCTURAL',
    '   WEAKENING, UNEVEN DYE PENETRATION, OR, IN SOME CASES, COMPLETE DEGRADATION OF THE MATERIAL. WHILE WE',
    '   TAKE ALL NECESSARY PRECAUTIONS TO MINIMIZE SUCH ISSUES, THEY REMAIN A POSSIBILITY UNDER REDUCED BATCH',
    '   CONDITIONS. WE RECOMMEND CONSIDERING THIS WHEN PLACING LOW-QUANTITY DYEING REQUESTS. PLEASE BE',
    '   ADVISED THAT THE COMPANY DOES NOT ACCEPT RESPONSIBILITY FOR ANY FABRIC DISTORTIONS OR DAMAGES THAT MAY',
    '   OCCUR AS A RESULT OF DYEING UNDER THESE CONDITIONS.',
    '2. IN CASE OF UNAVAILABILITY OF A FABRIC FOR SAMPLING, DEPENDING ON THE AVAILABILITY OF THE PRODUCTION LINE,',
    '   WE CAN MAKE A MICRO-PRODUCTION FOR YOU. SURCHARGES MAY APPLY DEPENDING ON YARN AVAILABILITY.',
    '3. BY LEAD TIME WE MEAN THE TIME PERIOD IN WHICH THE FABRIC WILL BE READY FOR THE SHIPMENT FROM OUR',
    '   ISTANBUL OFFICE.',
    '4. DEPENDING ON THE COMPOSITION, OUR FABRICS CAN BE CERTIFIED WITH THE FOLLOWING CERTIFICATIONS: OCS',
    '   (ORGANIC CONTENT STANDARD), GOTS (GLOBAL ORGANIC STANDARD), RCS (RECYCLED CLAIM STANDARD), GRS (GLOBAL',
    '   RECYCLED STANDARD), SOME OTHER ARE LENZING™ (TENCEL/LYOCELL, MODAL), ECOVERO™ AND EUROPEAN FLAX™.',
    '5. HEREBY GIVEN QUOTATIONS ARE FOB ISTANBUL PRICES, UPON OUR ESTEEMED CUSTOMERS REQUEST, WE CAN',
    '   PROVIDE ALSO CIF QUOTATIONS TOO.'
  ],
  
  // Notes content for Order Confirmation
  orderConfirmationNotes: [
    '1. TUANA SHALL NOT BE HELD RESPONSIBLE FOR ANY DELAYS CAUSED BY THIRD-PARTY FORWARDERS OR',
    '   TRANSPORTERS.',
    '2. ALL ORDER REQUESTS MUST BE SUBMITTED VIA EMAIL TO THE DESIGNATED CONTACT PERSON FROM THE',
    '   TUANA TEAM.',
    '3. FOR ORDERS WITH A TOTAL VOLUME BELOW 1,000 METERS, TUANA WILL APPLY A CHARGE OF',
    '   APPROXIMATELY €150 FOR THE PREPARATION OF THE ATR DOCUMENT, ONLY IF THE CLIENT REQUESTS SUCH',
    '   DOCUMENTATION. FOR ORDERS EXCEEDING 1,000 METERS, THIS COST WILL BE COVERED BY TUANA.',
    '4. CANCELLATION REQUESTS WILL NOT BE ACCEPTED IF SUBMITTED MORE THAN 48 HOURS AFTER ORDER',
    '   CONFIRMATION, BASED ON THE CLIENT\'S LOCAL TIME. IN SUCH CASES, TUANA RESERVES THE RIGHT TO',
    '   INVOICE THE FULL AMOUNT OF THE ORDER.',
    '5. ANY QUALITY CLAIMS MUST BE SUBMITTED VIA EMAIL WITHIN 14 CALENDAR DAYS OF',
    '   RECEIPT OF GOODS, ACCOMPANIED BY SUPPORTING PHOTOS AND A DETAILED DESCRIPTION. NO CLAIMS WILL',
    '   BE ACCEPTED AFTER THE FABRIC HAS BEEN CUT OR PROCESSED.'
  ]
};
