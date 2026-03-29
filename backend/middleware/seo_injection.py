"""
SEO HTML Injection Middleware
Intercepts HTML page requests and injects SEO meta tags server-side
"""

import os
import re
import json
import httpx
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Static pages configuration
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


def get_default_global_seo():
    """Default global SEO settings"""
    return {
        "site_title": "Suits India",
        "site_title_separator": " | ",
        "site_title_suffix": "Suits India",
        "meta_description": "Premium custom tailoring and bespoke suits",
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
        "organization_schema": {}
    }


def get_default_tracking():
    """Default tracking settings"""
    return {
        "ga4_enabled": False,
        "ga4_measurement_id": "",
        "meta_pixel_enabled": False,
        "meta_pixel_id": "",
        "gtm_enabled": False,
        "gtm_container_id": "",
        "linkedin_enabled": False,
        "linkedin_partner_id": "",
        "google_site_verification": "",
        "bing_site_verification": "",
        "custom_head_scripts": "",
        "custom_body_start_scripts": "",
        "custom_body_end_scripts": ""
    }


async def get_seo_data_for_path(path: str) -> dict:
    """
    Fetch complete SEO data for a given path with fallback hierarchy:
    Page-Level → Global → Auto-generated
    """
    # Get global settings
    global_seo = await db.seo_global.find_one({"_id": "global_seo"})
    if not global_seo:
        global_seo = get_default_global_seo()
    
    # Get tracking config
    tracking = await db.seo_tracking.find_one({"_id": "tracking_config"})
    if not tracking:
        tracking = get_default_tracking()
    
    # Determine page type and slug from path
    page_type = "static"
    page_slug = "home"
    page_name = "Home"
    product_data = None
    fabric_data = None
    
    # Parse path
    clean_path = path.rstrip("/") or "/"
    
    if clean_path == "/":
        page_slug = "home"
        page_name = "Home"
    elif clean_path.startswith("/products/"):
        page_type = "product"
        page_slug = clean_path.split("/products/")[-1].split("/")[0].split("?")[0]
        # Fetch product data for schema
        product_data = await db.product_categories.find_one({"slug": page_slug})
        if not product_data:
            product_data = await db.product_categories.find_one({"name": {"$regex": page_slug.replace("-", " "), "$options": "i"}})
        page_name = product_data.get("name", page_slug.replace("-", " ").title()) if product_data else page_slug.replace("-", " ").title()
    elif clean_path.startswith("/fabrics/"):
        page_type = "fabric"
        page_slug = clean_path.split("/fabrics/")[-1].split("/")[0].split("?")[0]
        fabric_data = await db.fabrics.find_one({"code": {"$regex": f"^{page_slug}$", "$options": "i"}})
        page_name = fabric_data.get("name", page_slug.upper()) if fabric_data else page_slug.upper()
    elif clean_path.startswith("/categories/"):
        page_type = "category"
        page_slug = clean_path.split("/categories/")[-1].split("/")[0].split("?")[0]
        page_name = page_slug.replace("-", " ").title()
    else:
        # Match static pages
        for sp in STATIC_PAGES:
            if sp["path"] == clean_path:
                page_slug = sp["slug"]
                page_name = sp["name"]
                break
    
    # Get page-specific SEO
    page_seo = await db.seo_pages.find_one({
        "page_type": page_type,
        "page_slug": page_slug
    })
    if not page_seo:
        page_seo = {}
    
    # Build canonical URL
    canonical_domain = (global_seo.get("canonical_domain") or "").rstrip("/")
    
    # Title with fallback hierarchy
    title = page_seo.get("title") or ""
    if not title:
        title = page_name
    
    # Build full title with suffix
    full_title = title
    if title and global_seo.get("site_title_suffix"):
        separator = global_seo.get("site_title_separator", " | ")
        full_title = f"{title}{separator}{global_seo.get('site_title_suffix')}"
    elif not title:
        full_title = global_seo.get("site_title", "")
    
    # Meta description with fallback
    meta_description = page_seo.get("meta_description") or global_seo.get("meta_description") or f"{page_name} - Premium custom tailoring services"
    
    # Canonical URL
    canonical_url = page_seo.get("canonical_url") or f"{canonical_domain}{clean_path}"
    if not canonical_url.startswith("http") and canonical_domain:
        canonical_url = f"{canonical_domain}{clean_path}"
    
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
    
    # Build structured data
    structured_data = []
    
    # Organization schema
    if global_seo.get("structured_data_enabled", True):
        org_schema = global_seo.get("organization_schema", {})
        if org_schema.get("name"):
            org_ld = {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": org_schema.get("name"),
                "url": org_schema.get("url") or canonical_domain,
            }
            if org_schema.get("logo"):
                org_ld["logo"] = org_schema.get("logo")
            if org_schema.get("description"):
                org_ld["description"] = org_schema.get("description")
            if org_schema.get("contact_email") or org_schema.get("contact_phone"):
                org_ld["contactPoint"] = {
                    "@type": "ContactPoint",
                    "contactType": "customer service"
                }
                if org_schema.get("contact_email"):
                    org_ld["contactPoint"]["email"] = org_schema.get("contact_email")
                if org_schema.get("contact_phone"):
                    org_ld["contactPoint"]["telephone"] = org_schema.get("contact_phone")
            if org_schema.get("address", {}).get("street"):
                org_ld["address"] = {
                    "@type": "PostalAddress",
                    "streetAddress": org_schema["address"].get("street"),
                    "addressLocality": org_schema["address"].get("city"),
                    "addressRegion": org_schema["address"].get("state"),
                    "addressCountry": org_schema["address"].get("country"),
                    "postalCode": org_schema["address"].get("postal_code")
                }
            if org_schema.get("social_links"):
                org_ld["sameAs"] = org_schema.get("social_links")
            structured_data.append(org_ld)
    
    # Product schema for product pages
    if page_type == "product" and product_data:
        product_ld = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product_data.get("name", page_name),
            "description": page_seo.get("meta_description") or product_data.get("description") or meta_description,
            "brand": {
                "@type": "Brand",
                "name": global_seo.get("organization_schema", {}).get("name", "Suits India")
            },
            "category": product_data.get("category", "Apparel")
        }
        if product_data.get("image"):
            product_ld["image"] = product_data.get("image")
        if product_data.get("sku") or product_data.get("slug"):
            product_ld["sku"] = product_data.get("sku") or product_data.get("slug")
        structured_data.append(product_ld)
    
    # Fabric schema
    if page_type == "fabric" and fabric_data:
        fabric_ld = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": fabric_data.get("name", page_name),
            "description": page_seo.get("meta_description") or fabric_data.get("description") or f"{fabric_data.get('name', '')} - Premium fabric",
            "brand": {
                "@type": "Brand",
                "name": global_seo.get("organization_schema", {}).get("name", "Suits India")
            },
            "sku": fabric_data.get("code", page_slug),
            "category": "Fabrics"
        }
        if fabric_data.get("image"):
            fabric_ld["image"] = fabric_data.get("image")
        structured_data.append(fabric_ld)
    
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
        "tracking": tracking,
        "page_custom_head_scripts": page_seo.get("custom_head_scripts") or ""
    }


