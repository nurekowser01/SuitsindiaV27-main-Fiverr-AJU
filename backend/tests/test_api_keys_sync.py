"""
Test Suite for API Keys & Sync System
Tests:
- API Key CRUD operations (admin auth required)
- Sync endpoints (X-API-Key auth)
- Webhook functionality
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


class TestAdminAuth:
    """Test admin authentication for API key management"""
    
    def test_admin_login_success(self):
        """Test admin login returns access_token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert len(data["access_token"]) > 0, "access_token should not be empty"
        print(f"PASS: Admin login successful, token received")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.text}")


@pytest.fixture(scope="module")
def test_api_key(admin_token):
    """Create a test API key and clean up after tests"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create test key
    response = requests.post(f"{BASE_URL}/api/api-keys", json={
        "name": "TEST_PyTestKey",
        "webhook_url": None
    }, headers=headers)
    
    assert response.status_code == 200, f"Failed to create test API key: {response.text}"
    data = response.json()
    
    yield {
        "api_key": data["api_key"],
        "key_prefix": data["key_prefix"],
        "name": data["name"]
    }
    
    # Cleanup - delete the test key
    try:
        requests.delete(
            f"{BASE_URL}/api/api-keys/{data['key_prefix']}", 
            headers=headers
        )
    except:
        pass


class TestApiKeyCRUD:
    """Test API Key CRUD operations"""
    
    def test_create_api_key_success(self, admin_token):
        """POST /api/api-keys creates a new API key"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/api-keys", json={
            "name": "TEST_CreateKey",
            "webhook_url": "https://example.com/webhook"
        }, headers=headers)
        
        assert response.status_code == 200, f"Create API key failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "api_key" in data, "Response should contain api_key"
        assert "key_prefix" in data, "Response should contain key_prefix"
        assert "name" in data, "Response should contain name"
        assert "message" in data, "Response should contain security message"
        
        # Verify key format
        assert data["api_key"].startswith("si_"), "API key should start with 'si_'"
        assert "..." in data["key_prefix"], "Key prefix should be truncated"
        assert data["name"] == "TEST_CreateKey"
        assert data["webhook_url"] == "https://example.com/webhook"
        
        print(f"PASS: API key created with prefix {data['key_prefix']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/api-keys/{data['key_prefix']}", headers=headers)
    
    def test_create_api_key_without_name_fails(self, admin_token):
        """POST /api/api-keys without name returns 400"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(f"{BASE_URL}/api/api-keys", json={
            "name": "",
            "webhook_url": None
        }, headers=headers)
        
        assert response.status_code == 400, "Should fail without name"
        print(f"PASS: Empty name correctly rejected")
    
    def test_create_api_key_without_auth_fails(self):
        """POST /api/api-keys without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/api-keys", json={
            "name": "TEST_NoAuth"
        })
        
        assert response.status_code == 401, "Should require authentication"
        print(f"PASS: Unauthenticated request correctly rejected")
    
    def test_list_api_keys_success(self, admin_token):
        """GET /api/api-keys lists all keys without hashes"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers)
        
        assert response.status_code == 200, f"List API keys failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Verify no sensitive data exposed
        for key in data:
            assert "key_hash" not in key, "key_hash should not be returned"
            assert "_id" not in key, "_id should not be returned"
            # Verify expected fields
            assert "name" in key
            assert "key_prefix" in key
            assert "is_active" in key
            assert "created_at" in key
        
        print(f"PASS: Listed {len(data)} API keys, no hashes exposed")
    
    def test_list_api_keys_without_auth_fails(self):
        """GET /api/api-keys without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/api-keys")
        
        assert response.status_code == 401, "Should require authentication"
        print(f"PASS: Unauthenticated list request correctly rejected")
    
    def test_update_api_key_webhook_url(self, admin_token, test_api_key):
        """PUT /api/api-keys/{key_prefix} updates webhook URL"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        key_prefix = test_api_key["key_prefix"]
        
        response = requests.put(
            f"{BASE_URL}/api/api-keys/{key_prefix}",
            json={"webhook_url": "https://updated-webhook.com/notify"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update persisted
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers)
        keys = list_response.json()
        updated_key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        
        assert updated_key is not None, "Key should exist after update"
        assert updated_key["webhook_url"] == "https://updated-webhook.com/notify"
        
        print(f"PASS: Webhook URL updated successfully")
    
    def test_update_api_key_toggle_active(self, admin_token, test_api_key):
        """PUT /api/api-keys/{key_prefix} toggles is_active"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        key_prefix = test_api_key["key_prefix"]
        
        # Get current state
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers)
        keys = list_response.json()
        original_key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        original_active = original_key["is_active"]
        
        # Toggle
        response = requests.put(
            f"{BASE_URL}/api/api-keys/{key_prefix}",
            json={"is_active": not original_active},
            headers=headers
        )
        
        assert response.status_code == 200, f"Toggle failed: {response.text}"
        
        # Verify toggle persisted
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers)
        keys = list_response.json()
        updated_key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        
        assert updated_key["is_active"] == (not original_active), "is_active should be toggled"
        
        # Toggle back for other tests
        requests.put(
            f"{BASE_URL}/api/api-keys/{key_prefix}",
            json={"is_active": original_active},
            headers=headers
        )
        
        print(f"PASS: is_active toggled from {original_active} to {not original_active}")
    
    def test_update_nonexistent_key_returns_404(self, admin_token):
        """PUT /api/api-keys/{key_prefix} returns 404 for nonexistent key"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/api-keys/si_nonexistent...",
            json={"webhook_url": "https://test.com"},
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Nonexistent key update correctly returns 404")
    
    def test_delete_api_key_success(self, admin_token):
        """DELETE /api/api-keys/{key_prefix} deletes a key"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a key to delete
        create_response = requests.post(f"{BASE_URL}/api/api-keys", json={
            "name": "TEST_ToDelete"
        }, headers=headers)
        
        key_prefix = create_response.json()["key_prefix"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/api-keys/{key_prefix}",
            headers=headers
        )
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers)
        keys = list_response.json()
        deleted_key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        
        assert deleted_key is None, "Deleted key should not appear in list"
        print(f"PASS: API key deleted successfully")
    
    def test_delete_nonexistent_key_returns_404(self, admin_token):
        """DELETE /api/api-keys/{key_prefix} returns 404 for nonexistent key"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/api-keys/si_nonexistent...",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: Nonexistent key delete correctly returns 404")


class TestSyncEndpoints:
    """Test Sync API endpoints with X-API-Key authentication"""
    
    def test_sync_products_success(self, test_api_key):
        """GET /api/sync/products returns products with valid API key"""
        headers = {"X-API-Key": test_api_key["api_key"]}
        
        response = requests.get(f"{BASE_URL}/api/sync/products", headers=headers)
        
        assert response.status_code == 200, f"Sync products failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Response should contain 'data' field"
        assert "synced_at" in data, "Response should contain 'synced_at' timestamp"
        assert isinstance(data["data"], list), "'data' should be a list of categories"
        
        # Verify no _id fields
        for cat in data["data"]:
            assert "_id" not in cat, "_id should be excluded"
        
        print(f"PASS: Sync products returned {len(data['data'])} categories")
    
    def test_sync_products_without_api_key_fails(self):
        """GET /api/sync/products without X-API-Key returns 401"""
        response = requests.get(f"{BASE_URL}/api/sync/products")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Missing X-API-Key" in response.json().get("detail", "")
        print(f"PASS: Missing API key correctly rejected")
    
    def test_sync_products_with_invalid_key_fails(self):
        """GET /api/sync/products with invalid key returns 401"""
        headers = {"X-API-Key": "si_invalid_key_12345"}
        
        response = requests.get(f"{BASE_URL}/api/sync/products", headers=headers)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Invalid or revoked" in response.json().get("detail", "")
        print(f"PASS: Invalid API key correctly rejected")
    
    def test_sync_styling_suits_success(self, test_api_key):
        """GET /api/sync/styling/suits returns styling data"""
        headers = {"X-API-Key": test_api_key["api_key"]}
        
        response = requests.get(f"{BASE_URL}/api/sync/styling/suits", headers=headers)
        
        # May be 404 if styling not configured, which is acceptable
        if response.status_code == 404:
            print(f"INFO: No styling found for 'suits' - this is acceptable if not configured")
            return
        
        assert response.status_code == 200, f"Sync styling failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Response should contain 'data' field"
        assert "synced_at" in data, "Response should contain 'synced_at' timestamp"
        assert "_id" not in data["data"], "_id should be excluded"
        
        print(f"PASS: Sync styling for suits returned data")
    
    def test_sync_styling_without_api_key_fails(self):
        """GET /api/sync/styling/suits without X-API-Key returns 401"""
        response = requests.get(f"{BASE_URL}/api/sync/styling/suits")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Missing API key correctly rejected for styling endpoint")
    
    def test_sync_measurements_success(self, test_api_key):
        """GET /api/sync/measurements returns measurement config"""
        headers = {"X-API-Key": test_api_key["api_key"]}
        
        response = requests.get(f"{BASE_URL}/api/sync/measurements", headers=headers)
        
        assert response.status_code == 200, f"Sync measurements failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Response should contain 'data' field"
        assert "synced_at" in data, "Response should contain 'synced_at' timestamp"
        assert "_id" not in data.get("data", {}), "_id should be excluded"
        
        print(f"PASS: Sync measurements returned config")
    
    def test_sync_measurements_without_api_key_fails(self):
        """GET /api/sync/measurements without X-API-Key returns 401"""
        response = requests.get(f"{BASE_URL}/api/sync/measurements")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Missing API key correctly rejected for measurements endpoint")
    
    def test_sync_all_success(self, test_api_key):
        """GET /api/sync/all returns combined products, styling, measurements"""
        headers = {"X-API-Key": test_api_key["api_key"]}
        
        response = requests.get(f"{BASE_URL}/api/sync/all", headers=headers)
        
        assert response.status_code == 200, f"Sync all failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "products" in data, "Response should contain 'products'"
        assert "styling" in data, "Response should contain 'styling'"
        assert "measurements" in data, "Response should contain 'measurements'"
        assert "synced_at" in data, "Response should contain 'synced_at'"
        
        # Verify data types
        assert isinstance(data["products"], list), "'products' should be a list"
        assert isinstance(data["styling"], dict), "'styling' should be a dict"
        
        print(f"PASS: Sync all returned products={len(data['products'])}, styling keys={len(data['styling'])}")
    
    def test_sync_all_without_api_key_fails(self):
        """GET /api/sync/all without X-API-Key returns 401"""
        response = requests.get(f"{BASE_URL}/api/sync/all")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Missing API key correctly rejected for /sync/all endpoint")


class TestInactiveApiKey:
    """Test that inactive API keys are rejected"""
    
    def test_sync_with_inactive_key_fails(self, admin_token):
        """Sync endpoints reject inactive API keys"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a new key
        create_response = requests.post(f"{BASE_URL}/api/api-keys", json={
            "name": "TEST_InactiveKey"
        }, headers=headers)
        
        key_data = create_response.json()
        api_key = key_data["api_key"]
        key_prefix = key_data["key_prefix"]
        
        # Deactivate the key
        requests.put(
            f"{BASE_URL}/api/api-keys/{key_prefix}",
            json={"is_active": False},
            headers=headers
        )
        
        # Try to use inactive key
        sync_response = requests.get(
            f"{BASE_URL}/api/sync/products",
            headers={"X-API-Key": api_key}
        )
        
        assert sync_response.status_code == 401, f"Expected 401 for inactive key, got {sync_response.status_code}"
        assert "Invalid or revoked" in sync_response.json().get("detail", "")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/api-keys/{key_prefix}", headers=headers)
        
        print(f"PASS: Inactive API key correctly rejected")


