const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const OrderConfirmationTemplate = require('./templates/order-confirmation/OrderConfirmationTemplate');

async function testOrderConfirmationPagination() {
  console.log('🧪 Testing Order Confirmation pagination...');
  
  const pdfDoc = await PDFDocument.create();
  const template = new OrderConfirmationTemplate(pdfDoc);
  
  // 30 ürün oluştur
  const goods = [];
  for (let i = 1; i <= 30; i++) {
    goods.push({
      id: i,
      'ARTICLE NUMBER': `T-${16487 + i} PRODUCT ${i} 100% MODAL FABRIC (HS CODE 1111.11.11.11.11)`,
      'WEIGHT / WIDHT': '100 GR/M2 / 200 CM',
      'QUANTITY (METERS)': '400',
      'PRICE': '5,00',
      'AMOUNT': '2000,00',
      'CURRENCY': 'EUR'
    });
  }
  
  const formData = {
    'ORDER CONFIRMATION NUMBER': 'OC-TEST-001',
    'RECIPIENT Şirket Adı': 'TEST COMPANY LTD.',
    'RECIPIENT Adres': 'Test Address 123',
    'RECIPIENT İlçe İl Ülke': 'Test District / Test City / Test Country',
    'RECIPIENT Vat': '1234567890',
    'RECIPIENT Sorumlu Kişi': 'Test Person',
    'RECIPIENT Telefon': '+90 212 123 45 67',
    'RECIPIENT Email': 'test@testcompany.com',
    goods: goods
  };
  
  console.log(`📦 Testing with ${goods.length} products`);
  console.log('📄 Expected: 7 products on first page, 23 products on second page');
  
  await template.generate(formData);
  
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('./test-order-confirmation-30-products.pdf', pdfBytes);
  
  console.log('✅ Test PDF created: test-order-confirmation-30-products.pdf');
  console.log(`📊 PDF has ${pdfDoc.getPages().length} pages`);
  
  if (pdfDoc.getPages().length === 2) {
    console.log('✅ Pagination working correctly: 2 pages created for 30 products');
  } else {
    console.log(`❌ Pagination issue: Expected 2 pages, got ${pdfDoc.getPages().length} pages`);
  }
}

// Test'i çalıştır
testOrderConfirmationPagination().catch(console.error);