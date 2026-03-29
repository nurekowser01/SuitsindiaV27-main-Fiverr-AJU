# Suits India - PRD (Product Requirements Document)

## Original Problem Statement
Clone the website `https://tailorstailor.in/` and build a Reseller POS module with white-label capabilities. The project has expanded to include a comprehensive admin panel, reseller portal, sales partner portal, and extensive order management features.

## Current Implementation Status

### ✅ POS Pricing Toggle - Customer/Cost View (COMPLETED - Feb 2026)

#### Features Implemented
- **Default Customer View**: Pricing sidebar shows customer prices (cost + reseller margins)
- **Secret Code Lock**: Lock icon button to toggle to cost view
- **Cost View Unlock**: Enter secret code to see actual cost prices
- **Configurable Code**: Secret code set in Reseller Settings > Margins tab

#### UX Flow
1. **Customer Session (Default)**: Reseller sits with customer, prices shown include margins
2. **Cost Check**: Reseller taps lock icon, enters secret code
3. **Cost View**: Shows "Your Cost" header with lower prices (without margins)
4. **Back to Customer**: Tap lock again to return to customer pricing

#### Reseller Settings: `/reseller/settings`
- "Cost View Secret Code" section in Margins tab
- Password input with show/hide toggle
- Help text explaining the feature

#### Styling Page Changes: `/reseller/styling`
- Header shows "Customer Price" or "Your Cost"
- Lock/LockOpen icon button to toggle views
- Secret code modal with password input
- Yellow indicator when viewing cost prices

#### Backend: `/app/backend/routes/reseller_settings.py`
- `PATCH /api/reseller-settings/{id}/secret-code` - Set secret code
- `POST /api/reseller-settings/{id}/verify-cost-code` - Verify code

---

### ✅ Shipping Tracking Module (COMPLETED - Feb 2026)

#### Features Implemented
- **Admin Shipping Modal**: Admin can add shipping details (courier, AWB, dates, tracking URL) from Orders page
- **Order Status Update**: Status automatically changes to "shipped" when shipping details are saved
- **Visual Indicators**: Truck icon turns green for shipped orders, orange for pending
- **Customer Order History**: Admin can view customer's full order history with shipping details
- **Reseller View**: Resellers can view shipping details in their "Shipped" tab with Track Package links

#### Admin UI: `/admin/orders`
- Truck icon in Actions column to add/edit shipping
- Shipping modal with: Courier Name, AWB Number, Shipped Date, Expected Delivery, Tracking URL, Notes

#### Customer Management: `/admin/customers`
- View customer details shows complete order history
- Shipped orders display shipping info inline with Track Package link

#### Reseller UI: `/reseller/orders`
- Added "Shipped" tab to view completed shipments
- Order details modal shows shipping section when available

#### Backend: `/app/backend/routes/pricing.py`
- `POST /api/pricing/shipping-tracking` - Add/update shipping details
- `GET /api/pricing/shipping-tracking/{order_id}` - Get shipping details

---

### ✅ Pricing Module V2 (COMPLETED - Feb 2026)

#### Features Implemented
- **Fabric Price Codes with SKU**: Admin configures price codes (P001, P002) with base price per meter + optional SKU for inventory tracking
- **Product Consumption**: Fabric meters needed per product type + base CMT + base shipping
- **Size Margins**: % markup on fabric price per size category (A=0%, B=30%, C=50%)
- **Construction Surcharges**: Half Canvas (+$50), Full Canvas (+$100) - pulled from **Style Options** (not duplicated)
- **Reseller Margins**: Per-reseller % margins on CMT, fabric, styling, shipping
- **Price Calculation API**: Returns full breakdown including construction type surcharges

#### Pricing Formula
```
Total = CMT (base + construction surcharge) × (1 + reseller margin)
      + Fabric (base/m × consumption × (1 + size margin)) × (1 + reseller margin)
      + Styling × (1 + reseller margin)
      + Shipping (base + country surcharge) × (1 + reseller margin)
```

#### Admin UI: `/admin/pricing`
- **Fabric Price Codes Tab**: CRUD for price codes with SKU and base price per meter
- **Product Consumption Tab**: Fabric meters, base CMT, base shipping per product
- **Size Margins Tab**: Configure % markup per size (A, B, C)
- **Reseller Pricing Tab**: Per-reseller margin percentages
- **Country Surcharges Tab**: Additional shipping by country

#### Key Design Decision
- **Construction surcharges (Half Canvas, Full Canvas) are configured in Style Options**, not duplicated in Product Consumption
- This avoids data entry duplication and ensures consistency

#### Reseller UI Updates
- **Size Category Selector**: A/B/C buttons in ProductConfigurePage
- **Fabric Price Code Lookup**: Shows name, SKU, and base price per meter

#### Backend: `/app/backend/routes/pricing.py`
- `GET/POST/PUT/DELETE /api/pricing/fabrics` - Fabric price code CRUD (with SKU)
- `GET /api/pricing/fabrics/lookup/{code}` - Price lookup with SKU
- `GET/POST /api/pricing/product-consumption` - Product fabric/CMT/shipping settings
- `GET/PUT /api/pricing/size-margins` - Size margin configuration
- `GET/PUT /api/pricing/reseller-pricing/{email}` - Reseller margin configuration
- `GET/POST/DELETE /api/pricing/country-surcharges` - Country surcharges
- `POST /api/pricing/calculate-price` - Full price calculation (construction surcharges from Style Options)
- `POST /api/pricing/shipping-tracking` - Add shipping details to order

### ✅ Axios Interceptor & API Centralization (COMPLETED - Dec 2025)

#### Features Implemented
- **Centralized API Instance**: `/app/frontend/src/lib/api.js` with automatic auth header injection
- **Token Auto-attach**: Automatically adds `Authorization: Bearer {token}` from localStorage
- **Multiple Token Support**: Checks `admin_token` first, then `reseller_token`
- **Error Handling**: 401 responses logged to console for debugging

