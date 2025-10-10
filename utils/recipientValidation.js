// Recipient veri doğrulama ve temizleme fonksiyonları

// Bu fonksiyonu artık kullanmıyoruz - direkt field name'leri kullanacağız

/**
 * Recipient verisini doğrula
 * @param {Object} data - Doğrulanacak recipient verisi
 * @param {boolean} isUpdate - Güncelleme mi yoksa yeni kayıt mı
 * @returns {Object} - {isValid: boolean, errors: Array}
 */
function validateRecipient(data, isUpdate = false) {
  const errors = [];

  // Zorunlu alan kontrolleri (sadece yeni kayıt için)
  if (!isUpdate) {
    if (!data.companyName || data.companyName.trim() === '') {
      errors.push('Company name is required');
    }
  }

  // Şirket adı kontrolü
  if (data.companyName) {
    if (typeof data.companyName !== 'string') {
      errors.push('Company name must be a string');
    } else if (data.companyName.trim().length < 2) {
      errors.push('Company name must be at least 2 characters');
    } else if (data.companyName.length > 200) {
      errors.push('Company name must be less than 200 characters');
    }
  }

  // Adres kontrolü
  if (data.address && typeof data.address !== 'string') {
    errors.push('Address must be a string');
  }
  if (data.address && data.address.length > 300) {
    errors.push('Address must be less than 300 characters');
  }

  // İlçe İl Ülke kontrolü
  if (data.cityStateCountry) {
    if (typeof data.cityStateCountry !== 'string') {
      errors.push('City/State/Country must be a string');
    } else if (data.cityStateCountry.length > 150) {
      errors.push('City/State/Country must be less than 150 characters');
    }
  }

  // VAT kontrolü
  if (data.vat) {
    if (typeof data.vat !== 'string') {
      errors.push('VAT must be a string');
    } else if (data.vat.length > 20) {
      errors.push('VAT must be less than 20 characters');
    }
  }

  // Sorumlu kişi kontrolü (contactPerson field'ı)
  if (data.contactPerson) {
    if (typeof data.contactPerson !== 'string') {
      errors.push('Contact person must be a string');
    } else if (data.contactPerson.length > 100) {
      errors.push('Contact person name must be less than 100 characters');
    }
  }

  // Telefon kontrolü
  if (data.phone) {
    if (typeof data.phone !== 'string') {
      errors.push('Phone must be a string');
    } else if (data.phone.length > 20) {
      errors.push('Phone must be less than 20 characters');
    }
  }

  // Email kontrolü
  if (data.email) {
    if (typeof data.email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Email format is invalid');
      } else if (data.email.length > 150) {
        errors.push('Email must be less than 150 characters');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Recipient verisini temizle ve normalize et
 * @param {Object} data - Temizlenecek recipient verisi
 * @returns {Object} - Temizlenmiş veri
 */
function sanitizeRecipient(data) {
  const sanitized = {};

  // Şirket adı - zorunlu alan
  if (data.companyName) {
    sanitized.companyName = data.companyName.toString().trim();
  }

  // Adres
  if (data.address) {
    sanitized.address = data.address.toString().trim();
  }

  // İlçe İl Ülke
  if (data.cityStateCountry) {
    sanitized.cityStateCountry = data.cityStateCountry.toString().trim();
  }

  // VAT
  if (data.vat) {
    sanitized.vat = data.vat.toString().trim().replace(/\s+/g, ''); // Boşlukları kaldır
  }

  // Sorumlu kişi (contactPerson field'ı)
  if (data.contactPerson) {
    sanitized.contactPerson = data.contactPerson.toString().trim();
  }

  // Telefon
  if (data.phone) {
    sanitized.phone = data.phone.toString().trim();
  }

  // Email
  if (data.email) {
    sanitized.email = data.email.toString().trim().toLowerCase();
  }

  // Tarih alanlarını koru (update durumunda)
  if (data.createdDate) {
    sanitized.createdDate = data.createdDate;
  }
  if (data.updatedDate) {
    sanitized.updatedDate = data.updatedDate;
  }

  return sanitized;
}

/**
 * Arama query'sini temizle
 * @param {string} query - Arama query'si
 * @returns {string} - Temizlenmiş query
 */
function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query.trim().replace(/[<>\"'&]/g, ''); // XSS koruması
}

module.exports = {
  validateRecipient,
  sanitizeRecipient,
  sanitizeSearchQuery
};