"""
Test suite for Admin Features:
- Admin Customer Management (CRUD + order history)
- Reseller Sources Management (CRUD)
- Order Statuses Management (CRUD)
- Order PDF Generation (Admin-only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL environment variable must be set"

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"

# Test data
TEST_CUSTOMER = {
    "name": "TEST_Customer_" + str(__import__('random').randint(1000, 9999)),
    "phone": "9876543210",
    "email": "test_customer@example.com",
    "address": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "notes": "Test customer for automated testing"
}

TEST_RESELLER_SOURCE = {
    "name": "TEST_Source_" + str(__import__('random').randint(1000, 9999)),
    "description": "Test reseller source for automation",
    "is_active": True
}

TEST_ORDER_STATUS = {
    "name": "test_status_" + str(__import__('random').randint(1000, 9999)),
    "display_name": "Test Status",
    "color": "#ff5733",
    "description": "Test order status",
    "is_active": True
}


class TestAuthSetup:
    """Authentication tests"""
    
    def test_admin_login(self, api_client):
        """Test admin login and get token"""
        response = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "access_token not in response"
        assert "user" in data, "User not in response"
        print(f"✓ Admin login successful")
        return data["access_token"]


class TestAdminCustomerManagement:
    """Test Admin Customer CRUD operations"""
    
    def test_create_customer(self, admin_client):
        """Test creating a new customer"""
        response = admin_client.post(f"{BASE_URL}/api/admin/customers", json=TEST_CUSTOMER)
        assert response.status_code in [200, 201], f"Create customer failed: {response.text}"
        data = response.json()
        assert "customer_id" in data, "customer_id not in response"
        assert data.get("name") == TEST_CUSTOMER["name"] or "Customer created" in data.get("message", "")
        print(f"✓ Customer created with ID: {data.get('customer_id')}")
        return data.get("customer_id")
    
    def test_get_all_customers(self, admin_client):
        """Test retrieving all customers"""
        response = admin_client.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 200, f"Get customers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} customers")
    
    def test_get_all_customers_with_search(self, admin_client):
        """Test searching customers"""
        response = admin_client.get(f"{BASE_URL}/api/admin/customers", params={"search": "TEST"})
        assert response.status_code == 200, f"Search customers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Search returned {len(data)} customers")
    
    def test_customer_crud_full_cycle(self, admin_client):
        """Test full CRUD cycle: Create -> Read -> Update -> Delete"""
        # CREATE
        create_response = admin_client.post(f"{BASE_URL}/api/admin/customers", json=TEST_CUSTOMER)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        customer_id = create_response.json().get("customer_id")
        assert customer_id, "customer_id not returned"
        print(f"  → Created customer: {customer_id}")
        
        # READ - Get customer details
        read_response = admin_client.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert read_response.status_code == 200, f"Read failed: {read_response.text}"
        customer_data = read_response.json()
        assert customer_data["customer_id"] == customer_id
        assert customer_data["name"] == TEST_CUSTOMER["name"]
        assert "orders" in customer_data, "orders field missing in details"
        assert "total_spent" in customer_data, "total_spent field missing"
        print(f"  → Read customer details with {customer_data.get('total_orders', 0)} orders")
        
        # UPDATE
        update_data = {"name": "TEST_Updated_Customer", "notes": "Updated notes"}
        update_response = admin_client.put(f"{BASE_URL}/api/admin/customers/{customer_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"  → Updated customer name")
        
        # VERIFY UPDATE
        verify_response = admin_client.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert verify_response.status_code == 200
        assert verify_response.json()["name"] == "TEST_Updated_Customer"
        print(f"  → Verified update persisted")
        
        # DELETE
        delete_response = admin_client.delete(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"  → Deleted customer")
        
        # VERIFY DELETE
        verify_delete = admin_client.get(f"{BASE_URL}/api/admin/customers/{customer_id}")
        assert verify_delete.status_code == 404, "Customer should not exist after delete"
        print(f"✓ Full CRUD cycle completed successfully")
    
    def test_customer_delete_with_orders_blocked(self, admin_client):
        """Test that customers with orders cannot be deleted"""
        # First, get a customer that might have orders
        all_customers = admin_client.get(f"{BASE_URL}/api/admin/customers").json()
        customer_with_orders = next((c for c in all_customers if c.get("order_count", 0) > 0), None)
        
        if customer_with_orders:
            delete_response = admin_client.delete(f"{BASE_URL}/api/admin/customers/{customer_with_orders['customer_id']}")
            assert delete_response.status_code == 400, "Should not allow deleting customer with orders"
            assert "orders" in delete_response.json().get("detail", "").lower()
            print(f"✓ Delete blocked for customer with {customer_with_orders['order_count']} orders")
        else:
            print("⚠ No customers with orders found to test delete protection")
    
    def test_unauthorized_access(self, api_client):
        """Test that unauthorized access is blocked"""
        response = api_client.get(f"{BASE_URL}/api/admin/customers")
        assert response.status_code == 401, f"Should return 401 for unauthorized access"
        print(f"✓ Unauthorized access blocked")


class TestResellerSourcesManagement:
    """Test Reseller Sources CRUD operations"""
    
    def test_get_reseller_sources(self, admin_client):
        """Test retrieving reseller sources"""
        response = admin_client.get(f"{BASE_URL}/api/admin/reseller-sources")
        assert response.status_code == 200, f"Get sources failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} reseller sources")
    
    def test_reseller_source_crud_cycle(self, admin_client):
        """Test full CRUD cycle for reseller sources"""
        # CREATE
        create_response = admin_client.post(f"{BASE_URL}/api/admin/reseller-sources", json=TEST_RESELLER_SOURCE)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        source_data = create_response.json()
        source_id = source_data.get("id")
        assert source_id, "Source ID not returned"
        print(f"  → Created source: {source_id}")
        
        # READ - Verify creation
        read_response = admin_client.get(f"{BASE_URL}/api/admin/reseller-sources")
        assert read_response.status_code == 200
        sources = read_response.json()
        created_source = next((s for s in sources if s["id"] == source_id), None)
        assert created_source, "Created source not found in list"
        assert created_source["name"] == TEST_RESELLER_SOURCE["name"]
        print(f"  → Verified source in list")
        
        # UPDATE
        update_data = {"name": "Updated_TEST_Source", "is_active": False}
        update_response = admin_client.put(f"{BASE_URL}/api/admin/reseller-sources/{source_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"  → Updated source")
        
        # VERIFY UPDATE
        verify_response = admin_client.get(f"{BASE_URL}/api/admin/reseller-sources")
        updated_source = next((s for s in verify_response.json() if s["id"] == source_id), None)
        assert updated_source["name"] == "Updated_TEST_Source"
        assert updated_source["is_active"] == False
        print(f"  → Verified update persisted")
        
        # DELETE
        delete_response = admin_client.delete(f"{BASE_URL}/api/admin/reseller-sources/{source_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"  → Deleted source")
        
        # VERIFY DELETE
        verify_delete = admin_client.get(f"{BASE_URL}/api/admin/reseller-sources")
        remaining_sources = [s for s in verify_delete.json() if s["id"] == source_id]
        assert len(remaining_sources) == 0, "Source should not exist after delete"
        print(f"✓ Reseller Source CRUD cycle completed successfully")
    
    def test_duplicate_source_name_blocked(self, admin_client):
        """Test that duplicate source names are blocked"""
        unique_source = {"name": "Unique_Test_Source_" + str(__import__('random').randint(10000, 99999)), "is_active": True}
        
        # Create first
        create1 = admin_client.post(f"{BASE_URL}/api/admin/reseller-sources", json=unique_source)
        assert create1.status_code in [200, 201]
        source_id = create1.json().get("id")
        
        # Try to create duplicate
        create2 = admin_client.post(f"{BASE_URL}/api/admin/reseller-sources", json=unique_source)
        assert create2.status_code == 400, "Should block duplicate name"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/admin/reseller-sources/{source_id}")
        print(f"✓ Duplicate source name blocked")


class TestOrderStatusesManagement:
    """Test Order Statuses CRUD operations"""
    
    def test_get_order_statuses(self, admin_client):
        """Test retrieving order statuses"""
        response = admin_client.get(f"{BASE_URL}/api/admin/order-statuses")
        assert response.status_code == 200, f"Get statuses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify system statuses exist
        status_names = [s["name"] for s in data]
        expected_system_statuses = ["wip", "placed", "processing", "shipped", "delivered", "cancelled"]
        for status in expected_system_statuses:
            assert status in status_names, f"System status '{status}' missing"
        
        print(f"✓ Retrieved {len(data)} order statuses with all system statuses present")
    
    def test_order_status_crud_cycle(self, admin_client):
        """Test full CRUD cycle for custom order statuses"""
        # CREATE
        create_response = admin_client.post(f"{BASE_URL}/api/admin/order-statuses", json=TEST_ORDER_STATUS)
        assert create_response.status_code in [200, 201], f"Create failed: {create_response.text}"
        status_data = create_response.json()
        status_id = status_data.get("id")
        assert status_id, "Status ID not returned"
        print(f"  → Created status: {status_id}")
        
        # READ - Verify creation
        read_response = admin_client.get(f"{BASE_URL}/api/admin/order-statuses")
        assert read_response.status_code == 200
        statuses = read_response.json()
        created_status = next((s for s in statuses if s["id"] == status_id), None)
        assert created_status, "Created status not found in list"
        assert created_status["display_name"] == TEST_ORDER_STATUS["display_name"]
        assert created_status["is_system"] == False, "Custom status should not be system"
        print(f"  → Verified status in list")
        
        # UPDATE
        update_data = {"display_name": "Updated Test Status", "color": "#00ff00"}
        update_response = admin_client.put(f"{BASE_URL}/api/admin/order-statuses/{status_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print(f"  → Updated status")
        
        # VERIFY UPDATE
        verify_response = admin_client.get(f"{BASE_URL}/api/admin/order-statuses")
        updated_status = next((s for s in verify_response.json() if s["id"] == status_id), None)
        assert updated_status["display_name"] == "Updated Test Status"
        assert updated_status["color"] == "#00ff00"
        print(f"  → Verified update persisted")
        
        # DELETE
        delete_response = admin_client.delete(f"{BASE_URL}/api/admin/order-statuses/{status_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"  → Deleted status")
        
        # VERIFY DELETE
        verify_delete = admin_client.get(f"{BASE_URL}/api/admin/order-statuses")
        remaining_statuses = [s for s in verify_delete.json() if s["id"] == status_id]
        assert len(remaining_statuses) == 0, "Status should not exist after delete"
        print(f"✓ Order Status CRUD cycle completed successfully")
    
    def test_system_status_delete_blocked(self, admin_client):
        """Test that system statuses cannot be deleted"""
        # Get a system status
        statuses = admin_client.get(f"{BASE_URL}/api/admin/order-statuses").json()
        system_status = next((s for s in statuses if s.get("is_system")), None)
        
        if system_status:
            delete_response = admin_client.delete(f"{BASE_URL}/api/admin/order-statuses/{system_status['id']}")
            assert delete_response.status_code == 400, "Should not allow deleting system status"
            assert "system" in delete_response.json().get("detail", "").lower()
            print(f"✓ System status delete blocked")
        else:
            print("⚠ No system status found to test")
    
    def test_system_status_name_change_blocked(self, admin_client):
        """Test that system status names cannot be changed"""
        statuses = admin_client.get(f"{BASE_URL}/api/admin/order-statuses").json()
        system_status = next((s for s in statuses if s.get("is_system")), None)
        
        if system_status:
            update_response = admin_client.put(
                f"{BASE_URL}/api/admin/order-statuses/{system_status['id']}", 
                json={"name": "new_name"}
            )
            assert update_response.status_code == 400, "Should not allow changing system status name"
            print(f"✓ System status name change blocked")
        else:
            print("⚠ No system status found to test")


class TestOrderPDFGeneration:
    """Test Order PDF Generation (Admin-only)"""
    
    def test_pdf_generation_endpoint_exists(self, admin_client):
        """Test that PDF generation endpoint exists"""
        # First get an order to test with
        orders_response = admin_client.get(f"{BASE_URL}/api/orders/admin/all")
        if orders_response.status_code != 200:
            pytest.skip("Could not fetch orders")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available to test PDF generation")
        
        order_id = orders[0]["order_id"]
        
        # Test PDF endpoint
        pdf_response = admin_client.get(f"{BASE_URL}/api/admin/orders/{order_id}/pdf")
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        
        # Verify it returns HTML content
        content_type = pdf_response.headers.get("content-type", "")
        assert "text/html" in content_type, "Should return HTML content"
        
        # Verify HTML structure
        html_content = pdf_response.text
        assert "<!DOCTYPE html>" in html_content or "<html>" in html_content, "Should be valid HTML"
        assert "SUITS INDIA" in html_content, "Should contain business name"
        assert order_id in html_content, "Should contain order ID"
        
        print(f"✓ PDF generation working for order {order_id}")
    
    def test_pdf_data_endpoint(self, admin_client):
        """Test PDF data endpoint"""
        orders_response = admin_client.get(f"{BASE_URL}/api/orders/admin/all")
        if orders_response.status_code != 200:
            pytest.skip("Could not fetch orders")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders available to test")
        
        order_id = orders[0]["order_id"]
        
        pdf_data_response = admin_client.get(f"{BASE_URL}/api/admin/orders/{order_id}/pdf-data")
        assert pdf_data_response.status_code == 200, f"PDF data fetch failed: {pdf_data_response.text}"
        
        data = pdf_data_response.json()
        assert "order" in data, "Should contain order data"
        assert data["order"]["order_id"] == order_id
        print(f"✓ PDF data endpoint working")
    
    def test_pdf_unauthorized_access_blocked(self, api_client):
        """Test that PDF generation requires admin auth"""
        response = api_client.get(f"{BASE_URL}/api/admin/orders/FAKE123/pdf")
        assert response.status_code == 401, "Should block unauthorized access"
        print(f"✓ PDF endpoint requires admin auth")
    
    def test_pdf_nonexistent_order(self, admin_client):
        """Test PDF generation for non-existent order"""
        response = admin_client.get(f"{BASE_URL}/api/admin/orders/NONEXISTENT123/pdf")
        assert response.status_code == 404, "Should return 404 for non-existent order"
        print(f"✓ PDF returns 404 for non-existent order")


# =====================
# FIXTURES
# =====================

@pytest.fixture
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.fail(f"Admin authentication failed: {response.text}")


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Cleanup will happen naturally as each test deletes its own data
    print("\n[Cleanup] Test suite completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
