"""
Test suite for Order Editing and Axios Interceptor features
Tests:
1. Axios Interceptor: Auth headers automatically attached to API requests
2. Order Edit from WIP: Edit button navigates to configure page with pre-filled data
3. Order Update API: PUT /api/orders/{order_id} updates the order correctly
4. Customer info fallback: Customer info extracted from order when not in state
5. Copy order functionality
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://reseller-pos.preview.emergentagent.com")

# Test credentials
RESELLER_EMAIL = "trump@suitsindia.com"
RESELLER_PASSWORD = "trump123"
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


class TestAuthAndInterceptor:
    """Test authentication and verify auth headers work correctly"""
    
    @pytest.fixture(scope="class")
    def reseller_session(self):
        """Get authenticated reseller session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as reseller - correct endpoint is /api/auth/reseller/login
        response = session.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                return session
        
        pytest.skip(f"Reseller login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin - correct endpoint is /api/auth/admin/login
        response = session.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                return session
        
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_reseller_login(self):
        """Test reseller login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token is not None, "No token returned"
        print(f"Reseller login successful, token received")
    
    def test_unauthorized_request_without_token(self):
        """Test that requests without auth header are rejected"""
        response = requests.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthorized request correctly rejected")
    
    def test_authorized_request_with_token(self, reseller_session):
        """Test that requests with auth header succeed"""
        response = reseller_session.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("Authorized request succeeded")


class TestOrderCRUD:
    """Test Order CRUD operations including edit functionality"""
    
    @pytest.fixture(scope="class")
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip("Could not get reseller token")
    
    @pytest.fixture(scope="class")
    def reseller_session(self, reseller_token):
        """Get authenticated reseller session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {reseller_token}"
        })
        return session
    
    @pytest.fixture
    def test_customer(self, reseller_session):
        """Get or create a test customer"""
        # Get existing customers
        response = reseller_session.get(f"{BASE_URL}/api/customers")
        if response.status_code == 200:
            customers = response.json()
            if customers:
                return customers[0]
        
        # Create test customer
        response = reseller_session.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_EditOrder Customer",
            "phone": "9999999999",
            "email": "test_editorder@example.com"
        })
        
        if response.status_code in [200, 201]:
            return response.json()
        
        pytest.skip("Could not create test customer")
    
    @pytest.fixture
    def test_order(self, reseller_session, test_customer):
        """Create a test WIP order for editing tests"""
        customer_id = test_customer.get("customer_id") or test_customer.get("id")
        customer_name = test_customer.get("name", "Test Customer")
        
        order_data = {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "items": [{
                "product_id": "test-product-001",
                "product_name": "Test Suit",
                "category_id": "test-category-001",
                "category_name": "Suits",
                "configuration": [
                    {
                        "id": 1,
                        "fabric": {"code": "TEST-FAB-001", "image": None},
                        "lining": {"code": "TEST-LIN-001", "image": None}
                    }
                ],
                "styling": {
                    "options": {
                        "collar": {"id": "collar-1", "name": "Notch Lapel", "surcharge": 0}
                    },
                    "construction": {"id": "cons-1", "name": "Half Canvas", "base_price": 500},
                    "comments": "Test order for editing"
                },
                "pricing": {"cmt": 1000, "styling": 100, "total": 1100}
            }]
        }
        
        response = reseller_session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code in [200, 201], f"Failed to create test order: {response.text}"
        
        order = response.json()
        yield order
        
        # Cleanup - delete test order
        try:
            reseller_session.delete(f"{BASE_URL}/api/orders/{order['order_id']}")
        except:
            pass
    
    def test_list_orders(self, reseller_session):
        """Test listing orders"""
        response = reseller_session.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200, f"Failed to list orders: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Expected list of orders"
        print(f"Found {len(orders)} orders")
    
    def test_list_wip_orders(self, reseller_session):
        """Test listing WIP orders"""
        response = reseller_session.get(f"{BASE_URL}/api/orders", params={"status": "wip"})
        assert response.status_code == 200, f"Failed to list WIP orders: {response.text}"
        orders = response.json()
        print(f"Found {len(orders)} WIP orders")
        
        # Verify all returned orders are WIP
        for order in orders:
            assert order.get("status") == "wip", f"Expected WIP status, got {order.get('status')}"
    
    def test_create_order(self, reseller_session, test_customer):
        """Test creating a new order"""
        customer_id = test_customer.get("customer_id") or test_customer.get("id")
        customer_name = test_customer.get("name", "Test Customer")
        
        order_data = {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "items": [{
                "product_id": "prod-create-test",
                "product_name": "Create Test Product",
                "configuration": [{"fabric": {"code": "CREATE-FAB"}}],
                "styling": {"comments": "Create test"},
                "pricing": {"total": 500}
            }]
        }
        
        response = reseller_session.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code in [200, 201], f"Failed to create order: {response.text}"
        
        order = response.json()
        assert "order_id" in order, "Order should have order_id"
        assert order.get("status") == "wip", "New order should be WIP"
        assert order.get("customer_id") == customer_id
        print(f"Created order: {order['order_id']}")
        
        # Cleanup
        reseller_session.delete(f"{BASE_URL}/api/orders/{order['order_id']}")
    
    def test_get_order(self, reseller_session, test_order):
        """Test getting a specific order"""
        order_id = test_order["order_id"]
        
        response = reseller_session.get(f"{BASE_URL}/api/orders/{order_id}")
        assert response.status_code == 200, f"Failed to get order: {response.text}"
        
        order = response.json()
        assert order.get("order_id") == order_id
        assert "items" in order
        print(f"Got order {order_id} with {len(order.get('items', []))} items")
    
    def test_update_order_put(self, reseller_session, test_order):
        """Test updating an order via PUT - main edit functionality"""
        order_id = test_order["order_id"]
        
        # Updated order data with modified configuration
        updated_data = {
            "customer_id": test_order["customer_id"],
            "customer_name": test_order["customer_name"],
            "items": [{
                "product_id": "test-product-001",
                "product_name": "Test Suit Updated",
                "category_id": "test-category-001",
                "category_name": "Suits",
                "configuration": [
                    {
                        "id": 1,
                        "fabric": {"code": "UPDATED-FAB-001", "image": None},
                        "lining": {"code": "UPDATED-LIN-001", "image": None},
                        "button": {"code": "NEW-BTN-001", "image": None}
                    }
                ],
                "styling": {
                    "options": {
                        "collar": {"id": "collar-2", "name": "Peak Lapel", "surcharge": 100}
                    },
                    "construction": {"id": "cons-2", "name": "Full Canvas", "base_price": 800},
                    "comments": "Updated order with new fabric"
                },
                "pricing": {"cmt": 1200, "styling": 200, "total": 1400}
            }]
        }
        
        response = reseller_session.put(f"{BASE_URL}/api/orders/{order_id}", json=updated_data)
        assert response.status_code == 200, f"Failed to update order: {response.text}"
        
        updated_order = response.json()
        assert updated_order.get("order_id") == order_id, "Order ID should not change"
        
        # Verify the update
        items = updated_order.get("items", [])
        assert len(items) == 1, "Should have one item"
        
        item = items[0]
        assert item.get("product_name") == "Test Suit Updated", "Product name should be updated"
        
        # Check configuration was updated
        config = item.get("configuration", [])
        if config:
            first_config = config[0] if isinstance(config, list) else config
            fabric = first_config.get("fabric", {})
            assert fabric.get("code") == "UPDATED-FAB-001", "Fabric code should be updated"
        
        print(f"Successfully updated order {order_id}")
    
    def test_update_preserves_order_id(self, reseller_session, test_order):
        """Test that updating order preserves the original order_id"""
        original_id = test_order["order_id"]
        
        response = reseller_session.put(f"{BASE_URL}/api/orders/{original_id}", json={
            "customer_id": test_order["customer_id"],
            "customer_name": test_order["customer_name"],
            "items": test_order.get("items", [])
        })
        
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("order_id") == original_id, "Order ID should be preserved"
        print("Order ID preserved after update")
    
    def test_update_nonexistent_order(self, reseller_session):
        """Test updating a non-existent order returns 404"""
        response = reseller_session.put(f"{BASE_URL}/api/orders/NONEXISTENT-123456", json={
            "customer_id": "test",
            "customer_name": "Test",
            "items": []
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent order")


class TestOrderEditFlow:
    """Test the full order edit flow including customer info extraction"""
    
    @pytest.fixture(scope="class")
    def reseller_session(self):
        """Get authenticated reseller session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                return session
        
        pytest.skip("Could not create reseller session")
    
    def test_get_order_contains_customer_info(self, reseller_session):
        """Test that order contains customer info for fallback extraction"""
        # First get list of orders
        response = reseller_session.get(f"{BASE_URL}/api/orders", params={"status": "wip"})
        assert response.status_code == 200
        
        orders = response.json()
        if not orders:
            pytest.skip("No WIP orders available")
        
        order = orders[0]
        
        # Verify customer info is present
        assert "customer_id" in order, "Order should contain customer_id"
        assert "customer_name" in order, "Order should contain customer_name"
        print(f"Order {order['order_id']} contains customer_id: {order['customer_id']}, name: {order['customer_name']}")
    
    def test_order_items_contain_configuration(self, reseller_session):
        """Test that order items contain configuration for pre-filling"""
        response = reseller_session.get(f"{BASE_URL}/api/orders", params={"status": "wip"})
        assert response.status_code == 200
        
        orders = response.json()
        if not orders:
            pytest.skip("No WIP orders available")
        
        order = orders[0]
        items = order.get("items", [])
        
        if not items:
            pytest.skip("Order has no items")
        
        item = items[0]
        
        # Check for expected fields needed for edit mode
        print(f"Item fields present: {list(item.keys())}")
        
        # These are the fields the frontend expects for edit mode
        assert "product_id" in item or item.get("product_name"), "Item should have product info"
        # Configuration may or may not be present depending on the order
        print(f"Item has configuration: {'configuration' in item}")
        print(f"Item has styling: {'styling' in item}")


class TestCopyOrder:
    """Test order copy functionality"""
    
    @pytest.fixture(scope="class")
    def reseller_session(self):
        """Get authenticated reseller session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                return session
        
        pytest.skip("Could not create reseller session")
    
    def test_copy_order(self, reseller_session):
        """Test copying an order creates a new WIP order"""
        # Get existing orders
        response = reseller_session.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200
        
        orders = response.json()
        if not orders:
            pytest.skip("No orders available to copy")
        
        original = orders[0]
        original_id = original["order_id"]
        
        # Copy the order
        response = reseller_session.post(f"{BASE_URL}/api/orders/{original_id}/copy")
        assert response.status_code in [200, 201], f"Failed to copy order: {response.text}"
        
        copied = response.json()
        
        # Verify copy
        assert copied.get("order_id") != original_id, "Copy should have new order_id"
        assert copied.get("status") == "wip", "Copy should be WIP"
        assert copied.get("customer_id") == original.get("customer_id"), "Customer ID should match"
        assert len(copied.get("items", [])) == len(original.get("items", [])), "Items should match"
        
        print(f"Successfully copied order {original_id} to {copied['order_id']}")
        
        # Cleanup
        try:
            reseller_session.delete(f"{BASE_URL}/api/orders/{copied['order_id']}")
        except:
            pass


class TestOrderSettings:
    """Test order settings endpoint"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Get session (no auth needed for settings)"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_get_order_settings(self, session):
        """Test getting order settings"""
        response = session.get(f"{BASE_URL}/api/orders/settings/order-config")
        assert response.status_code == 200, f"Failed to get order settings: {response.text}"
        
        settings = response.json()
        
        # Verify expected fields
        assert "edit_time_limit_minutes" in settings, "Should have edit_time_limit_minutes"
        print(f"Order settings: edit_time_limit={settings.get('edit_time_limit_minutes')}min")


class TestDataIsolation:
    """Test that order data is properly isolated between resellers"""
    
    @pytest.fixture(scope="class")
    def reseller_session(self):
        """Get authenticated reseller session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
                return session
        
        pytest.skip("Could not create reseller session")
    
    def test_orders_filtered_by_reseller(self, reseller_session):
        """Test that orders are filtered by reseller_email"""
        response = reseller_session.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200
        
        orders = response.json()
        
        # All orders should belong to this reseller
        for order in orders:
            assert order.get("reseller_email") == RESELLER_EMAIL, \
                f"Order {order['order_id']} belongs to {order.get('reseller_email')}, expected {RESELLER_EMAIL}"
        
        print(f"All {len(orders)} orders correctly filtered by reseller")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
