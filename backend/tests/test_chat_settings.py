"""
Test suite for Chat Settings API endpoints
Tests configurable polling interval feature for chat
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": "admin@suitsindia.com", "password": "admin"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def reseller_token():
    """Get reseller authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/reseller/login",
        json={"email": "reseller@test.com", "password": "reseller123"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Reseller authentication failed")


class TestPublicChatSettings:
    """Test public chat settings endpoint (no auth required)"""

    def test_get_public_chat_settings(self):
        """Test GET /api/admin/chat-settings/public returns polling interval"""
        response = requests.get(f"{BASE_URL}/api/admin/chat-settings/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "polling_interval_seconds" in data, "Response should contain polling_interval_seconds"
        assert isinstance(data["polling_interval_seconds"], int), "polling_interval_seconds should be an integer"
        assert 1 <= data["polling_interval_seconds"] <= 60, "polling_interval_seconds should be between 1-60"
        
        print(f"SUCCESS: Public chat settings returned polling_interval_seconds: {data['polling_interval_seconds']}")

    def test_public_endpoint_no_auth_required(self):
        """Test that public endpoint does not require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/chat-settings/public")
        # Should return 200 even without auth
        assert response.status_code == 200, f"Expected 200 (no auth required), got {response.status_code}"


class TestAdminChatSettings:
    """Test admin-only chat settings endpoints"""

    def test_get_chat_settings_requires_admin(self):
        """Test GET /api/admin/chat-settings requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/chat-settings")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_get_chat_settings_as_admin(self, admin_token):
        """Test GET /api/admin/chat-settings returns full settings for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/chat-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all expected fields
        assert "polling_interval_seconds" in data, "Should have polling_interval_seconds"
        assert "max_file_size_mb" in data, "Should have max_file_size_mb"
        assert "allowed_file_types" in data, "Should have allowed_file_types"
        assert "enable_notifications" in data, "Should have enable_notifications"
        
        print(f"SUCCESS: Admin chat settings: {data}")

    def test_get_chat_settings_denied_for_reseller(self, reseller_token):
        """Test GET /api/admin/chat-settings denied for non-admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/chat-settings",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"


class TestUpdateChatSettings:
    """Test updating chat settings"""

    def test_put_chat_settings_requires_admin(self):
        """Test PUT /api/admin/chat-settings requires admin authentication"""
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"polling_interval_seconds": 10}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_put_chat_settings_denied_for_reseller(self, reseller_token):
        """Test PUT /api/admin/chat-settings denied for non-admin"""
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"polling_interval_seconds": 10},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"

    def test_update_polling_interval(self, admin_token):
        """Test updating polling interval and verify persistence"""
        # Get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/chat-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_interval = get_response.json().get("polling_interval_seconds", 5)
        
        # Update to a new value
        new_interval = 15 if original_interval != 15 else 20
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"polling_interval_seconds": new_interval},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        # Verify the update was applied
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/chat-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert verify_response.status_code == 200
        updated_data = verify_response.json()
        assert updated_data["polling_interval_seconds"] == new_interval, \
            f"Expected interval {new_interval}, got {updated_data['polling_interval_seconds']}"
        
        # Also verify public endpoint reflects the change
        public_response = requests.get(f"{BASE_URL}/api/admin/chat-settings/public")
        assert public_response.status_code == 200
        public_data = public_response.json()
        assert public_data["polling_interval_seconds"] == new_interval, \
            f"Public endpoint should reflect updated interval {new_interval}"
        
        print(f"SUCCESS: Polling interval updated from {original_interval} to {new_interval}")

    def test_polling_interval_minimum_validation(self, admin_token):
        """Test that polling interval < 1 is clamped to 1"""
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"polling_interval_seconds": 0},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["polling_interval_seconds"] >= 1, "Polling interval should be clamped to minimum 1"

    def test_polling_interval_maximum_validation(self, admin_token):
        """Test that polling interval > 60 is clamped to 60"""
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"polling_interval_seconds": 100},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["polling_interval_seconds"] <= 60, "Polling interval should be clamped to maximum 60"

    def test_update_max_file_size(self, admin_token):
        """Test updating max file size"""
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"max_file_size_mb": 5},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["max_file_size_mb"] == 5, "max_file_size_mb should be updated to 5"
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"max_file_size_mb": 2},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

    def test_update_enable_notifications(self, admin_token):
        """Test toggling notifications"""
        # Toggle off
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"enable_notifications": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enable_notifications"] == False, "enable_notifications should be False"
        
        # Toggle back on
        response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json={"enable_notifications": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enable_notifications"] == True, "enable_notifications should be True"


class TestChatSettingsIntegration:
    """Integration tests for chat settings with chat widget"""

    def test_full_settings_flow(self, admin_token):
        """Test complete settings flow: read, update, verify public"""
        # 1. Read current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/chat-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        original_settings = get_response.json()
        
        # 2. Update settings
        test_settings = {
            "polling_interval_seconds": 12,
            "max_file_size_mb": 3,
            "enable_notifications": True
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json=test_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200
        
        # 3. Verify public endpoint returns correct polling interval
        public_response = requests.get(f"{BASE_URL}/api/admin/chat-settings/public")
        assert public_response.status_code == 200
        public_data = public_response.json()
        assert public_data["polling_interval_seconds"] == 12, "Public endpoint should return updated interval"
        
        # 4. Restore original settings
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/chat-settings",
            json=original_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert restore_response.status_code == 200
        
        print("SUCCESS: Full settings flow completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
