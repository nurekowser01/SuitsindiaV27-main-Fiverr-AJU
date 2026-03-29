"""
Shipping Tracking Module Tests
Tests the shipping tracking API endpoints and customer order history with shipping details
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"


class TestShippingTrackingModule:
    """Test shipping tracking functionality"""
    
    admin_token = None
    reseller_token = None
    test_order_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Get admin token
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.__class__.admin_token = response.json().get("access_token")
        
        # Try to get reseller token - might not exist
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        if response.status_code == 200:
            self.__class__.reseller_token = response.json().get("access_token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    def get_reseller_headers(self):
        return {"Authorization": f"Bearer {self.reseller_token}"}
    
    def test_01_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        self.__class__.admin_token = data["access_token"]
        print("Admin login successful")
    
    def test_02_get_orders_list(self):
        """Test getting admin orders list to find an order to test with"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/admin/all",
            headers=self.get_admin_headers()
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list)
        print(f"Found {len(orders)} orders")
        
        # Find any order to test with (prefer one without shipping details)
        for order in orders:
            if not order.get("shipping_details"):
                self.__class__.test_order_id = order.get("order_id")
                print(f"Using order {self.test_order_id} for testing")
                break
        
        if not self.test_order_id and orders:
            self.__class__.test_order_id = orders[0].get("order_id")
            print(f"Using order {self.test_order_id} for testing (has existing shipping)")
    
    def test_03_add_shipping_tracking_details(self):
        """Test adding shipping tracking details to an order"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        if not self.test_order_id:
            pytest.skip("No order available for testing")
        
        # Add shipping tracking details
        shipping_data = {
            "order_id": self.test_order_id,
            "courier_name": "FedEx Express",
            "awb_number": "TEST123456789",
            "shipped_date": datetime.now().strftime("%Y-%m-%d"),
            "expected_delivery": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "tracking_url": "https://www.fedex.com/fedextrack?trknbr=TEST123456789",
            "notes": "Test shipping tracking added by automated tests"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/shipping-tracking",
            json=shipping_data,
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Failed to add shipping tracking: {response.text}"
        data = response.json()
        assert data.get("message") == "Shipping details added"
        print(f"Successfully added shipping tracking for order {self.test_order_id}")
    
    def test_04_get_shipping_tracking_details(self):
        """Test getting shipping tracking details for an order"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        if not self.test_order_id:
            pytest.skip("No order available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/pricing/shipping-tracking/{self.test_order_id}",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Failed to get shipping tracking: {response.text}"
        data = response.json()
        
        # Verify shipping details are returned
        assert data.get("courier_name") == "FedEx Express"
        assert data.get("awb_number") == "TEST123456789"
        assert "tracking_url" in data
        print(f"Retrieved shipping tracking details: {data}")
    
    def test_05_verify_order_status_changed_to_shipped(self):
        """Test that order status changed to 'shipped' after adding shipping details"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        if not self.test_order_id:
            pytest.skip("No order available for testing")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/admin/all",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200
        orders = response.json()
        
        test_order = next((o for o in orders if o.get("order_id") == self.test_order_id), None)
        assert test_order is not None, f"Order {self.test_order_id} not found"
        
        # Verify status is 'shipped'
        assert test_order.get("status") == "shipped", f"Expected status 'shipped', got '{test_order.get('status')}'"
        
        # Verify shipping_details are embedded in the order
        shipping = test_order.get("shipping_details", {})
        assert shipping.get("awb_number") == "TEST123456789"
        print(f"Order {self.test_order_id} status is 'shipped' with shipping details embedded")


class TestCustomerOrderHistory:
    """Test customer order history with shipping details"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.__class__.admin_token = response.json().get("access_token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_01_get_customers_list(self):
        """Test getting customers list"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        customers = response.json()
        assert isinstance(customers, list)
        print(f"Found {len(customers)} customers")
        
        # Verify customer data structure includes order_count
        if customers:
            customer = customers[0]
            assert "customer_id" in customer
            assert "name" in customer
            assert "order_count" in customer
            print(f"Customer structure verified: {customer.get('customer_id')} - {customer.get('name')}")
    
    def test_02_get_customer_details_with_orders(self):
        """Test getting customer details with order history including shipping details"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # First get customers list
        response = requests.get(
            f"{BASE_URL}/api/admin/customers",
            headers=self.get_admin_headers()
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get customers list")
        
        customers = response.json()
        
        # Find a customer with orders
        customer_with_orders = None
        for customer in customers:
            if customer.get("order_count", 0) > 0:
                customer_with_orders = customer
                break
        
        if not customer_with_orders:
            pytest.skip("No customer with orders found for testing")
        
        customer_id = customer_with_orders["customer_id"]
        
        # Get customer details
        response = requests.get(
            f"{BASE_URL}/api/admin/customers/{customer_id}",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 200, f"Failed to get customer details: {response.text}"
        data = response.json()
        
        # Verify customer details structure
        assert data.get("customer_id") == customer_id
        assert "orders" in data
        assert "total_orders" in data
        assert "total_spent" in data
        
        orders = data.get("orders", [])
        print(f"Customer {customer_id} has {len(orders)} orders, total spent: {data.get('total_spent')}")
        
        # Check if any orders have shipping details
        orders_with_shipping = [o for o in orders if o.get("shipping_details")]
        print(f"Orders with shipping details: {len(orders_with_shipping)}")
        
        if orders_with_shipping:
            shipping = orders_with_shipping[0].get("shipping_details", {})
            print(f"Sample shipping details: courier={shipping.get('courier_name')}, awb={shipping.get('awb_number')}")


class TestResellerShippingView:
    """Test that reseller can view shipping details on their orders"""
    
    reseller_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Try multiple reseller credentials
        credentials = [
            (RESELLER_EMAIL, RESELLER_PASSWORD),
            ("trump@suitsindia.com", "trump123"),  # Known working reseller
        ]
        
        for email, password in credentials:
            response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
                "email": email,
                "password": password
            })
            if response.status_code == 200:
                self.__class__.reseller_token = response.json().get("access_token")
                print(f"Logged in as reseller: {email}")
                break
    
    def get_reseller_headers(self):
        return {"Authorization": f"Bearer {self.reseller_token}"}
    
    def test_01_reseller_can_get_shipping_tracking(self):
        """Test that reseller can get shipping tracking details"""
        if not self.reseller_token:
            pytest.skip("Reseller token not available")
        
        # First get reseller's orders
        response = requests.get(
            f"{BASE_URL}/api/orders?status=shipped",
            headers=self.get_reseller_headers()
        )
        
        if response.status_code != 200:
            print(f"Could not get orders: {response.status_code} - {response.text}")
            pytest.skip("Could not get reseller orders")
        
        orders = response.json()
        
        if not orders:
            pytest.skip("No shipped orders found for reseller")
        
        # Get shipping tracking for first shipped order
        order_id = orders[0].get("order_id")
        
        response = requests.get(
            f"{BASE_URL}/api/pricing/shipping-tracking/{order_id}",
            headers=self.get_reseller_headers()
        )
        
        # Reseller should be able to view shipping tracking
        assert response.status_code == 200, f"Failed to get shipping tracking: {response.text}"
        data = response.json()
        
        print(f"Reseller can view shipping for order {order_id}: {data}")
        
        # If shipping details exist, verify structure
        if data:
            if "courier_name" in data:
                print(f"Shipping details: courier={data.get('courier_name')}, awb={data.get('awb_number')}")


class TestShippingTrackingValidation:
    """Test shipping tracking validation and error handling"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.__class__.admin_token = response.json().get("access_token")
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_01_shipping_tracking_requires_auth(self):
        """Test that shipping tracking endpoints require authentication"""
        # Test POST without auth - FastAPI returns 422 for missing header validation
        response = requests.post(
            f"{BASE_URL}/api/pricing/shipping-tracking",
            json={
                "order_id": "test123",
                "courier_name": "Test",
                "awb_number": "123"
            }
        )
        # Endpoint should reject unauthenticated requests (401 or 422 for missing auth header)
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print(f"POST shipping-tracking requires auth: PASS (status: {response.status_code})")
    
    def test_02_shipping_tracking_invalid_order(self):
        """Test error when adding shipping to non-existent order"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/shipping-tracking",
            json={
                "order_id": "NONEXISTENT_ORDER_ID_12345",
                "courier_name": "FedEx",
                "awb_number": "123456789",
                "shipped_date": "2025-01-15"
            },
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Shipping tracking for invalid order returns 404: PASS")
    
    def test_03_get_shipping_tracking_invalid_order(self):
        """Test error when getting shipping for non-existent order"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/pricing/shipping-tracking/NONEXISTENT_ORDER_ID_12345",
            headers=self.get_admin_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Get shipping tracking for invalid order returns 404: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
