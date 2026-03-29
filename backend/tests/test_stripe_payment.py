"""
Stripe Payment API Tests
Tests: POST /api/settings/checkout/create-session, POST /api/settings/checkout/verify-payment
       GET /api/settings/stripe, PUT /api/settings/stripe, GET /api/settings/stripe/public-key
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStripeSettingsAPI:
    """Test Stripe settings endpoints"""
    
    def test_get_stripe_public_key(self):
        """GET /api/settings/stripe/public-key - returns publishable key"""
        response = requests.get(f"{BASE_URL}/api/settings/stripe/public-key")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publishable_key" in data
        # Verify it's a test key format
        if data["publishable_key"]:
            assert data["publishable_key"].startswith("pk_test_") or data["publishable_key"] == ""
        print(f"✓ Public key retrieved: {data['publishable_key'][:20]}..." if data['publishable_key'] else "✓ No public key set")
    
    def test_get_stripe_settings(self):
        """GET /api/settings/stripe - returns publishable key and has_secret_key flag"""
        response = requests.get(f"{BASE_URL}/api/settings/stripe")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "publishable_key" in data
        assert "has_secret_key" in data
        assert isinstance(data["has_secret_key"], bool)
        print(f"✓ Stripe settings: publishable_key exists={bool(data['publishable_key'])}, has_secret_key={data['has_secret_key']}")
    
    def test_update_stripe_settings_publishable_key_only(self):
        """PUT /api/settings/stripe - update only publishable key (preserves secret)"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/settings/stripe")
        original_data = get_response.json()
        
        # Update with only publishable key
        test_key = "pk_test_updatetestkey12345"
        update_response = requests.put(
            f"{BASE_URL}/api/settings/stripe",
            json={"publishable_key": test_key}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/settings/stripe")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["publishable_key"] == test_key
        # Secret key should be preserved
        assert verify_data["has_secret_key"] == original_data["has_secret_key"]
        
        # Restore original key
        requests.put(f"{BASE_URL}/api/settings/stripe", json={"publishable_key": original_data["publishable_key"]})
        print("✓ Publishable key update works, secret key preserved")


class TestStripeCheckoutAPI:
    """Test Stripe checkout session creation and verification"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get authentication token for reseller"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "reseller@test.com", "password": "reseller123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Reseller login failed - skipping checkout tests")
    
    @pytest.fixture
    def wip_order_id(self, reseller_token):
        """Get a WIP order ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/orders?status=wip",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["order_id"]
        pytest.skip("No WIP orders found for testing")
    
    def test_create_checkout_session_success(self, reseller_token, wip_order_id):
        """POST /api/settings/checkout/create-session - creates Stripe checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/create-session",
            json={
                "order_id": wip_order_id,
                "amount": 1000,  # Amount in INR
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            },
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        # Should return session_id and checkout URL
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data
        assert "url" in data
        assert data["session_id"].startswith("cs_test_")
        assert "checkout.stripe.com" in data["url"]
        print(f"✓ Checkout session created: {data['session_id'][:30]}...")
        print(f"✓ Checkout URL: {data['url'][:50]}...")
    
    def test_create_checkout_session_missing_fields(self, reseller_token):
        """POST /api/settings/checkout/create-session - returns 400 for missing fields"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/create-session",
            json={"order_id": "test123"},  # Missing amount, success_url, cancel_url
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print("✓ Missing fields validation works")
    
    def test_verify_payment_invalid_session(self, reseller_token):
        """POST /api/settings/checkout/verify-payment - returns 400 for invalid session"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/verify-payment",
            json={"session_id": "cs_test_invalid_session_id_123"},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        # Stripe returns 400 for invalid session IDs
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}: {response.text}"
        print("✓ Invalid session ID handled correctly")
    
    def test_verify_payment_missing_session_id(self, reseller_token):
        """POST /api/settings/checkout/verify-payment - returns 400 if session_id missing"""
        response = requests.post(
            f"{BASE_URL}/api/settings/checkout/verify-payment",
            json={},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "session_id" in response.text.lower() or "required" in response.text.lower()
        print("✓ Missing session_id validation works")


class TestOrderPaymentIntegration:
    """Test order update after Stripe payment initiation"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get authentication token for reseller"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "reseller@test.com", "password": "reseller123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Reseller login failed")
    
    def test_order_updated_with_stripe_session(self, reseller_token):
        """Verify order is updated with stripe_session_id after checkout creation"""
        # Get a WIP order
        orders_response = requests.get(
            f"{BASE_URL}/api/orders?status=wip",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        if orders_response.status_code != 200 or len(orders_response.json()) == 0:
            pytest.skip("No WIP orders found")
        
        order = orders_response.json()[0]
        order_id = order["order_id"]
        
        # Create checkout session
        checkout_response = requests.post(
            f"{BASE_URL}/api/settings/checkout/create-session",
            json={
                "order_id": order_id,
                "amount": 1500,
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel"
            },
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        if checkout_response.status_code != 200:
            pytest.skip(f"Checkout creation failed: {checkout_response.text}")
        
        session_id = checkout_response.json()["session_id"]
        
        # Fetch order again and verify stripe fields
        order_response = requests.get(
            f"{BASE_URL}/api/orders?status=wip",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        updated_order = next((o for o in order_response.json() if o["order_id"] == order_id), None)
        
        assert updated_order is not None, "Order not found after update"
        assert updated_order.get("stripe_session_id") == session_id
        assert updated_order.get("payment_method") == "stripe"
        assert updated_order.get("payment_status") == "pending"
        
        print(f"✓ Order {order_id} updated with stripe_session_id")
        print(f"  - payment_method: {updated_order.get('payment_method')}")
        print(f"  - payment_status: {updated_order.get('payment_status')}")


class TestStripeWebhook:
    """Test Stripe webhook endpoint (basic validation)"""
    
    def test_webhook_invalid_payload(self):
        """POST /api/settings/webhook - returns 400 for invalid payload"""
        response = requests.post(
            f"{BASE_URL}/api/settings/webhook",
            data="invalid json payload",
            headers={"Content-Type": "application/json"}
        )
        
        # Should reject invalid JSON
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Webhook rejects invalid payload")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