class TestWebhookLogs:
    """Test webhook log functionality"""
    
    def test_get_webhook_logs(self, admin_token, test_api_key):
        """GET /api/api-keys/{key_prefix}/webhook-logs returns logs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        key_prefix = test_api_key["key_prefix"]
        
        response = requests.get(
            f"{BASE_URL}/api/api-keys/{key_prefix}/webhook-logs",
            headers=headers
        )
        
        assert response.status_code == 200, f"Get webhook logs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Verify no _id in logs
        for log in data:
            assert "_id" not in log, "_id should be excluded from logs"
        
        print(f"PASS: Webhook logs retrieved, {len(data)} entries")
    
    def test_get_webhook_logs_without_auth_fails(self, test_api_key):
        """GET /api/api-keys/{key_prefix}/webhook-logs requires auth"""
        key_prefix = test_api_key["key_prefix"]
        
        response = requests.get(f"{BASE_URL}/api/api-keys/{key_prefix}/webhook-logs")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Webhook logs correctly require authentication")


class TestApiKeyUsageTracking:
    """Test that API key usage is tracked"""
    
    def test_usage_count_increments(self, admin_token, test_api_key):
        """API key usage count increments on sync calls"""
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        headers_api = {"X-API-Key": test_api_key["api_key"]}
        key_prefix = test_api_key["key_prefix"]
        
        # Get initial usage count
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers_admin)
        keys = list_response.json()
        key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        initial_count = key.get("usage_count", 0)
        
        # Make a sync call
        requests.get(f"{BASE_URL}/api/sync/products", headers=headers_api)
        time.sleep(0.5)  # Small delay for DB update
        
        # Check usage count incremented
        list_response = requests.get(f"{BASE_URL}/api/api-keys", headers=headers_admin)
        keys = list_response.json()
        key = next((k for k in keys if k["key_prefix"] == key_prefix), None)
        new_count = key.get("usage_count", 0)
        
        assert new_count > initial_count, f"Usage count should increment. Was {initial_count}, now {new_count}"
        print(f"PASS: Usage count incremented from {initial_count} to {new_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
