const PdfGeneratorService = require('../services/pdfGeneratorService');
const fs = require('fs');
const path = require('path');

const mockData = {
  invoiceDate: '15-05-2026',
  'INVOICE NUMBER': 'TEST-INV-001',
  'RESPONSIBLE PERSON': 'CENK YELMEN',
  'TELEPHONE': '+90 555 123 4567',
  'EMAIL': 'CENK@TUANATEX.COM',
  
  'RECIPIENT Şirket Adı': 'TEST BUYER GMBH',
  'RECIPIENT Adres': 'SAMPLE STREET 123, FLOOR 3, BUILDING C',
  'RECIPIENT İlçe İl Ülke': 'BERLIN, GERMANY',
  'RECIPIENT Vat': 'DE123456789',
  'RECIPIENT Sorumlu Kişi': 'JOHANN SCHMIDT',
  'RECIPIENT Telefon': '+49 30 1234567',
  'RECIPIENT Email': 'INFO@TESTBUYER.DE',
  
  'DELIVERY ADDRESS Şirket Adı': 'TEST RECEIVER WAREHOUSE',
  'DELIVERY ADDRESS Adres': 'LOGISTICS PARK 45, DOCK 2',
  'DELIVERY ADDRESS İlçe İl Ülke': 'MUNICH, GERMANY',
  'DELIVERY ADDRESS Vat': 'DE987654321',
  'DELIVERY ADDRESS Sorumlu Kişi': 'HANS MULLER',
  'DELIVERY ADDRESS Telefon': '+49 89 7654321',
  'DELIVERY ADDRESS Email': 'LOGISTICS@TESTBUYER.DE',
  
  'İmza ve Kaşe': true, // Boyutu test etmek için AÇIK
  
  goods: Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    'ARTICLE NUMBER': `T-16487 TEST FABRIC H${i+1} 100% COTTON (HS CODE 1111.11.11.11)`,
    'WEIGHT / WIDHT': '150 GR/M2 / 200 CM',
    'QUANTITY (METERS)': '500',
    'PRICE': '4.50',
    'AMOUNT': '2250.00'
  })),

  packingItems: Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    'ARTICLE NUMBER / COMPOSITION / CUSTOMS CODE': `T-16487 TEST FABRIC H${i+1} 100% COTTON (HS CODE 1111.11.11.11)`,
    'FABRIC WEIGHT / WIDHT': '150 GR/M2 / 200 CM',
    'QUANTITY (METERS)': '500',
    'ROLL NUMBER ROLL DIMENSIONS': `${i*5+1}-${i*5+5} / 150x200`,
    'LOT': `A00${i+1}`,
    'GROSS WEIGHT(KG)': '52.5',
    'NET WEIGHT (KG)': '50.0'
  })),
  
  'Discount Enabled': true,
  'Discount': '10',
  'KDV Ekle Enabled': true,
  'KDV': '18',
  
  'NOTE 1': 'THIS IS A TEST INVOICE GENERATED TO CHECK FILE SIZE.',
  'BANKA 1 NAME': 'TEST BANK A.S.',
  'BANKA 1 IBAN': 'TR00 0000 0000 0000 0000 0000 00',
  'BANKA 1 SWIFT': 'TESTTRIS',
  'TL KUR EKLE': true,
  'EUR/TRY': '35.5'
};

async function testPdfSizes() {
  console.log('🧪 PDF Boyut Testi Başlıyor...\n');
  const pdfService = new PdfGeneratorService();

  try {
    const outputs = [
      { type: 'invoice', name: 'Invoice' },
      { type: 'packing-list', name: 'Packing List' }
    ];

    for (const doc of outputs) {
      console.log(`⏳ ${doc.name} oluşturuluyor...`);
      const startTime = Date.now();
      
      const filePath = await pdfService.generatePDF(
        `TEST-${doc.type.toUpperCase()}`,
        doc.type,
        mockData,
        'en'
      );
      
      const elapsed = Date.now() - startTime;
      const stats = fs.statSync(filePath);
      const sizeKB = stats.size / 1024;
      
      console.log(`${doc.name} oluşturuldu (${elapsed}ms)`);
      console.log(`   Yol: ${filePath}`);
      
      if (sizeKB > 500) {
        console.error(`   BOYUT: ${sizeKB.toFixed(2)} KB (Tavsiye edilenin üzerinde!)`);
      } else {
        console.log(`   BOYUT: ${sizeKB.toFixed(2)} KB (Mükemmel)`);
      }
      console.log('─'.repeat(50));
    }

  } catch (error) {
    console.error('Test sırasında hata oluştu:', error);
  }
}

testPdfSizes();
