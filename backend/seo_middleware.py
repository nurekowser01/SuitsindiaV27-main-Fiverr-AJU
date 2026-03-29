"""
SEO HTML Template Rewriting Middleware

Injects SEO metadata into the index.html template for search engine crawlers.
This is the core of the CSR + Backend Injection architecture.

Only modifies:
  - <title> tag content
  - Adds meta/link/script tags before </head>
  - Adds scripts after <body> and before </body>

Does NOT modify:
  - <div id="root"> or any React mount point
  - React bundle <script> or <link> references
  - Existing non-SEO content or scripts
  - Authentication, payments, orders, or business logic
"""

import re
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ============================================
# HTML TEMPLATE CACHE
# ============================================
_html_cache = {"content": None, "mtime": 0, "path": None}


def get_index_html_template() -> str:
    """Read and cache the index.html template. Prefers build over public."""
    build_path = Path("/app/frontend/build/index.html")
    public_path = Path("/app/frontend/public/index.html")
    index_path = build_path if build_path.exists() else public_path

    if not index_path.exists():
        return "<html><head><title>Suits India</title></head><body><div id='root'></div></body></html>"

    mtime = index_path.stat().st_mtime
    if _html_cache["path"] != str(index_path) or _html_cache["mtime"] != mtime:
        _html_cache["content"] = index_path.read_text(encoding="utf-8")
        _html_cache["mtime"] = mtime
        _html_cache["path"] = str(index_path)

    return _html_cache["content"]


# ============================================
# PATH CLASSIFICATION
# ============================================

STATIC_EXTENSIONS = frozenset({
    '.js', '.css', '.map', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.webp', '.avif',
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    '.pdf', '.zip', '.gz', '.br', '.json', '.xml', '.txt',
})

NON_PUBLIC_PREFIXES = (
    '/api/', '/admin', '/reseller', '/partner', '/staff',
    '/login', '/forgot-password', '/reset-password',
    '/static/', '/sockjs-node/', '/ws', '/__webpack',
)


def should_inject_seo(path: str) -> bool:
    """Determine if a request path should receive SEO injection.
    Returns True only for public-facing pages (home, about, products, etc.)."""
    for prefix in NON_PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return False
    suffix = Path(path).suffix.lower()
    if suffix and suffix in STATIC_EXTENSIONS:
        return False
    return True


# ============================================
# HTML ESCAPING
# ============================================

def _esc_attr(text):
    """Escape text for use in HTML attribute values."""
    if not text:
        return ""
    return str(text).replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def _esc_content(text):
    """Escape text for use in HTML element content."""
    if not text:
        return ""
    return str(text).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


# ============================================
# CORE INJECTION FUNCTION
# ============================================