#### Usage
```javascript
import api from '../lib/api';
const response = await api.get('/orders');
const response = await api.post('/orders', data);
```

### ✅ Full Order Editing (COMPLETED - Dec 2025)

#### Features Implemented
- **Edit WIP Orders**: Click edit button navigates to configure page with pre-filled data
- **Edit Placed Orders**: Within time limit set by admin (default 60 minutes)
- **Data Preservation**: Fabric code, styling options, measurements pre-filled from existing order
- **Customer Info Fallback**: Extracts customer info from order when viewing "All Orders"
- **Order Update API**: `PUT /api/orders/{order_id}` updates existing order
- **Copy Order**: Creates new order with same styling for returning customers

#### Key Files
- `WIPOrdersPage.jsx`: `handleEditOrder()`, `handleCopyOrder()`, `handleLinkMeasurement()`
- `ProductConfigurePage.jsx`: Fetches product config_fields for edit mode
- `StylingPage.jsx`: `handleAddToWIP()` handles both create (POST) and update (PUT)

### ✅ Chat System (COMPLETED - Dec 2025)

#### Features Implemented
- **Order-Specific Chat**: Each chat is tied to a specific order
- **Group Chat Logic**:
  - Referred Reseller → Reseller + Sales Partner + Admin
  - Direct Reseller → Reseller + Admin only
- **Floating Chat Widget**: Bottom-right corner on all portals (Admin, Reseller, Sales Partner)
- **Unread Badge**: Shows unread message count on chat button
- **Configurable Polling Interval**: Admin can set polling interval (1-60 seconds) from Settings -> Chat tab
- **File Upload**: Support for all file types (max 2MB)
- **Admin Chats Page**: Dedicated `/admin/chats` page with full chat management
- **Per-Order Chat Button**: Green message icon in Admin Orders page
- **Chat Settings in Admin Panel**: Settings → Chat tab allows configuring:
  - Message Refresh Interval (polling, 1-60 seconds)
  - Max File Upload Size (MB)
  - Enable/Disable Notifications

#### Backend: `/app/backend/routes/chat.py`
- `GET /api/chats` - List all chats for user
- `GET /api/chats/unread-count` - Get total unread count
- `GET /api/chats/order/{order_id}` - Get or create chat for order
- `GET /api/chats/{chat_id}/messages` - Get messages
- `POST /api/chats/{chat_id}/messages` - Send message
- `PATCH /api/chats/{chat_id}/read` - Mark as read
- `POST /api/chats/{chat_id}/upload` - Upload file
- `GET /api/chats/files/{file_id}` - Download file
- `GET /api/admin/chats/resellers` - Get resellers (admin)
- `GET /api/admin/chats/reseller/{email}/orders` - Get reseller's orders (admin)

#### Backend: `/app/backend/routes/admin_settings.py` (Chat Settings)
- `GET /api/admin/chat-settings` - Get chat settings (admin only)
- `PUT /api/admin/chat-settings` - Update chat settings (admin only)
- `GET /api/admin/chat-settings/public` - Get polling interval (public, no auth)

#### Frontend Components
- `/app/frontend/src/components/chat/ChatWidget.jsx` - Floating chat widget
- `/app/frontend/src/pages/admin/AdminChatsPage.jsx` - Admin chats page

#### Collections (MongoDB)
- `chats` - Chat metadata (order_id, participants, etc.)
- `chat_messages` - Individual messages
- `chat_files` - Uploaded files (base64 encoded)

### ✅ P1 Features (COMPLETED - Feb 19, 2026)

#### 1. Customer Management in Admin
- **Page**: `/admin/customers`
- **Backend**: `/app/backend/routes/admin_customers.py`
- **Frontend**: `/app/frontend/src/pages/admin/CustomerManagementPage.jsx`

#### 2. Reseller Source Management  
- **Location**: Admin Settings > Reseller Sources tab
- **Backend**: `/app/backend/routes/admin_settings.py`

#### 3. Order Status Management
- **Location**: Admin Settings > Order Statuses tab
- 6 system statuses + custom statuses with colors

#### 4. Order PDF Generation (Admin Only)
- **Location**: Admin Orders page > PDF button
- **Backend**: `/app/backend/routes/order_pdf.py`

### ✅ Previously Completed Features
- Order Management Rules (time-limited editing, role-based delete)
- Styling Templates (independent of customer)
- Sales Partner Commission Management
- Admin Dashboard Stats
- Body Shape Preferences
- Measurement Saving & Linking

### 🔮 Future Tasks (P2)
1. Order WIP Stages - More granular production tracking
2. White-labeling for Resellers - Custom branding
3. Sales Partner Commission Calculation - Auto-calculation
4. Production Management Module
5. Customer Login & Order History portal

## Architecture

### Key API Endpoints
**Chat System:**
- `GET /api/chats` - List chats
- `POST /api/chats/{id}/messages` - Send message
- `POST /api/chats/{id}/upload` - Upload file (2MB max)

**Customer Management:**
- `GET/POST/PUT/DELETE /api/admin/customers`

**Settings:**
- `GET/POST/PUT/DELETE /api/admin/reseller-sources`
- `GET/POST/PUT/DELETE /api/admin/order-statuses`

**PDF:**
- `GET /api/admin/orders/{id}/pdf`

### MongoDB Collections
- `users`, `orders`, `customers`, `product_categories`
- `measurement_config`, `customer_measurements`, `styling_templates`
- `reseller_sources`, `order_statuses`, `order_settings`
- `chats`, `chat_messages`, `chat_files`
- `app_settings` - Stores chat_settings (polling interval, file size limits)

## Test Credentials
- **Admin**: admin@suitsindia.com / admin
- **Reseller**: reseller@test.com / reseller123
- **Sales Partner**: salespartner@test.com / partner123

