# Document AI Service - Parser Refactoring

## 📋 Overview
DocumentAiService has been completely refactored to use a modular, maintainable parser system. Each company format now has its own dedicated parser class.

## 🏗️ New Architecture

### Directory Structure
```
services/
├── documentAiService.js          # Main service (refactored)
├── documentAiService_old.js      # Backup of old implementation
└── parsers/                      # New parser system
    ├── BaseParser.js             # Abstract base class for all parsers
    ├── ParserFactory.js          # Format detection and parser management
    ├── AkbaslarParser.js         # AKBASLAR format parser
    ├── AdaParser.js              # ADA format parser
    ├── SafiraParser.js           # SAFİRA format parser
    ├── BezParser.js              # BEZ format parser
    ├── HarputParser.js           # HARPUT format parser
    └── AdilUcarParser.js         # ADİL UÇAR format parser
```

## 🔧 Key Components

### 1. BaseParser Class
**Location:** `services/parsers/BaseParser.js`

Abstract base class that provides:
- Common parsing utilities
- Text normalization methods
- Number extraction helpers
- Logging with company prefixes
- Empty product template creation

### 2. ParserFactory Class
**Location:** `services/parsers/ParserFactory.js`

Central management system that:
- Detects document format automatically
- Instantiates appropriate parser
- Provides confidence scoring
- Handles fallback scenarios
- Manages all parser instances

### 3. Company-Specific Parsers

#### AkbaslarParser
- **Fields:** CUSTOMER ORDER NO, COMPOSITION, Batch No, Roll No, Quantity Meter, Gross Weight, Net Weight
- **Format:** Table-based with header information

#### AdaParser
- **Fields:** Müşt. Referansı, Komp, Barkod-TopNo, Kalite-Lot, Metre, Gramaj
- **Format:** Multi-line with barcode patterns

#### SafiraParser
- **Fields:** Top No, Miktar Metre, Miktar Kg, Renk, En, Parti No, Kumaş Cinsi
- **Format:** Vertical and horizontal layouts

#### BezParser
- **Fields:** Tip, TopAdı, Tezgah No, Müş. No, Sip. No, Dispo No, Top Metre, En, kalite, lot
- **Format:** Section-based with grouped fields

#### HarputParser
- **Fields:** ARTICLE NUMBER, ROLL NUMBER, QUANTITY, GROSS WEIGHT, NET WEIGHT, LOT
- **Format:** H-code based product identification

#### AdilUcarParser
- **Fields:** ARTICLE NUMBER / COMPOSITION, QUANTITY(METERS), ROLL NUMBER
- **Format:** ÇEKİ LİSTESİ block-based parsing

## 🚀 Usage

### Basic Usage
```javascript
const DocumentAiService = require('./services/documentAiService');

const service = new DocumentAiService();
const result = await service.processDocument(buffer, mimeType, companyName);

// Result includes parser information
console.log(result.parserInfo.detectedFormat);    // e.g., 'AKBASLAR'
console.log(result.parserInfo.confidence);        // e.g., 85.5
```

### Direct Parser Access
```javascript
// Get parser factory
const parserFactory = service.getParserFactory();

// Parse document directly
const parseResult = parserFactory.parseDocument(ocrText);

// Get format detection statistics
const stats = parserFactory.getFormatDetectionStats(ocrText);
```

### Adding New Parsers
```javascript
// Get specific parser
const akbaslarParser = parserFactory.getParser('AKBASLAR');

// Add custom parser
parserFactory.addParser('NEW_COMPANY', new CustomParser());
```

## 🔍 Format Detection

The ParserFactory uses keyword-based detection:

1. **Keyword Matching:** Each parser defines format-specific keywords
2. **Percentage Scoring:** Calculates match percentage for each format
3. **Confidence Threshold:** Minimum 30% match required
4. **Priority Ordering:** Higher confidence formats take precedence

## 🔄 Migration from Old System

### Backward Compatibility
- `parseDocumentData()` method still exists (deprecated)
- Legacy fallback parsing available
- All existing API endpoints continue to work

### Key Changes
- ✅ Modular parser architecture
- ✅ Better error handling and logging
- ✅ Confidence scoring for format detection
- ✅ Easier testing and debugging
- ✅ Simplified adding new company formats

## 📊 Benefits

### Maintainability
- Each company format is isolated
- Easy to modify without affecting others
- Clear separation of concerns

### Extensibility
- Simple to add new company formats
- Shared common functionality via BaseParser
- Pluggable architecture via ParserFactory

### Reliability
- Better error handling per parser
- Fallback mechanisms
- Comprehensive logging

### Performance
- Efficient format detection
- Reduced parsing overhead
- Better memory management

## 🐛 Debugging

### Parser Information
All responses now include `parserInfo`:
```javascript
{
  detectedFormat: "AKBASLAR",
  confidence: 85.5,
  matchedKeywords: ["CUSTOMER ORDER NO", "COMPOSITION"]
}
```

### Format Detection Stats
```javascript
const stats = service.getFormatDetectionStats(text);
// Returns detailed breakdown of keyword matches for all formats
```

### Logging
- Each parser logs with company prefix: `[AKBASLAR]`
- Detailed parsing steps are logged
- Format detection confidence scores shown

## 🔧 Technical Notes

### Error Handling
- Parser failures fall back to legacy system
- Graceful degradation for unknown formats
- Detailed error messages with context

### Performance Considerations
- Parsers are instantiated once and reused
- Format detection is optimized for speed
- Memory-efficient text processing

### Testing
- Each parser can be tested independently
- Mock ParserFactory for unit tests
- Comprehensive format detection testing

## 📝 Future Enhancements

1. **Machine Learning Integration:** Use ML for format detection
2. **Configuration-Based Parsers:** Define formats via JSON config
3. **Real-time Parser Updates:** Hot-reload parser definitions
4. **Advanced Analytics:** Track parsing accuracy and performance
5. **Visual Parser Builder:** GUI tool for creating new parsers

---

**Migration completed successfully! 🎉**
All existing functionality preserved while gaining significant maintainability improvements.