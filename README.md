# 💬 BotXafiis — WhatsApp Bot SaaS

**The WhatsApp bot management platform for Somali businesses.**

You register a business, upload their FAQ/price list, and their WhatsApp number becomes an AI-powered bot that answers customer questions 24/7 — in Somali and English.

---

## 🏗️ Architecture

```
botxafiis/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── controllers/   Route handlers
│   │   ├── middleware/    Auth, upload
│   │   ├── models/        DB migrations
│   │   ├── routes/        API routes
│   │   ├── services/      AI, Twilio, file parsing
│   │   └── server.js      Entry point
│   └── uploads/          Uploaded files
├── frontend/         React dashboard
│   └── src/
│       ├── pages/         Dashboard, Businesses, Billing, Analytics
│       ├── components/    Layout, Sidebar
│       ├── context/       Auth
│       └── services/      API client
└── docker-compose.yml
```

**Stack:**
- **Frontend:** React 18, React Query, Recharts, React Router, Lucide icons
- **Backend:** Node.js, Express, JWT auth, Multer
- **Database:** PostgreSQL
- **AI:** Claude (Anthropic) — powers all bot responses
- **WhatsApp:** Twilio WhatsApp Business API
- **File parsing:** pdf-parse (PDFs), xlsx (Excel/CSV)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally
- Anthropic API key
- Twilio account (optional for dev — bots work in test mode)

### 1. Clone and install

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/botxafiis
JWT_SECRET=any_long_random_string_here
ANTHROPIC_API_KEY=sk-ant-your-key-here
FRONTEND_URL=http://localhost:3000

# Twilio (optional - bots log to console if not set)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WEBHOOK_BASE_URL=https://your-domain.com
```

### 3. Run migrations and seed

```bash
cd backend
npm run migrate   # Creates all database tables
npm run seed      # Creates default admin account
```

### 4. Start both servers

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Open http://localhost:3000

**Default login:** `admin@botxafiis.com` / `admin123`

---

## 🐳 Docker Deployment (Production)

```bash
# Copy and edit env file
cp backend/.env.example .env

# Set your API keys in docker-compose.yml or .env, then:
docker-compose up -d

# View logs
docker-compose logs -f backend
```

---

## 📱 WhatsApp Bot Setup

### Step 1: Get Twilio credentials
1. Create account at [twilio.com](https://twilio.com)
2. Go to **Messaging → WhatsApp → Sandbox** (for testing)
3. Or apply for **WhatsApp Business API** (for production)
4. Copy Account SID and Auth Token → put in `.env`

### Step 2: Configure webhook
In Twilio console → WhatsApp Sandbox → set webhook URL:
```
https://your-domain.com/api/webhook/whatsapp
```
Method: `HTTP POST`

### Step 3: Register a business
1. Login to dashboard
2. Click "Add Business"
3. Enter business name, WhatsApp number, type
4. Upload FAQ PDF and/or price list Excel
5. Click "Activate Bot"
6. Their number now responds automatically!

---

## 💰 Business Model

| Plan | Price | Features |
|------|-------|---------|
| Basic | $50/mo | 1 bot, AI responses, file upload |
| Pro | $100/mo | Priority AI, analytics, custom greeting |
| Enterprise | $200/mo | Multiple bots, full support |

**At 10 clients = $500/month**
**At 50 clients = $2,500/month**
**At 100 clients = $5,000/month**

---

## 🤖 How the Bot Works

1. Customer sends WhatsApp message to business number
2. Twilio forwards to `/api/webhook/whatsapp`
3. Backend finds the business by phone number
4. Sends message + knowledge base to Claude AI
5. Claude responds in Somali/English based on business config
6. Response sent back via Twilio to customer

---

## 📊 Dashboard Features

- **Dashboard** — live stats, revenue chart, recent clients
- **Clients** — add, edit, search, filter businesses
- **Business Detail** — manage files, view messages, test bot, record payments
- **Billing** — track who paid, record payments, revenue history
- **Analytics** — message volume, response times, top bots
- **Settings** — change password, API config, webhook URLs

---

## 🛠️ API Endpoints

### Auth
```
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/password
```

### Businesses
```
GET    /api/businesses
POST   /api/businesses
GET    /api/businesses/:id
PUT    /api/businesses/:id
DELETE /api/businesses/:id
POST   /api/businesses/:id/toggle-bot
POST   /api/businesses/:id/test-bot
```

### Files
```
POST   /api/businesses/:id/files
GET    /api/businesses/:id/files
DELETE /api/files/:id
```

### Payments
```
GET  /api/payments
POST /api/businesses/:id/payments
GET  /api/payments/analytics
```

### Webhook (public)
```
POST /api/webhook/whatsapp
```

---

## 🚀 Deployment on Render.com (Free)

1. Push to GitHub
2. Create **Web Service** → connect repo → `backend/` directory
3. Create **Static Site** → connect repo → `frontend/` directory  
4. Create **PostgreSQL** database
5. Set environment variables in Render dashboard
6. Done!

---

## 🔒 Security Notes

- JWT tokens expire in 7 days
- File uploads limited to 10MB
- Rate limiting: 200 requests per 15 minutes
- SQL injection protection via parameterized queries
- Passwords hashed with bcrypt (12 rounds)
- Change default admin password after first login!

---

## 📝 License

MIT — Build your business!

**Made for Somali entrepreneurs 🇸🇴**
