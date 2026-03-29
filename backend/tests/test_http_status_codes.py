"""
HTTP Status Code Tests for SEO 404 Fix

Tests that:
1. Valid public routes return HTTP 200
2. Valid admin portal routes return HTTP 200 (not blocked by BLOCKED_SUBSTRINGS)
3. Valid reseller portal routes return HTTP 200
4. Invalid/spam URLs return HTTP 404
5. 404 response contains 'noindex' meta tag
6. 404 response contains '404' text
7. API health endpoint returns HTTP 200
8. Admin login flow works correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestValidPublicRoutes:
    """All valid public routes should return HTTP 200"""
    
    @pytest.mark.parametrize("route", [
        "/",
        "/about",
        "/garments",
        "/fabrics",
        "/technology",
        "/how-it-works",
        "/get-started",
        "/trunk-show",
        "/contact-us",
        "/login",
        "/privacy-policy",
    ])
    def test_public_route_returns_200(self, route):
        """Valid public routes should return HTTP 200"""
        response = requests.get(f"{BASE_URL}{route}", timeout=30)
        assert response.status_code == 200, f"Route {route} returned {response.status_code}, expected 200"


class TestValidAdminPortalRoutes:
    """Admin portal routes should return HTTP 200 (not blocked by BLOCKED_SUBSTRINGS)"""
    
    @pytest.mark.parametrize("route", [
        "/admin/login",
        "/admin/dashboard",
        "/admin/backup",          # Previously blocked by '/backup' substring
        "/admin/database-sync",   # Previously blocked by '/database' substring
        "/admin/seo",
        "/admin/orders",
        "/admin/products",
        "/admin/settings",
    ])
    def test_admin_route_returns_200(self, route):
        """Admin portal routes should return HTTP 200"""
        response = requests.get(f"{BASE_URL}{route}", timeout=30)
        assert response.status_code == 200, f"Admin route {route} returned {response.status_code}, expected 200"


class TestValidResellerPortalRoutes:
    """Reseller portal routes should return HTTP 200"""
    
    @pytest.mark.parametrize("route", [
        "/reseller/login",
        "/reseller/dashboard",
        "/reseller/orders",
        "/reseller/cart",
    ])
    def test_reseller_route_returns_200(self, route):
        """Reseller portal routes should return HTTP 200"""
        response = requests.get(f"{BASE_URL}{route}", timeout=30)
        assert response.status_code == 200, f"Reseller route {route} returned {response.status_code}, expected 200"


class TestInvalidSpamURLs:
    """Invalid/spam URLs should return HTTP 404"""
    
    @pytest.mark.parametrize("route", [
        "/random-spam-url",
        "/wp-admin",
        "/wp-login.php",
        "/foo/bar/baz",
        "/this-is-spam",
        "/random.php",
        "/.env",
        "/phpmyadmin",
        "/xmlrpc.php",
        "/nonexistent-page",
    ])
    def test_invalid_route_returns_404(self, route):
        """Invalid/spam URLs should return HTTP 404"""
        response = requests.get(f"{BASE_URL}{route}", timeout=30)
        assert response.status_code == 404, f"Invalid route {route} returned {response.status_code}, expected 404"


class Test404ResponseContent:
    """404 response should contain proper SEO blocking tags"""
    
    def test_404_contains_noindex_meta_tag(self):
        """404 response body should contain 'noindex' meta tag for SEO blocking"""
        response = requests.get(f"{BASE_URL}/random-spam-url-12345", timeout=30)
        assert response.status_code == 404
        content = response.text.lower()
        assert 'noindex' in content, "404 response should contain 'noindex' meta tag"
    
    def test_404_contains_404_text(self):
        """404 response body should contain '404' text"""
        response = requests.get(f"{BASE_URL}/random-spam-url-12345", timeout=30)
        assert response.status_code == 404
        assert '404' in response.text, "404 response should contain '404' text"


class TestAPIEndpoints:
    """API endpoints should work correctly"""
    
    def test_api_health_returns_200(self):
        """/api/health should return HTTP 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
    
    def test_admin_login_flow(self):
        """Admin login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"},
            timeout=30
        )
        assert response.status_code == 200, f"Admin login returned {response.status_code}"
        data = response.json()
        assert "access_token" in data or "token" in data, "Login response should contain token"


class TestBlockedPathsNotBlockingPortals:
    """Verify BLOCKED_SUBSTRINGS don't falsely block valid portal routes"""
    
    def test_admin_backup_not_blocked(self):
        """/admin/backup should NOT be blocked by '/backup' substring"""
        response = requests.get(f"{BASE_URL}/admin/backup", timeout=30)
        # Should return 200 (portal route), not 404 (blocked)
        assert response.status_code == 200, f"/admin/backup returned {response.status_code}, should be 200 (not blocked)"
    
    def test_admin_database_sync_not_blocked(self):
        """/admin/database-sync should NOT be blocked by '/database' substring"""
        response = requests.get(f"{BASE_URL}/admin/database-sync", timeout=30)
        # Should return 200 (portal route), not 404 (blocked)
        assert response.status_code == 200, f"/admin/database-sync returned {response.status_code}, should be 200 (not blocked)"
    
    def test_standalone_backup_is_blocked(self):
        """/backup (not under portal) should be blocked"""
        response = requests.get(f"{BASE_URL}/backup", timeout=30)
        assert response.status_code == 404, f"/backup returned {response.status_code}, should be 404 (blocked)"
    
    def test_standalone_database_is_blocked(self):
        """/database (not under portal) should be blocked"""
        response = requests.get(f"{BASE_URL}/database", timeout=30)
        assert response.status_code == 404, f"/database returned {response.status_code}, should be 404 (blocked)"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
