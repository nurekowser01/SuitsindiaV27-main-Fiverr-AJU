"""
Test Suite: 404 URL Security and Route Validation
Tests the fix for invalid/spam URLs returning HTTP 404 instead of 200.

This test suite verifies:
- Invalid URLs return HTTP 404
- Valid public routes return HTTP 200
- Auth routes return HTTP 200
- Admin/portal routes return HTTP 200
- WordPress/attack paths return HTTP 404
- 404 page contains 'Page Not Found' and noindex meta
- Valid pages contain React app div#root
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestInvalidURLsReturn404:
    """Test that invalid/spam URLs return HTTP 404"""
    
    @pytest.mark.parametrize("path", [
        "/random-spam-test",
        "/this-does-not-exist",
        "/nonexistent-page-123",
        "/buy-cheap-viagra-online",
        "/best-casino-games-free",
    ])
    def test_spam_urls_return_404(self, path):
        """Spam/random URLs should return 404, not 200"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for {path}, got {response.status_code}"
    
    @pytest.mark.parametrize("path", [
        "/wp-admin",
        "/wp-admin/login.php",
        "/wp-login.php",
        "/xmlrpc.php",
        "/wp-content/uploads/backdoor.php",
        "/wp-includes/version.php",
    ])
    def test_wordpress_paths_return_404(self, path):
        """WordPress attack paths should return 404"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for WordPress path {path}, got {response.status_code}"
    
    @pytest.mark.parametrize("path", [
        "/phpmyadmin",
        "/pma",
        "/adminer.php",
        "/phpinfo.php",
        "/.env",
        "/.git/config",
        "/.htaccess",
    ])
    def test_security_sensitive_paths_return_404(self, path):
        """Security-sensitive paths should return 404"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 404, f"Expected 404 for security path {path}, got {response.status_code}"


class TestValidPublicRoutesReturn200:
    """Test that valid public routes return HTTP 200"""
    
    @pytest.mark.parametrize("path", [
        "/",
        "/about",
        "/garments",
        "/fabrics",
        "/technology",
        "/how-it-works",
        "/get-started",
        "/trunk-show",
        "/contact-us",
        "/privacy-policy",
        "/terms",
    ])
    def test_public_routes_return_200(self, path):
        """Valid public routes should return 200"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


class TestAuthRoutesReturn200:
    """Test that auth routes return HTTP 200"""
    
    @pytest.mark.parametrize("path", [
        "/login",
        "/forgot-password",
    ])
    def test_auth_routes_return_200(self, path):
        """Auth routes should return 200"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


class TestPortalRoutesReturn200:
    """Test that admin/portal routes return HTTP 200"""
    
    @pytest.mark.parametrize("path", [
        "/admin/dashboard",
        "/admin/orders",
        "/reseller/orders",
        "/reseller/dashboard",
        "/partner/dashboard",
        "/staff/dashboard",
    ])
    def test_portal_routes_return_200(self, path):
        """Portal routes should return 200 (authentication handled by JS)"""
        response = requests.get(f"{BASE_URL}{path}")
        assert response.status_code == 200, f"Expected 200 for {path}, got {response.status_code}"


class TestAPIEndpointsWork:
    """Test that API endpoints are not affected"""
    
    def test_health_endpoint(self):
        """/api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_validate_route_endpoint_valid(self):
        """/api/seo/validate-route should validate valid routes"""
        response = requests.get(f"{BASE_URL}/api/seo/validate-route?path=/about")
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") is True
    
    def test_validate_route_endpoint_invalid(self):
        """/api/seo/validate-route should reject invalid routes"""
        response = requests.get(f"{BASE_URL}/api/seo/validate-route?path=/fake-route-xyz")
        assert response.status_code == 200
        data = response.json()
        assert data.get("valid") is False


class Test404PageContent:
    """Test 404 page content and SEO properties"""
    
    def test_404_page_contains_page_not_found(self):
        """404 page should contain 'Page Not Found'"""
        response = requests.get(f"{BASE_URL}/random-spam-test")
        assert response.status_code == 404
        assert "Page Not Found" in response.text
    
    def test_404_page_has_noindex_meta(self):
        """404 page should have noindex,nofollow meta tag"""
        response = requests.get(f"{BASE_URL}/random-spam-test")
        assert response.status_code == 404
        assert 'noindex' in response.text.lower()
        assert 'nofollow' in response.text.lower()
    
    def test_404_page_does_not_have_react_root(self):
        """404 page should NOT have div#root (React app)"""
        response = requests.get(f"{BASE_URL}/random-spam-test")
        assert response.status_code == 404
        assert 'id="root"' not in response.text


class TestValidPagesHaveReactApp:
    """Test that valid pages have React app"""
    
    def test_homepage_has_react_root(self):
        """Homepage should have div#root"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        assert 'id="root"' in response.text
    
    def test_about_page_has_react_root(self):
        """/about should have div#root"""
        response = requests.get(f"{BASE_URL}/about")
        assert response.status_code == 200
        assert 'id="root"' in response.text


class TestSecurityHeaders:
    """Test that security headers are present on 404 responses"""
    
    def test_404_has_security_headers(self):
        """404 responses should have security headers"""
        response = requests.get(f"{BASE_URL}/random-spam-test")
        assert response.status_code == 404
        
        # Check key security headers
        headers = response.headers
        assert headers.get("x-content-type-options") == "nosniff"
        assert headers.get("x-frame-options") == "DENY"


# Run all tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
