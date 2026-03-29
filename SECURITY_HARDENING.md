# Suits India - Security Hardening Implementation

## Application-Level Security (Implemented)

### 1. Rate Limiting ✅

| Endpoint | Limit | Purpose |
|----------|-------|---------|
| `/api/auth/admin/login` | 5/minute per IP | Prevent brute force |
| `/api/auth/reseller/login` | 5/minute per IP | Prevent brute force |
| `/api/auth/forgot-password` | 3/minute per IP | Prevent email spam |
| All other endpoints | 200/minute per IP | General protection |

**Implementation**: `slowapi` library with in-memory storage (use Redis in production for distributed rate limiting)

### 2. Failed Login Tracking ✅

| Setting | Value |
|---------|-------|
| Max failed attempts | 5 per email |
| Max failed attempts per IP | 10 |
| Lockout duration | 15 minutes |

**Features**:
- Tracks failed logins by email and IP
- Auto-lockout after threshold exceeded
- Clears on successful login
- Logged to backend logs

**Collection**: `failed_logins`
```javascript
{
  email: String,
  ip_address: String,
  reason: String,
  timestamp: DateTime
}
```

### 3. Security Headers ✅

All API responses include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Production-only headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

### 4. CORS Configuration ✅

| Environment | Configuration |
|-------------|---------------|
| Development | `*` (wildcard) |
| Production | Specific domains only |

**How to configure for production**:
```bash
# In backend/.env
CORS_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
```

### 5. JWT Security ✅

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Default expiry | 7 days |
| "Remember Me" expiry | 30 days |
| Secret source | Environment variable |

**Production requirement**:
```bash
# Generate strong secret:
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Set in backend/.env:
JWT_SECRET="your-generated-64-char-secret"
```

### 6. Debug Mode Disabled ✅

In production (`ENVIRONMENT=production`):
- Swagger UI disabled (`/docs`)
- ReDoc disabled (`/redoc`)
- OpenAPI spec disabled (`/openapi.json`)

### 7. Request Logging ✅

All requests logged with:
- HTTP method
- Path
- Status code
- Duration
- Client IP

**Special logging**:
- 401 responses → WARNING
- 403 responses → WARNING
- 5xx responses → ERROR
- Failed logins → WARNING with details

---

## Environment Variables Checklist

### Production `.env` Configuration

```bash
# ===========================================
# PRODUCTION ENVIRONMENT
# ===========================================

# Database
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
DB_NAME="tailorstailor"

# Security
ENVIRONMENT="production"
JWT_SECRET="<64-char-random-string>"
CORS_ORIGINS="https://yourdomain.com"

# Stripe (if using payments)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="noreply@yourdomain.com"
SMTP_PASSWORD="app-password-here"
```

---

## Security Testing Guide

### Rate Limiting Test
```bash
# Should return 429 after 5 attempts
for i in {1..7}; do
  curl -X POST "https://yourdomain.com/api/auth/admin/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done
```

### Failed Login Lockout Test
```bash
# After 5 failed attempts, even correct credentials should fail for 15 minutes
```

### Security Headers Test
```bash
curl -I "https://yourdomain.com/api/health"
# Should see all security headers in response
```

---

## Remaining Infrastructure Requirements

The following require Emergent platform confirmation:

### 1. MongoDB Security
- [ ] MongoDB not publicly accessible
- [ ] Access restricted to backend only
- [ ] Authentication enforced
- [ ] Backup policy confirmed

### 2. Ingress/Nginx
- [ ] HTTPS strictly enforced
- [ ] TLS 1.2+ minimum
- [ ] Request size limits (10MB)
- [ ] Timeout configuration
- [ ] Ingress-level rate limiting

### 3. Kubernetes
- [ ] Containers run as non-root
- [ ] Resource limits enforced
- [ ] Internal services not publicly exposed

### 4. Logging & Monitoring
- [ ] Ingress-level logging enabled
- [ ] Log retention period (7-14 days)
- [ ] Alerting for abnormal spikes

---

## Penetration Testing Guidelines

### Acceptable Tests
- SQL/NoSQL injection attempts
- Authentication bypass testing
- Brute force simulation (respecting rate limits)
- Role escalation attempts
- XSS testing
- CSRF testing

### Thresholds to Avoid
- Do not exceed 100 requests/second sustained
- Stop if rate limited (429 responses)
- Do not attempt DoS attacks
- Do not test from multiple IPs simultaneously without approval

### Pre-Testing Checklist
- [ ] Notify Emergent support
- [ ] Confirm IP whitelist if needed
- [ ] Document testing schedule
- [ ] Have rollback plan ready

---

## Implementation Files

| File | Changes |
|------|---------|
| `/app/backend/server.py` | Rate limiter, security headers, request logging, CORS |
| `/app/backend/routes/auth.py` | Failed login tracking, rate limits on auth endpoints |
| `/app/backend/.env` | Production configuration template |

---

*Document created: February 21, 2026*
*Implementation status: Application-level hardening complete*
