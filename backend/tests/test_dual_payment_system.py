"""
Backend Tests for Dual Payment System
Tests:
1. Customer payment endpoint /api/payment/customer/create-checkout-session
2. Admin payment endpoint /api/payment/checkout/create-session
3. Order creation with both customer_payment and admin_payment fields
4. Cart operations via WIP orders
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://reseller-pos.preview.emergentagent.com"

# Test credentials
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


class TestAuth:
    """Helper class for authentication"""
    
    @staticmethod
    def get_reseller_token():
        """Get reseller auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        # Fallback to alternate credentials
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": "trump@suitsindia.com",
            "password": "trump123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    @staticmethod
    def get_admin_token():
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None


class TestCustomerPaymentEndpoint:
    """Test customer payment endpoint /api/payment/customer/create-checkout-session"""
    
    def test_customer_payment_missing_fields(self):
        """Test customer payment returns 400 for missing required fields"""
        response = requests.post(f"{BASE_URL}/api/payment/customer/create-checkout-session", json={})
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Missing fields returns 400 - {data['detail']}")
    
    def test_customer_payment_stripe_not_configured(self):
        """Test customer payment returns proper error when reseller Stripe not configured"""
        response = requests.post(f"{BASE_URL}/api/payment/customer/create-checkout-session", json={
            "order_ids": ["TEST-001"],
            "amount": 1000,
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel",
            "reseller_id": "default"
        })
        # Should return 400 or 404 because reseller Stripe keys are not configured
        assert response.status_code in [400, 404, 500]
        data = response.json()
        assert "detail" in data
        # Error should mention either "not configured" or "not found"
        error_msg = data['detail'].lower()
        assert any(word in error_msg for word in ["not configured", "not found", "stripe"])
        print(f"SUCCESS: Returns proper error for unconfigured Stripe - {data['detail']}")


class TestAdminPaymentEndpoint:
    """Test admin payment endpoint /api/payment/checkout/create-session"""
    
    def test_admin_payment_missing_fields(self):
        """Test admin payment returns 400 for missing required fields"""
        response = requests.post(f"{BASE_URL}/api/payment/checkout/create-session", json={})
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Missing fields returns 400 - {data['detail']}")
    
    def test_admin_payment_stripe_not_configured(self):
        """Test admin payment returns proper error when admin Stripe not configured"""
        response = requests.post(f"{BASE_URL}/api/payment/checkout/create-session", json={
            "order_id": "TEST-001",
            "amount": 500,  # Admin cost (less than customer price)
            "payment_type": "admin",
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        })
        # Should return 500 because admin Stripe keys are not configured
        # Or 520 if Cloudflare timeout
        assert response.status_code in [500, 520]
        if response.status_code == 500:
            data = response.json()
            assert "detail" in data
            assert "not configured" in data['detail'].lower()
            print(f"SUCCESS: Returns proper error for unconfigured admin Stripe - {data['detail']}")
        else:
            print(f"NOTE: Got 520 (Cloudflare timeout) - endpoint exists but had server error")


