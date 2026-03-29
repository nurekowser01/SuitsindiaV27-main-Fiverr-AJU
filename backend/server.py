from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from passlib.context import CryptContext
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ===========================================
# PRODUCTION SECURITY CONFIGURATION
# ===========================================

# Environment detection
IS_PRODUCTION = os.environ.get("ENVIRONMENT", "development").lower() == "production"
DEBUG_MODE = os.environ.get("DEBUG", "true").lower() == "true"

# In production, DEBUG must be false
if IS_PRODUCTION and DEBUG_MODE:
    import logging
    logging.warning("⚠️  DEBUG=true in production environment! This should be false.")

# CORS Configuration - Always include custom domain
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

# Custom domains that must ALWAYS be allowed (hardcoded for production)
CUSTOM_DOMAINS = [
    "https://suitsindia.com",
    "https://www.suitsindia.com",
]

if CORS_ORIGINS != "*":
    ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ORIGINS.split(",")]
    # Always add custom domains if not already present
    for domain in CUSTOM_DOMAINS:
        if domain not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(domain)
    print(f"CORS restricted to: {ALLOWED_ORIGINS}")
else:
    ALLOWED_ORIGINS = ["*"]

# Rate Limiter Configuration - with OPTIONS exemption
def get_remote_address_skip_options(request: Request) -> str:
    """Get remote address but return empty string for OPTIONS to skip rate limiting"""
    if request.method == "OPTIONS":
        return ""  # Skip rate limiting for CORS preflight
    return get_remote_address(request)

limiter = Limiter(
    key_func=get_remote_address_skip_options,
    default_limits=["200/minute"],  # Default rate limit for all endpoints
    storage_uri="memory://",  # Use Redis in production: "redis://localhost:6379"
)

# Import routes AFTER loading .env so they have access to environment variables
from routes import auth, admin, settings, pages, customers, products, styling, reseller_settings, measurements, orders, payment, marketing, roles, styling_templates, sales_partner, admin_customers, admin_settings, order_pdf, chat, pricing, backup, staff, database, seo, sync, size_repository

# Configure logging early - with explicit flushing for containers
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Ensures logs go to stdout/stderr
    ]
)
logger = logging.getLogger(__name__)

# Force unbuffered output for containers
import sys
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None
sys.stderr.reconfigure(line_buffering=True) if hasattr(sys.stderr, 'reconfigure') else None

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'tailorstailor')]

# Password hashing context (defined here to avoid circular imports)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash_local(password: str) -> str:
    """Hash password using bcrypt - local definition to avoid import issues"""
    return pwd_context.hash(password)