## Recent Changes Log

### Feb 28, 2026 - Staff Order Ownership & Order Details Bug Fixes (5 bugs)
- **BUG FIX #1: Staff Order Ownership** - Completed `get_reseller_email()` refactor in `orders.py`
  - `update_order`, `update_order_status`, `copy_order` now correctly use `get_reseller_email(user)` for ownership checks
  - Staff users can now view, edit, copy, and update status of their parent reseller's orders
  - `copy_order` correctly sets `reseller_email` to parent reseller and `created_by` to staff email
  - Cleaned up unused `user_email` variables across all endpoints
  - **Test Report**: `/app/test_reports/iteration_36.json` - 13/13 backend tests passed

- **BUG FIX #2: Staff Order Tab** - Added `status=staff` filter to `list_orders`
  - When status is "staff", backend returns orders where `created_by != reseller_email` (staff-created orders)
  - Resellers can now see which orders were created by their staff members in the "Staff Order" tab

- **BUG FIX #3: Order Details Configuration Display** - Fixed `OrderDetailsModal` in `WIPOrdersPage.jsx`
  - Configuration data is now an array of config sets; modal correctly iterates and displays each set
  - Shows fabric details: name, image, SKU, base_price per meter
  - Shows size category for each config set
  - Filters out non-display keys (id, size_category) from config entries

- **BUG FIX #4: Pricing Toggle in Order Details** - Added Admin/Customer pricing view toggle
  - Toggle buttons in pricing section header: "Customer Price" (gold) and "Admin Cost" (blue)
  - Customer view shows: cmt_customer_price, fabric_customer_price, styling_customer_price, shipping_customer_price, total_customer_price
  - Admin view shows: cmt_reseller_cost, fabric_reseller_cost, styling_reseller_cost, shipping_reseller_cost, total_reseller_cost

- **BUG FIX #5: Admin Pricing Page Load** - Removed unused `useAuth()` dependency from `PricingModulePage.jsx`
  - Page now loads reliably without re-login issues
  - All 5 tabs (Fabric Price Codes, Product Consumption, Size Margins, Reseller Pricing, Country Surcharges) functional

- **MINOR FIX: /api/auth/me endpoint** - Now includes `parent_reseller_email` for staff users
  - Ensures frontend components can correctly identify staff parent relationships


### Mar 2026 - Style Options Text Input Types Feature
- **FEATURE: Multi-Input-Type Style Parameters**
  - Parameters now support 3 input types: `image_only` (default), `text_only`, `image_and_text`
  - `text_only`: Shows a free text input instead of image cards (e.g., Monogram text)
  - `image_and_text`: Shows image cards + an additional text field
  - Each option/sub-option has a `has_text_input` toggle + `text_label` field
  - When enabled, selecting that option shows a text field for additional details
  - Works at parameter level, option level, and sub-option level
  - Text values saved as `text_inputs` in the styling data object on orders
  - **Backend**: Updated `StyleParameter`, `StyleOption`, `SubStyleOption` models in `styling.py`
  - **Admin**: `StyleManagementPage.jsx` - Input Type dropdown, Txt toggle per option/sub-option, text label config
  - **Reseller**: `StylingPage.jsx` - Renders appropriate input type, saves text values
  - **Test Report**: `/app/test_reports/iteration_37.json` - 10/10 backend, 100% frontend

- **BUG FIX: Frontend Build Missing** - Stale build directory from previous fork caused blank pages
  - Rebuilt frontend with correct `REACT_APP_BACKEND_URL`
  - Updated Kurian's email from `kurian@reseller.com` to `kurian@partner.com`

### Mar 19, 2026 - Try-On Measurement System (COMPLETE)
- **NEW FEATURE: Size Repository & Try-On Measurements**
  - Admin manages a "Size Repository" with garment types (Jacket, Pants), fits (Slim, Regular), and base measurements per size
  - Resellers can now take measurements by selecting a pre-defined garment size and applying +/- adjustments in 1/8 inch increments
  - **Admin UI**: `/admin/size-repository` — Create garment types, add fits with size ranges, select measurement fields, generate size rows, enter base measurements
  - **Reseller UI**: `/reseller/link-measurement` — Toggle between Manual Entry and Try-On Method; select garment → fit → size, view base measurements, adjust with +/- buttons
  - **Backend**: `/api/size-repo/garment-types` (GET/PUT), `/api/size-repo/sizes/{garment_id}/{fit_id}` (GET/PUT), `/api/size-repo/lookup/{garment_id}/{fit_id}/{size}` (GET)
  - **Collections**: `size_repository` (garment types/fits), `size_measurements` (base measurements per garment/fit/size)
  - **Files**: `/app/backend/routes/size_repository.py`, `/app/frontend/src/pages/admin/SizeRepositoryPage.jsx`, `/app/frontend/src/pages/reseller/LinkMeasurementPage.jsx`
  - **Bug Fix**: Duplicate `Ruler` import in `AdminLayout.jsx` causing build failure — removed duplicate
  - **Frontend Rebuild**: Built fresh frontend to include new pages in production build
  - **Test Report**: `/app/test_reports/iteration_39.json` — 19/19 backend, 100% frontend

### Mar 2026 - API Keys & Sync System
- **FEATURE: API Keys & Sync** for external app (DEGE eCommerce) integration
  - Admin panel: "API Keys & Sync" page at `/admin/api-keys`
  - Generate/revoke API keys with `si_` prefix, scoped to Products/Styling/Measurements
  - 4 read-only sync endpoints: `/api/sync/products`, `/api/sync/styling/{product_id}`, `/api/sync/measurements`, `/api/sync/all`
  - Webhook auto-notifications: fires POST to registered webhook URLs when Products, Styling, or Measurements change
  - Webhook logs with delivery status tracking
  - Test webhook button in admin panel
  - **Backend**: `routes/sync.py` — API key CRUD, sync endpoints, webhook dispatcher
  - **Frontend**: `ApiKeysPage.jsx` — key management, endpoint docs, webhook config
  - **Test Report**: `/app/test_reports/iteration_38.json` — 24/24 backend, 100% frontend

