"""
SEO System Tests
Tests for: preview-html injection, fallback hierarchy, redirect CRUD, sitemap, robots.txt
"""

import pytest
import requests
import os
import re

# Use the preview URL for API testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')
# Use localhost:8001 for catch-all route testing (direct backend access)
LOCALHOST_URL = "http://localhost:8001"

class TestSEOPreviewHTML:
    """Tests for /api/seo/preview-html endpoint - SEO injection into HTML"""
    
    def test_preview_html_home_page_has_title(self):
        """Test: GET /api/seo/preview-html?path=/ returns HTML with injected title"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check title is injected (should be Home | Suits India based on data)
        assert "<title>" in html
        assert "Suits India" in html
        print(f"PASS: Home page has title with 'Suits India'")
    
    def test_preview_html_home_page_has_meta_description(self):
        """Test: GET /api/seo/preview-html?path=/ has meta description"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check for meta description
        assert '<meta name="description" content="' in html
        print(f"PASS: Home page has meta description")
    
    def test_preview_html_home_page_has_og_tags(self):
        """Test: GET /api/seo/preview-html?path=/ has Open Graph tags"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check OG tags
        assert '<meta property="og:title"' in html
        assert '<meta property="og:description"' in html
        assert '<meta property="og:url"' in html
        assert '<meta property="og:type"' in html
        print(f"PASS: Home page has OG tags")
    
    def test_preview_html_home_page_has_twitter_cards(self):
        """Test: GET /api/seo/preview-html?path=/ has Twitter card tags"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check Twitter card tags
        assert '<meta name="twitter:card"' in html
        assert '<meta name="twitter:title"' in html
        print(f"PASS: Home page has Twitter card tags")
    
    def test_preview_html_home_page_has_canonical_url(self):
        """Test: GET /api/seo/preview-html?path=/ has canonical URL"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check canonical URL
        assert '<link rel="canonical" href="' in html
        assert 'suitsindia.com' in html
        print(f"PASS: Home page has canonical URL")
    
    def test_preview_html_home_page_has_structured_data(self):
        """Test: GET /api/seo/preview-html?path=/ has JSON-LD structured data"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check JSON-LD structured data
        assert '<script type="application/ld+json">' in html
        assert '"@context": "https://schema.org"' in html
        assert '"@type": "Organization"' in html
        print(f"PASS: Home page has JSON-LD structured data")
    
    def test_preview_html_home_page_has_ga4_script(self):
        """Test: GET /api/seo/preview-html?path=/ has GA4 tracking script"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check GA4 script (G-TESTID12345 was set in tracking config)
        assert 'googletagmanager.com/gtag/js' in html
        assert 'G-TESTID12345' in html
        print(f"PASS: Home page has GA4 tracking script")
    
    def test_preview_html_home_page_has_google_site_verification(self):
        """Test: GET /api/seo/preview-html?path=/ has google-site-verification meta"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check google-site-verification (test-verification-code-123 was set)
        assert '<meta name="google-site-verification" content="test-verification-code-123"' in html
        print(f"PASS: Home page has google-site-verification meta tag")
    
    def test_preview_html_about_page_has_page_level_overrides(self):
        """Test: GET /api/seo/preview-html?path=/about has page-level SEO overrides"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/about")
        assert response.status_code == 200
        
        html = response.text
        # Check page-level title override (About Our Master Tailors was set)
        assert "<title>About Our Master Tailors" in html
        # Check custom description
        assert "Learn about Suits India's legacy" in html or "master tailoring" in html.lower()
        print(f"PASS: About page has custom page-level SEO overrides")
    
    def test_preview_html_about_page_fallback_to_global_for_og_image(self):
        """Test: About page falls back to global OG image"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/about")
        assert response.status_code == 200
        
        html = response.text
        # Should have og:image (fallback from global since page doesn't specify one)
        assert '<meta property="og:image"' in html
        print(f"PASS: About page has OG image (fallback from global)")
    
    def test_preview_html_contact_page_has_title_and_canonical(self):
        """Test: GET /api/seo/preview-html?path=/contact-us has title and canonical"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/contact-us")
        assert response.status_code == 200
        
        html = response.text
        # Check title exists
        assert "<title>" in html
        assert "Contact" in html
        # Check canonical URL
        assert '<link rel="canonical" href="' in html
        assert 'contact-us' in html
        print(f"PASS: Contact page has title and canonical URL")
    
    def test_preview_html_has_root_div_untouched(self):
        """Test: The <div id='root'> is present and untouched in all injected HTML"""
        for path in ["/", "/about", "/contact-us"]:
            response = requests.get(f"{BASE_URL}/api/seo/preview-html?path={path}")
            assert response.status_code == 200
            
            html = response.text
            # Check root div is present
            assert '<div id="root">' in html
        print(f"PASS: Root div is present and untouched in all pages")
    
    def test_preview_html_has_react_bundle_untouched(self):
        """Test: React bundle script and CSS link tags are present"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Check React bundle script
        assert 'src="/static/js/main' in html
        # Check CSS link
        assert 'href="/static/css/main' in html
        print(f"PASS: React bundle and CSS links are present")
    
    def test_preview_html_no_duplicate_description_meta(self):
        """Test: No duplicate <meta name='description'> tags"""
        response = requests.get(f"{BASE_URL}/api/seo/preview-html?path=/")
        assert response.status_code == 200
        
        html = response.text
        # Count meta description tags
        count = html.count('<meta name="description"')
        assert count == 1, f"Expected 1 meta description, found {count}"
        print(f"PASS: Only 1 meta description tag present")


