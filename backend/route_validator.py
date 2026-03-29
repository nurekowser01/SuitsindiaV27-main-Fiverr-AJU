"""
Route Validator - Security Module

Validates incoming request paths against a whitelist of legitimate routes.
Unknown/malicious paths get HTTP 404 instead of the SPA's index.html.

This prevents:
- WordPress spam pages from returning 200
- Search engines indexing fake/spam URLs
- Attack path enumeration
"""

import re
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ============================================
# BLOCKED PATHS (immediate 404, no processing)
# ============================================
# WordPress attack paths
BLOCKED_SUBSTRINGS = (
    '/wp-admin', '/wp-login', '/wp-content', '/wp-includes',
    '/wp-json', '/wp-cron', '/wp-config', '/wp-signup',
    '/wp-trackback', '/wp-comments', '/wp-mail',
    '/xmlrpc.php', '/wlwmanifest.xml',
    # Server/config file probes
    '/.env', '/.git', '/.htaccess', '/.htpasswd', '/.svn',
    '/.well-known/security', '/.DS_Store',
    # Database admin tools
    '/phpmyadmin', '/pma', '/adminer', '/mysql', '/phpinfo',
    # Server probes
    '/cgi-bin', '/etc/passwd', '/etc/shadow', '/proc/',
    '/server-status', '/server-info',
    # Other CMS
    '/administrator/', '/joomla', '/drupal', '/magento',
    '/typo3', '/bitrix', '/modx',
    # Common attack vectors
    '/eval', '/exec', '/shell', '/cmd',
    '/backup', '/database', '/dump', '/sql',
)

# File extensions that indicate server-side scripts (should never exist in a React app)
BLOCKED_EXTENSIONS = (
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py.bak',
    '.sql', '.bak', '.old', '.orig', '.save', '.swp',
    '.config', '.ini', '.log', '.sh', '.bash',
)


def is_blocked_path(path: str) -> bool:
    """Check if a path matches known attack/spam patterns. Fast, no DB needed."""
    path_lower = path.lower()

    # Check blocked substrings
    for pattern in BLOCKED_SUBSTRINGS:
        if pattern in path_lower:
            return True

    # Check blocked file extensions
    suffix = Path(path_lower).suffix
    if suffix in BLOCKED_EXTENSIONS:
        return True

    # Block double-encoded / traversal attempts
    if '%2e%2e' in path_lower or '%252e' in path_lower:
        return True

    return False


# ============================================
# VALID ROUTE WHITELIST
# ============================================

# Exact-match public static routes (from App.js)
VALID_STATIC_ROUTES = frozenset({
    '/',
    '/about',
    '/garments',
    '/fabrics',
    '/technology',
    '/how-it-works',
    '/get-started',
    '/trunk-show',
    '/contact-us',
    '/privacy-policy',
    '/terms',
})

# Auth routes (valid but no SEO)
AUTH_ROUTES = frozenset({
    '/login',
    '/forgot-password',
    '/reset-password',
})

# Portal prefixes — all sub-paths are valid (behind auth)
PORTAL_PREFIXES = (
    '/admin',
    '/reseller',
    '/partner',
    '/staff',
)

# Dynamic route prefixes that need DB validation
DYNAMIC_PREFIXES = (
    '/products/',
    '/fabrics/',
    '/categories/',
)


async def is_valid_route(path: str, db) -> bool:
    """
    Validate if a request path corresponds to a legitimate application route.
    Returns True only for:
    - Whitelisted static routes
    - Auth routes
    - Portal routes (admin/reseller/partner/staff)
    - Dynamic routes with DB-verified slugs (products, fabrics, categories)
    """
    # 1. Exact match static routes
    if path in VALID_STATIC_ROUTES or path in AUTH_ROUTES:
        return True

    # 2. Portal routes (all sub-paths valid, behind auth)
    for prefix in PORTAL_PREFIXES:
        if path == prefix or path.startswith(prefix + '/'):
            return True

    # 3. Dynamic routes — validate slug exists in DB
    for prefix in DYNAMIC_PREFIXES:
        if path.startswith(prefix):
            slug = path[len(prefix):].rstrip('/')
            if not slug:
                return True  # Bare prefix like /products/ is valid
            return await _validate_dynamic_slug(db, prefix, slug)

    return False


async def _validate_dynamic_slug(db, prefix: str, slug: str) -> bool:
    """Check if a dynamic route slug exists in the database."""
    try:
        if prefix == '/products/':
            # Check by slug, id, or normalized name
            exists = await db.product_categories.find_one({
                "$or": [
                    {"slug": slug},
                    {"id": slug},
                    {"id": re.compile(f'^{re.escape(slug)}$', re.IGNORECASE)},
                ]
            })
            return exists is not None

        elif prefix == '/fabrics/':
            exists = await db.fabrics.find_one({
                "$or": [
                    {"slug": slug},
                    {"code": slug.upper()},
                    {"code": re.compile(f'^{re.escape(slug)}$', re.IGNORECASE)},
                ]
            })
            return exists is not None

        elif prefix == '/categories/':
            exists = await db.product_categories.find_one({
                "$or": [
                    {"slug": slug},
                    {"id": slug},
                ]
            })
            return exists is not None

    except Exception as e:
        logger.error(f"DB validation error for {prefix}{slug}: {e}")
        return False

    return False


# ============================================
# 404 HTML TEMPLATE
# ============================================

NOT_FOUND_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>404 - Page Not Found | Suits India</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0e17;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 520px;
        }
        .code {
            font-size: 7rem;
            font-weight: 800;
            color: #c9a962;
            line-height: 1;
            letter-spacing: -0.04em;
        }
        h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1rem 0 0.75rem;
            color: #f8fafc;
        }
        p {
            color: #94a3b8;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        a {
            display: inline-block;
            padding: 0.75rem 2rem;
            background: #c9a962;
            color: #0a0e17;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            border-radius: 6px;
            transition: background 0.2s;
        }
        a:hover { background: #b8963f; }
    </style>
</head>
<body>
    <div class="container">
        <div class="code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist or has been removed.</p>
        <a href="/">Back to Home</a>
    </div>
</body>
</html>"""