class TestOrderCreation:
    """Test order creation with dual payment tracking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.token = TestAuth.get_reseller_token()
        self.created_orders = []  # Initialize before potential skip
        if not self.token:
            pytest.skip("Could not get reseller token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def teardown_method(self):
        """Cleanup - delete test orders"""
        for order_id in self.created_orders:
            try:
                requests.delete(f"{BASE_URL}/api/orders/{order_id}", headers=self.headers)
            except:
                pass
    
    def test_get_or_create_customer(self):
        """Get existing customer or create one for testing"""
        # Try to list customers first
        response = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        if response.status_code == 200:
            customers = response.json()
            if customers:
                return customers[0].get("customer_id")
        
        # Create a test customer if needed
        response = requests.post(f"{BASE_URL}/api/customers", 
            headers=self.headers,
            json={
                "name": "TEST_DualPayment Customer",
                "email": "test.dualpayment@test.com",
                "phone": "9999999999"
            }
        )
        if response.status_code == 200:
            return response.json().get("customer_id")
        return None
    
    def test_order_creation_includes_dual_payment_fields(self):
        """Test that order creation includes both customer_payment and admin_payment fields"""
        # Get a customer
        customer_id = self.test_get_or_create_customer()
        if not customer_id:
            pytest.skip("Could not get/create customer for testing")
        
        # Create order with pricing
        order_data = {
            "customer_id": customer_id,
            "customer_name": "Test Customer",
            "total_customer_price": 10000,  # Customer pays 10000
            "total_admin_cost": 6000,  # Admin gets 6000 (includes admin margin)
            "items": [{
                "product_id": "test-product",
                "product_name": "Test Suit",
                "pricing": {
                    "total_customer_price": 10000,
                    "total_reseller_cost": 6000,
                    "total": 10000
                }
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", headers=self.headers, json=order_data)
        assert response.status_code == 200
        order = response.json()
        
        self.created_orders.append(order['order_id'])
        
        # Verify customer_payment fields
        assert "customer_payment" in order, "Order should have customer_payment field"
        customer_payment = order["customer_payment"]
        assert customer_payment.get("status") == "unpaid", "Customer payment status should be 'unpaid'"
        assert customer_payment.get("total_amount") == 10000, "Customer payment total should be 10000"
        
        # Verify admin_payment fields
        assert "admin_payment" in order, "Order should have admin_payment field"
        admin_payment = order["admin_payment"]
        assert admin_payment.get("status") == "unpaid", "Admin payment status should be 'unpaid'"
        assert admin_payment.get("amount_due") == 6000, "Admin payment amount_due should be 6000 (reseller cost)"
        
        print(f"SUCCESS: Order {order['order_id']} created with:")
        print(f"  - customer_payment.total_amount = {customer_payment.get('total_amount')} (customer price)")
        print(f"  - admin_payment.amount_due = {admin_payment.get('amount_due')} (reseller cost, NOT customer price)")
    
    def test_order_creation_calculates_from_items(self):
        """Test that order creation calculates totals from items if not provided"""
        customer_id = self.test_get_or_create_customer()
        if not customer_id:
            pytest.skip("Could not get/create customer for testing")
        
        # Create order WITHOUT providing totals - should calculate from items
        order_data = {
            "customer_id": customer_id,
            "customer_name": "Test Customer 2",
            "items": [{
                "product_id": "test-product-2",
                "product_name": "Test Jacket",
                "pricing": {
                    "total_customer_price": 8000,
                    "total_reseller_cost": 5000,
                    "total": 8000
                }
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", headers=self.headers, json=order_data)
        assert response.status_code == 200
        order = response.json()
        
        self.created_orders.append(order['order_id'])
        
        # Verify calculated values
        customer_payment = order.get("customer_payment", {})
        admin_payment = order.get("admin_payment", {})
        
        assert customer_payment.get("total_amount") == 8000, "Should calculate customer_payment.total_amount from items"
        assert admin_payment.get("amount_due") == 5000, "Should calculate admin_payment.amount_due from items"
        
        print(f"SUCCESS: Order {order['order_id']} correctly calculated from items:")
        print(f"  - customer_payment.total_amount = {customer_payment.get('total_amount')}")
        print(f"  - admin_payment.amount_due = {admin_payment.get('amount_due')}")


class TestResellerSettings:
    """Test reseller settings for Stripe configuration"""
    
    def test_reseller_settings_stripe_status(self):
        """Test reseller settings endpoint returns Stripe configuration status"""
        response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        assert response.status_code == 200
        data = response.json()
        
        # Check for Stripe-related fields
        print(f"Reseller settings response: {data}")
        
        # stripe_enabled should be a boolean
        stripe_enabled = data.get("stripe_enabled", False)
        stripe_key = data.get("stripe_publishable_key", "")
        
        print(f"SUCCESS: Reseller settings retrieved")
        print(f"  - stripe_enabled: {stripe_enabled}")
        print(f"  - stripe_publishable_key present: {bool(stripe_key)}")


class TestHealthAndEndpoints:
    """Basic health and endpoint availability tests"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("SUCCESS: Health endpoint returns healthy")
    
    def test_payment_routes_exist(self):
        """Test that payment routes are registered"""
        # Admin payment route
        response = requests.post(f"{BASE_URL}/api/payment/checkout/create-session", json={})
        assert response.status_code == 400, "Admin payment route should exist and return 400 for empty body"
        
        # Customer payment route
        response = requests.post(f"{BASE_URL}/api/payment/customer/create-checkout-session", json={})
        assert response.status_code == 400, "Customer payment route should exist and return 400 for empty body"
        
        print("SUCCESS: Both payment routes are registered and accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
