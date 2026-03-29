"""
Content Editor API Tests
Tests for GET /api/settings/all-content and PUT /api/settings/all-content
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": "admin@suitsindia.com",
        "password": "admin"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestHealthEndpoint:
    """Basic health checks"""
    
    def test_api_health(self, api_client):
        """Test API is responding"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")


class TestContentEditorGetPublic:
    """Test GET /api/settings/all-content (public endpoint)"""
    
    def test_get_all_content_public(self, api_client):
        """Public endpoint to get all content"""
        response = api_client.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        # Should return content structure
        assert isinstance(data, dict)
        print(f"✅ GET all-content returned {len(data)} keys")
    
    def test_content_has_home_section(self, api_client):
        """Content should have home section"""
        response = api_client.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if 'home' in data:
            home = data['home']
            # Check for hero slides
            assert 'heroSlides' in home or 'whyChooseUs' in home
            print(f"✅ Home section found with keys: {list(home.keys())[:5]}...")
        else:
            print("⚠️ No home section in database yet (will be created on first save)")
    
    def test_content_has_about_section(self, api_client):
        """Content should have about section"""
        response = api_client.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if 'about' in data:
            about = data['about']
            assert 'heroTitle' in about or 'storyTitle' in about
            print(f"✅ About section found: heroTitle={about.get('heroTitle', 'N/A')[:50]}...")
        else:
            print("⚠️ No about section in database yet")
    
    def test_content_has_contact_section(self, api_client):
        """Content should have contact-us section"""
        response = api_client.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        if 'contact-us' in data:
            contact = data['contact-us']
            assert 'phone' in contact or 'email' in contact or 'heroTitle' in contact
            print(f"✅ Contact section found: phone={contact.get('phone', 'N/A')}")
        else:
            print("⚠️ No contact-us section in database yet")


