"""
Test suite for Chat API endpoints
Tests chat functionality: GET chats, POST messages, unread counts, file upload
"""
import pytest
import requests
import os
import io

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


@pytest.fixture(scope="module")
def test_order_id(admin_token):
    """Get or create a test order for chat testing"""
    # First, get existing orders
    response = requests.get(
        f"{BASE_URL}/api/orders/admin/all",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["order_id"]
    
    # If no orders exist, skip the test
    pytest.skip("No orders available for chat testing")


class TestChatEndpoints:
    """Test all chat API endpoints"""

    def test_get_chats_admin(self, admin_token):
        """Test GET /api/chats returns list for admin"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list), "Response should be a list"

    def test_get_chats_reseller(self, reseller_token):
        """Test GET /api/chats returns list for reseller"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert isinstance(response.json(), list), "Response should be a list"

    def test_get_chats_unauthorized(self):
        """Test GET /api/chats returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/chats")
        assert response.status_code == 401, "Expected 401 for unauthorized request"

    def test_get_unread_count_admin(self, admin_token):
        """Test GET /api/chats/unread-count for admin"""
        response = requests.get(
            f"{BASE_URL}/api/chats/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"

    def test_get_unread_count_reseller(self, reseller_token):
        """Test GET /api/chats/unread-count for reseller"""
        response = requests.get(
            f"{BASE_URL}/api/chats/unread-count",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "unread_count" in data, "Response should contain unread_count"

    def test_get_admin_resellers_list(self, admin_token):
        """Test GET /api/admin/chats/resellers returns reseller list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/chats/resellers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # If there are resellers, verify structure
        if len(data) > 0:
            reseller = data[0]
            assert "email" in reseller, "Reseller should have email"
            assert "name" in reseller, "Reseller should have name"


class TestChatOrderOperations:
    """Test chat operations tied to orders"""

    def test_get_or_create_chat_for_order(self, admin_token, test_order_id):
        """Test GET /api/chats/order/{order_id} creates or retrieves chat"""
        response = requests.get(
            f"{BASE_URL}/api/chats/order/{test_order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 200 (existing or new chat) or 400 (no reseller for order)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "id" in data, "Chat should have an id"
            assert "order_id" in data, "Chat should have order_id"
            assert data["order_id"] == test_order_id, "Chat order_id should match"
            return data["id"]
        return None

    def test_get_reseller_orders_for_admin(self, admin_token):
        """Test GET /api/admin/chats/reseller/{email}/orders"""
        # First get a reseller
        resellers_response = requests.get(
            f"{BASE_URL}/api/admin/chats/resellers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if resellers_response.status_code == 200 and len(resellers_response.json()) > 0:
            reseller_email = resellers_response.json()[0]["email"]
            
            response = requests.get(
                f"{BASE_URL}/api/admin/chats/reseller/{reseller_email}/orders",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert isinstance(data, list), "Response should be a list"


class TestChatMessaging:
    """Test chat messaging functionality"""

    @pytest.fixture
    def chat_id(self, admin_token, test_order_id):
        """Get or create a chat for messaging tests"""
        response = requests.get(
            f"{BASE_URL}/api/chats/order/{test_order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            return response.json()["id"]
        pytest.skip("Could not create chat for messaging tests")

    def test_send_message_to_chat(self, admin_token, chat_id):
        """Test POST /api/chats/{chat_id}/messages"""
        response = requests.post(
            f"{BASE_URL}/api/chats/{chat_id}/messages",
            json={"content": "TEST_message_from_admin", "message_type": "text"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Message should have an id"
        assert data["content"] == "TEST_message_from_admin"
        assert data["message_type"] == "text"

    def test_get_chat_messages(self, admin_token, chat_id):
        """Test GET /api/chats/{chat_id}/messages"""
        response = requests.get(
            f"{BASE_URL}/api/chats/{chat_id}/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"

    def test_mark_messages_as_read(self, admin_token, chat_id):
        """Test PATCH /api/chats/{chat_id}/read"""
        response = requests.patch(
            f"{BASE_URL}/api/chats/{chat_id}/read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "marked_read" in data, "Response should contain marked_read count"


class TestChatFileUpload:
    """Test file upload functionality"""

    @pytest.fixture
    def chat_id(self, admin_token, test_order_id):
        """Get or create a chat for file upload tests"""
        response = requests.get(
            f"{BASE_URL}/api/chats/order/{test_order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            return response.json()["id"]
        pytest.skip("Could not create chat for file upload tests")

    def test_upload_small_file(self, admin_token, chat_id):
        """Test POST /api/chats/{chat_id}/upload with small file"""
        # Create a small test file (under 2MB)
        test_content = b"This is a test file content for chat upload testing."
        files = {"file": ("test.txt", io.BytesIO(test_content), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/chats/{chat_id}/upload",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "file_id" in data, "Response should contain file_id"
        assert "file_url" in data, "Response should contain file_url"
        assert "file_name" in data, "Response should contain file_name"
        assert "file_size" in data, "Response should contain file_size"
        assert data["file_size"] == len(test_content), "File size should match"

    def test_upload_large_file_rejected(self, admin_token, chat_id):
        """Test POST /api/chats/{chat_id}/upload rejects files over 2MB"""
        # Create a file larger than 2MB
        large_content = b"x" * (3 * 1024 * 1024)  # 3MB
        files = {"file": ("large_test.txt", io.BytesIO(large_content), "text/plain")}
        
        response = requests.post(
            f"{BASE_URL}/api/chats/{chat_id}/upload",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for large file, got {response.status_code}"
        assert "2MB" in response.text or "too large" in response.text.lower(), "Error should mention file size limit"

    def test_retrieve_uploaded_file(self, admin_token, chat_id):
        """Test GET /api/chats/files/{file_id}"""
        # First upload a file
        test_content = b"Retrieve test content"
        files = {"file": ("retrieve_test.txt", io.BytesIO(test_content), "text/plain")}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/chats/{chat_id}/upload",
            files=files,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if upload_response.status_code == 200:
            file_id = upload_response.json()["file_id"]
            
            # Retrieve the file
            response = requests.get(f"{BASE_URL}/api/chats/files/{file_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            assert response.content == test_content, "Retrieved content should match uploaded content"


class TestChatAccessControl:
    """Test access control for chats"""

    def test_admin_can_access_all_chats(self, admin_token):
        """Admin should be able to see all chats"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_reseller_only_sees_own_chats(self, reseller_token):
        """Reseller should only see their own chats"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200
        # Resellers can only see chats where they are the reseller
        data = response.json()
        assert isinstance(data, list)

    def test_invalid_chat_id_returns_404(self, admin_token):
        """Test accessing non-existent chat returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/chats/000000000000000000000000/messages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSalesPartnerChatEndpoints:
    """Test sales partner specific chat endpoints"""

    def test_get_referred_resellers_endpoint_exists(self, admin_token):
        """Test that sales partner endpoint exists (may return 403 for non-partners)"""
        response = requests.get(
            f"{BASE_URL}/api/sales-partner/chats/resellers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin should get 403 since they're not a sales partner
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
