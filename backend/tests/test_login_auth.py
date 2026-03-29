"""
Test Login Authentication for Admin, Sales Partner, and Reseller Portals
Tests all login endpoints and validates user role-based access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Admin Portal Login Tests - Uses /api/auth/admin/login"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials - admin@suitsindia.com / admin"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "admin"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == "admin@suitsindia.com"
        assert data["user"]["is_admin"] == True or data["user"]["role"] == "admin"
        
        # Verify token works with /me endpoint
        token = data["access_token"]
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        print(f"✓ Admin login successful - user: {data['user']['email']}")
        
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid admin credentials rejected correctly")
        
    def test_admin_login_nonexistent_user(self):
        """Test admin login with non-existent user"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Non-existent user rejected correctly")


class TestSalesPartnerLogin:
    """Sales Partner Portal Login Tests - Uses /api/auth/reseller/login"""
    
    def test_sales_partner_login_success(self):
        """Test sales partner login with valid credentials - donald@suitsindia.com / donald123"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "donald@suitsindia.com",
            "password": "donald123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == "donald@suitsindia.com"
        assert data["user"]["role"] == "sales_partner", f"Expected sales_partner role, got {data['user'].get('role')}"
        
        # Verify token works with /me endpoint
        token = data["access_token"]
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        me_data = me_response.json()
        assert me_data["role"] == "sales_partner"
        print(f"✓ Sales Partner login successful - user: {data['user']['email']}, role: {data['user']['role']}")
        
    def test_sales_partner_login_invalid_credentials(self):
        """Test sales partner login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "donald@suitsindia.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid sales partner credentials rejected correctly")


class TestResellerLogin:
    """Reseller Portal Login Tests - Uses /api/auth/reseller/login"""
    
    def test_reseller_login_trump_success(self):
        """Test reseller login with trump credentials - trump@suitsindia.com / trump123"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "trump@suitsindia.com",
            "password": "trump123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == "trump@suitsindia.com"
        
        # Verify token works with /me endpoint
        token = data["access_token"]
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        print(f"✓ Reseller (trump) login successful - user: {data['user']['email']}, role: {data['user'].get('role')}")
        
    def test_reseller_login_test_account_success(self):
        """Test reseller login with test account - reseller@test.com / reseller123"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "reseller@test.com",
            "password": "reseller123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == "reseller@test.com"
        
        # Verify token works with /me endpoint
        token = data["access_token"]
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert me_response.status_code == 200, f"Token validation failed: {me_response.text}"
        print(f"✓ Reseller (test) login successful - user: {data['user']['email']}, role: {data['user'].get('role')}")
        
    def test_reseller_login_invalid_credentials(self):
        """Test reseller login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "trump@suitsindia.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid reseller credentials rejected correctly")
        
    def test_reseller_login_multiple_attempts(self):
        """Test multiple login attempts to check for intermittent failures (reported issue)"""
        email = "trump@suitsindia.com"
        password = "trump123"
        
        success_count = 0
        failure_count = 0
        failures = []
        
        for i in range(5):
            response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    success_count += 1
                else:
                    failure_count += 1
                    failures.append(f"Attempt {i+1}: Missing access_token - {response.text}")
            else:
                failure_count += 1
                failures.append(f"Attempt {i+1}: Status {response.status_code} - {response.text}")
        
        print(f"Multiple login test: {success_count}/5 successful")
        if failures:
            print(f"Failures: {failures}")
        
        assert success_count == 5, f"Expected 5/5 successful logins, got {success_count}/5. Failures: {failures}"
        print(f"✓ Multiple reseller login attempts all successful (no intermittent failures detected)")


class TestAuthTokenValidation:
    """Test token validation and /me endpoint"""
    
    def test_me_endpoint_without_token(self):
        """Test /me endpoint without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ /me endpoint correctly rejects requests without token")
        
    def test_me_endpoint_with_invalid_token(self):
        """Test /me endpoint with invalid token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalidtoken123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ /me endpoint correctly rejects invalid tokens")


class TestLoginErrorMessages:
    """Test that proper error messages are returned"""
    
    def test_admin_login_error_message(self):
        """Test admin login returns proper error message"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "credentials" in data["detail"].lower()
        print(f"✓ Admin login returns proper error message: {data['detail']}")
        
    def test_reseller_login_error_message(self):
        """Test reseller login returns proper error message"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "credentials" in data["detail"].lower()
        print(f"✓ Reseller login returns proper error message: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
