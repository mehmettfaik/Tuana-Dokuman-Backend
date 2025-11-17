/**
 * Excel OCR Parser Service
 * Google Document AI'dan gelen OCR verisini parse edip Excel için hazırlar
 */

class ExcelOcrParser {
  /**
   * OCR text'inden ürün verilerini çıkarır
   * @param {string} ocrText - Google Document AI'dan gelen OCR text
   * @param {string} imageLink - Fotoğrafın linki
   * @returns {Object} - Articles, compositions, weights, widths ve image links
   */
  parseOcrText(ocrText, imageLink = '') {

    // Eğer OCR text boşsa hata
    if (!ocrText || ocrText.trim() === '') {
      console.log('HATA: OCR text boş!');
      return {
        articles: [],
        compositions: [],
        weights: [],
        widths: [],
        imageLinks: [],
        totalProducts: 0
      };
    }

    console.log('OCR text mevcut, işleniyor...');

    // Article'ları bul
    const articleMatches = ocrText.match(/\*\s*\*\*Article:\*\*\s*([^\n]+)/g) || [];
    const articles = articleMatches.map(match => {
      const extracted = match.match(/\*\s*\*\*Article:\*\*\s*([^\n]+)/);
      return extracted ? extracted[1].trim() : '';
    }).filter(item => item);
    // Composition'ları bul
    const compMatches = ocrText.match(/\*\s*\*\*Composition:\*\*\s*([^\n*]+)/g) || [];
    const compositions = compMatches.map(match => {
      const extracted = match.match(/\*\s*\*\*Composition:\*\*\s*([^\n*]+)/);
      if (extracted) {
        return extracted[1].replace(/[*\n\r]+/g, ' ').trim();
      }
      return '';
    }).filter(item => item);
    // Weight'leri bul
    const weightMatches = ocrText.match(/\*\s*\*\*Weight:\*\*\s*([^\n*]+)/g) || [];
    const weights = weightMatches.map(match => {
      const extracted = match.match(/\*\s*\*\*Weight:\*\*\s*([^\n*]+)/);
      if (extracted) {
        return extracted[1].replace(/[*\n\r]+/g, ' ').trim();
      }
      return '';
    }).filter(item => item);
    // Width'leri bul
    const widthMatches = ocrText.match(/\*\s*\*\*Width:\*\*\s*([^\n*]+)/g) || [];
    const widths = widthMatches.map(match => {
      const extracted = match.match(/\*\s*\*\*Width:\*\*\s*([^\n*]+)/);
      if (extracted) {
        return extracted[1].replace(/[*\n\r]+/g, ' ').trim();
      }
      return '';
    }).filter(item => item);
    // En az article olması gerekiyor
    if (articles.length === 0) {
      return {
        articles: [],
        compositions: [],
        weights: [],
        widths: [],
        imageLinks: [],
        totalProducts: 0
      };
    }

    // Listeleri eşitle (article sayısına göre)
    const minLength = articles.length;
    console.log(`Article sayısı: ${minLength}`);

    // Diğer listeleri article sayısına göre ayarla
    const normalizedCompositions = [...compositions];
    const normalizedWeights = [...weights];
    const normalizedWidths = [...widths];

    // Eksik olanları boş string ile doldur
    while (normalizedCompositions.length < minLength) {
      normalizedCompositions.push('');
    }
    while (normalizedWeights.length < minLength) {
      normalizedWeights.push('');
    }
    while (normalizedWidths.length < minLength) {
      normalizedWidths.push('');
    }

    // Fazla olanları kes
    normalizedCompositions.length = minLength;
    normalizedWeights.length = minLength;
    normalizedWidths.length = minLength;

    console.log(`Final - Articles: ${minLength}, Compositions: ${normalizedCompositions.length}, Weights: ${normalizedWeights.length}, Widths: ${normalizedWidths.length}`);

    // Output hazırla
    const output = {
      articles: articles,
      compositions: normalizedCompositions,
      weights: normalizedWeights,
      widths: normalizedWidths,
      imageLinks: new Array(minLength).fill(imageLink),
      totalProducts: minLength
    };

    console.log(`SONUÇ: ${output.totalProducts} ürün hazırlandı`);
    output.articles.forEach((article, i) => {
      console.log(`Ürün ${i + 1}: ${article}`);
    });

    console.log('=== TAMAMLANDI ===');

    return output;
  }