def inject_seo_into_html(html: str, seo_data: dict) -> str:
    """
    Inject SEO metadata into an HTML string.

    Takes the raw index.html content and a seo_data dict (from /api/seo/render),
    returns the modified HTML with all SEO tags injected.
    """
    if not seo_data:
        return html

    # Safety: don't double-inject
    if '<!-- SEO INJECTION START -->' in html:
        return html

    # --- 1. Replace <title> ---
    title = seo_data.get("title")
    if title:
        html = re.sub(
            r'<title>[^<]*</title>',
            f'<title>{_esc_content(title)}</title>',
            html,
            count=1,
        )

    # --- 2. Remove existing hardcoded description meta tag ---
    html = re.sub(r'<meta\s+name="description"\s+content="[^"]*"\s*/?\s*>', '', html)

    # --- 3. Build tags for <head> injection ---
    tags = []

    # Meta description
    if seo_data.get("meta_description"):
        tags.append(f'<meta name="description" content="{_esc_attr(seo_data["meta_description"])}" />')

    # Meta keywords
    if seo_data.get("meta_keywords"):
        tags.append(f'<meta name="keywords" content="{_esc_attr(seo_data["meta_keywords"])}" />')

    # Robots directive
    if seo_data.get("robots"):
        tags.append(f'<meta name="robots" content="{_esc_attr(seo_data["robots"])}" />')

    # Canonical URL
    if seo_data.get("canonical_url"):
        tags.append(f'<link rel="canonical" href="{_esc_attr(seo_data["canonical_url"])}" />')

    # Open Graph tags
    og = seo_data.get("og", {})
    for prop, key in [
        ("og:title", "title"), ("og:description", "description"),
        ("og:image", "image"), ("og:url", "url"),
        ("og:type", "type"), ("og:site_name", "site_name"),
    ]:
        val = og.get(key)
        if val:
            tags.append(f'<meta property="{prop}" content="{_esc_attr(val)}" />')

    # Twitter Card tags
    tw = seo_data.get("twitter", {})
    for name, key in [
        ("twitter:card", "card"), ("twitter:site", "site"),
        ("twitter:title", "title"), ("twitter:description", "description"),
        ("twitter:image", "image"),
    ]:
        val = tw.get(key)
        if val:
            tags.append(f'<meta name="{name}" content="{_esc_attr(val)}" />')

    # Site verification tags
    tracking = seo_data.get("tracking", {})
    if tracking.get("google_site_verification"):
        tags.append(f'<meta name="google-site-verification" content="{_esc_attr(tracking["google_site_verification"])}" />')
    if tracking.get("bing_site_verification"):
        tags.append(f'<meta name="msvalidate.01" content="{_esc_attr(tracking["bing_site_verification"])}" />')

    # JSON-LD Structured Data
    sd = seo_data.get("structured_data")
    if sd:
        items = sd if isinstance(sd, list) else [sd]
        for item in items:
            if item:
                tags.append(f'<script type="application/ld+json">{json.dumps(item, ensure_ascii=False)}</script>')

    # --- Tracking Scripts ---
    # Google Analytics 4
    if tracking.get("ga4_enabled") and tracking.get("ga4_measurement_id"):
        mid = _esc_attr(tracking["ga4_measurement_id"])
        tags.append(f'<script async src="https://www.googletagmanager.com/gtag/js?id={mid}"></script>')
        tags.append(
            f'<script>window.dataLayer=window.dataLayer||[];'
            f'function gtag(){{dataLayer.push(arguments)}}'
            f'gtag("js",new Date());gtag("config","{mid}");</script>'
        )

    # Google Tag Manager (head portion)
    gtm_id = None
    if tracking.get("gtm_enabled") and tracking.get("gtm_container_id"):
        gtm_id = _esc_attr(tracking["gtm_container_id"])
        tags.append(
            f"<script>(function(w,d,s,l,i){{w[l]=w[l]||[];w[l].push({{'gtm.start':"
            f"new Date().getTime(),event:'gtm.js'}});var f=d.getElementsByTagName(s)[0],"
            f"j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src="
            f"'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);"
            f"}})(window,document,'script','dataLayer','{gtm_id}');</script>"
        )

    # Meta Pixel (Facebook)
    if tracking.get("meta_pixel_enabled") and tracking.get("meta_pixel_id"):
        pid = _esc_attr(tracking["meta_pixel_id"])
        tags.append(
            f"<script>!function(f,b,e,v,n,t,s){{if(f.fbq)return;n=f.fbq=function()"
            f"{{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};"
            f"if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];"
            f"t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];"
            f"s.parentNode.insertBefore(t,s)}}(window,document,'script',"
            f"'https://connect.facebook.net/en_US/fbevents.js');"
            f"fbq('init','{pid}');fbq('track','PageView');</script>"
        )

    # LinkedIn Insight Tag
    if tracking.get("linkedin_enabled") and tracking.get("linkedin_partner_id"):
        lid = _esc_attr(tracking["linkedin_partner_id"])
        tags.append(
            f'<script type="text/javascript">_linkedin_partner_id="{lid}";'
            f'window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];'
            f'window._linkedin_data_partner_ids.push(_linkedin_partner_id);</script>'
            f'<script type="text/javascript">(function(l){{if(!l){{window.lintrk=function(a,b)'
            f'{{window.lintrk.q.push([a,b])}};window.lintrk.q=[]}}var s=document.getElementsByTagName("script")[0];'
            f'var b=document.createElement("script");b.type="text/javascript";b.async=true;'
            f'b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";'
            f's.parentNode.insertBefore(b,s);}})(window.lintrk);</script>'
        )

    # Custom head scripts (from global tracking config)
    if tracking.get("custom_head_scripts"):
        tags.append(tracking["custom_head_scripts"])

    # Page-specific custom head scripts
    if seo_data.get("page_custom_head_scripts"):
        tags.append(seo_data["page_custom_head_scripts"])

    # --- 4. Inject all tags before </head> ---
    if tags:
        block = '\n    <!-- SEO INJECTION START -->\n    ' + '\n    '.join(tags) + '\n    <!-- SEO INJECTION END -->\n    '
        html = html.replace('</head>', block + '</head>')

    # --- 5. Body-start scripts (right after <body>) ---
    body_start_parts = []
    if gtm_id:
        body_start_parts.append(
            f'<noscript><iframe src="https://www.googletagmanager.com/ns.html?id={gtm_id}" '
            f'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'
        )
    if tracking.get("custom_body_start_scripts"):
        body_start_parts.append(tracking["custom_body_start_scripts"])

    if body_start_parts:
        insert_text = '\n    '.join(body_start_parts)
        body_match = re.search(r'<body[^>]*>', html)
        if body_match:
            pos = body_match.end()
            html = html[:pos] + '\n    ' + insert_text + html[pos:]

    # --- 6. Body-end scripts (before </body>) ---
    body_end_parts = []
    if tracking.get("custom_body_end_scripts"):
        body_end_parts.append(tracking["custom_body_end_scripts"])

    if body_end_parts:
        insert_text = '\n    '.join(body_end_parts)
        html = html.replace('</body>', '    ' + insert_text + '\n</body>')

    return html


# ============================================
# REDIRECT CHECK
# ============================================

async def check_redirect(db, path: str):
    """Check if a 301/302 redirect is configured for this path.
    Returns {"new_path": str, "status_code": int} or None."""
    redirect = await db.seo_redirects.find_one({
        "old_path": path,
        "active": {"$ne": False}
    })
    if redirect and redirect.get("new_path"):
        return {
            "new_path": redirect["new_path"],
            "status_code": redirect.get("status_code", 301)
        }
    return None