- **BUG FIX: Measurements Sync returning 0 fields**
  - Root cause: `sync.py` queried `config_id: "default"` but collection uses `_id: "default"`
  - Fixed to match measurements.py convention. Now returns all 17 fields correctly.

- **FIX: Styling defaults in sync response**
  - Added `normalize_styling()` to ensure all parameters return `input_type`, `text_label`, `has_text_input`, `has_sub_options`, `sub_options` with proper defaults
  - External apps now receive complete schema even for older data without these fields




### Feb 21, 2026 - Production Security Hardening
- **SECURITY: Comprehensive application-level hardening implemented**
  
  **Rate Limiting (slowapi)**:
  - Login endpoints: 5 requests/minute per IP
  - Password reset: 3 requests/minute per IP
  - General API: 200 requests/minute per IP
  
  **Failed Login Tracking**:
  - Tracks by email and IP address
  - Auto-lockout after 5 failed attempts
  - 15-minute lockout duration
  - Logged to `failed_logins` collection
  
  **Security Headers**:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - HSTS (production only)
  - Content-Security-Policy (production only)
  
  **CORS Hardening**:
  - Configurable via CORS_ORIGINS environment variable
  - No wildcard in production
  
  **Debug Mode**:
  - Swagger/OpenAPI disabled in production (ENVIRONMENT=production)
  
  **Request Logging**:
  - All requests logged with IP, method, path, status, duration
  - Failed auth attempts logged as warnings
  
  **Documentation created**: `/app/SECURITY_HARDENING.md`

### Feb 21, 2026 - Negative Margin Support for Special Resellers
- **FEATURE: Negative margin values for special pricing**
  - Admin can now enter negative values (e.g., -20%) for reseller margins
  - Example: If CMT base = $185 and margin = -20%, reseller cost = $185 × 0.80 = $148
  - Updated UI labels: "Positive = markup, Negative = discount"
  - All margin fields now have `step="any"` for decimal support
  - Backend already handles negative calculations correctly via formula: `cost × (1 + margin/100)`

### Feb 21, 2026 - Forgot Password & Email Configuration
- **NEW: Forgot Password Flow** - Full password reset via email
  - Forgot Password page (`/forgot-password`) with email input
  - Reset Password page (`/reset-password?token=xxx`) with password reset form
  - Backend endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
  - Secure token generation with 1-hour expiry
  - "Forgot Password?" links added to all login pages (Admin, Reseller, Sales Partner)
  
- **NEW: Admin Email Configuration Page** (`/admin/email`)
  - Two provider options: Google Workspace SMTP and Mailgun
  - SMTP settings: Host, Port, Username, App Password
  - Mailgun settings: API Key, Domain
  - Test email button to verify configuration
  - Backend endpoints: `GET/PUT /api/admin/email-settings`, `POST /api/admin/email-settings/test`
  
- **BUG FIX: Stripe payment success URL malformed**
  - Fixed: `success_url` was appending `?session_id=xxx` even when URL already had query params
  - Now correctly uses `&` if `?` exists, preventing malformed URLs like `?payment=success?session_id=xxx`
  - This was causing the verify-payment call to fail because session_id wasn't being parsed correctly

### Feb 21, 2026 - Authentication Role-Collision Bug Fix
- **BUG FIX: Reseller and Sales Partner Session Collision** - Sessions now properly isolated
  - **Root cause**: Both roles used the same backend endpoint (`/api/auth/reseller/login`) and same localStorage key (`reseller_token`), causing session conflicts on page refresh
  - **Fix implemented**: 
    1. Separate token storage: `reseller_token` for Resellers, `partner_token` for Sales Partners
    2. Separate login functions: `resellerLogin()` and `partnerLogin()` in AuthContext.jsx
    3. Role validation: `resellerLogin()` rejects sales_partner role, `partnerLogin()` rejects reseller role
    4. Session initialization in `initAuth()` now correctly identifies user role from token type
  - **Test report**: `/app/test_reports/iteration_25.json` - 100% pass rate (4/4 test cases)
  - **Test cases verified**:
    - Reseller login + page refresh → stays in Reseller portal ✓
    - Sales Partner login + page refresh → stays in Sales Partner portal ✓
    - Sales Partner attempting Reseller login → rejected with error message ✓
    - Reseller attempting Sales Partner login → rejected with error message ✓

### Feb 21, 2026 - Remember Me Feature & Password Eye Toggle
- **NEW: Remember Me Feature** - Extends token expiry for trusted devices
  - Standard login: 7-day token expiry
  - "Remember me" checked: 30-day token expiry
  - Implemented on all 3 login portals (Admin, Reseller, Sales Partner)
  - Backend: `create_access_token()` in auth.py accepts `remember_me` parameter
  - Frontend: All login functions pass `rememberMe` boolean to backend
  
- **NEW: Password Eye Toggle** - Show/hide password on all login pages
  - Added Eye/EyeOff icons from lucide-react
  - Click to toggle between password visibility states
  - Consistent implementation across Admin, Reseller, and Sales Partner login pages
  
- **Test report**: `/app/test_reports/iteration_26.json` - 100% pass rate (5/5 test cases)

### Feb 20, 2026 - Stripe Payment Integration Fix
- **BUG FIX: Stripe Checkout Session Creation** - Payment flow now working correctly
  - Fixed: Backend `/api/settings/checkout/create-session` creates Stripe checkout sessions
  - Fixed: Webhook endpoint now properly sets `stripe.api_key` before processing
  - Fixed: Uses standard `json.loads` instead of deprecated `stripe.util.json.loads`
  - Payment modal displays with Bank Transfer and Online Payment (Stripe) options
  - Selecting Stripe redirects to Stripe checkout page with correct order details
  - Order updated with `stripe_session_id`, `payment_method`, `payment_status`
  - Test report: `/app/test_reports/iteration_23.json` - 89% backend (webhook minor), 100% frontend

