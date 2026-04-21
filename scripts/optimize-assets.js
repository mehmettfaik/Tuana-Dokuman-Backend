/**
 * Asset Optimization Script
 * 
 * Bu script, PDF'lere gömülen görselleri optimize ederek
 * PDF boyutunu önemli ölçüde küçültür.
 * DPI kalitesi korunur - sadece gereksiz büyük pikseller küçültülür.
 * 
 * Kullanım: node scripts/optimize-assets.js
 */

const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const OPTIMIZED_DIR = path.join(ASSETS_DIR, 'optimized');

async function optimizeAssets() {
  console.log('Asset optimizasyonu başlıyor...\n');

  // Optimized klasörünü oluştur
  await fs.ensureDir(OPTIMIZED_DIR);
  await fs.ensureDir(path.join(OPTIMIZED_DIR, 'washing-icons'));

  let totalOriginal = 0;
  let totalOptimized = 0;

  // 1. Logo optimizasyonu
  // PDF'te 25x25 pt = ~35x35 px @72dpi. 150px veriyoruz → ~4x oversampling
  console.log('Logo optimizasyonu...');
  const logoPath = path.join(__dirname, '../logo.png');
  if (await fs.pathExists(logoPath)) {
    const originalSize = (await fs.stat(logoPath)).size;
    totalOriginal += originalSize;

    await sharp(logoPath)
      .resize(150, 150, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(path.join(OPTIMIZED_DIR, 'logo.png'));

    const optimizedSize = (await fs.stat(path.join(OPTIMIZED_DIR, 'logo.png'))).size;
    totalOptimized += optimizedSize;
    console.log(`   logo.png: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentSaved(originalSize, optimizedSize)})`);
  }

  // 2. Kaşe (stamp) optimizasyonu
  // PDF'te 130x50 pt = ~180x70 px @72dpi. 400x160 veriyoruz → ~2x oversampling
  // PNG olarak kalacak çünkü alpha channel (şeffaflık) olabilir
  console.log('Kaşe (stamp) optimizasyonu...');
  const stampPath = path.join(ASSETS_DIR, 'signature/kase.png');
  if (await fs.pathExists(stampPath)) {
    const originalSize = (await fs.stat(stampPath)).size;
    totalOriginal += originalSize;

    await fs.ensureDir(path.join(OPTIMIZED_DIR, 'signature'));
    await sharp(stampPath)
      .resize(400, 160, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(path.join(OPTIMIZED_DIR, 'signature/kase.png'));

    const optimizedSize = (await fs.stat(path.join(OPTIMIZED_DIR, 'signature/kase.png'))).size;
    totalOptimized += optimizedSize;
    console.log(`   kase.png: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentSaved(originalSize, optimizedSize)})`);
  }

  // 3. İmza optimizasyonu (zaten küçük ama yine de işleyelim)
  console.log('İmza optimizasyonu...');
  const signaturePath = path.join(ASSETS_DIR, 'signature/imza.png');
  if (await fs.pathExists(signaturePath)) {
    const originalSize = (await fs.stat(signaturePath)).size;
    totalOriginal += originalSize;

    await sharp(signaturePath)
      .resize(260, 100, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(path.join(OPTIMIZED_DIR, 'signature/imza.png'));

    const optimizedSize = (await fs.stat(path.join(OPTIMIZED_DIR, 'signature/imza.png'))).size;
    totalOptimized += optimizedSize;
    console.log(`   imza.png: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentSaved(originalSize, optimizedSize)})`);
  }

  // 4. Washing icons optimizasyonu
  // PDF'te 65x70 pt = ~90x97 px @72dpi. 200x200 veriyoruz → ~2x oversampling
  console.log('Washing icons optimizasyonu...');
  const washingIconsDir = path.join(ASSETS_DIR, 'washing-icons');
  if (await fs.pathExists(washingIconsDir)) {
    const files = await fs.readdir(washingIconsDir);
    const imageFiles = files.filter(f => /\.(jpeg|jpg|png)$/i.test(f));

    for (const file of imageFiles) {
      const filePath = path.join(washingIconsDir, file);
      const stat = await fs.stat(filePath);
      
      if (!stat.isFile()) continue;

      const originalSize = stat.size;
      totalOriginal += originalSize;

      // JPEG olarak çıktı al (washing icons'ta şeffaflık yok - grayscale)
      const outputFile = file.replace(/\.(jpeg|jpg|png)$/i, '.jpeg');
      await sharp(filePath)
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(path.join(OPTIMIZED_DIR, 'washing-icons', outputFile));

      const optimizedSize = (await fs.stat(path.join(OPTIMIZED_DIR, 'washing-icons', outputFile))).size;
      totalOptimized += optimizedSize;
      console.log(`   ${file}: ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${percentSaved(originalSize, optimizedSize)})`);
    }
  }

  // Sonuç özeti
  console.log('\n' + '═'.repeat(60));
  console.log(`Optimizasyon tamamlandı!`);
  console.log(`   Toplam orijinal: ${formatBytes(totalOriginal)}`);
  console.log(`   Toplam optimize: ${formatBytes(totalOptimized)}`);
  console.log(`   Kazanım: ${formatBytes(totalOriginal - totalOptimized)} (${percentSaved(totalOriginal, totalOptimized)})`);
  console.log('═'.repeat(60));
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function percentSaved(original, optimized) {
  const saved = ((original - optimized) / original * 100).toFixed(1);
  return `${saved}% saved`;
}

// Script'i çalıştır
optimizeAssets().catch(err => {
  console.error('Optimizasyon hatası:', err);
  process.exit(1);
});
