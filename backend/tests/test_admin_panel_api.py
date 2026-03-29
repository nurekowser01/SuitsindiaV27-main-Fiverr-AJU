"""
Admin Panel API Tests
Tests for: Admin Auth, Order Management, User Management, Roles, Stripe Settings, Marketing Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com')

# Admin credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("user", {}).get("is_admin") == True, "User is not admin"
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print(f"✓ Invalid password correctly rejected")
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint returns admin user"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json().get("access_token")
        
        # Then check /me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert data.get("email") == ADMIN_EMAIL
        assert data.get("is_admin") == True
        print(f"✓ Auth/me returns correct admin user")


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json().get("access_token")


class TestAdminOrderManagement:
    """Test admin order management endpoints"""
    
    def test_get_all_orders_admin(self, admin_token):
        """Test fetching all orders as admin"""
        response = requests.get(f"{BASE_URL}/api/orders/admin/all", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin can fetch all orders ({len(data)} orders)")
    
    def test_get_orders_by_status(self, admin_token):
        """Test filtering orders by status"""
        for status in ["wip", "placed", "processing"]:
            response = requests.get(f"{BASE_URL}/api/orders/admin/all", 
                params={"status": status},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed for status {status}: {response.text}"
        print(f"✓ Admin can filter orders by status")
    
    def test_update_order_status(self, admin_token):
        """Test updating order status"""
        # First get an order
        orders_response = requests.get(f"{BASE_URL}/api/orders/admin/all", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        orders = orders_response.json()
        
        if not orders:
            pytest.skip("No orders to test status update")
        
        order_id = orders[0].get("order_id")
        original_status = orders[0].get("status")
        
        # Update status
        new_status = "processing" if original_status != "processing" else "placed"
        response = requests.patch(f"{BASE_URL}/api/orders/admin/{order_id}/status",
            json={"status": new_status},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        # Restore original status
        requests.patch(f"{BASE_URL}/api/orders/admin/{order_id}/status",
            json={"status": original_status},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Admin can update order status")
    
    def test_admin_update_order_full(self, admin_token):
        """Test full order update including admin comments"""
        orders_response = requests.get(f"{BASE_URL}/api/orders/admin/all", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        orders = orders_response.json()
        
        if not orders:
            pytest.skip("No orders to test full update")
        
        order = orders[0]
        order_id = order.get("order_id")
        
        # Update with admin comments
        update_data = {
            "admin_comments": "TEST_Admin comment from pytest",
            "payment_method": "bank_transfer",
            "payment_status": "pending"
        }
        
        response = requests.put(f"{BASE_URL}/api/orders/admin/{order_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update order: {response.text}"
        
        # Verify update
        updated_order = response.json()
        assert updated_order.get("admin_comments") == "TEST_Admin comment from pytest"
        print(f"✓ Admin can update order with comments and payment info")


class TestAdminUserManagement:
    """Test admin user management endpoints"""
    
    def test_get_all_users(self, admin_token):
        """Test fetching all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify admin user exists
        admin_user = next((u for u in data if u.get("email") == ADMIN_EMAIL), None)
        assert admin_user is not None, "Admin user not found in list"
        assert admin_user.get("is_admin") == True
        print(f"✓ Admin can fetch all users ({len(data)} users)")
    
    def test_create_user(self, admin_token):
        """Test creating a new user"""
        test_email = "TEST_newuser@example.com"
        
        # First delete if exists (cleanup from previous test)
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        existing = next((u for u in users_response.json() if u.get("email") == test_email), None)
        if existing:
            requests.delete(f"{BASE_URL}/api/admin/users/{existing['id']}", headers={
                "Authorization": f"Bearer {admin_token}"
            })
        
        # Create new user
        response = requests.post(f"{BASE_URL}/api/admin/users",
            json={
                "email": test_email,
                "password": "testpass123",
                "full_name": "Test User",
                "phone": "+91 9876543210",
                "company": "Test Company",
                "payment_methods": {"bank_transfer": True, "stripe": True},
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        data = response.json()
        assert "id" in data, "No id in response"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{data['id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"✓ Admin can create new users")
    
    def test_update_user(self, admin_token):
        """Test updating a user"""
        test_email = "TEST_updateuser@example.com"
        
        # Create user first
        create_response = requests.post(f"{BASE_URL}/api/admin/users",
            json={
                "email": test_email,
                "password": "testpass123",
                "full_name": "Original Name"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test user: {create_response.text}")
        
        user_id = create_response.json().get("id")
        
        # Update user
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}",
            json={
                "full_name": "Updated Name",
                "company": "Updated Company"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update user: {response.text}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"✓ Admin can update users")
    
    def test_delete_user(self, admin_token):
        """Test deleting a user"""
        test_email = "TEST_deleteuser@example.com"
        
        # Create user first
        create_response = requests.post(f"{BASE_URL}/api/admin/users",
            json={
                "email": test_email,
                "password": "testpass123"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test user: {create_response.text}")
        
        user_id = create_response.json().get("id")
        
        # Delete user
        response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to delete user: {response.text}"
        
        # Verify deletion
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        deleted_user = next((u for u in users_response.json() if u.get("id") == user_id), None)
        assert deleted_user is None, "User still exists after deletion"
        print(f"✓ Admin can delete users")


class TestRolesManagement:
    """Test roles management endpoints"""
    
    def test_get_all_roles(self, admin_token):
        """Test fetching all roles"""
        response = requests.get(f"{BASE_URL}/api/roles/roles", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify default roles exist
        role_names = [r.get("name") for r in data]
        assert "Admin" in role_names, "Admin role not found"
        assert "Reseller" in role_names, "Reseller role not found"
        assert "Sales Partner" in role_names, "Sales Partner role not found"
        print(f"✓ Can fetch all roles ({len(data)} roles), default roles exist")
    
    def test_create_role(self, admin_token):
        """Test creating a new role"""
        test_role_name = "TEST_CustomRole"
        
        # First delete if exists
        roles_response = requests.get(f"{BASE_URL}/api/roles/roles", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        existing = next((r for r in roles_response.json() if r.get("name") == test_role_name), None)
        if existing:
            requests.delete(f"{BASE_URL}/api/roles/roles/{existing['id']}", headers={
                "Authorization": f"Bearer {admin_token}"
            })
        
        # Create role
        response = requests.post(f"{BASE_URL}/api/roles/roles",
            json={
                "name": test_role_name,
                "description": "Test role description",
                "permissions": {"orders": ["read"]}
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        data = response.json()
        assert data.get("name") == test_role_name
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/roles/roles/{data['id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"✓ Can create custom roles")
    
    def test_update_role(self, admin_token):
        """Test updating a role"""
        # Create a test role first
        create_response = requests.post(f"{BASE_URL}/api/roles/roles",
            json={
                "name": "TEST_UpdateRole",
                "description": "Original description",
                "permissions": {}
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test role: {create_response.text}")
        
        role_id = create_response.json().get("id")
        
        # Update role
        response = requests.put(f"{BASE_URL}/api/roles/roles/{role_id}",
            json={
                "description": "Updated description"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update role: {response.text}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/roles/roles/{role_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print(f"✓ Can update roles")
    
    def test_cannot_delete_system_roles(self, admin_token):
        """Test that system roles cannot be deleted"""
        roles_response = requests.get(f"{BASE_URL}/api/roles/roles", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        admin_role = next((r for r in roles_response.json() if r.get("name") == "Admin"), None)
        
        if not admin_role:
            pytest.skip("Admin role not found")
        
        response = requests.delete(f"{BASE_URL}/api/roles/roles/{admin_role['id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 400, f"Should not be able to delete system role"
        print(f"✓ System roles are protected from deletion")


class TestStripeSettings:
    """Test Stripe settings endpoints"""
    
    def test_get_stripe_settings(self, admin_token):
        """Test fetching Stripe settings"""
        response = requests.get(f"{BASE_URL}/api/settings/stripe", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get Stripe settings: {response.text}"
        data = response.json()
        assert "publishable_key" in data, "No publishable_key in response"
        print(f"✓ Can fetch Stripe settings")
    
    def test_update_stripe_settings(self, admin_token):
        """Test updating Stripe settings"""
        # Get current settings
        current_response = requests.get(f"{BASE_URL}/api/settings/stripe", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        current_key = current_response.json().get("publishable_key", "")
        
        # Update settings
        test_key = "pk_test_testkey123"
        response = requests.put(f"{BASE_URL}/api/settings/stripe",
            json={
                "publishable_key": test_key,
                "secret_key": "sk_test_testsecret123"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update Stripe settings: {response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings/stripe", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert verify_response.json().get("publishable_key") == test_key
        
        # Restore original if it existed
        if current_key:
            requests.put(f"{BASE_URL}/api/settings/stripe",
                json={"publishable_key": current_key},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        print(f"✓ Can update Stripe settings")
    
    def test_get_stripe_public_key(self, admin_token):
        """Test fetching public Stripe key"""
        response = requests.get(f"{BASE_URL}/api/settings/stripe/public-key", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get public key: {response.text}"
        data = response.json()
        assert "publishable_key" in data
        print(f"✓ Can fetch Stripe public key")


class TestMarketingSettings:
    """Test marketing and SEO settings endpoints"""
    
    def test_get_marketing_settings(self, admin_token):
        """Test fetching marketing settings"""
        response = requests.get(f"{BASE_URL}/api/marketing/settings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Failed to get marketing settings: {response.text}"
        data = response.json()
        # Verify expected fields exist
        expected_fields = ["meta_pixel_id", "meta_pixel_enabled", "ga4_measurement_id", "ga4_enabled",
                          "seo_title", "seo_description", "seo_keywords", "og_title", "og_description", "og_image"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Can fetch marketing settings with all expected fields")
    
    def test_update_marketing_settings(self, admin_token):
        """Test updating marketing settings"""
        # Get current settings
        current_response = requests.get(f"{BASE_URL}/api/marketing/settings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        current_settings = current_response.json()
        
        # Update settings
        test_settings = {
            "meta_pixel_id": "TEST_123456789",
            "meta_pixel_enabled": True,
            "ga4_measurement_id": "G-TEST123",
            "ga4_enabled": True,
            "seo_title": "TEST Suits India",
            "seo_description": "TEST description",
            "seo_keywords": "test, suits, india",
            "og_title": "TEST OG Title",
            "og_description": "TEST OG Description",
            "og_image": "https://example.com/test.jpg"
        }
        
        response = requests.put(f"{BASE_URL}/api/marketing/settings",
            json=test_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update marketing settings: {response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/marketing/settings", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        verify_data = verify_response.json()
        assert verify_data.get("meta_pixel_id") == "TEST_123456789"
        assert verify_data.get("ga4_enabled") == True
        assert verify_data.get("seo_title") == "TEST Suits India"
        
        # Restore original settings
        requests.put(f"{BASE_URL}/api/marketing/settings",
            json=current_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"✓ Can update marketing settings (tracking and SEO)")
    
    def test_track_event(self, admin_token):
        """Test tracking a marketing event"""
        response = requests.post(f"{BASE_URL}/api/marketing/track",
            json={
                "event_type": "TEST_page_view",
                "data": {"page": "/test"},
                "page_url": "https://example.com/test"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to track event: {response.text}"
        print(f"✓ Can track marketing events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