- **BUG FIX: Order status not updating after successful Stripe payment**
  - Fixed: `/api/settings/checkout/verify-payment` now sets `status: "placed"` when payment is verified as "paid"
  - Previously only updated `payment_status` to "paid" but left order in "wip" status

- **BUG FIX: Fabric margin not applied in customer-centric pricing**
  - **Root cause**: Backend was only applying reseller margins, not the two-layer admin+reseller margin system
  - **Fix**: Updated `/api/pricing/calculate-price` to apply TWO layers of margins:
    1. **Admin margins** (from `reseller_pricing`): What admin charges the reseller on top of base cost
    2. **Reseller margins** (from `reseller_settings.margins`): What reseller charges customer on top of their cost
  - **Calculation flow**: `Base Cost → +Admin Margin → Reseller Cost → +Reseller Margin → Customer Price`
  - **Example (Fabric)**: Base 89.25 → +15% admin → 102.64 (reseller cost) → +20% reseller → 123.16 (customer price)
  - **Frontend updated**: Now uses backend pricing for all components (fabric, CMT, styling, shipping)
  - **Cost view**: Shows `cost_before_reseller_margin` (reseller's cost after admin margin)
  - **Customer view**: Shows `final_cost` (customer price after both margins)

- **BUG FIX: Payment methods not respecting reseller settings**
  - Fixed: Payment modal now only shows payment options that are enabled for the reseller
  - If reseller has `payment_methods: {bank_transfer: false, stripe: true}`, only Stripe option shows
  - Added `fetchUserInfo()` to get user payment methods from `/auth/me`
  - Default payment method auto-set based on allowed options

#### Key Endpoints
- `GET /api/settings/stripe` - Get Stripe settings (publishable_key, has_secret_key)
- `PUT /api/settings/stripe` - Update Stripe keys
- `GET /api/settings/stripe/public-key` - Get publishable key for frontend
- `POST /api/settings/checkout/create-session` - Create Stripe checkout session
- `POST /api/settings/checkout/verify-payment` - Verify payment status & update order to "placed"
- `POST /api/settings/webhook` - Handle Stripe webhooks (async confirmations)

### Dec 2025 (Current Session) - Axios Interceptor & Order Editing
- **NEW: Centralized Axios Interceptor** (`/app/frontend/src/lib/api.js`)
  - Automatically attaches Authorization header to all API requests
  - Prevents recurring auth header bugs
  - Used by StylingPage, WIPOrdersPage, ProductConfigurePage

- **NEW: Full Order Editing Flow**
  - Edit button on WIP/Placed orders navigates to configure page with pre-filled data
  - Fabric code, styling options, measurements preserved
  - Customer info extracted from order when viewing "All Orders"
  - PUT /api/orders/{order_id} updates existing order
  - Test report: `/app/test_reports/iteration_18.json` - 100% pass rate

- **BUG FIX: Settings Save Buttons Not Working**
  - Fixed "Save Order Rules" - was missing Authorization header
  - Added new "Save Settings" (General Settings) backend endpoint
  - Test report: `/app/test_reports/iteration_17.json` - 100% pass rate

### Dec 2025 (Session 6) - P0 Security Fix Complete
- **CRITICAL: Data Isolation Security Fix** - Resellers can now only see their own data
  - Fixed: Customers API (`/app/backend/routes/customers.py`)
  - Fixed: Orders API (`/app/backend/routes/orders.py`)
  - Fixed: Styling Templates API (`/app/backend/routes/styling_templates.py`)
  - Fixed: Chat API (`/app/backend/routes/chat.py`)
  - Fixed: Measurements API (`/app/backend/routes/measurements.py`) - Was completely unauthenticated!
  - All endpoints now filter by `reseller_email` for resellers
  - Admin can still see all data across all resellers
  - 22/22 security tests passed

- **Sales Partner Revenue Calculation - Complete Rewrite**
  - Fixed: `sales_partner.py` now calculates commission based on **product quantity × per-product rate**
  - Formula: `Retainer + (Onboarding × Referrals) + (Per-Product Rate × Quantity Sold)`
  - Example: $500 + ($100 × 1 reseller) + (3 suits × $30) + (2 jackets × $20) + (5 shirts × $5) = **$755**
  - Fixed: Revenue Commission % defaulting to 5 (now respects 0)
  - Fixed: `hashed_password` was exposed in referrals API
  - Frontend updated with **Product-wise Breakdown** showing each product type's contribution
  - Admin panel shows clear **Commission Formula** preview

### Feb 19, 2026 (Session 5) - Chat System Complete
- **NEW: Chat System** - Full order-based chat with file uploads
  - Floating widget on all portals
  - Admin dedicated Chats page
  - Per-order chat button in Admin Orders
  - Group chat (Reseller + Partner + Admin)
  - 5-second polling, unread badges
  - File upload (2MB max)

### Feb 19, 2026 - P1 Features
- Customer Management Page
- Reseller Sources Management
- Order Statuses Management
- Order PDF Generation

## Test Reports
- `/app/test_reports/iteration_28.json` - Staff Module Tests (14/16 backend, 100% frontend)
- `/app/test_reports/iteration_27.json` - Dual Payment System Tests (10/10 passed)
- `/app/test_reports/iteration_17.json` - Chat Settings & E2E Chat Tests (31/31 passed)
- `/app/test_reports/iteration_15.json` - Data Isolation Security Tests (22/22 passed)
- `/app/backend/tests/test_staff_module.py` - Staff module test suite
- `/app/backend/tests/test_dual_payment_system.py` - Dual payment system test suite
- `/app/backend/tests/test_chat_settings.py` - Chat settings test suite
- `/app/backend/tests/test_chat_api.py` - Chat API test suite
- `/app/backend/tests/test_data_isolation_security.py` - Security test suite

## Important Notes
- **SECURITY**: All data endpoints filter by `reseller_email` - resellers only see their own data
- Orders must have `reseller_email` field set for data isolation to work
- Chat polling interval is configurable via Admin Settings → Chat tab (default: 5 seconds, range: 1-60)
- Max file upload size: 2MB (larger files should be shared as links)

### Feb 27, 2026 - Strict 404 Handling & Security Hardening (COMPLETE)
- **SECURITY: Route Validation & 404 Enforcement**
  - Only whitelisted routes serve `index.html` — all unknown paths return HTTP 404
  - Route validation: Static whitelist (10 public pages) + Auth routes + Portal prefixes + DB-verified dynamic routes (products, fabrics, categories)
  - Invalid dynamic routes (e.g., `/products/fake-product`) return 404 after DB check
  - **WordPress/Attack Path Blocking**: `/wp-admin`, `/xmlrpc.php`, `/.env`, `/.git`, `/phpmyadmin`, `.php`, `.asp`, `.jsp`, `.sql` — all blocked immediately via middleware
  - **Frontend proxy integration**: `setupProxy.js` validates routes against backend before serving, ensuring 404s work through both port 3000 (dev server) and port 8001 (backend)
  - **404 HTML**: Clean branded page (dark bg, gold accent) with `noindex, nofollow` — does NOT serve React app or JS bundles
  - **Files Created**: `/app/backend/route_validator.py`, `/app/frontend/src/setupProxy.js`
  - **Files Modified**: `/app/backend/server.py` (middlewares, catch-all, validate-route endpoint, CSP headers)
  - **New Endpoint**: `GET /api/seo/validate-route?path=/about` — lightweight route validation
- **SECURITY: Enhanced Headers**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy` with strict source whitelisting (Google Analytics, Stripe, Fonts, etc.)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - **Test Report**: `/app/test_reports/iteration_33.json` - 95/95 tests passed

### Feb 27, 2026 - Sub-Style Options Feature (COMPLETE)
- **NEW FEATURE: Sub-Style Options for Style Parameters**
  - Style options can now have nested sub-options (same structure: image + label + surcharge)
  - **Admin Panel**: Toggle switch on each option to enable/disable sub-options. When ON, a blue nested section appears below with full CRUD for sub-options (name, image, surcharge, default, delete)
  - **Reseller Portal**: When a selected option has sub-options, they auto-expand inline below the main options grid with blue styling. Sub-option surcharges are added to pricing.
  - **Backend**: `SubStyleOption` Pydantic model added; `StyleOption` extended with `has_sub_options` and `sub_options` fields
  - **Files Modified**: `/app/backend/routes/styling.py`, `/app/frontend/src/pages/admin/StyleManagementPage.jsx`, `/app/frontend/src/pages/reseller/StylingPage.jsx`
  - **Test Report**: `/app/test_reports/iteration_32.json` - 100% pass rate

### Feb 27, 2026 - SEO Fixes: Slug Normalization, Redirect URLs, Meta Descriptions
- **FIX #1**: Slug normalization — `normalize_slug()` function enforces lowercase, hyphen-only, no special characters. Applied to sitemap, canonicals, product matching.
- **FIX #2**: 301 redirects now use absolute HTTPS production URL (e.g., `https://suitsindia.com/about`) instead of relative paths.
- **FIX #3**: Auto-generated meta descriptions now use actual product/fabric `description` field from DB (truncated to ~155 chars), falling back to template text only when DB description is too short.
- **NEW FEATURE: Complete SEO & Marketing Admin Panel + Backend HTML Template Rewriting Middleware**
  - **Backend HTML Injection Middleware** (CORE FEATURE):
    - Intercepts public page requests via catch-all route in `server.py`
    - Reads React build's `index.html`, injects SEO metadata, returns modified HTML
    - Only processes public pages — does NOT touch `/api/*`, `/admin/*`, `/reseller/*`, `/partner/*`, `/login`, static files
    - Does NOT modify `<div id="root">`, React bundles, or existing scripts
    - Preview/test endpoint: `GET /api/seo/preview-html?path=/about`
  - **Fallback Hierarchy**: Page-Level SEO → Global SEO → Auto-generated defaults
  - **301/302 Redirect System**: Database-driven redirects with CRUD API
  - **Global SEO Settings**: Site title, meta description, OG tags, Twitter cards, organization schema
  - **Page-Level SEO**: Custom SEO for all static pages, products, fabrics, categories
  - **Tracking Integration**: GA4, Meta Pixel, GTM, LinkedIn Insight with enable/disable toggles
  - **Site Verification**: Google Search Console, Bing Webmaster Tools
  - **Custom Scripts**: Head, body start, body end script injection
  - **JSON-LD Structured Data**: Organization schema with address and social links
  - **Dynamic Sitemap**: Auto-generated XML sitemap at `/api/sitemap.xml`
  - **Dynamic Robots.txt**: Configurable robots.txt at `/api/robots.txt`
  - **OG Image Upload**: File upload with storage for social sharing images
  
  **Architecture**:
  - CSR + Backend HTML Injection model (no SSR migration needed)
  - All SEO data stored in database (no hardcoded values)
  - `seo_middleware.py` contains pure injection logic (testable, isolated)
  - `server.py` catch-all route serves frontend build with SEO for production
  - Extensible for future multi-environment support
  
  **Files Created/Modified**:
  - `/app/backend/seo_middleware.py` - Core HTML injection engine (NEW)
  - `/app/backend/routes/seo.py` - All SEO API endpoints + redirect CRUD
  - `/app/backend/server.py` - Preview endpoint + production catch-all route
  - `/app/frontend/src/pages/admin/SEOManagementPage.jsx` - Admin UI
  
  **Key Endpoints**:
  - `GET /api/seo/preview-html?path=/` - Preview SEO-injected HTML
  - `GET /api/seo/render?path=/` - Get raw SEO data JSON
  - `GET/PUT /api/seo/global` - Global SEO settings
  - `GET/PUT /api/seo/pages/{type}/{slug}` - Page-level SEO
  - `GET/PUT /api/seo/tracking` - Tracking config
  - `GET/POST/DELETE /api/seo/redirects` - 301/302 redirect management
  
  **Test Report**: `/app/test_reports/iteration_31.json` - 100% pass rate (31/31 tests)

### Feb 25, 2026 - US Sales Partner Contact Feature
- **NEW FEATURE: US Sales Partner Contact Information**
  - Added US Sales Partner contact section to Contact Us page
  - Displays alongside India Office when US details are filled in
  - Fields added to Content Editor:
    - US Phone
    - US WhatsApp (with country code)
    - US Company/Partner Name
    - US Address Line 1, Line 2, City/State
  - Auto-hides when fields are empty
  - Blue themed badge/icon for US (vs gold for India)
  - **Files Modified**:
    - `/app/frontend/src/pages/ContactUsPage.jsx`
    - `/app/frontend/src/pages/admin/ContentEditorPage.jsx`

### Feb 23, 2026 - Sales Partner Dashboard Token Fix
- **BUG FIX: Sales Partner Dashboard Not Loading Data**
  - **Issue**: Sales Partner dashboard showed all zeros despite correct data in backend
  - **Root Cause**: Dashboard fetched token from `localStorage.getItem('reseller_token')` but partner token is stored in `partner_token`
  - **Fix**: Changed to `localStorage.getItem('partner_token')` in SalesPartnerDashboard.jsx
  - **Verified**: Dashboard now shows correct referrals, orders, and commission breakdown

### Feb 23, 2026 - User Role Assignment Bug Fix
- **BUG FIX: Sales Partner Role Not Assigned on User Creation**
  - **Issue**: When admin created a new Sales Partner via the Users page, the user couldn't login via the Sales Partner portal - it said "Please use the Reseller portal to login"
  - **Root Cause**: In `/app/backend/routes/admin.py`, the `create_user` function hardcoded `role: "user"` regardless of the `role_id` sent from frontend
  - **Fix**: 
    1. `create_user`: Map `role_id` to `role` field (sales_partner, reseller, admin, staff, user)
    2. `update_user`: Sync `role` field when `role_id` is updated
    3. Set `is_admin: True` only when role is "admin"
  - **Test Verified**: Created new Sales Partner "donald@test.com" and confirmed login to Sales Partner portal works correctly

### Feb 23, 2026 - Logout Redirect Fix
- **BUG FIX: Logout Redirect to Login Selection Page**
  - **Issue**: Logging out from any portal (Admin, Reseller, Sales Partner) redirected to role-specific login pages (e.g., `/admin/login`) instead of the main login selection page (`/login`)
  - **Root Cause**: 
    1. The `ProtectedRoute` components detected `!user` after `logout()` cleared state
    2. This triggered a redirect to the role-specific login page BEFORE `navigate('/login')` could complete
  - **Fix Implemented**:
    1. Added `loggingOut` state flag to `AuthContext.jsx`
    2. `logout()` sets `loggingOut = true` before clearing state
    3. All protected route components (`AdminRoute`, `ResellerRoute`, `SalesPartnerRoute`) check for `loggingOut` and return `null` instead of redirecting
    4. Changed `handleLogout()` to use `window.location.href = '/login'` for a hard redirect that bypasses React Router
  - **Files Updated**:
    - `/app/frontend/src/context/AuthContext.jsx` - Added loggingOut state
    - `/app/frontend/src/components/ProtectedRoute.jsx` - Check loggingOut in all protected routes
    - `/app/frontend/src/components/admin/AdminLayout.jsx` - Hard redirect + loggingOut check
    - `/app/frontend/src/pages/reseller/ResellerDashboard.jsx` - Hard redirect
    - `/app/frontend/src/pages/partner/SalesPartnerDashboard.jsx` - Hard redirect
  - **Test Results**: All three portals (Admin, Reseller, Sales Partner) now correctly redirect to `/login` after logout

### Feb 23, 2026 - Staff Module Implementation
- **NEW: Staff (Sub-Agent) System** - Resellers can create staff members
  
  **Staff Creation**:
  - Reseller creates staff via Settings → Staff tab
  - Staff has: email, password, name, phone, margins
  - Endpoint: `POST /api/staff`
  
  **Staff Margins (3-Tier System)**:
  - **Admin Margins**: Set by admin, applied to base prices → Reseller Cost
  - **Staff Cost Margins**: Set by reseller (`margins`), applied to reseller cost → Staff Cost
  - **Staff Customer Margins**: Set by staff (`customer_margins`), applied to staff cost → Customer Price
  
  **Staff My Pricing Page** (`/reseller/my-pricing`):
  - Staff can view their cost margins (set by reseller)
  - Staff can set their customer margins (profit margins)
  - Example pricing breakdown shows full 3-tier calculation
  
  **Staff Login**:
  - Same reseller login page (`/reseller/login`)
  - Role-based redirection (authType = 'staff')
  - Returns `parent_reseller_email`, `margins`, and `customer_margins` in response
  
  **Staff Restrictions**:
  - CAN: Add orders to WIP, Link measurements, Receive customer payments, Set own customer margins
  - CANNOT: Place orders (only reseller pays admin), Access full settings
  - "My Pricing" button shown instead of Settings in dashboard
  - Place button hidden in WIP Orders
  - Full Settings page shows "Access Restricted" message
  
  **Test Report**: `/app/test_reports/iteration_29.json` - 91.6% backend (11/12), 100% frontend

### Feb 23, 2026 - Dual Payment System Implementation
- **NEW: Dual Payment Architecture** - Complete separation of customer and admin payments
  
  **Customer Payment (Customer → Reseller)**:
  - Uses reseller's own Stripe keys configured in Settings → Payments
  - Full customer price (includes reseller margin)
  - Endpoint: `POST /api/payment/customer/create-checkout-session`
  - Verify: `POST /api/payment/customer/verify-payment`
  
  **Admin Payment (Reseller → Admin)**:
  - Uses admin's Stripe keys
  - Reseller cost only (admin cost + admin margin, NO reseller margin)
  - Endpoint: `POST /api/payment/checkout/create-session`
  - Amount stored in `order.admin_payment.amount_due`
  
  **Order Payment Tracking Fields**:
  - `customer_payment.total_amount` - Full price customer pays reseller
  - `customer_payment.status` - unpaid/part_paid/paid
  - `admin_payment.amount_due` - Amount reseller owes admin
  - `admin_payment.status` - unpaid/paid
  
  **Cart Flow Fix**:
  - "Add to Cart" on Styling page no longer navigates away
  - Shows toast notification with "View Cart" action button
  - User can continue adding more items or proceed to cart

  **Test Report**: `/app/test_reports/iteration_27.json` - 100% pass rate (10/10 tests)

### ✅ Production 404 Handling Fix (COMPLETED - Feb 2026)

#### Problem
Invalid/spam URLs on the production site (suitsindia.com) returned HTTP 200 instead of 404. This was harming SEO by keeping thousands of old spam URLs indexed by search engines.

#### Root Cause
The previous approach used `setupProxy.js` (a CRA dev-only feature) to validate routes. This only works with the webpack dev server and is completely inactive in production.

#### Solution
Replaced the CRA dev server with a custom Express server (`/app/frontend/server.js`):
- Serves static assets (JS, CSS, images) directly from `build/` directory
- Proxies all page requests to the FastAPI backend at `127.0.0.1:8001`
- Backend's catch-all route handles: redirects, route validation, SEO injection, and 404 responses
- Updated `package.json` start script from `craco start` to `node server.js`
- Deleted obsolete `setupProxy.js`

#### Pricing Module Fix (Feb 2026)
- **Bug**: Admin margins (set per-reseller) were NOT being applied to customer pricing
- **Root Cause**: All resellers shared a single `reseller_settings` document with `reseller_id: "default"`. The pricing engine looked up by `reseller_email` which never matched. Fell back to shared "default" with 0% margins.
- **Fix**: 
  - Backend `pricing.py`: Changed lookup from `reseller_email` to `reseller_id` matching the reseller's email
  - Frontend: All reseller pages now use `user.email` as `resellerId` instead of hardcoded `"default"`
  - Each reseller now has isolated settings stored by their email
- **Test**: `/app/test_reports/iteration_35.json` — 13/13 passed, math verified

#### Key Files
- `/app/frontend/server.js` - Custom Express production server
- `/app/frontend/package.json` - Updated start script
- `/app/backend/server.py` (line 602) - Backend catch-all with validation/SEO/404 logic
- `/app/backend/route_validator.py` - Route validation whitelist and blocked paths

#### Test Report
`/app/test_reports/iteration_34.json` - 100% pass rate (46/46 tests)

---

### SEO 404 False-Positive Fix (COMPLETED - Mar 2026)

#### Issues Fixed
1. **`/admin/backup` & `/admin/database-sync` returning 404**: `block_malicious_paths` middleware's BLOCKED_SUBSTRINGS (`/backup`, `/database`) falsely matched valid admin portal routes. Fixed by skipping portal paths (`/admin/*`, `/reseller/*`, `/partner/*`, `/staff/*`) before checking blocked substrings.
2. **Backend-down fallback returning 200**: `frontend/server.js` error handler served `index.html` with HTTP 200 when backend was unreachable, causing soft 404 SEO penalties during backend restarts. Fixed to return 503 with `noindex` meta tag.

#### Files Modified
- `/app/backend/server.py` (line ~442) - `block_malicious_paths` now skips portal paths
- `/app/frontend/server.js` (line ~62) - Error fallback returns 503 instead of 200

#### Test Report
`/app/test_reports/iteration_41.json` - 100% pass rate (41/41 tests)

---

## Test Reports
- `/app/test_reports/iteration_41.json` - SEO 404 False-Positive Fix (41/41 passed)
- `/app/test_reports/iteration_34.json` - 404 URL Security Fix (46/46 passed)
- `/app/test_reports/iteration_31.json` - SEO System Backend Tests (31/31 passed)
- `/app/test_reports/iteration_27.json` - Dual Payment System Tests (10/10 passed)
- `/app/test_reports/iteration_17.json` - Chat Settings & E2E Chat Tests (31/31 passed)
- `/app/test_reports/iteration_15.json` - Data Isolation Security Tests (22/22 passed)
- `/app/backend/tests/test_http_status_codes.py` - HTTP status code test suite
- `/app/backend/tests/test_seo_system.py` - SEO system test suite
- `/app/backend/tests/test_chat_settings.py` - Chat settings test suite
- `/app/backend/tests/test_chat_api.py` - Chat API test suite
- `/app/backend/tests/test_data_isolation_security.py` - Security test suite
- `/app/backend/tests/test_dual_payment_system.py` - Dual payment system test suite
- `/app/backend/tests/test_404_url_security.py` - 404 URL security test suite

## Test Credentials
- **Admin**: admin@suitsindia.com / admin
- **Reseller 1**: reseller@test.com / reseller123
- **Reseller 2**: trump@suitsindia.com / trump123
- **Sales Partner**: donald@suitsindia.com / donald123
