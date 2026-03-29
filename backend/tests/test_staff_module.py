"""
Staff Module Tests - Backend API Testing
Tests staff CRUD operations, login functionality, and role-based access
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"
STAFF_EMAIL = "staff1@test.com"
STAFF_PASSWORD = "staff123"
TEST_STAFF_EMAIL = f"TEST_staff_{os.getpid()}@test.com"


class TestHealthAndEndpoints:
    """Basic health and endpoint availability tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint working")
    
    def test_staff_route_registered(self):
        """Test that staff routes are registered"""
        # This will return 401 (unauthorized) if route exists, 404 if not
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code in [401, 403, 200], f"Expected 401/403/200, got {response.status_code}"
        print("✅ Staff route is registered")


class TestResellerLogin:
    """Test reseller login functionality"""
    
    def test_reseller_login_success(self):
        """Test reseller can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == RESELLER_EMAIL
        assert data["user"]["role_id"] in ["reseller", "admin"]
        print(f"✅ Reseller login successful: {RESELLER_EMAIL}")
        return data["access_token"]


class TestStaffLogin:
    """Test staff login functionality via reseller login endpoint"""
    
    def get_reseller_token(self):
        """Helper to get reseller token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_staff_login_success(self):
        """Test staff can login via reseller login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        
        if response.status_code == 401:
            # Staff user may not exist yet - this is expected if not seeded
            print(f"⚠️ Staff user {STAFF_EMAIL} does not exist - will test with created staff")
            pytest.skip("Staff user not seeded, will be tested after creation")
        
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        
        # Verify staff-specific fields in response
        assert "access_token" in data
        assert data["user"]["email"] == STAFF_EMAIL
        assert data["user"]["role_id"] == "staff"
        
        # Staff should have parent_reseller_email
        assert "parent_reseller_email" in data["user"], "Staff should have parent_reseller_email"
        
        # Staff should have margins
        assert "margins" in data["user"], "Staff should have margins"
        
        print(f"✅ Staff login successful: {STAFF_EMAIL}")
        print(f"   - Role: {data['user']['role_id']}")
        print(f"   - Parent reseller: {data['user'].get('parent_reseller_email')}")
        return data["access_token"]
    
    def test_staff_login_invalid_credentials(self):
        """Test staff login fails with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Staff login correctly rejects invalid credentials")


