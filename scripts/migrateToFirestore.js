const { initializeFirebase, getFirestore } = require('./config/firebase');

// Bu script cache verilerini Firestore'a aktarmak için kullanılabilir
async function migrateData() {
  try {
    // Firebase'i başlat
    initializeFirebase();
    const db = getFirestore();

    // Örnek veri - gerçek verilerinizi buraya koyun
    const sampleRecipients = [
      {
        companyName: "ABC TEKSTIL SAN. VE TIC. LTD. STI.",
        address: "Atatürk Mah. Cumhuriyet Cad. No: 123/A",
        cityStateCountry: "Kadıköy / İstanbul / Türkiye",
        vat: "1234567890",
        responsiblePerson: "Ahmet Yılmaz",
        phone: "+90 212 123 45 67",
        email: "ahmet@abctekstil.com",
        createdDate: "2024-10-06T10:30:00.000Z",
        updatedDate: "2025-10-07T11:02:57.653Z"
      },
      {
        companyName: "MODA FASHION EXPORT IMPORT LTD.",
        address: "İnönü Bulvarı No: 45 Kat: 3",
        cityStateCountry: "Beyoğlu / İstanbul / Türkiye",
        vat: "0987654321",
        responsiblePerson: "Ayşe Demir",
        phone: "+90 212 987 65 43",
        email: "ayse@modafashion.com",
        createdDate: "2024-10-06T11:00:00.000Z",
        updatedDate: "2025-10-07T11:02:57.653Z"
      }
    ];

    console.log('🔄 Starting data migration to Firestore...');

    // Her recipient'ı Firestore'a ekle
    for (const recipient of sampleRecipients) {
      const docRef = await db.collection('recipients').add(recipient);
      console.log(`✅ Added recipient: ${recipient.companyName} with ID: ${docRef.id}`);
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };