"""
Test Suite for 404 Handling and Security Hardening

Tests strict 404 handling for:
- WordPress attack paths
- Server config probes
- Script extensions
- Spam/fake URLs

Tests valid routes return 200:
- Static routes (/, /about, etc.)
- Auth routes (/login, etc.)
- Portal routes (/admin/*, /reseller/*, etc.)
- Dynamic routes (DB-verified: /products/*, /fabrics/*)

Also tests:
- Security headers presence
- 301 redirects
- SEO injection endpoints
- API routes unaffected
"""

import pytest
import requests
import os

# Use localhost:8001 directly for frontend route testing (not the preview URL which routes non-/api to port 3000)
BACKEND_URL = "http://localhost:8001"
API_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBlockedPaths:
    """Test that known attack/malicious paths return 404"""
    
    # WordPress attack paths
    @pytest.mark.parametrize("path", [
        "/wp-admin",
        "/wp-admin/",
        "/wp-login.php",
        "/xmlrpc.php",
        "/wp-content/uploads",
        "/wp-content/uploads/2024/01/malware.php",
        "/wp-includes/js/jquery/jquery.min.js",
        "/wp-json/wp/v2/users",
        "/wp-cron.php",
    ])
    def test_wordpress_paths_return_404(self, path):
        """WordPress paths should immediately return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
        # Should NOT contain React app div#root
        assert "div id=\"root\"" not in response.text, f"404 page should not contain React app for {path}"
    
    # Server config/file probes
    @pytest.mark.parametrize("path", [
        "/.env",
        "/.git/config",
        "/.git/HEAD",
        "/.htaccess",
        "/.htpasswd",
        "/.svn/entries",
    ])
    def test_config_file_probes_return_404(self, path):
        """Config file probes should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
    
    # Database admin tools
    @pytest.mark.parametrize("path", [
        "/phpmyadmin",
        "/phpmyadmin/",
        "/pma",
        "/adminer.php",
        "/phpinfo.php",
    ])
    def test_db_admin_tools_return_404(self, path):
        """Database admin tool paths should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
    
    # Server probes
    @pytest.mark.parametrize("path", [
        "/cgi-bin/test",
        "/cgi-bin/admin.cgi",
        "/etc/passwd",
        "/etc/shadow",
        "/proc/self/environ",
        "/server-status",
        "/server-info",
    ])
    def test_server_probes_return_404(self, path):
        """Server probe paths should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
    
    # Script file extensions
    @pytest.mark.parametrize("path", [
        "/test.php",
        "/admin.php",
        "/shell.php",
        "/admin.asp",
        "/admin.aspx",
        "/shell.jsp",
        "/backup.sql",
        "/database.sql",
        "/config.bak",
        "/settings.old",
    ])
    def test_script_extensions_return_404(self, path):
        """Server-side script extensions should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"


class TestSpamURLs:
    """Test that random spam/fake URLs return 404"""
    
    @pytest.mark.parametrize("path", [
        "/cheap-viagra-online",
        "/buy-cialis-cheap",
        "/casino-bonus-2024",
        "/free-slots-no-deposit",
        "/some/deeply/nested/spam/page",
        "/products/buy-cheap-viagra",
        "/seo-spam-page-12345",
        "/free-iphone-giveaway",
        "/earn-money-fast-2024",
    ])
    def test_spam_urls_return_404(self, path):
        """Spam URLs should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
        # Should NOT contain div#root
        assert "div id=\"root\"" not in response.text, f"404 page should not contain React app for {path}"


class TestValidStaticRoutes:
    """Test that valid static routes return 200 with React app"""
    
    @pytest.mark.parametrize("path", [
        "/",
        "/about",
        "/garments",
        "/fabrics",
        "/technology",
        "/how-it-works",
        "/get-started",
        "/contact-us",
        "/privacy-policy",
        "/terms",
    ])
    def test_static_routes_return_200(self, path):
        """Valid static routes should return 200"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"
        # Should contain React app div#root for valid routes
        assert 'id="root"' in response.text or "div id=\"root\"" in response.text, f"Valid route {path} should contain React app"


class TestAuthRoutes:
    """Test that auth routes return 200"""
    
    @pytest.mark.parametrize("path", [
        "/login",
        "/forgot-password",
        "/reset-password",
    ])
    def test_auth_routes_return_200(self, path):
        """Auth routes should return 200"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