def generate_meta_tags(seo_data: dict) -> str:
    """Generate HTML meta tags string from SEO data"""
    tags = []
    
    # Title tag
    if seo_data.get("title"):
        tags.append(f'<title>{escape_html(seo_data["title"])}</title>')
    
    # Meta description
    if seo_data.get("meta_description"):
        tags.append(f'<meta name="description" content="{escape_html(seo_data["meta_description"])}" />')
    
    # Meta keywords
    if seo_data.get("meta_keywords"):
        tags.append(f'<meta name="keywords" content="{escape_html(seo_data["meta_keywords"])}" />')
    
    # Robots
    if seo_data.get("robots"):
        tags.append(f'<meta name="robots" content="{seo_data["robots"]}" />')
    
    # Canonical
    if seo_data.get("canonical_url"):
        tags.append(f'<link rel="canonical" href="{escape_html(seo_data["canonical_url"])}" />')
    
    # Open Graph
    og = seo_data.get("og", {})
    if og.get("title"):
        tags.append(f'<meta property="og:title" content="{escape_html(og["title"])}" />')
    if og.get("description"):
        tags.append(f'<meta property="og:description" content="{escape_html(og["description"])}" />')
    if og.get("image"):
        tags.append(f'<meta property="og:image" content="{escape_html(og["image"])}" />')
    if og.get("url"):
        tags.append(f'<meta property="og:url" content="{escape_html(og["url"])}" />')
    if og.get("type"):
        tags.append(f'<meta property="og:type" content="{og["type"]}" />')
    if og.get("site_name"):
        tags.append(f'<meta property="og:site_name" content="{escape_html(og["site_name"])}" />')
    
    # Twitter
    twitter = seo_data.get("twitter", {})
    if twitter.get("card"):
        tags.append(f'<meta name="twitter:card" content="{twitter["card"]}" />')
    if twitter.get("site"):
        tags.append(f'<meta name="twitter:site" content="{escape_html(twitter["site"])}" />')
    if twitter.get("title"):
        tags.append(f'<meta name="twitter:title" content="{escape_html(twitter["title"])}" />')
    if twitter.get("description"):
        tags.append(f'<meta name="twitter:description" content="{escape_html(twitter["description"])}" />')
    if twitter.get("image"):
        tags.append(f'<meta name="twitter:image" content="{escape_html(twitter["image"])}" />')
    
    return "\n    ".join(tags)


