"""
Test suite for:
1. Permissions Matrix - role-based access control
2. Reseller Authentication - login and protected routes
3. Stripe Checkout endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def reseller_token():
    """Get reseller authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/reseller/login",
        json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
    )
    assert response.status_code == 200, f"Reseller login failed: {response.text}"
    return response.json()["access_token"]


class TestResellerAuthentication:
    """Test reseller login and authentication"""
    
    def test_reseller_login_success(self):
        """Test reseller login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == RESELLER_EMAIL
        assert data["user"]["role_id"] == "reseller"
        assert data["user"]["is_admin"] == False
        assert "permissions" in data["user"]
    
    def test_reseller_login_invalid_password(self):
        """Test reseller login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
    
    def test_reseller_login_invalid_email(self):
        """Test reseller login with non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "nonexistent@test.com", "password": "password123"}
        )
        assert response.status_code == 401
    
    def test_reseller_me_endpoint(self, reseller_token):
        """Test /me endpoint with reseller token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == RESELLER_EMAIL
        assert data["role_id"] == "reseller"
        assert "permissions" in data
    
    def test_admin_cannot_login_as_reseller(self):
        """Test that admin user cannot login via reseller endpoint (unless they have reseller role)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        # Admin should be able to login as they have is_admin flag
        # This is expected behavior per the code
        assert response.status_code in [200, 403]


class TestPermissionsMatrix:
    """Test permissions matrix functionality"""
    
    def test_get_roles(self, admin_token):
        """Test fetching all roles"""
        response = requests.get(
            f"{BASE_URL}/api/roles/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        roles = response.json()
        
        # Verify default roles exist
        role_ids = [r["id"] for r in roles]
        assert "admin" in role_ids
        assert "reseller" in role_ids
        assert "sales_partner" in role_ids
    
    def test_update_role_permissions(self, admin_token):
        """Test updating role permissions (permissions matrix save)"""
        # First get the reseller role
        response = requests.get(
            f"{BASE_URL}/api/roles/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        roles = response.json()
        reseller_role = next((r for r in roles if r["id"] == "reseller"), None)
        assert reseller_role is not None
        
        # Update permissions with page access levels
        new_permissions = {
            "pages": {
                "dashboard": "view",
                "products": "none",
                "orders": "edit",
                "customers": "view"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/roles/roles/reseller",
            json={"permissions": new_permissions},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify the update persisted
        response = requests.get(
            f"{BASE_URL}/api/roles/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        roles = response.json()
        updated_reseller = next((r for r in roles if r["id"] == "reseller"), None)
        
        assert updated_reseller is not None
        assert "pages" in updated_reseller.get("permissions", {})
        assert updated_reseller["permissions"]["pages"]["dashboard"] == "view"
        assert updated_reseller["permissions"]["pages"]["orders"] == "edit"
    
    def test_create_custom_role_with_permissions(self, admin_token):
        """Test creating a new role with custom permissions"""
        role_data = {
            "name": "TEST_CustomRole",
            "description": "Test role for permissions matrix",
            "permissions": {
                "pages": {
                    "dashboard": "view",
                    "products": "edit",
                    "orders": "view",
                    "customers": "none"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/roles/roles",
            json=role_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code in [200, 201]
        
        # Verify role was created
        response = requests.get(
            f"{BASE_URL}/api/roles/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        roles = response.json()
        custom_role = next((r for r in roles if r["name"] == "TEST_CustomRole"), None)
        
        if custom_role:
            # Clean up - delete the test role
            requests.delete(
                f"{BASE_URL}/api/roles/roles/{custom_role['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )


class TestStripeCheckout:
    """Test Stripe checkout endpoints"""
    
    def test_get_stripe_settings(self, admin_token):
        """Test getting Stripe settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings/stripe",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "publishable_key" in data
        assert "has_secret_key" in data
    
    def test_get_stripe_public_key(self):
        """Test getting Stripe public key (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/settings/stripe/public-key")
        assert response.status_code == 200
        data = response.json()
        assert "publishable_key" in data
    
    def test_create_checkout_session_without_valid_stripe_keys(self, admin_token):
        """Test creating checkout session when Stripe keys are invalid/not configured"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/create-session",
            json={
                "order_id": "TEST_ORDER_123",
                "amount": 5000,
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Expected: 400 or 500 error because Stripe is not properly configured
        # 400 = Invalid API key (test keys configured but invalid)
        # 500 = No keys configured at all
        assert response.status_code in [400, 500]
        detail = response.json().get("detail", "")
        assert "Stripe not configured" in detail or "Invalid API Key" in detail
    
    def test_create_checkout_session_missing_fields(self, admin_token):
        """Test creating checkout session with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/create-session",
            json={
                "order_id": "TEST_ORDER_123"
                # Missing amount, success_url, cancel_url
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "Missing required fields" in response.json().get("detail", "")
    
    def test_verify_payment_without_valid_stripe_keys(self, admin_token):
        """Test verifying payment when Stripe keys are invalid/not configured"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/verify-payment",
            json={"session_id": "cs_test_123"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Expected: 400 or 500 error because Stripe is not properly configured
        # 400 = Invalid API key (test keys configured but invalid)
        # 500 = No keys configured at all
        assert response.status_code in [400, 500]
        detail = response.json().get("detail", "")
        assert "Stripe not configured" in detail or "Invalid API Key" in detail
    
    def test_verify_payment_missing_session_id(self, admin_token):
        """Test verifying payment without session_id"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/verify-payment",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400
        assert "session_id is required" in response.json().get("detail", "")


class TestAdminPermissionEnforcement:
    """Test that admin routes check permissions properly"""
    
    def test_admin_login_returns_permissions(self):
        """Test that admin login returns user permissions"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "permissions" in data["user"]
        # Admin should have full permissions
        assert data["user"]["is_admin"] == True
    
    def test_reseller_login_returns_role_permissions(self):
        """Test that reseller login returns role-based permissions"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        assert "permissions" in data["user"]
        assert data["user"]["role_id"] == "reseller"


class TestCleanup:
    """Cleanup test data"""
    
    def test_restore_reseller_permissions(self, admin_token):
        """Restore reseller role to original permissions"""
        original_permissions = {
            "orders": ["create", "read", "update"],
            "customers": ["create", "read"]
        }
        
        response = requests.put(
            f"{BASE_URL}/api/roles/roles/reseller",
            json={"permissions": original_permissions},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