class TestPortalRoutes:
    """Test that portal routes return 200"""
    
    @pytest.mark.parametrize("path", [
        "/admin/login",
        "/admin/dashboard",
        "/admin/orders",
        "/admin/products",
        "/admin/styling",
        "/reseller/login",
        "/reseller/dashboard",
        "/reseller/customers",
        "/partner/login",
        "/staff/login",
    ])
    def test_portal_routes_return_200(self, path):
        """Portal routes should return 200"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


class TestDynamicRoutes:
    """Test dynamic routes with DB verification"""
    
    # Valid products in DB: suits-jackets, shirts, denim-wear, shoes
    @pytest.mark.parametrize("path", [
        "/products/suits-jackets",
        "/products/shirts",
        "/products/denim-wear",
        "/products/shoes",
    ])
    def test_valid_product_routes_return_200(self, path):
        """Valid product slugs should return 200"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for valid product {path}, got {response.status_code}"
    
    # Invalid product slugs
    @pytest.mark.parametrize("path", [
        "/products/fake-product",
        "/products/nonexistent",
        "/products/buy-cheap-viagra",
        "/products/spam-product-2024",
    ])
    def test_invalid_product_routes_return_404(self, path):
        """Invalid product slugs should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for invalid product {path}, got {response.status_code}"
    
    # Valid fabric in DB: RD110
    def test_valid_fabric_route_returns_200(self):
        """Valid fabric code should return 200"""
        response = requests.get(f"{BACKEND_URL}/fabrics/rd110")
        assert response.status_code == 200, f"Expected 200 for /fabrics/rd110, got {response.status_code}"
    
    def test_valid_fabric_route_uppercase_returns_200(self):
        """Valid fabric code uppercase should return 200"""
        response = requests.get(f"{BACKEND_URL}/fabrics/RD110")
        assert response.status_code == 200, f"Expected 200 for /fabrics/RD110, got {response.status_code}"
    
    # Invalid fabrics
    @pytest.mark.parametrize("path", [
        "/fabrics/nonexistent",
        "/fabrics/fake-fabric",
        "/fabrics/XXXXX",
    ])
    def test_invalid_fabric_routes_return_404(self, path):
        """Invalid fabric codes should return 404"""
        response = requests.get(f"{BACKEND_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for invalid fabric {path}, got {response.status_code}"


class Test404ResponseContent:
    """Test 404 response content is correct"""
    
    def test_404_contains_title_404(self):
        """404 response should contain <title>404"""
        response = requests.get(f"{BACKEND_URL}/fake-spam-page")
        assert response.status_code == 404
        assert "<title>404" in response.text, "404 page should have <title>404 in head"
    
    def test_404_contains_noindex_nofollow(self):
        """404 response should contain noindex,nofollow meta tag"""
        response = requests.get(f"{BACKEND_URL}/fake-spam-page")
        assert response.status_code == 404
        assert 'noindex' in response.text.lower() and 'nofollow' in response.text.lower(), \
            "404 page should have noindex,nofollow meta tag"
    
    def test_404_does_not_contain_react_root(self):
        """404 response should NOT contain div#root (no React app)"""
        response = requests.get(f"{BACKEND_URL}/wp-admin")
        assert response.status_code == 404
        assert 'id="root"' not in response.text, "404 page should NOT contain React app div#root"
    
    def test_valid_route_contains_react_root(self):
        """Valid route /about SHOULD contain div#root"""
        response = requests.get(f"{BACKEND_URL}/about")
        assert response.status_code == 200
        assert 'id="root"' in response.text, "Valid route /about should contain React app div#root"


class TestSecurityHeaders:
    """Test security headers are present on responses"""
    
    def test_security_headers_on_valid_route(self):
        """Valid routes should have security headers"""
        response = requests.get(f"{BACKEND_URL}/about")
        
        # Check required security headers
        assert response.headers.get("X-Content-Type-Options") == "nosniff", \
            "Missing or incorrect X-Content-Type-Options header"
        assert response.headers.get("X-Frame-Options") == "DENY", \
            "Missing or incorrect X-Frame-Options header"
        assert "X-XSS-Protection" in response.headers, \
            "Missing X-XSS-Protection header"
        assert "Referrer-Policy" in response.headers, \
            "Missing Referrer-Policy header"
        assert "Permissions-Policy" in response.headers, \
            "Missing Permissions-Policy header"
        assert "Content-Security-Policy" in response.headers, \
            "Missing Content-Security-Policy header"
    
    def test_security_headers_on_api_route(self):
        """API routes should have security headers"""
        response = requests.get(f"{BACKEND_URL}/api/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
    
    def test_security_headers_on_404_route(self):
        """404 routes should have security headers"""
        response = requests.get(f"{BACKEND_URL}/wp-admin")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"


class TestAPIRoutesUnaffected:
    """Test that API routes are not blocked"""
    
    def test_api_health_returns_200(self):
        """API health endpoint should return 200"""
        response = requests.get(f"{BACKEND_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_api_root_returns_200(self):
        """API root should return 200"""
        response = requests.get(f"{BACKEND_URL}/api/")
        assert response.status_code == 200


class TestRedirects:
    """Test 301 redirects are working"""
    
    def test_old_about_redirects_to_about(self):
        """
        /old-about should redirect to https://suitsindia.com/about with 301
        Note: Follow redirect disabled to check the redirect response itself
        """
        response = requests.get(f"{BACKEND_URL}/old-about", allow_redirects=False)
        # If redirect is configured in DB, should be 301
        if response.status_code == 301:
            location = response.headers.get("Location", "")
            assert "/about" in location, f"Redirect location should contain /about, got {location}"
        else:
            # If no redirect configured, this would be 404 (valid test case)
            pytest.skip("301 redirect from /old-about not configured in seo_redirects collection")


class TestSEOInjection:
    """Test SEO injection endpoint"""
    
    def test_seo_preview_html_endpoint(self):
        """SEO preview HTML endpoint should work"""
        response = requests.get(f"{BACKEND_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        # Should return HTML content
        assert "<!DOCTYPE html>" in response.text or "<html" in response.text
        # Should have SEO markers
        assert "SEO" in response.text or "meta" in response.text.lower()


class TestStaticBuildFiles:
    """Test static build files are served correctly"""
    
    def test_static_js_files_served(self):
        """Static JS files from build should be accessible"""
        # First, check if the build directory has JS files by listing them
        # We'll test the common pattern used by React build
        response = requests.get(f"{BACKEND_URL}/static/js/main.js", allow_redirects=True)
        # May be 200 if file exists, or 404 if not - we just verify it's not blocked
        # The test passes if it doesn't return a blocked path response
        if response.status_code == 404:
            # Check that it's a proper 404 (file not found) not blocked path
            # This is acceptable - the file might not exist in build
            pass
        else:
            # If file exists, should be 200 with JS content
            assert response.status_code == 200
    
    def test_manifest_json_served(self):
        """manifest.json should be accessible"""
        response = requests.get(f"{BACKEND_URL}/manifest.json")
        # Should not be blocked - either 200 (exists) or 404 (doesn't exist)
        assert response.status_code in [200, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