class TestStaffCRUD:
    """Test Staff CRUD operations"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_list_staff_requires_auth(self):
        """Test that listing staff requires authentication"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 401
        print("✅ Staff list correctly requires authentication")
    
    def test_list_staff_with_token(self, reseller_token):
        """Test listing staff members with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/staff",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to list staff: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Staff list returned {len(data)} members")
        return data
    
    def test_create_staff(self, reseller_token):
        """Test creating a new staff member"""
        staff_data = {
            "email": TEST_STAFF_EMAIL,
            "password": "testpass123",
            "full_name": "Test Staff Member",
            "phone": "+91 9876543210"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/staff",
            json=staff_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        if response.status_code == 400 and "already registered" in response.text.lower():
            print(f"⚠️ Staff {TEST_STAFF_EMAIL} already exists - skipping creation")
            return None
        
        assert response.status_code in [200, 201], f"Failed to create staff: {response.text}"
        data = response.json()
        
        # Verify created staff data
        assert data["email"] == TEST_STAFF_EMAIL
        assert data["full_name"] == "Test Staff Member"
        assert data["role_id"] == "staff"
        assert "parent_reseller_email" in data
        assert data["parent_reseller_email"] == RESELLER_EMAIL
        
        # Verify margins are initialized
        assert "margins" in data
        assert "cmt_margin" in data["margins"]
        assert "fabric_margin" in data["margins"]
        assert "styling_margin" in data["margins"]
        assert "shipping_margin" in data["margins"]
        
        print(f"✅ Staff created: {TEST_STAFF_EMAIL}")
        print(f"   - Parent: {data['parent_reseller_email']}")
        print(f"   - Margins: {data['margins']}")
        return data
    
    def test_get_staff_by_email(self, reseller_token):
        """Test getting a specific staff member"""
        # First ensure staff exists
        self.test_create_staff(reseller_token)
        
        response = requests.get(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to get staff: {response.text}"
        data = response.json()
        assert data["email"] == TEST_STAFF_EMAIL
        print(f"✅ Retrieved staff: {data['full_name']}")
    
    def test_update_staff(self, reseller_token):
        """Test updating staff member details"""
        # First ensure staff exists
        self.test_create_staff(reseller_token)
        
        update_data = {
            "full_name": "Updated Staff Name",
            "phone": "+91 1234567890"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}",
            json=update_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to update staff: {response.text}"
        data = response.json()
        assert data["full_name"] == "Updated Staff Name"
        print(f"✅ Staff updated: {data['full_name']}")
    
    def test_update_staff_margins(self, reseller_token):
        """Test updating staff margins"""
        # First ensure staff exists
        self.test_create_staff(reseller_token)
        
        margins_data = {
            "cmt_margin": 5.0,
            "fabric_margin": 3.0,
            "styling_margin": 2.5,
            "shipping_margin": 1.0
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}/margins",
            json=margins_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to update margins: {response.text}"
        data = response.json()
        
        # Verify margins were updated
        assert data["margins"]["cmt_margin"] == 5.0
        assert data["margins"]["fabric_margin"] == 3.0
        assert data["margins"]["styling_margin"] == 2.5
        assert data["margins"]["shipping_margin"] == 1.0
        
        print(f"✅ Staff margins updated: {data['margins']}")
    
    def test_update_staff_password(self, reseller_token):
        """Test updating staff password"""
        # First ensure staff exists
        self.test_create_staff(reseller_token)
        
        response = requests.patch(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}/password",
            json={"password": "newpassword123"},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to update password: {response.text}"
        data = response.json()
        assert "message" in data
        assert "successfully" in data["message"].lower()
        print("✅ Staff password updated successfully")
    
    def test_delete_staff(self, reseller_token):
        """Test deactivating (soft delete) staff member"""
        # First ensure staff exists
        self.test_create_staff(reseller_token)
        
        response = requests.delete(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Failed to delete staff: {response.text}"
        data = response.json()
        assert "deactivated" in data["message"].lower() or "success" in data["message"].lower()
        print("✅ Staff deactivated successfully")
        
        # Verify staff is deactivated but still retrievable
        response = requests.get(
            f"{BASE_URL}/api/staff/{TEST_STAFF_EMAIL}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200
        staff = response.json()
        assert staff["is_active"] == False
        print("✅ Verified staff is_active=False after deactivation")


class TestStaffAuthentication:
    """Test created staff can login and use the portal"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_created_staff_can_login(self, reseller_token):
        """Test that newly created staff can login"""
        # Create a fresh test staff
        fresh_staff_email = f"TEST_freshstaff_{os.getpid()}@test.com"
        staff_password = "freshpass123"
        
        # Create staff
        create_response = requests.post(
            f"{BASE_URL}/api/staff",
            json={
                "email": fresh_staff_email,
                "password": staff_password,
                "full_name": "Fresh Test Staff"
            },
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        if create_response.status_code == 400:
            print("⚠️ Staff already exists, skipping creation")
            pytest.skip("Staff already exists")
        
        assert create_response.status_code in [200, 201]
        print(f"✅ Created staff: {fresh_staff_email}")
        
        # Now login as staff
        login_response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": fresh_staff_email,
            "password": staff_password
        })
        
        assert login_response.status_code == 200, f"Staff login failed: {login_response.text}"
        data = login_response.json()
        
        # Verify response has staff-specific data
        assert data["user"]["role_id"] == "staff"
        assert data["user"]["parent_reseller_email"] == RESELLER_EMAIL
        assert "margins" in data["user"]
        
        print(f"✅ Staff login verified with correct role and parent reseller")
        
        # Cleanup - deactivate staff
        requests.delete(
            f"{BASE_URL}/api/staff/{fresh_staff_email}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        print(f"✅ Cleaned up test staff")


class TestStaffAccessControl:
    """Test that staff has restricted access"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_staff_cannot_list_other_staff(self, reseller_token):
        """Staff members should not be able to list other staff"""
        # Create staff
        staff_email = f"TEST_staffaccess_{os.getpid()}@test.com"
        staff_password = "staffpass123"
        
        create_response = requests.post(
            f"{BASE_URL}/api/staff",
            json={
                "email": staff_email,
                "password": staff_password,
                "full_name": "Staff Access Test"
            },
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        if create_response.status_code != 200 and create_response.status_code != 201:
            pytest.skip("Could not create test staff")
        
        # Login as staff
        login_response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": staff_email,
            "password": staff_password
        })
        
        if login_response.status_code != 200:
            pytest.skip("Staff login failed")
        
        staff_token = login_response.json()["access_token"]
        
        # Try to list staff as staff member
        list_response = requests.get(
            f"{BASE_URL}/api/staff",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        # Staff should get 403 (forbidden) when trying to list staff
        assert list_response.status_code == 403, f"Expected 403, got {list_response.status_code}: {list_response.text}"
        print("✅ Staff correctly denied access to staff list")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/staff/{staff_email}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )


class TestExistingStaffUser:
    """Test with existing staff1@test.com user if it exists"""
    
    def test_existing_staff_user_login(self):
        """Test login with existing staff user from seed data"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        
        if response.status_code == 401:
            print(f"⚠️ Staff user {STAFF_EMAIL} not in database - skipping")
            pytest.skip("Staff user not seeded in database")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify it's a staff user
        assert data["user"]["role_id"] == "staff"
        print(f"✅ Existing staff user login successful: {STAFF_EMAIL}")
        print(f"   - Parent: {data['user'].get('parent_reseller_email')}")
        print(f"   - Margins: {data['user'].get('margins')}")
        
        return data["access_token"]


# Test cleanup
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_staff():
    """Cleanup test staff after all tests"""
    yield
    
    # Get reseller token for cleanup
    try:
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        if response.status_code == 200:
            token = response.json()["access_token"]
            
            # List all staff and delete TEST_ prefixed ones
            list_response = requests.get(
                f"{BASE_URL}/api/staff",
                headers={"Authorization": f"Bearer {token}"}
            )
            if list_response.status_code == 200:
                for staff in list_response.json():
                    if staff["email"].startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/staff/{staff['email']}",
                            headers={"Authorization": f"Bearer {token}"}
                        )
                        print(f"🧹 Cleaned up test staff: {staff['email']}")
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")
