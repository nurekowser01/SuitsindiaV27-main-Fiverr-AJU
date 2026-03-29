"""
SEO Management System - Backend Routes
Handles all SEO configuration: global settings, page-level SEO, tracking, sitemap, robots.txt
"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Request
from fastapi.responses import Response, PlainTextResponse
from datetime import datetime, timezone
from bson import ObjectId
from typing import Optional, List
import os
import re
import uuid
import base64

router = APIRouter(prefix="/seo", tags=["SEO Management"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT for admin auth
import jwt
SECRET_KEY = os.getenv("JWT_SECRET", "tailorstailor-secret-key-change-in-production")


def normalize_slug(text: str) -> str:
    """Convert any text to a URL-safe slug: lowercase, hyphen-separated, no special characters."""
    if not text:
        return ""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)   # Replace any non-alphanumeric run with a single hyphen
    slug = slug.strip('-')                      # Strip leading/trailing hyphens
    return slug

async def get_current_admin(authorization: str):
    """Verify admin token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": payload.get("sub")})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============================================
# DEFAULT SEO STRUCTURE (for initialization only)
# ============================================

def get_default_global_seo():
    """Default global SEO settings - stored in DB, not hardcoded in app"""
    return {
        "_id": "global_seo",
        "environment": "production",  # For future multi-env support
        "site_title": "",
        "site_title_separator": " | ",
        "site_title_suffix": "",
        "meta_description": "",
        "meta_keywords": "",
        "og_title": "",
        "og_description": "",
        "og_image": "",
        "og_type": "website",
        "twitter_card": "summary_large_image",
        "twitter_site": "",
        "canonical_domain": "",
        "default_index": True,
        "default_follow": True,
        "structured_data_enabled": True,
        "sitemap_enabled": True,
        "organization_schema": {
            "name": "",
            "logo": "",
            "url": "",
            "description": "",
            "contact_email": "",
            "contact_phone": "",
            "address": {
                "street": "",
                "city": "",
                "state": "",
                "country": "",
                "postal_code": ""
            },
            "social_links": []
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

def get_default_page_seo(page_type: str, page_slug: str):
    """Default page-level SEO structure"""
    return {
        "page_type": page_type,  # static, product, fabric, category
        "page_slug": page_slug,
        "environment": "production",
        "title": "",
        "meta_description": "",
        "meta_keywords": "",
        "canonical_url": "",
        "og_title": "",
        "og_description": "",
        "og_image": "",
        "index": None,  # None = use global default
        "follow": None,  # None = use global default
        "structured_data": {},
        "custom_head_scripts": "",
        "priority": 0.5,  # For sitemap
        "changefreq": "weekly",  # For sitemap
        "include_in_sitemap": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

def get_default_tracking():
    """Default tracking configuration"""
    return {
        "_id": "tracking_config",
        "environment": "production",
        "ga4_measurement_id": "",
        "ga4_enabled": False,
        "meta_pixel_id": "",
        "meta_pixel_enabled": False,
        "gtm_container_id": "",
        "gtm_enabled": False,
        "linkedin_partner_id": "",
        "linkedin_enabled": False,
        "google_site_verification": "",
        "bing_site_verification": "",
        "custom_head_scripts": "",
        "custom_body_start_scripts": "",
        "custom_body_end_scripts": "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

def get_default_robots():
    """Default robots.txt configuration"""
    return {
        "_id": "robots_config",
        "environment": "production",
        "allow_all": True,
        "disallow_paths": [],
        "allow_paths": [],
        "crawl_delay": None,
        "custom_rules": "",
        "sitemap_url": "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

# Static pages list - easily extendable
STATIC_PAGES = [
    {"slug": "home", "path": "/", "name": "Home"},
    {"slug": "about", "path": "/about", "name": "About Us"},
    {"slug": "contact", "path": "/contact-us", "name": "Contact Us"},
    {"slug": "garments", "path": "/garments", "name": "Garments"},
    {"slug": "technology", "path": "/technology", "name": "Technology"},
    {"slug": "how-it-works", "path": "/how-it-works", "name": "How It Works"},
    {"slug": "get-started", "path": "/get-started", "name": "Get Started"},
    {"slug": "privacy-policy", "path": "/privacy-policy", "name": "Privacy Policy"},
    {"slug": "terms", "path": "/terms", "name": "Terms & Conditions"},
]


# ============================================
# GLOBAL SEO SETTINGS
# ============================================

@router.get("/global")
async def get_global_seo():
    """Get global SEO settings (public - for HTML injection)"""
    settings = await db.seo_global.find_one({"_id": "global_seo"})
    if not settings:
        # Initialize with defaults
        defaults = get_default_global_seo()
        await db.seo_global.insert_one(defaults)
        settings = defaults
    
    # Remove MongoDB _id for JSON serialization
    if settings:
        settings["id"] = str(settings.pop("_id", "global_seo"))
    return settings


@router.put("/global")
async def update_global_seo(data: dict, authorization: str = Header(None)):
    """Update global SEO settings (admin only)"""
    await get_current_admin(authorization)
    
    data["updated_at"] = datetime.now(timezone.utc)
    data.pop("_id", None)
    data.pop("id", None)
    
    result = await db.seo_global.update_one(
        {"_id": "global_seo"},
        {"$set": data},
        upsert=True
    )
    
    return {"success": True, "message": "Global SEO settings updated"}


# ============================================
# PAGE-LEVEL SEO
# ============================================

@router.get("/pages")
async def get_all_page_seo(authorization: str = Header(None)):
    """Get all page SEO settings (admin)"""
    await get_current_admin(authorization)
    
    pages = await db.seo_pages.find({}).to_list(length=None)
    
    # Also include static pages that don't have custom SEO yet
    existing_slugs = {p.get("page_slug") for p in pages}
    
    result = []
    for page in pages:
        page["id"] = str(page.pop("_id"))
        result.append(page)
    
    # Add placeholders for static pages without SEO config
    for static_page in STATIC_PAGES:
        if static_page["slug"] not in existing_slugs:
            placeholder = get_default_page_seo("static", static_page["slug"])
            placeholder["id"] = None
            placeholder["page_name"] = static_page["name"]
            placeholder["page_path"] = static_page["path"]
            result.append(placeholder)
    
    return result


@router.get("/pages/static")
async def get_static_pages_list():
    """Get list of static pages available for SEO configuration"""
    return STATIC_PAGES


@router.get("/pages/{page_type}/{page_slug}")
async def get_page_seo(page_type: str, page_slug: str):
    """Get SEO settings for a specific page (public - for HTML injection)"""
    page_seo = await db.seo_pages.find_one({
        "page_type": page_type,
        "page_slug": page_slug
    })
    
    if page_seo:
        page_seo["id"] = str(page_seo.pop("_id"))
        return page_seo
    
    # Return default structure
    return get_default_page_seo(page_type, page_slug)


@router.put("/pages/{page_type}/{page_slug}")
async def update_page_seo(page_type: str, page_slug: str, data: dict, authorization: str = Header(None)):
    """Update SEO settings for a specific page (admin only)"""
    await get_current_admin(authorization)
    
    data["page_type"] = page_type
    data["page_slug"] = page_slug
    data["updated_at"] = datetime.now(timezone.utc)
    data.pop("_id", None)
    data.pop("id", None)
    
    # Upsert - create if doesn't exist
    result = await db.seo_pages.update_one(
        {"page_type": page_type, "page_slug": page_slug},
        {"$set": data, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    
    return {"success": True, "message": f"SEO settings for {page_type}/{page_slug} updated"}


@router.delete("/pages/{page_type}/{page_slug}")
async def delete_page_seo(page_type: str, page_slug: str, authorization: str = Header(None)):
    """Delete custom SEO settings for a page (reverts to defaults)"""
    await get_current_admin(authorization)
    
    result = await db.seo_pages.delete_one({
        "page_type": page_type,
        "page_slug": page_slug
    })
    
    return {"success": True, "deleted": result.deleted_count > 0}


# ============================================
# TRACKING & SCRIPTS
# ============================================

@router.get("/tracking")
async def get_tracking_config():
    """Get tracking configuration (public - for script injection)"""
    config = await db.seo_tracking.find_one({"_id": "tracking_config"})
    if not config:
        defaults = get_default_tracking()
        await db.seo_tracking.insert_one(defaults)
        config = defaults
    
    if config:
        config["id"] = str(config.pop("_id", "tracking_config"))
    return config


@router.put("/tracking")
async def update_tracking_config(data: dict, authorization: str = Header(None)):
    """Update tracking configuration (admin only)"""
    await get_current_admin(authorization)
    
    data["updated_at"] = datetime.now(timezone.utc)
    data.pop("_id", None)
    data.pop("id", None)
    
    await db.seo_tracking.update_one(
        {"_id": "tracking_config"},
        {"$set": data},
        upsert=True
    )
    
    return {"success": True, "message": "Tracking configuration updated"}


# ============================================
# ROBOTS.TXT CONFIGURATION
# ============================================

@router.get("/robots-config")
async def get_robots_config(authorization: str = Header(None)):
    """Get robots.txt configuration (admin)"""
    await get_current_admin(authorization)
    
    config = await db.seo_robots.find_one({"_id": "robots_config"})
    if not config:
        defaults = get_default_robots()
        await db.seo_robots.insert_one(defaults)
        config = defaults
    
    if config:
        config["id"] = str(config.pop("_id", "robots_config"))
    return config


@router.put("/robots-config")
async def update_robots_config(data: dict, authorization: str = Header(None)):
    """Update robots.txt configuration (admin only)"""
    await get_current_admin(authorization)
    
    data["updated_at"] = datetime.now(timezone.utc)
    data.pop("_id", None)
    data.pop("id", None)
    
    await db.seo_robots.update_one(
        {"_id": "robots_config"},
        {"$set": data},
        upsert=True
    )
    
    return {"success": True, "message": "Robots.txt configuration updated"}


# ============================================
# IMAGE UPLOAD FOR OG IMAGES
# ============================================

@router.post("/upload-image")
async def upload_og_image(file: UploadFile = File(...), authorization: str = Header(None)):
    """Upload OG image with recommended dimensions validation"""
    await get_current_admin(authorization)
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are allowed")
    
    # Read file
    content = await file.read()
    
    # Check file size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"og_{uuid.uuid4().hex}.{ext}"
    
    # Store in database as base64 (for simplicity - can be moved to cloud storage later)
    image_doc = {
        "filename": filename,
        "content_type": file.content_type,
        "data": base64.b64encode(content).decode("utf-8"),
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    result = await db.seo_images.insert_one(image_doc)
    
    # Return URL path for serving
    return {
        "success": True,
        "filename": filename,
        "url": f"/api/seo/images/{filename}",
        "size": len(content),
        "recommendation": "Recommended OG image size: 1200x630 pixels"
    }


@router.get("/images/{filename}")
async def get_og_image(filename: str):
    """Serve uploaded OG image"""
    image = await db.seo_images.find_one({"filename": filename})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    content = base64.b64decode(image["data"])
    return Response(
        content=content,
        media_type=image["content_type"],
        headers={"Cache-Control": "public, max-age=31536000"}
    )


# ============================================
# DYNAMIC SITEMAP GENERATION
# ============================================

@router.get("/sitemap-data")
async def get_sitemap_data():
    """Get data for sitemap generation"""
    global_seo = await db.seo_global.find_one({"_id": "global_seo"}) or {}
    
    if not global_seo.get("sitemap_enabled", True):
        return {"enabled": False, "urls": []}
    
    canonical_domain = global_seo.get("canonical_domain", "").rstrip("/")
    urls = []
    
    # Static pages
    for page in STATIC_PAGES:
        page_seo = await db.seo_pages.find_one({
            "page_type": "static",
            "page_slug": page["slug"]
        })
        
        if page_seo and not page_seo.get("include_in_sitemap", True):
            continue
        
        urls.append({
            "loc": f"{canonical_domain}{page['path']}",
            "lastmod": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "changefreq": page_seo.get("changefreq", "weekly") if page_seo else "weekly",
            "priority": page_seo.get("priority", 0.8 if page["slug"] == "home" else 0.5) if page_seo else (0.8 if page["slug"] == "home" else 0.5)
        })
    
    # Product pages
    products = await db.product_categories.find({}).to_list(length=None)
    for product in products:
        slug = product.get("slug") or product.get("id") or normalize_slug(product.get("name", ""))
        page_seo = await db.seo_pages.find_one({
            "page_type": "product",
            "page_slug": slug
        })
        
        if page_seo and not page_seo.get("include_in_sitemap", True):
            continue
            
        urls.append({
            "loc": f"{canonical_domain}/products/{slug}",
            "lastmod": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "changefreq": page_seo.get("changefreq", "weekly") if page_seo else "weekly",
            "priority": page_seo.get("priority", 0.7) if page_seo else 0.7
        })
    
    # Fabric pages
    fabrics = await db.fabrics.find({}).to_list(length=None)
    for fabric in fabrics:
        slug = fabric.get("slug") or normalize_slug(fabric.get("code", ""))
        page_seo = await db.seo_pages.find_one({
            "page_type": "fabric",
            "page_slug": slug
        })
        
        if page_seo and not page_seo.get("include_in_sitemap", True):
            continue
            
        urls.append({
            "loc": f"{canonical_domain}/fabrics/{slug}",
            "lastmod": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "changefreq": page_seo.get("changefreq", "monthly") if page_seo else "monthly",
            "priority": page_seo.get("priority", 0.6) if page_seo else 0.6
        })
    
    return {"enabled": True, "urls": urls, "canonical_domain": canonical_domain}


# ============================================
# SEO RENDERING DATA (for HTML injection)
# ============================================

@router.get("/render")
async def get_seo_render_data(path: str = "/"):
    """
    Get complete SEO data for a specific path - used by HTML injection middleware.
    Implements fallback hierarchy: Page-Level → Global Defaults → Auto-generated
    """
    # Get global settings
    global_seo = await db.seo_global.find_one({"_id": "global_seo"}) or get_default_global_seo()
    
    # Get tracking config
    tracking = await db.seo_tracking.find_one({"_id": "tracking_config"}) or get_default_tracking()
    
    # Determine page type and slug from path
    page_type = "static"
    page_slug = "home"
    
    # Parse path
    path = path.rstrip("/") or "/"
    
    if path == "/":
        page_slug = "home"
    elif path.startswith("/products/"):
        page_type = "product"
        raw_slug = path.split("/products/")[-1].split("/")[0]
        page_slug = normalize_slug(raw_slug) if raw_slug != raw_slug.lower() or any(c in raw_slug for c in '&%+ ') else raw_slug
    elif path.startswith("/fabrics/"):
        page_type = "fabric"
        raw_slug = path.split("/fabrics/")[-1].split("/")[0]
        page_slug = normalize_slug(raw_slug) if raw_slug != raw_slug.lower() or any(c in raw_slug for c in '&%+ ') else raw_slug
    elif path.startswith("/categories/"):
        page_type = "category"
        raw_slug = path.split("/categories/")[-1].split("/")[0]
        page_slug = normalize_slug(raw_slug) if raw_slug != raw_slug.lower() or any(c in raw_slug for c in '&%+ ') else raw_slug
    else:
        # Match static pages
        for sp in STATIC_PAGES:
            if sp["path"] == path:
                page_slug = sp["slug"]
                break
    
    # Get page-specific SEO
    page_seo = await db.seo_pages.find_one({
        "page_type": page_type,
        "page_slug": page_slug
    }) or {}
    
    # Fetch product/fabric data for auto-generation
    product_data = None
    if page_type == "product":
        # Match by: slug field → id field → normalized name
        product_data = await db.product_categories.find_one({"slug": page_slug})
        if not product_data:
            product_data = await db.product_categories.find_one({"id": page_slug})
        if not product_data:
            all_products = await db.product_categories.find({}).to_list(length=None)
            for p in all_products:
                p_slug = p.get("slug") or p.get("id") or normalize_slug(p.get("name", ""))
                if p_slug == page_slug:
                    product_data = p
                    break
    
    fabric_data = None
    if page_type == "fabric":
        fabric_data = await db.fabrics.find_one({"slug": page_slug})
        if not fabric_data:
            fabric_data = await db.fabrics.find_one({"code": page_slug.upper()})
    
    # Build final SEO data with fallback hierarchy
    canonical_domain = global_seo.get("canonical_domain", "").rstrip("/")
    
    # Title with fallback: Page-Level → Auto-generated from DB → Global
    title = page_seo.get("title") or ""
    if not title and page_type == "static":
        for sp in STATIC_PAGES:
            if sp["slug"] == page_slug:
                title = sp["name"]
                break
    elif not title and page_type == "product" and product_data:
        title = f"Custom {product_data.get('name', page_slug.replace('-', ' ').title())}"
    elif not title and page_type == "fabric" and fabric_data:
        title = f"{fabric_data.get('name', page_slug.upper())} Fabric"
    elif not title and page_type in ("product", "fabric", "category"):
        title = page_slug.replace("-", " ").title()
    
    # Add site title suffix if configured
    full_title = title
    if title and global_seo.get("site_title_suffix"):
        full_title = f"{title}{global_seo.get('site_title_separator', ' | ')}{global_seo.get('site_title_suffix')}"
    elif not title and global_seo.get("site_title"):
        full_title = global_seo.get("site_title")
    
    # Meta description with fallback: Page-Level → Auto-generated from DB description → Global
    meta_description = page_seo.get("meta_description") or ""
    if not meta_description and page_type == "product" and product_data:
        db_desc = product_data.get("description", "")
        if db_desc and len(db_desc) > 10:
            # Use actual product description from DB, truncated to ~155 chars
            meta_description = (db_desc[:152] + "...") if len(db_desc) > 155 else db_desc
        else:
            product_name = product_data.get("name", page_slug.replace("-", " ").title())
            meta_description = f"Shop custom {product_name} tailored to your exact measurements. Premium fabrics, expert craftsmanship."
    elif not meta_description and page_type == "fabric" and fabric_data:
        db_desc = fabric_data.get("description", "")
        if db_desc and len(db_desc) > 10:
            meta_description = (db_desc[:152] + "...") if len(db_desc) > 155 else db_desc
        else:
            fabric_name = fabric_data.get("name", page_slug.upper())
            fabric_code = fabric_data.get("code", "")
            meta_description = f"Explore {fabric_name} ({fabric_code}) - premium fabric for custom tailoring."
    if not meta_description:
        meta_description = global_seo.get("meta_description") or ""
    
    # Canonical URL - always use normalized slug for clean URLs
    normalized_path = path
    if page_type == "product":
        normalized_path = f"/products/{page_slug}"
    elif page_type == "fabric":
        normalized_path = f"/fabrics/{page_slug}"
    elif page_type == "category":
        normalized_path = f"/categories/{page_slug}"
    canonical_url = page_seo.get("canonical_url") or f"{canonical_domain}{normalized_path}"
    
    # OG tags with fallback
    og_title = page_seo.get("og_title") or title or global_seo.get("og_title") or full_title
    og_description = page_seo.get("og_description") or meta_description or global_seo.get("og_description") or ""
    og_image = page_seo.get("og_image") or global_seo.get("og_image") or ""
    
    # Make OG image absolute URL
    if og_image and not og_image.startswith("http"):
        og_image = f"{canonical_domain}{og_image}"
    
    # Index/Follow with fallback
    index = page_seo.get("index") if page_seo.get("index") is not None else global_seo.get("default_index", True)
    follow = page_seo.get("follow") if page_seo.get("follow") is not None else global_seo.get("default_follow", True)
    
    robots_content = []
    robots_content.append("index" if index else "noindex")
    robots_content.append("follow" if follow else "nofollow")
    
    # Build structured data if enabled
    structured_data = None
    if global_seo.get("structured_data_enabled", True):
        org_schema = global_seo.get("organization_schema", {})
        org_structured = None
        if org_schema.get("name"):
            org_structured = {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": org_schema.get("name"),
                "url": org_schema.get("url") or canonical_domain,
                "logo": org_schema.get("logo"),
                "description": org_schema.get("description"),
                "contactPoint": {
                    "@type": "ContactPoint",
                    "email": org_schema.get("contact_email"),
                    "telephone": org_schema.get("contact_phone")
                }
            }
            if org_schema.get("address", {}).get("street"):
                org_structured["address"] = {
                    "@type": "PostalAddress",
                    "streetAddress": org_schema["address"].get("street"),
                    "addressLocality": org_schema["address"].get("city"),
                    "addressRegion": org_schema["address"].get("state"),
                    "addressCountry": org_schema["address"].get("country"),
                    "postalCode": org_schema["address"].get("postal_code")
                }
            if org_schema.get("social_links"):
                org_structured["sameAs"] = org_schema.get("social_links")
        
        # Auto-generate Product schema for product pages
        product_structured = None
        if page_type == "product" and product_data:
            product_name = product_data.get("name", page_slug.replace("-", " ").title())
            product_structured = {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": f"Custom {product_name}",
                "description": meta_description,
                "url": f"{canonical_domain}{path}",
                "brand": {
                    "@type": "Brand",
                    "name": org_schema.get("name") or "Suits India"
                },
                "category": "Clothing > Custom Tailoring",
                "manufacturer": {
                    "@type": "Organization",
                    "name": org_schema.get("name") or "Suits India"
                }
            }
            if og_image:
                product_structured["image"] = og_image
            # Add offers if product has pricing info
            if product_data.get("base_price"):
                product_structured["offers"] = {
                    "@type": "Offer",
                    "priceCurrency": "USD",
                    "price": str(product_data.get("base_price")),
                    "availability": "https://schema.org/InStock",
                    "url": f"{canonical_domain}{path}"
                }
            else:
                product_structured["offers"] = {
                    "@type": "Offer",
                    "availability": "https://schema.org/InStock",
                    "url": f"{canonical_domain}{path}",
                    "priceSpecification": {
                        "@type": "PriceSpecification",
                        "priceCurrency": "USD"
                    }
                }
        
        # Combine structured data
        if org_structured and product_structured:
            structured_data = [org_structured, product_structured]
        elif product_structured:
            structured_data = product_structured
        elif org_structured:
            structured_data = org_structured
    
    # Merge page-specific structured data
    if page_seo.get("structured_data"):
        if structured_data:
            # Create array of structured data
            structured_data = [structured_data, page_seo.get("structured_data")]
        else:
            structured_data = page_seo.get("structured_data")
    
    return {
        "title": full_title,
        "meta_description": meta_description,
        "meta_keywords": page_seo.get("meta_keywords") or global_seo.get("meta_keywords") or "",
        "canonical_url": canonical_url,
        "robots": ", ".join(robots_content),
        "og": {
            "title": og_title,
            "description": og_description,
            "image": og_image,
            "url": canonical_url,
            "type": global_seo.get("og_type", "website"),
            "site_name": global_seo.get("site_title") or ""
        },
        "twitter": {
            "card": global_seo.get("twitter_card", "summary_large_image"),
            "site": global_seo.get("twitter_site") or "",
            "title": og_title,
            "description": og_description,
            "image": og_image
        },
        "structured_data": structured_data,
        "tracking": {
            "ga4_enabled": tracking.get("ga4_enabled", False),
            "ga4_measurement_id": tracking.get("ga4_measurement_id") or "",
            "meta_pixel_enabled": tracking.get("meta_pixel_enabled", False),
            "meta_pixel_id": tracking.get("meta_pixel_id") or "",
            "gtm_enabled": tracking.get("gtm_enabled", False),
            "gtm_container_id": tracking.get("gtm_container_id") or "",
            "linkedin_enabled": tracking.get("linkedin_enabled", False),
            "linkedin_partner_id": tracking.get("linkedin_partner_id") or "",
            "google_site_verification": tracking.get("google_site_verification") or "",
            "bing_site_verification": tracking.get("bing_site_verification") or "",
            "custom_head_scripts": tracking.get("custom_head_scripts") or "",
            "custom_body_start_scripts": tracking.get("custom_body_start_scripts") or "",
            "custom_body_end_scripts": tracking.get("custom_body_end_scripts") or ""
        },
        "page_custom_head_scripts": page_seo.get("custom_head_scripts") or ""
    }


# ============================================
# 301/302 REDIRECT MANAGEMENT
# ============================================

@router.get("/redirects")
async def get_redirects(authorization: str = Header(None)):
    """Get all redirect rules (admin only)"""
    await get_current_admin(authorization)
    redirects = await db.seo_redirects.find({}).to_list(length=None)
    for r in redirects:
        r["id"] = str(r.pop("_id"))
    return redirects


@router.post("/redirects")
async def create_redirect(data: dict, authorization: str = Header(None)):
    """Create a redirect rule (admin only)"""
    await get_current_admin(authorization)
    old_path = data.get("old_path", "").strip()
    new_path = data.get("new_path", "").strip()
    if not old_path or not new_path:
        raise HTTPException(status_code=400, detail="Both old_path and new_path are required")
    doc = {
        "old_path": old_path,
        "new_path": new_path,
        "status_code": data.get("status_code", 301),
        "active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await db.seo_redirects.insert_one(doc)
    return {"success": True, "id": str(result.inserted_id)}


@router.delete("/redirects/{redirect_id}")
async def delete_redirect(redirect_id: str, authorization: str = Header(None)):
    """Delete a redirect rule (admin only)"""
    await get_current_admin(authorization)
    result = await db.seo_redirects.delete_one({"_id": ObjectId(redirect_id)})
    return {"success": True, "deleted": result.deleted_count > 0}