  /**
   * Alternatif parsing metodu - Daha esnek pattern matching
   * Eğer yukarıdaki format çalışmazsa bu denenir
   */
  parseOcrTextFlexible(ocrText, imageLink = '') {
    if (!ocrText || ocrText.trim() === '') {
      return {
        articles: [],
        compositions: [],
        weights: [],
        widths: [],
        imageLinks: [],
        totalProducts: 0
      };
    }

    // Çok daha esnek ve agresif regex pattern'leri
    const articlePatterns = [
      /article[:\s]+([^\n,]+)/gi,
      /art[.:\s]+([A-Z0-9-]+)/gi,
      /item[:\s]+([^\n,]+)/gi,
      /code[:\s]+([A-Z0-9-]+)/gi,
      /ürün[:\s]+([^\n,]+)/gi,
      /kod[:\s]+([A-Z0-9-]+)/gi,
      // Sadece büyük harf + rakam kombinasyonları (ör: ABC123, XYZ-456)
      /\b([A-Z]{2,}[-\s]?[0-9]{2,})\b/g,
      /\b([A-Z][0-9]{3,})\b/g
    ];

    const compositionPatterns = [
      /composition[:\s]+([^\n,]+)/gi,
      /comp[.:\s]+([^\n,]+)/gi,
      /material[:\s]+([^\n,]+)/gi,
      /fabric[:\s]+([^\n,]+)/gi,
      /kumaş[:\s]+([^\n,]+)/gi,
      /içerik[:\s]+([^\n,]+)/gi,
      // Yüzde içeren ifadeler (ör: 100% Cotton, 80% Cotton 20% Polyester)
      /(\d+%\s*[A-Za-z]+(?:\s+\d+%\s*[A-Za-z]+)*)/gi,
      /(cotton|polyester|viscose|elastane|wool|silk|linen|rayon)/gi
    ];

    const weightPatterns = [
      /weight[:\s]+([^\n,]+)/gi,
      /wt[.:\s]+([^\n,]+)/gi,
      /gsm[:\s]*([0-9]+)/gi,
      /gram[:\s]*([0-9]+)/gi,
      /ağırlık[:\s]+([^\n,]+)/gi,
      // Sadece sayı + gsm/gr kombinasyonu
      /(\d+\s*(?:gsm|g\/m|gr))/gi,
      // 100-500 arası sayılar (muhtemelen gramaj)
      /\b([1-5]\d{2})\s*(?:gsm|g|gr)?\b/gi
    ];

    const widthPatterns = [
      /width[:\s]+([^\n,]+)/gi,
      /w[.:\s]*([0-9]+)/gi,
      /cm[:\s]*([0-9]+)/gi,
      /en[:\s]+([^\n,]+)/gi,
      /genişlik[:\s]+([^\n,]+)/gi,
      // Sayı + cm/inch
      /(\d+\s*(?:cm|inch|"))/gi,
      // 100-250 arası sayılar (muhtemelen en)
      /\b(1[0-9]{2}|2[0-4][0-9]|250)\s*(?:cm)?\b/gi
    ];

    // Her pattern'i dene
    let articles = this.extractWithPatterns(ocrText, articlePatterns);
    let compositions = this.extractWithPatterns(ocrText, compositionPatterns);
    let weights = this.extractWithPatterns(ocrText, weightPatterns);
    let widths = this.extractWithPatterns(ocrText, widthPatterns);

    if (articles.length === 0) {
      console.warn('⚠️ Hiç article bulunamadı, metin analizi yapılıyor...');
      
      // Son çare: metni satırlara böl ve muhtemel article'ları bul
      const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      for (const line of lines) {
        // Büyük harf + rakam kombinasyonlarını ara
        const potentialArticles = line.match(/\b([A-Z]{2,}[-\s]?[0-9]{2,})\b/g);
        if (potentialArticles) {
          articles.push(...potentialArticles);
        }
      }
      
      console.log(`Metin analizinden ${articles.length} muhtemel article bulundu`);
    }

    // Hiçbir veri bulunamadıysa boş dön
    if (articles.length === 0 && compositions.length === 0 && weights.length === 0 && widths.length === 0) {
      console.error('❌ Hiçbir veri bulunamadı!');
      return {
        articles: [],
        compositions: [],
        weights: [],
        widths: [],
        imageLinks: [],
        totalProducts: 0
      };
    }

    // En çok bulunan sayıyı baz al
    const maxLength = Math.max(
      articles.length,
      compositions.length,
      weights.length,
      widths.length,
      1 // En az 1
    );

    console.log(`Baz uzunluk: ${maxLength}`);

    // Normalize et
    articles = this.normalizeArray(articles, maxLength);
    compositions = this.normalizeArray(compositions, maxLength);
    weights = this.normalizeArray(weights, maxLength);
    widths = this.normalizeArray(widths, maxLength);

    return {
      articles,
      compositions,
      weights,
      widths,
      imageLinks: new Array(maxLength).fill(imageLink),
      totalProducts: maxLength
    };
  }

  /**
   * Birden fazla pattern ile text'den veri çıkarır
   */
  extractWithPatterns(text, patterns) {
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 0) {
        const results = matches.map(match => match[1].trim()).filter(item => item);
        if (results.length > 0) {
          return results;
        }
      }
    }
    return [];
  }

  /**
   * Array'i normalize eder (eksikleri doldurur, fazlaları keser)
   */
  normalizeArray(arr, targetLength) {
    const result = [...arr];
    while (result.length < targetLength) {
      result.push('');
    }
    result.length = targetLength;
    return result;
  }
}

module.exports = new ExcelOcrParser();
