"""
Test Staff Order Ownership - Testing the five bug fixes:
1. Staff-created orders appear under parent reseller's orders
2. Staff tab shows orders where created_by != reseller_email
3. Staff can update/copy orders belonging to parent reseller
4. Order creation by staff sets reseller_email to parent_reseller_email
5. Staff users see parent reseller's orders in WIP/Placed tabs
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@suitsindia.com", "password": "admin"}
RESELLER_CREDS = {"email": "reseller@test.com", "password": "reseller123"}
STAFF_CREDS = {"email": "staff.reseller@test.com", "password": "staff123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json=ADMIN_CREDS
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def reseller_token():
    """Get reseller auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/reseller/login",
        json=RESELLER_CREDS
    )
    assert response.status_code == 200, f"Reseller login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def staff_token():
    """Get staff auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/reseller/login",
        json=STAFF_CREDS
    )
    assert response.status_code == 200, f"Staff login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_customer(reseller_token):
    """Create or get test customer for order tests"""
    headers = {"Authorization": f"Bearer {reseller_token}"}
    
    # Try to find existing customer
    response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
    if response.status_code == 200:
        customers = response.json()
        if customers:
            return customers[0]
    
    # Create new customer
    customer_data = {
        "name": "TEST_Staff_Customer",
        "phone": "+91 9999888877",
        "email": "test.staff.customer@test.com"
    }
    response = requests.post(
        f"{BASE_URL}/api/customers",
        json=customer_data,
        headers=headers
    )
    assert response.status_code in [200, 201], f"Create customer failed: {response.text}"
    return response.json()


class TestStaffAuthentication:
    """Test staff user authentication and user info"""
    
    def test_staff_login_returns_parent_reseller_email(self):
        """Staff user login response should include parent_reseller_email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=STAFF_CREDS
        )
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        
        data = response.json()
        user = data.get("user", {})
        assert user.get("role") == "staff" or user.get("role_id") == "staff"
        assert user.get("parent_reseller_email") == "reseller@test.com", \
            f"Expected parent_reseller_email='reseller@test.com', got {user.get('parent_reseller_email')}"
    
    def test_reseller_login_does_not_have_parent_reseller_email(self, reseller_token):
        """Regular reseller should not have parent_reseller_email"""
        headers = {"Authorization": f"Bearer {reseller_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        user = response.json()
        assert user.get("role") in ["reseller", None] or user.get("role_id") == "reseller"
        # Parent reseller email should either not exist or be empty for resellers
        parent_email = user.get("parent_reseller_email")
        assert not parent_email or parent_email == user.get("email"), \
            f"Reseller should not have parent_reseller_email pointing to another user"


class TestStaffOrderCreation:
    """Test that staff order creation correctly sets reseller_email to parent"""
    
    def test_staff_create_order_sets_parent_reseller_email(self, staff_token, test_customer):
        """Order created by staff should have reseller_email = parent_reseller_email"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        order_data = {
            "customer_id": test_customer.get("customer_id"),
            "customer_name": test_customer.get("name"),
            "items": [{
                "product_id": "test-product",
                "product_name": "TEST Staff Order Product",
                "pricing": {"total_customer_price": 100, "total_reseller_cost": 80}
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers
        )
        assert response.status_code == 200, f"Create order failed: {response.text}"
        
        order = response.json()
        # Key assertion: reseller_email should be parent's email
        assert order.get("reseller_email") == "reseller@test.com", \
            f"Expected reseller_email='reseller@test.com', got {order.get('reseller_email')}"
        
        # created_by should be the staff's email
        assert order.get("created_by") == "staff.reseller@test.com", \
            f"Expected created_by='staff.reseller@test.com', got {order.get('created_by')}"
        
        # Store order_id for cleanup
        pytest.staff_created_order_id = order.get("order_id")
        return order.get("order_id")
    
    def test_reseller_create_order_sets_own_email(self, reseller_token, test_customer):
        """Order created by reseller should have reseller_email = own email"""
        headers = {"Authorization": f"Bearer {reseller_token}"}
        
        order_data = {
            "customer_id": test_customer.get("customer_id"),
            "customer_name": test_customer.get("name"),
            "items": [{
                "product_id": "test-product",
                "product_name": "TEST Reseller Order Product",
                "pricing": {"total_customer_price": 100, "total_reseller_cost": 80}
            }]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers
        )
        assert response.status_code == 200, f"Create order failed: {response.text}"
        
        order = response.json()
        assert order.get("reseller_email") == "reseller@test.com", \
            f"Expected reseller_email='reseller@test.com', got {order.get('reseller_email')}"
        assert order.get("created_by") == "reseller@test.com", \
            f"Expected created_by='reseller@test.com', got {order.get('created_by')}"
        
        pytest.reseller_created_order_id = order.get("order_id")
        return order.get("order_id")


class TestStaffOrderVisibility:
    """Test that staff can see parent reseller's orders"""
    
    def test_staff_can_see_wip_orders(self, staff_token):
        """Staff should see WIP orders belonging to parent reseller"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "wip"},
            headers=headers
        )
        assert response.status_code == 200, f"List orders failed: {response.text}"
        
        orders = response.json()
        # Staff should see orders where reseller_email matches parent_reseller_email
        for order in orders:
            assert order.get("reseller_email") == "reseller@test.com", \
                f"Staff seeing order from wrong reseller: {order.get('reseller_email')}"
    
    def test_reseller_can_see_staff_created_orders_in_wip(self, reseller_token):
        """Reseller should see orders created by their staff in WIP tab"""
        headers = {"Authorization": f"Bearer {reseller_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "wip"},
            headers=headers
        )
        assert response.status_code == 200, f"List orders failed: {response.text}"
        
        orders = response.json()
        # Find the staff-created order
        staff_created = [o for o in orders if o.get("created_by") == "staff.reseller@test.com"]
        assert len(staff_created) > 0, "Reseller should see staff-created orders in WIP tab"
    
    def test_staff_tab_shows_staff_created_orders(self, reseller_token):
        """Staff tab (status=staff) should show orders where created_by != reseller_email"""
        headers = {"Authorization": f"Bearer {reseller_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "staff"},
            headers=headers
        )
        assert response.status_code == 200, f"List staff orders failed: {response.text}"
        
        orders = response.json()
        # All orders in staff tab should have created_by != reseller_email
        for order in orders:
            assert order.get("created_by") != order.get("reseller_email"), \
                f"Staff tab should only show orders where created_by != reseller_email"
            assert order.get("created_by") is not None, \
                "Staff tab orders should have created_by field"


class TestStaffOrderOperations:
    """Test that staff can update/copy orders belonging to parent reseller"""
    
    def test_staff_can_view_parent_reseller_order(self, staff_token):
        """Staff should be able to view orders owned by parent reseller"""
        headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Get any WIP order
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "wip"},
            headers=headers
        )
        assert response.status_code == 200
        orders = response.json()
        
        if orders:
            order_id = orders[0].get("order_id")
            # Fetch specific order
            response = requests.get(
                f"{BASE_URL}/api/orders/{order_id}",
                headers=headers
            )
            assert response.status_code == 200, f"Staff cannot view parent's order: {response.text}"
    
    def test_staff_can_update_parent_reseller_order(self, staff_token, reseller_token, test_customer):
        """Staff should be able to update orders owned by parent reseller"""
        headers_reseller = {"Authorization": f"Bearer {reseller_token}"}
        headers_staff = {"Authorization": f"Bearer {staff_token}"}
        
        # Create order as reseller first
        order_data = {
            "customer_id": test_customer.get("customer_id"),
            "customer_name": test_customer.get("name"),
            "items": [{
                "product_id": "test-product",
                "product_name": "TEST Update Order",
                "pricing": {"total_customer_price": 200, "total_reseller_cost": 150}
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers_reseller
        )
        assert response.status_code == 200
        order_id = response.json().get("order_id")
        
        # Now staff tries to update it
        update_data = {"notes": "Updated by staff"}
        response = requests.put(
            f"{BASE_URL}/api/orders/{order_id}",
            json=update_data,
            headers=headers_staff
        )
        assert response.status_code == 200, f"Staff cannot update parent's order: {response.text}"
        
        updated_order = response.json()
        assert updated_order.get("notes") == "Updated by staff"
        
        # Cleanup
        pytest.test_update_order_id = order_id
    
    def test_staff_can_copy_parent_reseller_order(self, staff_token, reseller_token, test_customer):
        """Staff should be able to copy orders owned by parent reseller"""
        headers_reseller = {"Authorization": f"Bearer {reseller_token}"}
        headers_staff = {"Authorization": f"Bearer {staff_token}"}
        
        # Create order as reseller first
        order_data = {
            "customer_id": test_customer.get("customer_id"),
            "customer_name": test_customer.get("name"),
            "items": [{
                "product_id": "test-product",
                "product_name": "TEST Copy Order",
                "pricing": {"total_customer_price": 300, "total_reseller_cost": 250}
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers_reseller
        )
        assert response.status_code == 200
        original_order_id = response.json().get("order_id")
        
        # Now staff tries to copy it
        response = requests.post(
            f"{BASE_URL}/api/orders/{original_order_id}/copy",
            headers=headers_staff
        )
        assert response.status_code == 200, f"Staff cannot copy parent's order: {response.text}"
        
        copied_order = response.json()
        # Copied order should also belong to parent reseller
        assert copied_order.get("reseller_email") == "reseller@test.com", \
            f"Copied order should have parent reseller's email"
        # But created_by should be staff
        assert copied_order.get("created_by") == "staff.reseller@test.com", \
            f"Copied order should have staff as created_by"
        
        pytest.test_copy_original_id = original_order_id
        pytest.test_copy_new_id = copied_order.get("order_id")
    
    def test_staff_can_update_order_status(self, staff_token, reseller_token, test_customer):
        """Staff should be able to update order status for parent reseller's orders"""
        headers_reseller = {"Authorization": f"Bearer {reseller_token}"}
        headers_staff = {"Authorization": f"Bearer {staff_token}"}
        
        # Create order as reseller
        order_data = {
            "customer_id": test_customer.get("customer_id"),
            "customer_name": test_customer.get("name"),
            "items": [{
                "product_id": "test-product",
                "product_name": "TEST Status Update",
                "pricing": {"total_customer_price": 400, "total_reseller_cost": 350}
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=headers_reseller
        )
        assert response.status_code == 200
        order_id = response.json().get("order_id")
        
        # Staff tries to update status - note: this might be restricted by business logic
        # depending on if staff should be able to place orders
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "placed"},
            headers=headers_staff
        )
        # Should succeed (staff can update status)
        assert response.status_code == 200, f"Staff cannot update order status: {response.text}"
        
        pytest.test_status_order_id = order_id


class TestStaffCannotAccessOtherResellerOrders:
    """Test that staff cannot access orders from other resellers"""
    
    def test_staff_cannot_see_other_reseller_orders(self, staff_token, admin_token):
        """Staff should NOT see orders from resellers other than their parent"""
        headers_staff = {"Authorization": f"Bearer {staff_token}"}
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all orders as admin to check
        response = requests.get(
            f"{BASE_URL}/api/orders/admin/all",
            headers=headers_admin
        )
        assert response.status_code == 200
        all_orders = response.json()
        
        # Find orders NOT belonging to reseller@test.com
        other_reseller_orders = [o for o in all_orders if o.get("reseller_email") != "reseller@test.com"]
        
        if other_reseller_orders:
            # Staff tries to access one of these orders
            other_order_id = other_reseller_orders[0].get("order_id")
            response = requests.get(
                f"{BASE_URL}/api/orders/{other_order_id}",
                headers=headers_staff
            )
            # Should be 403 Forbidden
            assert response.status_code == 403, \
                f"Staff should not be able to access other reseller's orders, got {response.status_code}"


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_orders(self, admin_token):
        """Delete test orders created during tests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        orders_to_delete = []
        
        if hasattr(pytest, 'staff_created_order_id') and pytest.staff_created_order_id:
            orders_to_delete.append(pytest.staff_created_order_id)
        if hasattr(pytest, 'reseller_created_order_id') and pytest.reseller_created_order_id:
            orders_to_delete.append(pytest.reseller_created_order_id)
        if hasattr(pytest, 'test_update_order_id') and pytest.test_update_order_id:
            orders_to_delete.append(pytest.test_update_order_id)
        if hasattr(pytest, 'test_copy_original_id') and pytest.test_copy_original_id:
            orders_to_delete.append(pytest.test_copy_original_id)
        if hasattr(pytest, 'test_copy_new_id') and pytest.test_copy_new_id:
            orders_to_delete.append(pytest.test_copy_new_id)
        if hasattr(pytest, 'test_status_order_id') and pytest.test_status_order_id:
            orders_to_delete.append(pytest.test_status_order_id)
        
        for order_id in orders_to_delete:
            try:
                requests.delete(f"{BASE_URL}/api/orders/admin/{order_id}", headers=headers)
            except:
                pass
        
        # Always pass cleanup
        assert True