class TestContentEditorAuthenticated:
    """Test PUT /api/settings/all-content (requires admin auth)"""
    
    def test_update_content_requires_auth(self, api_client):
        """PUT should require authentication"""
        response = api_client.put(f"{BASE_URL}/api/settings/all-content", json={
            "home": {"testField": "test"}
        }, headers={"Authorization": ""})  # No auth
        assert response.status_code in [401, 403]
        print("✅ PUT correctly requires authentication")
    
    def test_update_home_content(self, authenticated_client):
        """Admin can update home content"""
        unique_id = str(uuid.uuid4())[:8]
        test_title = f"TEST_PRODUCT_LINE_{unique_id}"
        
        # First get current content
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        # Update home section
        updated_content = {
            **current_content,
            "home": {
                **current_content.get("home", {}),
                "productLineTitle": test_title,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        print(f"✅ PUT all-content succeeded: {response.json()}")
        
        # Verify persistence
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("home", {}).get("productLineTitle") == test_title
        print(f"✅ Content persisted correctly: productLineTitle={test_title}")
    
    def test_update_hero_slides(self, authenticated_client):
        """Test updating hero slides text"""
        unique_id = str(uuid.uuid4())[:8]
        test_slide_title = f"TEST_HERO_{unique_id}"
        
        # Get current content
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        # Prepare hero slides
        home_content = current_content.get("home", {})
        hero_slides = home_content.get("heroSlides", [
            {"title": "Default Slide", "subtitle": "Default", "highlight": ""}
        ])
        
        # Update first slide's title
        if hero_slides:
            hero_slides[0]["title"] = test_slide_title
        
        updated_content = {
            **current_content,
            "home": {
                **home_content,
                "heroSlides": hero_slides,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        # Verify persistence
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("home", {}).get("heroSlides", [{}])[0].get("title") == test_slide_title
        print(f"✅ Hero slide title updated and persisted: {test_slide_title}")
    
    def test_update_contact_us_content(self, authenticated_client):
        """Test updating contact-us section"""
        unique_id = str(uuid.uuid4())[:8]
        test_phone = f"+91 TEST_{unique_id}"
        
        # Get current content
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        # Update contact-us section
        updated_content = {
            **current_content,
            "contact-us": {
                **current_content.get("contact-us", {}),
                "phone": test_phone,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        # Verify
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("contact-us", {}).get("phone") == test_phone
        print(f"✅ Contact phone updated: {test_phone}")
    
    def test_update_about_content(self, authenticated_client):
        """Test updating about section"""
        unique_id = str(uuid.uuid4())[:8]
        test_title = f"TEST_STORY_{unique_id}"
        
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        updated_content = {
            **current_content,
            "about": {
                **current_content.get("about", {}),
                "storyTitle": test_title,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("about", {}).get("storyTitle") == test_title
        print(f"✅ About storyTitle updated: {test_title}")
    
    def test_update_garments_content(self, authenticated_client):
        """Test updating garments section"""
        unique_id = str(uuid.uuid4())[:8]
        test_intro = f"TEST_JACKETS_INTRO_{unique_id}"
        
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        updated_content = {
            **current_content,
            "garments": {
                **current_content.get("garments", {}),
                "jacketsIntro": test_intro,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("garments", {}).get("jacketsIntro") == test_intro
        print(f"✅ Garments jacketsIntro updated: {test_intro}")
    
    def test_update_technology_content(self, authenticated_client):
        """Test updating technology section"""
        unique_id = str(uuid.uuid4())[:8]
        test_hero = f"TEST_TECH_HERO_{unique_id}"
        
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        updated_content = {
            **current_content,
            "technology": {
                **current_content.get("technology", {}),
                "heroTitle": test_hero,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("technology", {}).get("heroTitle") == test_hero
        print(f"✅ Technology heroTitle updated: {test_hero}")
    
    def test_update_how_it_works_content(self, authenticated_client):
        """Test updating how-it-works section"""
        unique_id = str(uuid.uuid4())[:8]
        test_process = f"TEST_PROCESS_{unique_id}"
        
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        updated_content = {
            **current_content,
            "how-it-works": {
                **current_content.get("how-it-works", {}),
                "processTitle": test_process,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("how-it-works", {}).get("processTitle") == test_process
        print(f"✅ How-it-works processTitle updated: {test_process}")
    
    def test_update_get_started_content(self, authenticated_client):
        """Test updating get-started section"""
        unique_id = str(uuid.uuid4())[:8]
        test_submit = f"TEST_SUBMIT_{unique_id}"
        
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        updated_content = {
            **current_content,
            "get-started": {
                **current_content.get("get-started", {}),
                "submitButton": test_submit,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        time.sleep(0.5)
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        data = response.json()
        
        assert data.get("get-started", {}).get("submitButton") == test_submit
        print(f"✅ Get-started submitButton updated: {test_submit}")


class TestContentPersistence:
    """Test that content changes persist after refresh"""
    
    def test_content_persists_after_multiple_gets(self, api_client, authenticated_client):
        """Content should persist across multiple GET requests"""
        unique_id = str(uuid.uuid4())[:8]
        test_title = f"PERSIST_TEST_{unique_id}"
        
        # Get current content
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        # Update
        updated_content = {
            **current_content,
            "home": {
                **current_content.get("home", {}),
                "whyChooseUsTitle": test_title,
            }
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=updated_content)
        assert response.status_code == 200
        
        # Multiple GETs to verify persistence
        for i in range(3):
            time.sleep(0.3)
            response = api_client.get(f"{BASE_URL}/api/settings/all-content")
            assert response.status_code == 200
            data = response.json()
            assert data.get("home", {}).get("whyChooseUsTitle") == test_title
        
        print(f"✅ Content persists after 3 consecutive GETs")


class TestCleanup:
    """Clean up test data"""
    
    def test_restore_default_values(self, authenticated_client):
        """Restore some test values back to defaults"""
        response = authenticated_client.get(f"{BASE_URL}/api/settings/all-content")
        current_content = response.json() if response.status_code == 200 else {}
        
        # Restore home section to reasonable defaults
        home = current_content.get("home", {})
        
        # Only restore if it contains TEST_ prefix
        if home.get("productLineTitle", "").startswith("TEST_"):
            home["productLineTitle"] = "Product Line"
        if home.get("whyChooseUsTitle", "").startswith("TEST_") or home.get("whyChooseUsTitle", "").startswith("PERSIST_"):
            home["whyChooseUsTitle"] = "Why Suits India ?"
        
        # Restore hero slides if needed
        hero_slides = home.get("heroSlides", [])
        if hero_slides and hero_slides[0].get("title", "").startswith("TEST_"):
            hero_slides[0]["title"] = "STYLE APP"
        
        current_content["home"] = home
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/all-content", json=current_content)
        assert response.status_code == 200
        print("✅ Test data cleaned up")
