# Suits India - Full System Architecture Document

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Pricing System](#8-pricing-system)
9. [API Reference](#9-api-reference)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Security Considerations](#12-security-considerations)

---

## 1. Executive Summary

**Suits India** is a full-stack B2B e-commerce platform for custom tailoring businesses. It enables:
- **Resellers** to create custom suit orders with detailed measurements and styling options
- **Sales Partners** to earn commissions on referred orders
- **Admins** to manage products, pricing, orders, and system configuration

### Key Features
- Multi-tenant architecture with role-based access
- Complex two-tier pricing system (Admin-to-Reseller + Reseller-to-Customer margins)
- Real-time order customization with fabric, styling, and measurement flows
- Stripe payment integration
- Order-specific chat system
- PDF invoice generation
- Email notifications (Google Workspace SMTP / Mailgun)

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0.0 | UI Framework |
| React Router DOM | 7.5.1 | Client-side routing |
| Tailwind CSS | 3.x | Utility-first styling |
| Shadcn/UI + Radix | Latest | Component library |
| Axios | 1.8.4 | HTTP client |
| Recharts | 3.6.0 | Data visualization |
| Lucide React | 0.507.0 | Icon library |
| Sonner | 2.0.3 | Toast notifications |
| Craco | 7.1.0 | CRA configuration override |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110.1 | Web framework |
| Motor | Latest | Async MongoDB driver |
| Pydantic | 2.x | Data validation |
| PyJWT | Latest | JWT authentication |
| Passlib + bcrypt | Latest | Password hashing |
| Stripe | Latest | Payment processing |
| pdfkit | Latest | PDF generation |

### Database
| Technology | Purpose |
|------------|---------|
| MongoDB | Primary database (document store) |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Container | Kubernetes (Emergent Platform) |
| Process Manager | Supervisor |
| Reverse Proxy | Nginx (via K8s Ingress) |

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  Admin   │  │ Reseller │  │  Sales   │  │  Public Website  │    │
│  │  Portal  │  │  Portal  │  │ Partner  │  │   (Marketing)    │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
└───────┼─────────────┼─────────────┼─────────────────┼───────────────┘
        │             │             │                 │
        └─────────────┴─────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES INGRESS (Nginx)                        │
│                    https://[domain].emergentagent.com                │
│         /api/* → Backend:8001    /* → Frontend:3000                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│     FRONTEND      │                    │      BACKEND      │
│   React (CSR)     │                    │     FastAPI       │
│   Port: 3000      │                    │    Port: 8001     │
│                   │                    │                   │
│ • Shadcn/UI       │                    │ • REST API        │
│ • React Router    │                    │ • JWT Auth        │
│ • Axios Client    │                    │ • Business Logic  │
│ • Tailwind CSS    │                    │ • PDF Generation  │
└───────────────────┘                    └─────────┬─────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────┐
                    │                              │                  │
                    ▼                              ▼                  ▼
          ┌─────────────────┐           ┌──────────────┐    ┌──────────────┐
          │    MongoDB      │           │    Stripe    │    │    SMTP      │
          │   (Managed)     │           │   Payments   │    │   (Email)    │
          └─────────────────┘           └──────────────┘    └──────────────┘
```

---

## 4. Frontend Architecture

### Rendering Model
- **Type**: Pure Client-Side Rendered (CSR)
- **Framework**: Create React App with Craco
- **Build Output**: Static HTML/JS/CSS files

### Directory Structure
```
/app/frontend/src/
├── components/
│   ├── ui/                    # Shadcn/UI components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── tabs.jsx
│   │   └── ... (40+ components)
│   ├── admin/
│   │   └── AdminLayout.jsx    # Admin panel layout
│   └── layout/
│       └── Header.jsx         # Public site header
│
├── context/
│   ├── AuthContext.jsx        # Authentication state
│   └── ContentContext.jsx     # CMS content state
│
├── pages/
│   ├── admin/                 # Admin portal (17 pages)
│   │   ├── DashboardPage.jsx
│   │   ├── AdminOrdersPage.jsx
│   │   ├── PricingModulePage.jsx
│   │   ├── EmailKeysPage.jsx
│   │   └── ...
│   │
│   ├── reseller/              # Reseller portal (12 pages)
│   │   ├── ResellerDashboard.jsx
│   │   ├── StylingPage.jsx
│   │   ├── MeasurementPage.jsx
│   │   ├── WIPOrdersPage.jsx
│   │   └── ...
│   │
│   ├── partner/               # Sales Partner portal (2 pages)
│   │   ├── SalesPartnerLoginPage.jsx
│   │   └── SalesPartnerDashboard.jsx
│   │
│   └── [Public Pages]         # Marketing website (8 pages)
│       ├── HomePage.jsx
│       ├── AboutPage.jsx
│       ├── FabricsPage.jsx
│       └── ...
│
├── lib/
│   └── utils.js               # Utility functions (cn, etc.)
│
├── App.js                     # Main app with routes
└── index.js                   # Entry point
```

### Route Structure
| Route Pattern | Portal | Auth Required |
|---------------|--------|---------------|
| `/` | Public | No |
| `/about`, `/fabrics`, `/how-it-works` | Public | No |
| `/login` | Login Selection | No |
| `/forgot-password`, `/reset-password` | Auth | No |
| `/admin/*` | Admin | Yes (admin role) |
| `/reseller/*` | Reseller | Yes (reseller role) |
| `/partner/*` | Sales Partner | Yes (sales_partner role) |

### State Management
- **AuthContext**: Manages authentication state, tokens, user info
- **ContentContext**: Manages CMS-driven content for public pages
- **Local State**: Component-level state via React hooks

---

## 5. Backend Architecture

### Directory Structure
```
/app/backend/
├── server.py                  # FastAPI application entry
├── routes/
│   ├── auth.py                # Authentication endpoints
│   ├── admin.py               # Admin management
│   ├── admin_settings.py      # Admin configuration
│   ├── admin_customers.py     # Customer management
│   ├── orders.py              # Order CRUD
│   ├── pricing.py             # Pricing module
│   ├── products.py            # Product catalog
│   ├── styling.py             # Styling options
│   ├── measurements.py        # Measurement configs
│   ├── payment.py             # Stripe integration
│   ├── chat.py                # Order chat system
│   ├── pages.py               # CMS pages
│   ├── marketing.py           # SEO/Marketing
│   ├── sales_partner.py       # Partner management
│   ├── reseller_settings.py   # Reseller configuration
│   └── order_pdf.py           # PDF generation
│
├── utils/
│   └── email.py               # Email utilities
│
├── requirements.txt           # Python dependencies
└── .env                       # Environment variables
```

### API Router Registration
```python
# server.py
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(payment.router, prefix="/settings", tags=["Payment"])
# ... and more
```

---

## 6. Database Schema

### Collections Overview

#### `users`
```javascript
{
  _id: ObjectId,
  email: String,                    // Unique identifier
  hashed_password: String,
  full_name: String,
  company: String,                  // For resellers
  role: "admin" | "reseller" | "sales_partner",
  is_admin: Boolean,
  payment_methods: {
    bank_transfer: Boolean,
    stripe: Boolean
  },
  reset_token: String,              // Password reset
  reset_token_expiry: DateTime,
  created_at: DateTime,
  updated_at: DateTime
}
```

#### `orders`
```javascript
{
  _id: ObjectId,
  order_id: String,                 // "CustomerName -- 123456"
  reseller_email: String,
  customer_name: String,
  customer_id: ObjectId,
  status: "wip" | "placed" | "production" | "shipped" | "delivered",
  payment_status: "pending" | "paid",
  payment_method: "bank_transfer" | "stripe",
  stripe_session_id: String,
  
  // Product Details
  product: {
    category: String,
    fabric_code: String,
    fabric_sku: String,
    lining_sku: String,
    button_sku: String
  },
  
  // Measurements
  measurements: {
    chest: Number,
    waist: Number,
    // ... 20+ measurement fields
  },
  
  // Styling
  styling: {
    lapel_style: String,
    button_count: String,
    vent_style: String,
    // ... many more options
  },
  
  // Pricing
  pricing: {
    fabric_cost: Number,
    cmt_cost: Number,
    styling_cost: Number,
    shipping_cost: Number,
    total_price: Number
  },
  
  // Shipping
  shipping: {
    courier_name: String,
    tracking_number: String,
    shipped_date: DateTime
  },
  
  created_at: DateTime,
  updated_at: DateTime
}
```

#### `customers`
```javascript
{
  _id: ObjectId,
  reseller_email: String,           // Owner reseller
  name: String,
  email: String,
  phone: String,
  measurements: {...},              // Saved measurements
  created_at: DateTime
}
```

#### `reseller_pricing` (Admin-to-Reseller Margins)
```javascript
{
  _id: ObjectId,
  reseller_email: String,
  reseller_name: String,
  cmt_margin_percent: Number,       // Can be negative for discounts
  fabric_margin_percent: Number,
  styling_margin_percent: Number,
  shipping_margin_percent: Number,
  custom_base_cmt: Number,          // Override base CMT
  custom_base_shipping: Number
}
```

#### `reseller_settings` (Reseller-to-Customer Margins)
```javascript
{
  _id: ObjectId,
  reseller_email: String,
  margins: {
    fabric_margin: Number,          // % markup to customer
    base_product_margin: Number,
    styling_margin: Number,
    shipping_margin: Number
  },
  cost_price_code: String,          // Secret code to view cost
  payment_methods: {...}
}
```

#### `fabric_codes`
```javascript
{
  _id: ObjectId,
  code: String,                     // Price code (P001)
  sku: String,                      // Product SKU
  name: String,
  description: String,
  base_price_per_meter: Number,
  status: "active" | "inactive"
}
```

#### `product_consumption`
```javascript
{
  _id: ObjectId,
  product_category: String,         // "2-piece-suit"
  fabric_meters: Number,            // Meters needed
  base_cmt_price: Number,           // Cut-Make-Trim cost
  base_shipping: Number
}
```

#### `size_margins`
```javascript
{
  _id: "size_margins",
  size_a_margin_percent: Number,    // 0%
  size_b_margin_percent: Number,    // 30%
  size_c_margin_percent: Number     // 50%
}
```

#### `settings`
```javascript
// Email configuration
{
  _id: "email_keys",
  email_provider: "smtp" | "mailgun",
  smtp_host: String,
  smtp_port: Number,
  smtp_username: String,
  smtp_password: String,
  mailgun_api_key: String,
  mailgun_domain: String,
  sender_email: String
}

// Stripe configuration
{
  _id: "stripe_config",
  publishable_key: String,
  secret_key: String,
  webhook_secret: String
}
```

---

## 7. Authentication & Authorization

### Authentication Flow
```
┌──────────┐      POST /api/auth/{admin|reseller}/login       ┌──────────┐
│  Client  │ ─────────────────────────────────────────────────▶│  Server  │
│          │◀───────────────────────────────────────────────── │          │
└──────────┘      { access_token, user: {...} }               └──────────┘
     │
     │ Store token in localStorage:
     │   - admin_token (for admins)
     │   - reseller_token (for resellers)
     │   - partner_token (for sales partners)
     │
     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  All subsequent requests include:                                         │
│  Authorization: Bearer <token>                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Token Structure (JWT)
```javascript
{
  "sub": "user@email.com",
  "type": "reseller",              // Optional, for reseller tokens
  "exp": 1234567890                // Expiry timestamp
}
```

### Token Expiry
| Scenario | Expiry |
|----------|--------|
| Standard Login | 7 days |
| "Remember Me" Checked | 30 days |

### Role-Based Access Control
| Role | Portals Accessible | Key Permissions |
|------|-------------------|-----------------|
| `admin` | Admin Portal | Full system access, pricing, user management |
| `reseller` | Reseller Portal | Create orders, manage customers, view own data |
| `sales_partner` | Partner Portal | View referrals, commission tracking |

### Session Isolation
Each role uses separate token storage to prevent session collision:
- Admin: `localStorage.admin_token`
- Reseller: `localStorage.reseller_token`
- Sales Partner: `localStorage.partner_token`

---

## 8. Pricing System

### Two-Tier Margin Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRICING CALCULATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  BASE COST   │ ──▶ │  + ADMIN MARGIN  │ ──▶ │ + RESELLER MARGIN   │
│  (System)    │     │  (To Reseller)   │     │ (To Customer)       │
└──────────────┘     └──────────────────┘     └─────────────────────┘
       │                     │                         │
       │                     │                         │
       ▼                     ▼                         ▼
   Base CMT: $185      Reseller Cost:           Customer Price:
                       $185 × (1 + 10%)          $203.50 × (1 + 70%)
                       = $203.50                 = $345.95
```

### Price Components

#### 1. Fabric Cost
```
Fabric Cost = (Base Price/m × Meters × Size Margin × Admin Margin) × Reseller Margin

Example:
- Base: $25/m
- Meters: 3.5
- Size B Margin: +30%
- Admin Margin: +10%
- Reseller Margin: +20%

Calculation:
= $25 × 3.5 × 1.30 × 1.10 × 1.20
= $150.15
```

#### 2. CMT (Cut-Make-Trim) Cost
```
CMT Cost = (Base CMT + Construction Surcharge) × Admin Margin × Reseller Margin

Construction Surcharges:
- Half Canvas: +$50
- Full Canvas: +$100
```

#### 3. Styling Cost
```
Styling Cost = Sum of all styling option surcharges × Margins
```

#### 4. Shipping Cost
```
Shipping Cost = Base Shipping × Country Surcharge × Margins
```

### Negative Margins (Special Pricing)
Margins can be negative for preferred resellers:
- `-20%` margin = 20% discount
- Formula: `cost × (1 + (-20)/100) = cost × 0.80`

---

## 9. API Reference

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/reseller/login` | Reseller/Partner login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/auth/me` | Get current user info |

### Orders Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List orders (filtered by role) |
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/{id}` | Get order details |
| PUT | `/api/orders/{id}` | Update order |
| DELETE | `/api/orders/{id}` | Delete order |
| PUT | `/api/orders/{id}/status` | Update order status |

### Pricing Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pricing/fabric-codes` | List fabric codes |
| POST | `/api/pricing/fabric-codes` | Create fabric code |
| GET | `/api/pricing/product-consumption` | Get consumption rates |
| GET | `/api/pricing/size-margins` | Get size margins |
| GET | `/api/pricing/reseller-pricing/{email}` | Get reseller margins |
| PUT | `/api/pricing/reseller-pricing/{email}` | Update reseller margins |
| POST | `/api/pricing/calculate-price` | Calculate order price |

### Payment Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/settings/checkout/create-session` | Create Stripe session |
| POST | `/api/settings/checkout/verify-payment` | Verify payment |
| POST | `/api/settings/stripe/webhook` | Stripe webhook handler |

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/email-settings` | Get email config |
| PUT | `/api/admin/email-settings` | Update email config |
| POST | `/api/admin/email-settings/test` | Send test email |
| GET | `/api/admin/general-settings` | Get site settings |

---

## 10. Third-Party Integrations

### Stripe (Payments)
- **Purpose**: Process credit card payments
- **Integration Points**:
  - Checkout Session creation
  - Payment verification
  - Webhook handling for async events
- **Configuration**: Stored in `settings` collection

### Email (SMTP / Mailgun)
- **Purpose**: Transactional emails (password reset, order confirmations)
- **Supported Providers**:
  - Google Workspace SMTP
  - Mailgun API
- **Configuration**: Admin panel → Email Settings

### PDF Generation (pdfkit)
- **Purpose**: Generate order invoices/receipts
- **Endpoint**: `/api/orders/{id}/pdf`

---

## 11. Deployment Architecture

### Kubernetes Configuration
```yaml
# Deployment specs (auto-configured by Emergent)
replicas: 2
resources:
  requests:
    cpu: 250m
    memory: 1Gi
  limits:
    cpu: 500m
    memory: 2Gi
```

### Supervisor Configuration
```ini
[program:backend]
command=uvicorn server:app --host 0.0.0.0 --port 8001 --reload
directory=/app/backend

[program:frontend]
command=yarn start
directory=/app/frontend
environment=PORT="3000"
```

### Environment Variables

#### Backend (`/app/backend/.env`)
```bash
MONGO_URL=mongodb://...          # Auto-configured in production
DB_NAME=tailorstailor
JWT_SECRET=<secret>
CORS_ORIGINS=*
STRIPE_SECRET_KEY=<key>
```

#### Frontend (`/app/frontend/.env`)
```bash
REACT_APP_BACKEND_URL=https://[domain].emergentagent.com
WDS_SOCKET_PORT=443
```

### URL Routing (Ingress)
| Path Pattern | Destination |
|--------------|-------------|
| `/api/*` | Backend (port 8001) |
| `/*` | Frontend (port 3000) |

---

## 12. Security Considerations

### Authentication Security
- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with configurable expiry
- ✅ Separate token storage per role
- ✅ Password reset with secure random tokens (1-hour expiry)

### API Security
- ✅ All endpoints require authentication (except public routes)
- ✅ Role-based access control on sensitive endpoints
- ✅ Input validation via Pydantic models

### Data Security
- ✅ MongoDB `_id` fields excluded from API responses
- ✅ Sensitive credentials masked in admin UI
- ✅ Environment variables for all secrets

### Payment Security
- ✅ Stripe handles all card data (PCI compliant)
- ✅ Webhook signature verification
- ✅ Payment verification before order status update

### Recommendations for Production
- [ ] Enable rate limiting on auth endpoints
- [ ] Add CSRF protection for form submissions
- [ ] Implement API request logging/monitoring
- [ ] Set up database backups
- [ ] Configure CORS to specific domains (not `*`)

---

## Document Information
- **Generated**: February 21, 2026
- **Version**: 1.0
- **Application**: Suits India
- **Platform**: Emergent (Kubernetes)
