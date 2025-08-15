const enLocale = require('../locales/en');
const trLocale = require('../locales/tr');

class LanguageService {
  constructor() {
    this.locales = {
      en: enLocale,
      tr: trLocale
    };
  }

  /**
   * Get text for given key and language
   * @param {string} key - The translation key
   * @param {string} language - Language code ('tr' or 'en')
   * @returns {string|array} - Translated text
   */
  getText(key, language = 'en') {
    // Validate language
    if (!this.isValidLanguage(language)) {
      console.warn(`Invalid language code: ${language}. Falling back to 'en'`);
      language = 'en';
    }

    const locale = this.locales[language];
    
    if (!locale || !locale[key]) {
      console.warn(`Translation key '${key}' not found for language '${language}'. Falling back to English.`);
      return this.locales.en[key] || key;
    }

    return locale[key];
  }

  /**
   * Check if language code is valid
   * @param {string} language - Language code to validate
   * @returns {boolean} - True if valid
   */
  isValidLanguage(language) {
    return ['tr', 'en'].includes(language);
  }

  /**
   * Get translated payment terms value
   * @param {string} value - Original payment terms value
   * @param {string} language - Language code ('tr' or 'en')
   * @returns {string} - Translated payment terms value
   */
  getPaymentTermsTranslation(value, language = 'en') {
    // Validate language
    if (!this.isValidLanguage(language)) {
      console.warn(`Invalid language code: ${language}. Falling back to 'en'`);
      language = 'en';
    }

    const locale = this.locales[language];
    
    if (!locale || !locale.paymentTermsValues || !locale.paymentTermsValues[value]) {
      console.warn(`Payment terms translation for '${value}' not found for language '${language}'. Using original value.`);
      return value;
    }

    return locale.paymentTermsValues[value];
  }

  /**
   * Get translated certifiable value
   * @param {string} value - Original certifiable value
   * @param {string} language - Language code ('tr' or 'en')
   * @returns {string} - Translated certifiable value
   */
  getCertifiableTranslation(value, language = 'en') {
    // Validate language
    if (!this.isValidLanguage(language)) {
      console.warn(`Invalid language code: ${language}. Falling back to 'en'`);
      language = 'en';
    }

    const locale = this.locales[language];
    
    if (!locale || !locale.certifiableValues || !locale.certifiableValues[value]) {
      console.warn(`Certifiable translation for '${value}' not found for language '${language}'. Using original value.`);
      return value;
    }

    return locale.certifiableValues[value];
  }

  /**
   * Get all supported languages
   * @returns {array} - Array of supported language codes
   */
  getSupportedLanguages() {
    return Object.keys(this.locales);
  }

  /**
   * Get all translations for a specific language
   * @param {string} language - Language code
   * @returns {object} - All translations for the language
   */
  getAllTranslations(language = 'en') {
    if (!this.isValidLanguage(language)) {
      language = 'en';
    }
    return this.locales[language];
  }
}

module.exports = LanguageService;
