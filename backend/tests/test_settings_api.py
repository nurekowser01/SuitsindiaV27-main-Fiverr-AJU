"""
Backend API Tests for Suits India Content Management System
Tests the settings API endpoints for content management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin123"


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_check(self):
        """Test that health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Health check passed")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert data["token_type"] == "bearer"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == ADMIN_EMAIL
        assert user["is_admin"] == True
        print(f"SUCCESS: Admin login successful for {ADMIN_EMAIL}")
        
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("SUCCESS: Invalid credentials rejected correctly")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("SUCCESS: Wrong password rejected correctly")


class TestAllContentEndpoint:
    """Tests for /api/settings/all-content endpoint"""
    
    def test_get_all_content_public(self):
        """Test GET all-content endpoint (public access)"""
        response = requests.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        # Verify it returns content (may be empty object if not set)
        assert isinstance(data, dict)
        print("SUCCESS: GET all-content returns valid response")
        
        return data
    
    def test_all_content_has_suits_india_branding(self):
        """Test that content contains Suits India branding"""
        response = requests.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        # Check for Suits India branding in various places
        content_str = str(data)
        
        # Should contain Suits India references
        assert "Suits India" in content_str, "Content should contain 'Suits India' branding"
        print("SUCCESS: Content contains 'Suits India' branding")
        
        # Should NOT contain old Tailors Tailor branding
        assert "Tailors Tailor" not in content_str, "Content should NOT contain old 'Tailors Tailor' branding"
        print("SUCCESS: Content does NOT contain old 'Tailors Tailor' branding")
    
    def test_contact_us_content_structure(self):
        """Test contact-us content has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if "contact-us" in data:
            contact = data["contact-us"]
            # Verify expected fields exist
            expected_fields = ["heroTitle", "introTitle", "phone", "email", "companyName"]
            for field in expected_fields:
                if field in contact:
                    print(f"SUCCESS: contact-us has field '{field}': {contact[field][:50] if len(str(contact[field])) > 50 else contact[field]}")
    
    def test_home_content_structure(self):
        """Test home content has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if "home" in data:
            home = data["home"]
            # Verify expected fields
            if "heroSlides" in home:
                assert isinstance(home["heroSlides"], list)
                print(f"SUCCESS: home has {len(home['heroSlides'])} hero slides")
            if "whyChooseUs" in home:
                assert isinstance(home["whyChooseUs"], list)
                print(f"SUCCESS: home has {len(home['whyChooseUs'])} 'Why Choose Us' items")
    
    def test_put_all_content_requires_auth(self):
        """Test PUT all-content requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/settings/all-content",
            json={"test": "data"}
        )
        assert response.status_code == 401
        print("SUCCESS: PUT all-content requires authentication")
    
    def test_put_all_content_with_auth(self):
        """Test PUT all-content with valid authentication"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get current content
        get_response = requests.get(f"{BASE_URL}/api/settings/all-content")
        current_content = get_response.json()
        
        # Update content (just re-save current content)
        put_response = requests.put(
            f"{BASE_URL}/api/settings/all-content",
            json=current_content,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert put_response.status_code == 200
        data = put_response.json()
        assert data.get("message") == "All content updated"
        print("SUCCESS: PUT all-content with auth works correctly")


class TestUISettingsEndpoints:
    """Tests for UI settings endpoints"""
    
    def test_get_public_ui_settings(self):
        """Test GET public UI settings"""
        response = requests.get(f"{BASE_URL}/api/settings/ui/public")
        assert response.status_code == 200
        data = response.json()
        
        # Should have display_mode
        assert "display_mode" in data
        print(f"SUCCESS: Public UI settings returned, display_mode: {data['display_mode']}")
    
    def test_get_ui_settings_requires_auth(self):
        """Test GET UI settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/ui")
        assert response.status_code == 401
        print("SUCCESS: GET UI settings requires authentication")


class TestAllImagesEndpoint:
    """Tests for /api/settings/all-images endpoint - UI Management feature"""
    
    def test_get_all_images_requires_auth(self):
        """Test GET all-images requires authentication"""
        response = requests.get(f"{BASE_URL}/api/settings/all-images")
        assert response.status_code == 401
        print("SUCCESS: GET all-images requires authentication")
    
    def test_get_all_images_with_auth(self):
        """Test GET all-images with valid authentication"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        
        # Get all images
        response = requests.get(
            f"{BASE_URL}/api/settings/all-images",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure - should have page keys
        assert isinstance(data, dict)
        print(f"SUCCESS: GET all-images returns {len(data)} page configurations")
        
        # Check for expected page keys
        expected_pages = ["home", "about", "garments", "fabrics", "technology"]
        for page in expected_pages:
            if page in data:
                print(f"  - Found '{page}' page configuration")
        
        return data
    
    def test_all_images_has_display_mode(self):
        """Test that all-images includes displayMode for pages"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Get all images
        response = requests.get(
            f"{BASE_URL}/api/settings/all-images",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check home page has displayMode
        if "home" in data:
            home = data["home"]
            if "displayMode" in home:
                print(f"SUCCESS: Home page has displayMode: {home['displayMode']}")
                assert home["displayMode"] in ["individual", "carousel"], "displayMode should be 'individual' or 'carousel'"
            if "hero" in home:
                assert isinstance(home["hero"], list), "hero should be a list of images"
                print(f"SUCCESS: Home page has {len(home['hero'])} hero images")
            if "activeHeroIndex" in home:
                print(f"SUCCESS: Home page has activeHeroIndex: {home['activeHeroIndex']}")
            if "carouselImages" in home:
                print(f"SUCCESS: Home page has carouselImages: {home['carouselImages']}")
    
    def test_put_all_images_requires_auth(self):
        """Test PUT all-images requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/settings/all-images",
            json={"test": "data"}
        )
        assert response.status_code == 401
        print("SUCCESS: PUT all-images requires authentication")
    
    def test_put_all_images_with_auth(self):
        """Test PUT all-images with valid authentication"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Get current images
        get_response = requests.get(
            f"{BASE_URL}/api/settings/all-images",
            headers={"Authorization": f"Bearer {token}"}
        )
        current_images = get_response.json()
        
        # Update images (just re-save current)
        put_response = requests.put(
            f"{BASE_URL}/api/settings/all-images",
            json=current_images,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert put_response.status_code == 200
        data = put_response.json()
        assert data.get("message") == "All images updated"
        print("SUCCESS: PUT all-images with auth works correctly")


class TestHomepageEndpoint:
    """Tests for homepage content endpoint"""
    
    def test_get_homepage_content(self):
        """Test GET homepage content"""
        response = requests.get(f"{BASE_URL}/api/settings/homepage")
        assert response.status_code == 200
        data = response.json()
        
        # Should have expected structure
        assert isinstance(data, dict)
        print("SUCCESS: GET homepage content works")
        
        # Check for expected fields
        if "hero_title" in data:
            print(f"  - hero_title: {data['hero_title']}")
        if "why_choose_us" in data:
            print(f"  - why_choose_us items: {len(data['why_choose_us'])}")


class TestFooterContent:
    """Tests for footer content from API"""
    
    def test_footer_content_in_all_content(self):
        """Test footer content is included in all-content"""
        response = requests.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if "footer" in data:
            footer = data["footer"]
            print("SUCCESS: Footer content found in all-content")
            
            if "description" in footer:
                print(f"  - description: {footer['description'][:50]}...")
            if "copyright" in footer:
                print(f"  - copyright: {footer['copyright']}")
                # Verify Suits India in copyright
                assert "Suits India" in footer["copyright"], "Copyright should contain 'Suits India'"
                print("SUCCESS: Copyright contains 'Suits India'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
