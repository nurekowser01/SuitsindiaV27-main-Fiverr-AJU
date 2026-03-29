# Suits India - Detailed Tech Stack Documentation

## Overview

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Node.js | v20.20.0 |
| **Runtime** | Python | 3.11.14 |
| **Database** | MongoDB | 7.0.30 |
| **Frontend** | React | 19.0.0 |
| **Backend** | FastAPI | 0.110.1 |
| **Package Manager** | Yarn | 1.22.22 |

---

## 1. Frontend Tech Stack

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.0.0 | UI library (latest with concurrent features) |
| `react-dom` | 19.0.0 | React DOM renderer |
| `react-scripts` | 5.0.1 | Create React App build tooling |
| `@craco/craco` | 7.1.0 | CRA configuration override (Tailwind support) |

### Routing

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router-dom` | 7.5.1 | Client-side routing with latest React Router |

### UI Component Library (Shadcn/UI + Radix)

| Package | Version | Component |
|---------|---------|-----------|
| `@radix-ui/react-accordion` | 1.2.8 | Expandable sections |
| `@radix-ui/react-alert-dialog` | 1.1.11 | Confirmation dialogs |
| `@radix-ui/react-avatar` | 1.1.7 | User avatars |
| `@radix-ui/react-checkbox` | 1.2.3 | Checkboxes |
| `@radix-ui/react-dialog` | 1.1.11 | Modal dialogs |
| `@radix-ui/react-dropdown-menu` | 2.1.12 | Dropdown menus |
| `@radix-ui/react-hover-card` | 1.1.11 | Hover information cards |
| `@radix-ui/react-label` | 2.1.4 | Form labels |
| `@radix-ui/react-menubar` | 1.1.12 | Menu bars |
| `@radix-ui/react-navigation-menu` | 1.2.10 | Navigation menus |
| `@radix-ui/react-popover` | 1.1.11 | Popovers |
| `@radix-ui/react-progress` | 1.1.4 | Progress bars |
| `@radix-ui/react-radio-group` | 1.3.4 | Radio buttons |
| `@radix-ui/react-scroll-area` | 1.2.6 | Custom scrollbars |
| `@radix-ui/react-select` | 2.2.2 | Select dropdowns |
| `@radix-ui/react-separator` | 1.1.4 | Visual separators |
| `@radix-ui/react-slider` | 1.3.2 | Range sliders |
| `@radix-ui/react-slot` | 1.2.0 | Component composition |
| `@radix-ui/react-switch` | 1.2.2 | Toggle switches |
| `@radix-ui/react-tabs` | 1.1.9 | Tab navigation |
| `@radix-ui/react-toast` | 1.2.11 | Toast notifications |
| `@radix-ui/react-toggle` | 1.1.6 | Toggle buttons |
| `@radix-ui/react-toggle-group` | 1.1.7 | Toggle button groups |
| `@radix-ui/react-tooltip` | 1.2.4 | Tooltips |
| `@radix-ui/react-aspect-ratio` | 1.1.4 | Aspect ratio containers |
| `@radix-ui/react-collapsible` | 1.1.8 | Collapsible sections |
| `@radix-ui/react-context-menu` | 2.2.12 | Right-click menus |

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 3.4.17 | Utility-first CSS framework |
| `tailwindcss-animate` | 1.0.7 | Animation utilities for Tailwind |
| `tailwind-merge` | 3.2.0 | Merge Tailwind classes intelligently |
| `class-variance-authority` | 0.7.1 | Component variant management |
| `clsx` | 2.1.1 | Conditional className utility |
| `autoprefixer` | 10.4.20 | CSS vendor prefixing |
| `postcss` | 8.4.49 | CSS processing |

### Icons

| Package | Version | Purpose |
|---------|---------|---------|
| `lucide-react` | 0.507.0 | Modern icon library (500+ icons) |

### Forms & Validation

| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | 7.56.2 | Performant form handling |
| `@hookform/resolvers` | 5.0.1 | Validation resolvers |
| `zod` | 3.24.4 | Schema validation |
| `input-otp` | 1.4.2 | OTP input fields |

### Data Visualization

| Package | Version | Purpose |
|---------|---------|---------|
| `recharts` | 3.6.0 | Chart library (bar, line, pie, etc.) |

### Date/Time

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | 4.1.0 | Date manipulation utilities |
| `react-day-picker` | 8.10.1 | Date picker component |

### HTTP Client

| Package | Version | Purpose |
|---------|---------|---------|
| `axios` | 1.8.4 | HTTP requests to backend |

### Notifications

| Package | Version | Purpose |
|---------|---------|---------|
| `sonner` | 2.0.3 | Toast notification system |

### UI Components (Additional)

| Package | Version | Purpose |
|---------|---------|---------|
| `cmdk` | 1.1.1 | Command palette (⌘K) |
| `embla-carousel-react` | 8.6.0 | Carousel/slider component |
| `react-resizable-panels` | 3.0.1 | Resizable panel layouts |
| `vaul` | 1.1.2 | Drawer/bottom sheet component |
| `next-themes` | 0.4.6 | Theme management (dark/light mode) |

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 9.23.0 | JavaScript linting |
| `eslint-plugin-react` | 7.37.4 | React-specific linting |
| `eslint-plugin-react-hooks` | 5.2.0 | Hooks linting |
| `eslint-plugin-jsx-a11y` | 6.10.2 | Accessibility linting |
| `eslint-plugin-import` | 2.31.0 | Import/export linting |
| `@babel/plugin-proposal-private-property-in-object` | 7.21.11 | Babel plugin |

---

## 2. Backend Tech Stack

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.110.1 | Modern async web framework |
| `uvicorn` | 0.25.0 | ASGI server |
| `starlette` | 0.37.2 | ASGI toolkit (FastAPI dependency) |
| `pydantic` | 2.12.5 | Data validation & serialization |
| `pydantic_core` | 2.41.5 | Pydantic core implementation |

### Database

| Package | Version | Purpose |
|---------|---------|---------|
| `motor` | 3.3.1 | Async MongoDB driver |
| `pymongo` | 4.5.0 | MongoDB driver (motor dependency) |
| `dnspython` | 2.8.0 | DNS resolution for MongoDB Atlas |

### Authentication & Security

| Package | Version | Purpose |
|---------|---------|---------|
| `PyJWT` | 2.11.0 | JWT token handling |
| `python-jose` | 3.5.0 | JOSE (JWT) implementation |
| `passlib` | 1.7.4 | Password hashing utilities |
| `bcrypt` | 4.0.1 | Password hashing algorithm |
| `cryptography` | 46.0.4 | Cryptographic operations |
| `ecdsa` | 0.19.1 | ECDSA cryptography |
| `rsa` | 4.9.1 | RSA cryptography |
| `oauthlib` | 3.3.1 | OAuth implementation |
| `requests-oauthlib` | 2.0.0 | OAuth for requests |

### Payment Processing

| Package | Version | Purpose |
|---------|---------|---------|
| `stripe` | 14.3.0 | Stripe payment SDK |

### Email

| Package | Version | Purpose |
|---------|---------|---------|
| `email-validator` | 2.3.0 | Email validation |
| (Built-in `smtplib`) | - | SMTP email sending |

### HTTP & Networking

| Package | Version | Purpose |
|---------|---------|---------|
| `requests` | 2.32.5 | Synchronous HTTP client |
| `httpx` | 0.28.1 | Async HTTP client |
| `httpcore` | 1.0.9 | HTTP core library |
| `aiohttp` | 3.13.3 | Async HTTP client/server |
| `urllib3` | 2.6.3 | HTTP client utilities |
| `certifi` | 2026.1.4 | SSL certificates |

### Async Support

| Package | Version | Purpose |
|---------|---------|---------|
| `anyio` | 4.12.1 | Async compatibility layer |
| `aiosignal` | 1.4.0 | Async signal handling |
| `aiohappyeyeballs` | 2.6.1 | Async connection optimization |
| `asyncio` | (built-in) | Async I/O |

### AI/ML Integration (Available)

| Package | Version | Purpose |
|---------|---------|---------|
| `openai` | 1.99.9 | OpenAI API client |
| `google-genai` | 1.62.0 | Google Gemini API |
| `google-generativeai` | 0.8.6 | Google Generative AI |
| `litellm` | 1.80.0 | LLM abstraction layer |
| `emergentintegrations` | 0.1.0 | Emergent platform integrations |
| `tiktoken` | 0.12.0 | Token counting |
| `tokenizers` | 0.22.2 | Fast tokenization |

### Data Processing

| Package | Version | Purpose |
|---------|---------|---------|
| `pandas` | 3.0.0 | Data manipulation |
| `numpy` | 2.4.2 | Numerical computing |
| `pillow` | 12.1.0 | Image processing |
| `jq` | 1.11.0 | JSON processing |

### Cloud Services

| Package | Version | Purpose |
|---------|---------|---------|
| `boto3` | 1.42.42 | AWS SDK |
| `botocore` | 1.42.42 | AWS core library |
| `s3transfer` | 0.16.0 | S3 file transfers |
| `google-api-python-client` | 2.189.0 | Google APIs |
| `google-auth` | 2.49.0 | Google authentication |

### Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| `python-dotenv` | 1.2.1 | Environment variable loading |
| `python-multipart` | 0.0.22 | Multipart form handling |
| `PyYAML` | 6.0.3 | YAML parsing |
| `Jinja2` | 3.1.6 | Template engine |
| `click` | 8.3.1 | CLI utilities |
| `typer` | 0.21.1 | CLI framework |
| `rich` | 14.3.2 | Terminal formatting |
| `tqdm` | 4.67.3 | Progress bars |

### Code Quality

| Package | Version | Purpose |
|---------|---------|---------|
| `black` | 26.1.0 | Code formatting |
| `flake8` | 7.3.0 | Code linting |
| `mypy` | 1.19.1 | Type checking |
| `isort` | 7.0.0 | Import sorting |
| `pytest` | 9.0.2 | Testing framework |

### Protocol Buffers & gRPC

| Package | Version | Purpose |
|---------|---------|---------|
| `protobuf` | 5.29.6 | Protocol buffer support |
| `grpcio` | 1.76.0 | gRPC support |
| `grpcio-status` | 1.71.2 | gRPC status codes |
| `proto-plus` | 1.27.1 | Protocol buffer utilities |

---

## 3. Database Tech Stack

### MongoDB 7.0.30

| Feature | Usage |
|---------|-------|
| **Document Store** | Primary data storage |
| **Indexes** | Query optimization |
| **Aggregation Pipeline** | Complex queries |
| **Async Driver** | Motor for non-blocking I/O |

### Collections Structure

```
tailorstailor (Database)
├── users              # User accounts (admin, reseller, sales_partner)
├── orders             # Order documents with full details
├── customers          # Customer profiles per reseller
├── fabric_codes       # Fabric catalog with pricing
├── product_consumption # Fabric consumption per product
├── size_margins       # Size-based pricing margins
├── reseller_pricing   # Admin-to-reseller margins
├── reseller_settings  # Reseller-to-customer margins
├── styling_options    # Available styling choices
├── measurement_configs # Measurement field configurations
├── pages              # CMS page content
├── chats              # Order-specific chat messages
├── settings           # System settings (email, stripe, etc.)
└── country_surcharges # Shipping surcharges by country
```

---

## 4. Infrastructure Tech Stack

### Container Runtime

| Component | Technology |
|-----------|------------|
| **Platform** | Emergent (Kubernetes) |
| **Container** | Docker-based pods |
| **Orchestration** | Kubernetes |
| **Ingress** | Nginx Ingress Controller |

### Process Management

| Component | Technology |
|-----------|------------|
| **Process Manager** | Supervisor |
| **Backend Process** | `uvicorn server:app --port 8001` |
| **Frontend Process** | `yarn start (port 3000)` |
| **Hot Reload** | Enabled for both |

### Networking

| Aspect | Configuration |
|--------|---------------|
| **External URL** | `https://reseller-pos.preview.emergentagent.com` |
| **Backend Internal** | `0.0.0.0:8001` |
| **Frontend Internal** | `0.0.0.0:3000` |
| **API Routing** | `/api/*` → Backend |
| **Static Routing** | `/*` → Frontend |

