# Tuana Dokuman Backend

PDF generation and recipient management API service.

## 🚀 Live Demo
- **Production**: https://tuana-dokuman-backend.onrender.com
- **Health Check**: https://tuana-dokuman-backend.onrender.com/api/health

## 📋 Features

### PDF Generation
- Invoice Templates
- Proforma Invoice
- Credit/Debit Notes
- Order Confirmation
- Packing Lists
- Technical Sheets
- Turkish number formatting (1.250,23)

### Recipients Management (Firebase Firestore)
- CRUD operations for recipients
- Search functionality
- Statistics and analytics
- Real-time data persistence

## 🛠️ Setup

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mehmettfaik/Tuana-Dokuman-Backend.git
   cd Tuana-Dokuman-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Firebase Setup** (for Recipients API)
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Add credentials to `.env` file

5. **Start development server**
   ```bash
   npm run dev
   ```

   Server will run on: http://localhost:3001

### Production Deployment (Render.com)

1. **Connect GitHub repository to Render**
2. **Set environment variables in Render dashboard:**
   ```
   NODE_ENV=production
   PORT=10000
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY=your-private-key
   ```
3. **Deploy automatically triggers on git push**

## 📡 API Endpoints

### Health & Status
- `GET /` - Basic server info
- `GET /api/health` - Detailed health check
- `GET /test` - Simple test endpoint

### PDF Generation
- `POST /api/pdf/invoice` - Generate invoice PDF
- `POST /api/pdf/proforma` - Generate proforma invoice PDF
- `POST /api/pdf/credit-note` - Generate credit note PDF
- `POST /api/pdf/debit-note` - Generate debit note PDF
- `POST /api/pdf/order-confirmation` - Generate order confirmation PDF
- `POST /api/pdf/packing-list` - Generate packing list PDF
- `POST /api/pdf/technical-sheet` - Generate technical sheet PDF

### Recipients Management
- `GET /api/recipients` - List all recipients
- `GET /api/recipients/search?q=term` - Search recipients
- `GET /api/recipients/stats` - Get statistics
- `GET /api/recipients/:id` - Get specific recipient
- `POST /api/recipients` - Create new recipient
- `PUT /api/recipients/:id` - Update recipient
- `DELETE /api/recipients/:id` - Delete recipient

## 🔧 Environment Variables

### Required for Recipients API
```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### Optional
```env
NODE_ENV=development|production
PORT=3001
```

## 🏗️ Project Structure

```
├── config/
│   └── firebase.js          # Firebase configuration
├── controllers/
│   ├── pdfController.js     # PDF generation logic
│   └── recipientController.js # Recipients CRUD operations
├── routes/
│   ├── pdfRoutes.js         # PDF API routes
│   └── recipientRoutes.js   # Recipients API routes
├── services/
│   ├── recipientService.js  # Firestore operations
│   ├── fontService.js       # Font management
│   └── ...                  # Other services
├── templates/
│   ├── invoice/             # Invoice template
│   ├── proforma/            # Proforma invoice template
│   └── ...                  # Other PDF templates
├── assets/
│   ├── fonts/               # Font files
│   └── washing-icons/       # Washing instruction icons
└── scripts/
    └── migrateToFirestore.js # Data migration script
```

## 🔥 Firebase Firestore Structure

### Recipients Collection
```javascript
{
  id: "auto-generated-id",
  companyName: "ABC TEKSTIL LTD.",
  address: "Atatürk Mah. Cumhuriyet Cad. No: 123/A",
  cityStateCountry: "İstanbul / Türkiye",
  vat: "1234567890",
  responsiblePerson: "Ahmet Yılmaz",
  phone: "+90 212 123 45 67",
  email: "ahmet@abctekstil.com",
  createdDate: "2024-10-06T10:30:00.000Z",
  updatedDate: "2025-10-07T11:02:57.653Z"
}
```

## 🚀 Deployment Status

- ✅ **Production**: https://tuana-dokuman-backend.onrender.com
- ✅ **Automatic deployments** from `main` branch
- ✅ **Health monitoring** at `/api/health`
- ✅ **CORS enabled** for frontend integration
- ✅ **Firebase Firestore** for data persistence

## 📞 API Testing

### Test Recipients API
```bash
# Get all recipients
curl https://tuana-dokuman-backend.onrender.com/api/recipients

# Search recipients
curl "https://tuana-dokuman-backend.onrender.com/api/recipients/search?q=tekstil"

# Get stats
curl https://tuana-dokuman-backend.onrender.com/api/recipients/stats
```

### Test PDF Generation
```bash
# Generate test invoice
curl -X POST https://tuana-dokuman-backend.onrender.com/api/pdf/invoice \
  -H "Content-Type: application/json" \
  -d '{"invoiceNumber": "INV-001", "goods": [{"name": "Product 1", "quantity": 1, "price": 100}]}'
```

---

Made with ❤️ for textile industry document management