def generate_structured_data(seo_data: dict) -> str:
    """Generate JSON-LD structured data script tags"""
    structured_data = seo_data.get("structured_data", [])
    if not structured_data:
        return ""
    
    scripts = []
    for schema in structured_data:
        if schema:
            scripts.append(f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>')
    
    return "\n    ".join(scripts)


def generate_tracking_scripts(seo_data: dict) -> tuple:
    """
    Generate tracking scripts for head and body
    Returns: (head_scripts, body_start_scripts, body_end_scripts)
    """
    tracking = seo_data.get("tracking", {})
    head_scripts = []
    body_start_scripts = []
    body_end_scripts = []
    
    # Google Site Verification
    if tracking.get("google_site_verification"):
        head_scripts.append(f'<meta name="google-site-verification" content="{tracking["google_site_verification"]}" />')
    
    # Bing Site Verification
    if tracking.get("bing_site_verification"):
        head_scripts.append(f'<meta name="msvalidate.01" content="{tracking["bing_site_verification"]}" />')
    
    # Google Tag Manager - Head
    if tracking.get("gtm_enabled") and tracking.get("gtm_container_id"):
        gtm_id = tracking["gtm_container_id"]
        head_scripts.append(f'''<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':
new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
}})(window,document,'script','dataLayer','{gtm_id}');</script>
<!-- End Google Tag Manager -->''')
        
        # GTM noscript for body
        body_start_scripts.append(f'''<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={gtm_id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->''')
    
    # Google Analytics 4
    if tracking.get("ga4_enabled") and tracking.get("ga4_measurement_id"):
        ga_id = tracking["ga4_measurement_id"]
        head_scripts.append(f'''<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id={ga_id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', '{ga_id}');
</script>
<!-- End Google Analytics 4 -->''')
    
    # Meta Pixel (Facebook)
    if tracking.get("meta_pixel_enabled") and tracking.get("meta_pixel_id"):
        pixel_id = tracking["meta_pixel_id"]
        head_scripts.append(f'''<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->''')
    
    # LinkedIn Insight Tag
    if tracking.get("linkedin_enabled") and tracking.get("linkedin_partner_id"):
        li_id = tracking["linkedin_partner_id"]
        head_scripts.append(f'''<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "{li_id}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(l) {{
if (!l){{window.lintrk = function(a,b){{window.lintrk.q.push([a,b])}};
window.lintrk.q=[]}}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);}})();
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid={li_id}&fmt=gif" />
</noscript>
<!-- End LinkedIn Insight Tag -->''')
    
    # Custom head scripts
    if tracking.get("custom_head_scripts"):
        head_scripts.append(f'<!-- Custom Head Scripts -->\n{tracking["custom_head_scripts"]}\n<!-- End Custom Head Scripts -->')
    
    # Custom body start scripts
    if tracking.get("custom_body_start_scripts"):
        body_start_scripts.append(f'<!-- Custom Body Start Scripts -->\n{tracking["custom_body_start_scripts"]}\n<!-- End Custom Body Start Scripts -->')
    
    # Custom body end scripts
    if tracking.get("custom_body_end_scripts"):
        body_end_scripts.append(f'<!-- Custom Body End Scripts -->\n{tracking["custom_body_end_scripts"]}\n<!-- End Custom Body End Scripts -->')
    
    # Page-specific head scripts
    if seo_data.get("page_custom_head_scripts"):
        head_scripts.append(f'<!-- Page Custom Scripts -->\n{seo_data["page_custom_head_scripts"]}\n<!-- End Page Custom Scripts -->')
    
    return (
        "\n    ".join(head_scripts),
        "\n".join(body_start_scripts),
        "\n".join(body_end_scripts)
    )


def escape_html(text: str) -> str:
    """Escape HTML special characters"""
    if not text:
        return ""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;"))


async def inject_seo_into_html(html_content: str, path: str) -> str:
    """
    Inject SEO meta tags, structured data, and tracking scripts into HTML
    """
    # Fetch SEO data for the path
    seo_data = await get_seo_data_for_path(path)
    
    # Generate all SEO components
    meta_tags = generate_meta_tags(seo_data)
    structured_data = generate_structured_data(seo_data)
    head_scripts, body_start_scripts, body_end_scripts = generate_tracking_scripts(seo_data)
    
    # Combine all head content
    head_injection = f'''
    <!-- SEO Meta Tags - Server Injected -->
    {meta_tags}
    <!-- End SEO Meta Tags -->
    
    <!-- Structured Data -->
    {structured_data}
    <!-- End Structured Data -->
    
    <!-- Tracking Scripts -->
    {head_scripts}
    <!-- End Tracking Scripts -->
'''
    
    # Remove any existing title tag and meta description (from React Helmet placeholders)
    html_content = re.sub(r'<title>.*?</title>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
    html_content = re.sub(r'<meta\s+name=["\']description["\'][^>]*/?>', '', html_content, flags=re.IGNORECASE)
    
    # Inject head content before </head>
    html_content = re.sub(
        r'(</head>)',
        f'{head_injection}\\1',
        html_content,
        flags=re.IGNORECASE
    )
    
    # Inject body start scripts after <body...>
    if body_start_scripts:
        html_content = re.sub(
            r'(<body[^>]*>)',
            f'\\1\n{body_start_scripts}',
            html_content,
            flags=re.IGNORECASE
        )
    
    # Inject body end scripts before </body>
    if body_end_scripts:
        html_content = re.sub(
            r'(</body>)',
            f'{body_end_scripts}\n\\1',
            html_content,
            flags=re.IGNORECASE
        )
    
    return html_content