---

## 5. Build & Development Tools

### Frontend Build Pipeline

```
Source (JSX/CSS) 
    ↓
Craco (CRA Override)
    ↓
Webpack (Bundling)
    ↓
Babel (Transpilation)
    ↓
PostCSS + Tailwind (CSS Processing)
    ↓
Static Assets (HTML/JS/CSS)
```

### Backend Runtime

```
Python Source
    ↓
Uvicorn (ASGI Server)
    ↓
FastAPI (Request Handling)
    ↓
Pydantic (Validation)
    ↓
Motor (Async DB Operations)
    ↓
MongoDB
```

---

## 6. Version Summary

| Category | Technology | Version |
|----------|------------|---------|
| **Node.js** | Runtime | 20.20.0 |
| **Python** | Runtime | 3.11.14 |
| **MongoDB** | Database | 7.0.30 |
| **React** | Frontend | 19.0.0 |
| **FastAPI** | Backend | 0.110.1 |
| **Tailwind** | Styling | 3.4.17 |
| **Radix UI** | Components | 1.x - 2.x |
| **Stripe** | Payments | 14.3.0 |
| **Motor** | MongoDB Driver | 3.3.1 |

---

## 7. Key Architecture Decisions

### Why React 19?
- Latest concurrent features
- Improved performance with automatic batching
- Better Suspense support
- Future-proof codebase

### Why FastAPI?
- Native async support
- Automatic OpenAPI documentation
- Pydantic integration for validation
- High performance (Starlette-based)

### Why MongoDB?
- Flexible document schema for orders
- Easy to model complex nested data (measurements, styling)
- Horizontal scaling capability
- Good async driver support (Motor)

### Why Shadcn/UI + Radix?
- Accessible by default (WAI-ARIA)
- Unstyled primitives = full design control
- Works perfectly with Tailwind
- Composable and tree-shakeable

### Why Tailwind CSS?
- Utility-first = faster development
- Consistent design system
- Small production bundle (purging)
- Great documentation

---

*Document generated: February 21, 2026*