class TestSEOPortalPaths:
    """Tests for portal paths - should NOT get SEO injection via localhost catch-all"""
    
    def test_admin_path_no_seo_injection(self):
        """Test: /admin does NOT get SEO injection via localhost:8001"""
        response = requests.get(f"{LOCALHOST_URL}/admin")
        assert response.status_code == 200
        
        html = response.text
        # Should NOT have SEO injection markers
        assert '<!-- SEO INJECTION START -->' not in html
        print(f"PASS: /admin path does not have SEO injection")
    
    def test_login_path_no_seo_injection(self):
        """Test: /login does NOT get SEO injection via localhost:8001"""
        response = requests.get(f"{LOCALHOST_URL}/login")
        assert response.status_code == 200
        
        html = response.text
        # Should NOT have SEO injection markers
        assert '<!-- SEO INJECTION START -->' not in html
        print(f"PASS: /login path does not have SEO injection")
    
    def test_reseller_path_no_seo_injection(self):
        """Test: /reseller does NOT get SEO injection"""
        response = requests.get(f"{LOCALHOST_URL}/reseller")
        assert response.status_code == 200
        
        html = response.text
        # Should NOT have SEO injection markers
        assert '<!-- SEO INJECTION START -->' not in html
        print(f"PASS: /reseller path does not have SEO injection")
    
    def test_partner_path_no_seo_injection(self):
        """Test: /partner does NOT get SEO injection"""
        response = requests.get(f"{LOCALHOST_URL}/partner")
        assert response.status_code == 200
        
        html = response.text
        # Should NOT have SEO injection markers
        assert '<!-- SEO INJECTION START -->' not in html
        print(f"PASS: /partner path does not have SEO injection")


