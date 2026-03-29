"""
Tests for Sales Partners Commission Management
Tests: GET /api/admin/users (filter sales_partner), GET /api/products/categories, PUT /api/admin/users/{email}/commissions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": "admin@suitsindia.com", "password": "admin"}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json().get("access_token")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAdminAuthentication:
    """Test admin authentication"""
    
    def test_admin_login(self, api_client):
        """Test admin can login"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@suitsindia.com"
        assert data["user"]["is_admin"] == True


class TestGetUsers:
    """Test GET /api/admin/users endpoint"""
    
    def test_get_all_users(self, api_client, admin_token):
        """Test fetching all users"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_users_contain_commission_settings(self, api_client, admin_token):
        """Test that users include commission_settings field"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for user in data:
            assert "commission_settings" in user
    
    def test_sales_partners_exist(self, api_client, admin_token):
        """Test that sales_partner role users exist"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        sales_partners = [u for u in data if u.get("role") == "sales_partner"]
        assert len(sales_partners) > 0, "No sales partners found in the system"
    
    def test_test_sales_partner_exists(self, api_client, admin_token):
        """Test that the test sales partner exists"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        test_partner = [u for u in data if u.get("email") == "salespartner@test.com"]
        assert len(test_partner) == 1
        partner = test_partner[0]
        assert partner["role"] == "sales_partner"
        assert "commission_settings" in partner


class TestGetProductCategories:
    """Test GET /api/products/categories endpoint"""
    
    def test_get_categories(self, api_client, admin_token):
        """Test fetching product categories"""
        response = api_client.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_categories_contain_products(self, api_client, admin_token):
        """Test categories contain products array"""
        response = api_client.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for category in data:
            assert "products" in category
            assert "name" in category
            assert "id" in category
    
    def test_products_have_required_fields(self, api_client, admin_token):
        """Test products have id and name fields"""
        response = api_client.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for category in data:
            for product in category.get("products", []):
                assert "id" in product
                assert "name" in product


class TestUpdateCommissions:
    """Test PUT /api/admin/users/{email}/commissions endpoint"""
    
    def test_update_sales_partner_commissions(self, api_client, admin_token):
        """Test updating commission settings for sales partner"""
        commission_settings = {
            "monthly_retainer": 6000,
            "onboarding_commission": 1500,
            "commission_percentage": 10,
            "product_commissions": {
                "suits": 600,
                "jackets": 400,
                "pants": 200
            }
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/users/salespartner@test.com/commissions",
            json={"commission_settings": commission_settings},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "successfully" in data["message"].lower()
    
    def test_verify_commissions_persisted(self, api_client, admin_token):
        """Verify commission settings are saved correctly"""
        # First set specific values
        commission_settings = {
            "monthly_retainer": 7000,
            "onboarding_commission": 2000,
            "commission_percentage": 12,
            "product_commissions": {
                "suits": 700,
                "jackets": 500
            }
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/users/salespartner@test.com/commissions",
            json={"commission_settings": commission_settings},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        
        # Fetch and verify persistence
        get_response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        
        users = get_response.json()
        partner = [u for u in users if u.get("email") == "salespartner@test.com"][0]
        
        assert partner["commission_settings"]["monthly_retainer"] == 7000
        assert partner["commission_settings"]["onboarding_commission"] == 2000
        assert partner["commission_settings"]["commission_percentage"] == 12
        assert partner["commission_settings"]["product_commissions"]["suits"] == 700
        assert partner["commission_settings"]["product_commissions"]["jackets"] == 500
    
    def test_update_non_sales_partner_fails(self, api_client, admin_token):
        """Test updating commissions for non-sales partner returns error"""
        commission_settings = {
            "monthly_retainer": 1000
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/users/admin@suitsindia.com/commissions",
            json={"commission_settings": commission_settings},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 400 since admin is not a sales partner
        assert response.status_code == 400
        data = response.json()
        assert "not a sales partner" in data.get("detail", "").lower()
    
    def test_update_nonexistent_user_fails(self, api_client, admin_token):
        """Test updating commissions for non-existent user returns 404"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/users/nonexistent@test.com/commissions",
            json={"commission_settings": {"monthly_retainer": 1000}},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
    
    def test_unauthorized_access_fails(self, api_client):
        """Test that unauthorized access is denied"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/users/salespartner@test.com/commissions",
            json={"commission_settings": {"monthly_retainer": 1000}}
        )
        assert response.status_code == 401


class TestProductCommissionsCount:
    """Test product commissions count (Products Configured)"""
    
    def test_product_commissions_count_calculation(self, api_client, admin_token):
        """Test the product commissions count is calculated correctly"""
        # Set product commissions with some > 0 and some = 0
        commission_settings = {
            "monthly_retainer": 5000,
            "onboarding_commission": 1000,
            "commission_percentage": 8,
            "product_commissions": {
                "suits": 500,
                "jackets": 300,
                "pants": 0,  # This should not count
                "formal-shirts": 200,
                "casual-shirts": 0  # This should not count
            }
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/admin/users/salespartner@test.com/commissions",
            json={"commission_settings": commission_settings},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200
        
        # Fetch and verify
        get_response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        
        users = get_response.json()
        partner = [u for u in users if u.get("email") == "salespartner@test.com"][0]
        
        # Count products with commission > 0
        product_commissions = partner["commission_settings"].get("product_commissions", {})
        configured_count = len([k for k, v in product_commissions.items() if v > 0])
        
        # Should be 3 (suits, jackets, formal-shirts)
        assert configured_count == 3


class TestCleanup:
    """Reset test sales partner to original state"""
    
    def test_reset_sales_partner_commissions(self, api_client, admin_token):
        """Reset test sales partner to original commission settings"""
        commission_settings = {
            "monthly_retainer": 5000,
            "onboarding_commission": 1000,
            "commission_percentage": 8,
            "product_commissions": {
                "suits": 500,
                "jackets": 300,
                "pants": 150,
                "formal-shirts": 200
            }
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/admin/users/salespartner@test.com/commissions",
            json={"commission_settings": commission_settings},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
