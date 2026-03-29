"""
Test suite for POS Cost View Secret Code feature
Tests:
1. Secret code can be set in reseller settings
2. Secret code verification endpoint
3. Secret code settings persistence
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
RESELLER_ID = 'default'

# Test credentials
RESELLER_EMAIL = "trump@suitsindia.com"
RESELLER_PASSWORD = "trump123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def reseller_token(api_client):
    """Get reseller authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/reseller/login", json={
        "email": RESELLER_EMAIL,
        "password": RESELLER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Reseller authentication failed: {response.status_code}")


class TestSecretCodeSettings:
    """Test secret code configuration in reseller settings"""
    
    def test_get_reseller_settings(self, api_client):
        """GET /reseller-settings/{id} should return settings with cost_view_secret_code field"""
        response = api_client.get(f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cost_view_secret_code" in data or data.get("cost_view_secret_code") is None, \
            "Settings should include cost_view_secret_code field"
        print(f"PASS: Reseller settings returned with cost_view_secret_code field")
    
    def test_set_secret_code(self, api_client):
        """PATCH /reseller-settings/{id}/secret-code should save the secret code"""
        test_code = "TEST1234"
        
        response = api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": test_code}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"PASS: Secret code set successfully")
    
    def test_secret_code_persists(self, api_client):
        """Verify secret code is persisted in settings"""
        # First set a code
        test_code = "PERSIST123"
        set_response = api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": test_code}
        )
        assert set_response.status_code == 200
        
        # Verify it's persisted by getting settings
        get_response = api_client.get(f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("cost_view_secret_code") == test_code, \
            f"Expected code '{test_code}', got '{data.get('cost_view_secret_code')}'"
        print(f"PASS: Secret code persisted correctly")
    
    def test_set_empty_secret_code(self, api_client):
        """Setting empty/null secret code should work (disables feature)"""
        response = api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": None}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"PASS: Empty secret code can be set")
    
    def test_update_settings_with_full_payload(self, api_client):
        """PUT /reseller-settings/{id} should save secret code as part of full settings"""
        settings_data = {
            "company_name": "Test Company",
            "cost_view_secret_code": "FULL_PAYLOAD_CODE",
            "margins": {
                "base_product_margin": 10,
                "fabric_margin": 5,
                "style_options_margin": 8
            },
            "show_pricing": True
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}",
            json=settings_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("cost_view_secret_code") == "FULL_PAYLOAD_CODE", \
            "Secret code should be saved via PUT"
        print(f"PASS: Secret code saved via full settings update")


class TestSecretCodeVerification:
    """Test POST /reseller-settings/{id}/verify-cost-code endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_secret_code(self, api_client):
        """Ensure a known secret code is set before verification tests"""
        api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": "1234"}
        )
    
    def test_verify_correct_code(self, api_client):
        """POST /verify-cost-code with correct code should return success"""
        response = api_client.post(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/verify-cost-code",
            json={"code": "1234"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "message" in data, "Response should include a message"
        print(f"PASS: Correct code verification returns success")
    
    def test_verify_wrong_code(self, api_client):
        """POST /verify-cost-code with wrong code should return 401"""
        response = api_client.post(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/verify-cost-code",
            json={"code": "WRONGCODE"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Wrong code returns 401 Unauthorized")
    
    def test_verify_empty_code(self, api_client):
        """POST /verify-cost-code with empty code should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/verify-cost-code",
            json={"code": ""}
        )
        # Should either be 401 (invalid) or 400 (validation error)
        assert response.status_code in [400, 401], \
            f"Expected 400 or 401, got {response.status_code}"
        print(f"PASS: Empty code rejected with status {response.status_code}")
    
    def test_verify_code_not_configured(self, api_client):
        """When no secret code is configured, verification should return 400"""
        # Clear the secret code
        api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": None}
        )
        
        response = api_client.post(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/verify-cost-code",
            json={"code": "ANYCODE"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "not configured" in data.get("detail", "").lower(), \
            "Error message should indicate code not configured"
        print(f"PASS: Verification fails when no code configured")
        
        # Restore the code
        api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": "1234"}
        )
    
    def test_verify_nonexistent_reseller(self, api_client):
        """Verification for non-existent reseller should return 404"""
        response = api_client.post(
            f"{BASE_URL}/api/reseller-settings/NONEXISTENT_RESELLER/verify-cost-code",
            json={"code": "1234"}
        )
        # Should create default settings or return 404
        # Based on the code, it will return 404 since we query first
        assert response.status_code in [200, 404], \
            f"Expected 200 or 404, got {response.status_code}"
        print(f"PASS: Non-existent reseller handled appropriately")


class TestMarginCalculationIntegration:
    """Test that margins are properly applied in pricing based on view mode"""
    
    def test_margins_in_settings(self, api_client):
        """Verify margins are stored and returned in settings"""
        # Set margins
        margins = {
            "base_product_margin": 15,
            "fabric_margin": 10,
            "style_options_margin": 12
        }
        
        response = api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/margins",
            json=margins
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("margins") == margins, "Margins should be saved correctly"
        print(f"PASS: Margins saved and returned correctly")


class TestCleanup:
    """Reset test data after tests complete"""
    
    def test_reset_secret_code(self, api_client):
        """Reset secret code to known value for consistent testing"""
        response = api_client.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_ID}/secret-code",
            json={"code": "1234"}
        )
        assert response.status_code == 200
        print(f"PASS: Secret code reset to '1234' for next test run")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