# ===========================================
# LIFESPAN CONTEXT MANAGER (Modern approach)
# ===========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Modern lifespan manager - replaces deprecated @app.on_event("startup/shutdown")
    This ensures seeding runs reliably in all environments including production.
    """
    # === STARTUP ===
    print("="*50, flush=True)
    print("🚀 APPLICATION STARTUP - Beginning initialization...", flush=True)
    print("="*50, flush=True)
    logger.info("="*50)
    logger.info("🚀 APPLICATION STARTUP - Beginning initialization...")
    logger.info("="*50)
    
    try:
        await seed_initial_users()
        sync.set_db(db)
        print("✅ Application startup completed successfully", flush=True)
        logger.info("✅ Application startup completed successfully")
    except Exception as e:
        error_msg = f"❌ CRITICAL ERROR during startup: {str(e)}"
        print(error_msg, flush=True)
        logger.error(error_msg)
        import traceback
        tb = traceback.format_exc()
        print(tb, flush=True)
        logger.error(tb)
        # Don't raise - allow app to start even if seeding fails
    
    yield  # Application runs here
    
    # === SHUTDOWN ===
    print("🛑 APPLICATION SHUTDOWN - Closing connections...", flush=True)
    logger.info("🛑 APPLICATION SHUTDOWN - Closing connections...")
    client.close()
    print("✅ MongoDB connection closed", flush=True)
    logger.info("✅ MongoDB connection closed")


async def seed_initial_users():
    """Seed default users for a fresh database"""
    print("📋 Starting user seeding process...", flush=True)
    print(f"📋 Using database: {os.environ.get('DB_NAME', 'tailorstailor')}", flush=True)
    logger.info("📋 Starting user seeding process...")
    logger.info(f"📋 Using database: {os.environ.get('DB_NAME', 'tailorstailor')}")
    
    # Test MongoDB connection with a simple operation that works with Atlas
    try:
        # Use a simple list_collection_names instead of admin.command('ping')
        # This works with restricted Atlas permissions
        collections = await db.list_collection_names()
        print(f"[OK] MongoDB connection verified. Collections: {collections}", flush=True)
        logger.info(f"[OK] MongoDB connection verified. Collections: {collections}")
    except Exception as e:
        print(f"❌ MongoDB connection test failed: {str(e)}", flush=True)
        logger.error(f"❌ MongoDB connection test failed: {str(e)}")
        # Try to continue anyway - the insert operations will fail if DB is truly unreachable
        print("⚠️ Attempting to continue with seeding despite connection test failure...", flush=True)
        logger.info("⚠️ Attempting to continue with seeding despite connection test failure...")
    
    users_to_seed = [
        {
            "email": "admin@suitsindia.com",
            "password": "admin",
            "full_name": "Admin User",
            "role": "admin",
            "is_admin": True,
        },
        {
            "email": "reseller@test.com",
            "password": "reseller123",
            "full_name": "Test Reseller",
            "company": "Test Company",
            "role": "reseller",
            "role_id": "reseller",
            "is_admin": False,
        },
        {
            "email": "partner@suitsindia.com",
            "password": "partner123",
            "full_name": "Test Sales Partner",
            "company": "Partner Company",
            "role": "sales_partner",
            "role_id": "sales_partner",
            "is_admin": False,
        },
    ]
    
    for user_data in users_to_seed:
        email = user_data["email"]
        password = user_data.pop("password")
        
        try:
            print(f"🔍 Checking if user exists: {email}", flush=True)
            logger.info(f"🔍 Checking if user exists: {email}")
            existing = await db.users.find_one({"email": email})
            
            hashed_pw = get_password_hash_local(password)
            print(f"🔐 Password hashed for: {email}", flush=True)
            logger.info(f"🔐 Password hashed for: {email}")
            
            user_doc = {
                **user_data,
                "hashed_password": hashed_pw,
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            }
            
            if not existing:
                result = await db.users.insert_one(user_doc)
                print(f"✅ Created user: {email} (id: {result.inserted_id})", flush=True)
                logger.info(f"✅ Created user: {email} (id: {result.inserted_id})")
            else:
                # Update existing user to ensure correct credentials
                result = await db.users.update_one(
                    {"email": email},
                    {"$set": {
                        "hashed_password": hashed_pw,
                        "role": user_data.get("role"),
                        "is_admin": user_data.get("is_admin", False),
                        "is_active": True,
                    }}
                )
                print(f"🔄 Updated user: {email} (matched: {result.matched_count})", flush=True)
                logger.info(f"🔄 Updated user: {email} (matched: {result.matched_count})")
        except Exception as e:
            print(f"❌ Failed to seed user {email}: {str(e)}", flush=True)
            logger.error(f"❌ Failed to seed user {email}: {str(e)}")
            import traceback
            tb = traceback.format_exc()
            print(tb, flush=True)
            logger.error(tb)
            # Continue with other users instead of raising
            continue
    
    # Verify users were created
    try:
        user_count = await db.users.count_documents({})
        print(f"📊 Total users in database: {user_count}", flush=True)
        logger.info(f"📊 Total users in database: {user_count}")
        
        # List all users for debugging
        all_users = await db.users.find({}, {"email": 1, "role": 1, "_id": 0}).to_list(100)
        print(f"📋 Users in database: {all_users}", flush=True)
        logger.info(f"📋 Users in database: {all_users}")
    except Exception as e:
        print(f"❌ Failed to verify users: {str(e)}", flush=True)
        logger.error(f"❌ Failed to verify users: {str(e)}")
    
    print("✅ User seeding process completed!", flush=True)
    logger.info("✅ User seeding process completed!")


# Create the main app with production settings and lifespan
app = FastAPI(
    title="Suits India API",
    lifespan=lifespan,  # Modern lifespan manager
    docs_url=None if IS_PRODUCTION else "/docs",  # Disable Swagger in production
    redoc_url=None if IS_PRODUCTION else "/redoc",  # Disable ReDoc in production
    openapi_url=None if IS_PRODUCTION else "/openapi.json",  # Disable OpenAPI in production
)

# ===========================================
# CORS MIDDLEWARE - MUST BE ADDED FIRST
# ===========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],  # Allow all headers for flexibility
)

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Base routes
@api_router.get("/")
async def root():
    return {"message": "Tailors Tailor API is running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Include routers
app.include_router(api_router)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(pages.router, prefix="/api/pages", tags=["Pages"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(styling.router, prefix="/api/styling", tags=["Styling"])
app.include_router(styling_templates.router, prefix="/api/styling", tags=["Styling Templates"])
app.include_router(reseller_settings.router, prefix="/api/reseller-settings", tags=["Reseller Settings"])
app.include_router(measurements.router, prefix="/api/measurements", tags=["Measurements"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(payment.router, prefix="/api/settings", tags=["Payment"])
app.include_router(payment.router, prefix="/api/payment", tags=["Payment"])  # Also register at /api/payment
app.include_router(marketing.router, prefix="/api/marketing", tags=["Marketing"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(sales_partner.router, prefix="/api", tags=["Sales Partner"])
app.include_router(admin_customers.router, prefix="/api/admin", tags=["Admin Customers"])
app.include_router(admin_settings.router, prefix="/api/admin", tags=["Admin Settings"])
app.include_router(order_pdf.router, prefix="/api/admin", tags=["Order PDF"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
app.include_router(backup.router, prefix="/api/admin", tags=["Backup & Restore"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff Management"])
app.include_router(database.router, prefix="/api/admin", tags=["Database Sync"])
app.include_router(seo.router, prefix="/api", tags=["SEO Management"])
app.include_router(sync.router, prefix="/api", tags=["Sync API"])
app.include_router(size_repository.router, prefix="/api/size-repo", tags=["Size Repository"])


# ===========================================
# SECURITY HEADERS MIDDLEWARE
# ===========================================
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    
    # Content-Security-Policy — balanced for functionality + security
    csp_parts = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://snap.licdn.com https://js.stripe.com https://assets.emergent.sh https://cdn.tailwindcss.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.emergentagent.com",
        "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
        "frame-ancestors 'self' https://app.emergent.sh https://*.emergent.sh https://*.emergentagent.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_parts)
    
    # HSTS - Only in production with HTTPS
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    return response


# ===========================================
# REQUEST LOGGING MIDDLEWARE
# ===========================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now(timezone.utc)
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    
    # Log request (skip health checks for cleaner logs)
    if request.url.path not in ["/api/health", "/api/"]:
        logger.info(
            f"{request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.3f}s - "
            f"IP: {client_ip}"
        )
    
    # Log warnings for suspicious activity
    if response.status_code == 401:
        logger.warning(f"Unauthorized access attempt: {request.url.path} from IP: {client_ip}")
    elif response.status_code == 403:
        logger.warning(f"Forbidden access attempt: {request.url.path} from IP: {client_ip}")
    elif response.status_code >= 500:
        logger.error(f"Server error: {request.url.path} - Status: {response.status_code}")
    
    return response


# ===========================================
# MALICIOUS PATH BLOCKING MIDDLEWARE
# ===========================================
@app.middleware("http")
async def block_malicious_paths(request: Request, call_next):
    """
    First line of defense: immediately 404 known attack paths.
    Runs before any routing or DB queries for maximum performance.
    Does NOT block /api/* or static assets.
    """
    path = request.url.path

    # Only check non-API, non-portal paths (API routes have auth, portal routes are behind login)
    if not path.startswith("/api/"):
        # Skip portal paths — they're behind authentication and handled by route_validator
        is_portal = any(path == p or path.startswith(p + '/') for p in ('/admin', '/reseller', '/partner', '/staff'))
        if not is_portal and is_blocked_path(path):
            client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
            logger.warning(f"BLOCKED malicious path: {path} from IP: {client_ip}")
            response = Response(content="Not Found", status_code=404, media_type="text/plain")
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"
            response.headers["X-XSS-Protection"] = "1; mode=block"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
            return response

    return await call_next(request)


# ===========================================
# DYNAMIC SITEMAP.XML AND ROBOTS.TXT
# ===========================================
from fastapi.responses import PlainTextResponse, HTMLResponse, FileResponse
from starlette.responses import RedirectResponse
import json
from seo_middleware import should_inject_seo, get_index_html_template, inject_seo_into_html, check_redirect
from route_validator import is_blocked_path, is_valid_route, NOT_FOUND_HTML

@app.get("/api/sitemap.xml", response_class=PlainTextResponse)
async def generate_sitemap():
    """Generate dynamic sitemap.xml from database"""
    try:
        # Fetch sitemap data
        sitemap_data = await seo.get_sitemap_data()
        
        if not sitemap_data.get("enabled"):
            return PlainTextResponse(
                content="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Sitemap is disabled -->",
                media_type="application/xml"
            )
        
        urls = sitemap_data.get("urls", [])
        
        xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        
        for url in urls:
            xml_content += '  <url>\n'
            xml_content += f'    <loc>{url.get("loc", "")}</loc>\n'
            if url.get("lastmod"):
                xml_content += f'    <lastmod>{url.get("lastmod")}</lastmod>\n'
            if url.get("changefreq"):
                xml_content += f'    <changefreq>{url.get("changefreq")}</changefreq>\n'
            if url.get("priority"):
                xml_content += f'    <priority>{url.get("priority")}</priority>\n'
            xml_content += '  </url>\n'
        
        xml_content += '</urlset>'
        
        return PlainTextResponse(content=xml_content, media_type="application/xml")
    except Exception as e:
        logger.error(f"Error generating sitemap: {e}")
        return PlainTextResponse(
            content="<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!-- Error generating sitemap -->",
            media_type="application/xml"
        )


@app.get("/api/robots.txt", response_class=PlainTextResponse)
async def generate_robots():
    """Generate dynamic robots.txt from database"""
    try:
        # Fetch robots config
        config = await db.seo_robots.find_one({"_id": "robots_config"})
        
        if not config:
            # Return permissive default with sitemap from global SEO
            global_seo = await db.seo_global.find_one({"_id": "global_seo"}) or {}
            canonical = global_seo.get("canonical_domain", "").rstrip("/")
            content = "User-agent: *\nAllow: /\n"
            if canonical:
                content += f"\nSitemap: {canonical}/api/sitemap.xml\n"
        else:
            content = "User-agent: *\n"
            
            if config.get("allow_all", True):
                content += "Allow: /\n"
            
            for path in config.get("disallow_paths", []):
                content += f"Disallow: {path}\n"
            
            for path in config.get("allow_paths", []):
                content += f"Allow: {path}\n"
            
            if config.get("crawl_delay"):
                content += f"Crawl-delay: {config.get('crawl_delay')}\n"
            
            if config.get("custom_rules"):
                content += f"\n{config.get('custom_rules')}\n"
            
            # Sitemap URL: use configured or auto-generate from canonical domain
            sitemap_url = config.get("sitemap_url")
            if not sitemap_url:
                global_seo = await db.seo_global.find_one({"_id": "global_seo"}) or {}
                canonical = global_seo.get("canonical_domain", "").rstrip("/")
                if canonical:
                    sitemap_url = f"{canonical}/api/sitemap.xml"
            if sitemap_url:
                content += f"\nSitemap: {sitemap_url}\n"
        
        return PlainTextResponse(content=content, media_type="text/plain")
    except Exception as e:
        logger.error(f"Error generating robots.txt: {e}")
        return PlainTextResponse(content="User-agent: *\nAllow: /\n", media_type="text/plain")


# ===========================================
# SEO HTML TEMPLATE REWRITING
# ===========================================

@app.get("/api/seo/preview-html")
async def preview_seo_html(path: str = "/"):
    """
    Preview the SEO-injected HTML for any path.
    Use this endpoint to verify that meta tags, OG tags, structured data,
    and tracking scripts are correctly injected into the HTML response.
    Example: /api/seo/preview-html?path=/about
    """
    import time
    t0 = time.perf_counter()
    html_template = get_index_html_template()
    t1 = time.perf_counter()
    seo_data = await seo.get_seo_render_data(path=path)
    t2 = time.perf_counter()
    injected_html = inject_seo_into_html(html_template, seo_data)
    t3 = time.perf_counter()
    response = HTMLResponse(content=injected_html)
    response.headers["X-SEO-Template-Ms"] = f"{(t1-t0)*1000:.2f}"
    response.headers["X-SEO-DBFetch-Ms"] = f"{(t2-t1)*1000:.2f}"
    response.headers["X-SEO-Inject-Ms"] = f"{(t3-t2)*1000:.2f}"
    response.headers["X-SEO-Total-Ms"] = f"{(t3-t0)*1000:.2f}"
    return response


@app.get("/api/seo/validate-route")
async def validate_route_api(path: str = "/"):
    """
    Lightweight route validation endpoint.
    Returns {"valid": true/false} for a given path.
    Used by the frontend dev server proxy to decide whether to serve index.html or 404.
    """
    if is_blocked_path(path):
        return {"valid": False, "reason": "blocked"}
    valid = await is_valid_route(path, db)
    return {"valid": valid}


# ===========================================
# PRODUCTION FRONTEND SERVING WITH SEO INJECTION
# ===========================================

BUILD_DIR = Path("/app/frontend/build")


@app.get("/{full_path:path}")
async def serve_frontend_with_seo(request: Request, full_path: str):
    """
    Catch-all route with strict 404 enforcement.
    Only serves index.html for VERIFIED routes. Everything else gets HTTP 404.
    
    Order of checks:
    1. Redirects (301/302)
    2. Static files from build directory (JS, CSS, images)
    3. Route validation (whitelist + DB check)
    4. SEO injection for valid public routes
    5. 404 for everything else
    """
    request_path = "/" + full_path if full_path else "/"

    # 1. Check for 301/302 redirects
    redirect_info = await check_redirect(db, request_path)
    if redirect_info and redirect_info.get("new_path"):
        new_path = redirect_info["new_path"]
        if not new_path.startswith("http"):
            global_seo = await db.seo_global.find_one({"_id": "global_seo"}) or {}
            canonical_domain = global_seo.get("canonical_domain", "").rstrip("/")
            if canonical_domain:
                new_path = f"{canonical_domain}{new_path}"
        return RedirectResponse(
            url=new_path,
            status_code=redirect_info.get("status_code", 301),
        )

    # 2. Serve static files from build directory (JS, CSS, images, fonts)
    if full_path and BUILD_DIR.exists():
        file_path = BUILD_DIR / full_path
        if file_path.is_file() and ".." not in full_path:
            return FileResponse(file_path)

    # 3. STRICT ROUTE VALIDATION — only serve index.html for verified routes
    if not await is_valid_route(request_path, db):
        return HTMLResponse(content=NOT_FOUND_HTML, status_code=404)

    # 4. Read HTML template and inject SEO for valid public pages
    html_template = get_index_html_template()

    if should_inject_seo(request_path):
        try:
            seo_data = await seo.get_seo_render_data(path=request_path)
            html_template = inject_seo_into_html(html_template, seo_data)
        except Exception as e:
            logger.error(f"SEO injection failed for {request_path}: {e}")

    return HTMLResponse(content=html_template)
