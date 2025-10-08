const validateRecipient = (data, isUpdate = false) => {
  const errors = [];

  // Zorunlu alanlar (sadece yeni kayıt için)
  if (!isUpdate) {
    if (!data.companyName || data.companyName.trim() === '') {
      errors.push('Company name is required');
    }
  }

  // Veri tipi ve format kontrolü
  if (data.companyName && typeof data.companyName !== 'string') {
    errors.push('Company name must be a string');
  }

  if (data.email && typeof data.email !== 'string') {
    errors.push('Email must be a string');
  }

  if (data.phone && typeof data.phone !== 'string') {
    errors.push('Phone must be a string');
  }

  // Email format kontrolü (sadece @ içeren metinler için)
  if (data.email && data.email.trim() !== '') {
    if (data.email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }
    // @ içermiyorsa email değil, boş bırak
  }

  // Telefon format kontrolü (sadece sayı içeren metinler için)
  if (data.phone && data.phone.trim() !== '') {
    // En az bir rakam içermelidir
    if (!/\d/.test(data.phone)) {
      errors.push('Phone must contain at least one number');
    }
  }

  // VAT numarası kontrolü (sadece rakam ve harf)
  if (data.vat && data.vat.trim() !== '') {
    const vatRegex = /^[A-Z0-9]+$/i;
    if (!vatRegex.test(data.vat.replace(/\s/g, ''))) {
      errors.push('VAT number can only contain letters and numbers');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeRecipient = (data) => {
  const sanitized = {};

  // String alanları temizle
  if (data.companyName) sanitized.companyName = data.companyName.trim();
  if (data.responsiblePerson) sanitized.responsiblePerson = data.responsiblePerson.trim();
  if (data.email) sanitized.email = data.email.trim().toLowerCase();
  if (data.phone) sanitized.phone = data.phone.trim();
  if (data.address) sanitized.address = data.address.trim();
  if (data.city) sanitized.city = data.city.trim();
  if (data.country) sanitized.country = data.country.trim();
  if (data.postalCode) sanitized.postalCode = data.postalCode.trim();
  if (data.vat) sanitized.vat = data.vat.trim().toUpperCase();
  if (data.website) {
    let website = data.website.trim();
    if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      website = 'https://' + website;
    }
    sanitized.website = website;
  }
  if (data.notes) sanitized.notes = data.notes.trim();

  return sanitized;
};

module.exports = {
  validateRecipient,
  sanitizeRecipient
};