class TestAPIRoutesNotAffected:
    """Tests for API routes - should not be affected by catch-all"""
    
    def test_api_health_returns_json(self):
        """Test: GET /api/health returns JSON (API routes not affected)"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"PASS: /api/health returns JSON: {data}")
    
    def test_api_seo_global_returns_json(self):
        """Test: GET /api/seo/global returns correct JSON data"""
        response = requests.get(f"{BASE_URL}/api/seo/global")
        assert response.status_code == 200
        
        data = response.json()
        assert "site_title" in data
        assert data.get("site_title") == "Suits India"
        assert "canonical_domain" in data
        print(f"PASS: /api/seo/global returns correct JSON")


class TestStaticFileServing:
    """Tests for static file serving via catch-all from build directory"""
    
    def test_static_js_file_served(self):
        """Test: Static JS files served correctly from build directory (HTTP 200)"""
        response = requests.get(f"{LOCALHOST_URL}/static/js/main.5e91ca1a.js")
        assert response.status_code == 200
        assert 'javascript' in response.headers.get('content-type', '').lower() or len(response.text) > 0
        print(f"PASS: Static JS file served with status 200")
    
    def test_static_css_file_served(self):
        """Test: Static CSS files served correctly from build directory (HTTP 200)"""
        response = requests.get(f"{LOCALHOST_URL}/static/css/main.daa14de3.css")
        assert response.status_code == 200
        print(f"PASS: Static CSS file served with status 200")


class TestRedirectFeature:
    """Tests for 301/302 redirect functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token")
    
    def test_301_redirect_via_localhost(self):
        """Test: localhost:8001/old-about returns 301 redirect to /about"""
        response = requests.get(f"{LOCALHOST_URL}/old-about", allow_redirects=False)
        assert response.status_code == 301
        assert response.headers.get("location") == "/about"
        print(f"PASS: /old-about returns 301 redirect to /about")
    
    def test_redirect_crud_get_list(self, admin_token):
        """Test: GET /api/seo/redirects lists redirects (requires admin auth)"""
        response = requests.get(
            f"{BASE_URL}/api/seo/redirects",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        redirects = response.json()
        assert isinstance(redirects, list)
        # Check that /old-about redirect exists
        old_about_redirect = next((r for r in redirects if r.get("old_path") == "/old-about"), None)
        assert old_about_redirect is not None
        assert old_about_redirect.get("new_path") == "/about"
        print(f"PASS: GET /api/seo/redirects returns list with /old-about redirect")
    
    def test_redirect_crud_create_and_delete(self, admin_token):
        """Test: POST creates redirect, DELETE removes it"""
        # Create a test redirect
        create_response = requests.post(
            f"{BASE_URL}/api/seo/redirects",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "old_path": "/TEST_old-page",
                "new_path": "/TEST_new-page",
                "status_code": 301
            }
        )
        assert create_response.status_code == 200
        
        data = create_response.json()
        assert data.get("success") is True
        redirect_id = data.get("id")
        assert redirect_id is not None
        print(f"PASS: Created test redirect with id: {redirect_id}")
        
        # Verify it exists
        list_response = requests.get(
            f"{BASE_URL}/api/seo/redirects",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        redirects = list_response.json()
        test_redirect = next((r for r in redirects if r.get("old_path") == "/TEST_old-page"), None)
        assert test_redirect is not None
        print(f"PASS: Test redirect found in list")
        
        # Delete the test redirect
        delete_response = requests.delete(
            f"{BASE_URL}/api/seo/redirects/{redirect_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        assert delete_response.json().get("deleted") is True
        print(f"PASS: Test redirect deleted successfully")


class TestSitemapAndRobots:
    """Tests for sitemap.xml and robots.txt"""
    
    def test_sitemap_xml_returns_valid_xml(self):
        """Test: GET /api/sitemap.xml returns valid XML"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        content = response.text
        assert '<?xml version="1.0"' in content
        assert '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' in content
        assert '<url>' in content
        assert '<loc>' in content
        print(f"PASS: /api/sitemap.xml returns valid XML")
    
    def test_sitemap_xml_contains_pages(self):
        """Test: sitemap.xml contains home and static pages"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        content = response.text
        # Check for home page
        assert 'suitsindia.com/' in content
        # Check for about page
        assert 'suitsindia.com/about' in content
        print(f"PASS: sitemap.xml contains home and about pages")
    
    def test_robots_txt_returns_text(self):
        """Test: GET /api/robots.txt returns text content"""
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        assert response.status_code == 200
        
        content = response.text
        assert 'User-agent:' in content
        assert 'Allow:' in content or 'Disallow:' in content
        print(f"PASS: /api/robots.txt returns text content")


class TestFallbackHierarchy:
    """Tests for SEO fallback hierarchy: Page-Level -> Global -> Auto-generated"""
    
    def test_page_level_overrides_global(self):
        """Test: Page-level SEO overrides global settings"""
        # Get about page which has custom title
        response = requests.get(f"{BASE_URL}/api/seo/render?path=/about")
        assert response.status_code == 200
        
        data = response.json()
        # About page should have custom title "About Our Master Tailors"
        assert "About" in data.get("title", "")
        assert "Master Tailors" in data.get("title", "") or "About Our" in data.get("title", "")
        print(f"PASS: Page-level title overrides global: {data.get('title')}")
    
    def test_fallback_to_global_when_page_empty(self):
        """Test: Falls back to global when page-level is empty"""
        # Get render data for a page without specific SEO set
        response = requests.get(f"{BASE_URL}/api/seo/render?path=/garments")
        assert response.status_code == 200
        
        data = response.json()
        # Should have global meta description since page doesn't set one
        meta_desc = data.get("meta_description", "")
        # Should fallback to global description
        assert len(meta_desc) > 0
        print(f"PASS: Falls back to global meta_description: {meta_desc[:50]}...")
    
    def test_auto_generated_defaults(self):
        """Test: Auto-generated defaults for unknown pages"""
        # Get render data for an unknown path
        response = requests.get(f"{BASE_URL}/api/seo/render?path=/some-unknown-page")
        assert response.status_code == 200
        
        data = response.json()
        # Should have some canonical URL
        assert "canonical_url" in data
        # Should have robots directive
        assert "robots" in data
        print(f"PASS: Auto-generated defaults work for unknown pages")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
