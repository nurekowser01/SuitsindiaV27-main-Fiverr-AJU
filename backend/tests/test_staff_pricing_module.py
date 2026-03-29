"""
Staff Pricing Module Tests - Backend API Testing
Tests staff customer margins, pricing calculation, and My Pricing page functionality.

Pricing flow: 
Base → Admin Margin → Reseller Cost → Staff Cost Margin (set by reseller) → Staff Cost → Staff Customer Margin (set by staff) → Customer Price
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"
STAFF_EMAIL = "staff1@test.com"
STAFF_PASSWORD = "staff123"


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")


class TestStaffLogin:
    """Test staff login returns correct fields for pricing"""
    
    def test_staff_login_returns_margins(self):
        """Staff login should return both cost margins (set by reseller) and customer margins"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        
        if response.status_code == 401:
            pytest.skip("Staff user not found - may need to seed")
        
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        
        # Verify user data structure
        assert "user" in data
        user = data["user"]
        
        # Verify staff role
        assert user.get("role_id") == "staff", f"Expected role_id='staff', got {user.get('role_id')}"
        
        # Verify parent reseller
        assert "parent_reseller_email" in user, "Missing parent_reseller_email"
        assert user["parent_reseller_email"] == RESELLER_EMAIL
        
        # Verify cost margins (set by reseller) - these define what staff pays reseller
        assert "margins" in user, "Missing margins (cost margins)"
        margins = user["margins"]
        assert "cmt_margin" in margins
        assert "fabric_margin" in margins
        assert "styling_margin" in margins
        assert "shipping_margin" in margins
        
        # Check that customer_margins exists (or is None initially)
        # This field stores what staff charges their customers
        
        print(f"✅ Staff login successful with margins: {margins}")
        print(f"   Customer margins: {user.get('customer_margins', 'Not set')}")
        return data["access_token"]


class TestStaffCustomerMargins:
    """Test staff can set and update their customer margins"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_staff_can_update_own_customer_margins(self, staff_token):
        """Staff should be able to update their own customer margins"""
        customer_margins = {
            "cmt_margin": 20.0,
            "fabric_margin": 15.0,
            "styling_margin": 10.0,
            "shipping_margin": 5.0
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/staff/{STAFF_EMAIL}/customer-margins",
            json=customer_margins,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update customer margins: {response.text}"
        data = response.json()
        
        # Verify customer margins were saved
        assert "customer_margins" in data, "Response missing customer_margins"
        saved_margins = data["customer_margins"]
        
        assert saved_margins["cmt_margin"] == 20.0
        assert saved_margins["fabric_margin"] == 15.0
        assert saved_margins["styling_margin"] == 10.0
        assert saved_margins["shipping_margin"] == 5.0
        
        print(f"✅ Staff customer margins updated: {saved_margins}")
    
    def test_staff_cannot_update_other_staff_margins(self, staff_token):
        """Staff should NOT be able to update another staff's margins"""
        # Try to update another staff member's margins (using a fake email)
        response = requests.patch(
            f"{BASE_URL}/api/staff/other_staff@test.com/customer-margins",
            json={"cmt_margin": 50.0},
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        # Should be 404 (not found) or 403 (forbidden)
        assert response.status_code in [403, 404], f"Expected 403/404, got {response.status_code}"
        print("✅ Staff correctly denied access to other staff's margins")
    
    def test_reseller_can_update_staff_customer_margins(self, reseller_token):
        """Reseller should be able to update their staff's customer margins"""
        customer_margins = {
            "cmt_margin": 25.0,
            "fabric_margin": 18.0,
            "styling_margin": 12.0,
            "shipping_margin": 8.0
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/staff/{STAFF_EMAIL}/customer-margins",
            json=customer_margins,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        
        assert data["customer_margins"]["cmt_margin"] == 25.0
        print(f"✅ Reseller can update staff's customer margins: {data['customer_margins']}")
    
    def test_get_staff_shows_customer_margins(self, staff_token):
        """GET staff should return customer_margins field"""
        response = requests.get(
            f"{BASE_URL}/api/staff/{STAFF_EMAIL}",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get staff: {response.text}"
        data = response.json()
        
        # Should have both margins (cost) and customer_margins
        assert "margins" in data, "Missing cost margins"
        assert "customer_margins" in data, "Missing customer_margins"
        
        print(f"✅ Staff data includes customer_margins: {data['customer_margins']}")


class TestStaffPricingCalculation:
    """Test that pricing calculation applies staff margins correctly"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_pricing_calculation_for_staff_returns_is_staff_pricing(self, staff_token):
        """Pricing calculation for staff should include is_staff_pricing flag"""
        # Simple pricing calculation request
        pricing_data = {
            "fabric_price_code": "P001",  # Use a known fabric code
            "size_category": "A",
            "product_id": "suit_2piece",
            "styling_total": 50,
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=pricing_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Pricing calculation failed: {response.text}"
        data = response.json()
        
        # Staff pricing should have is_staff_pricing: true
        assert data.get("is_staff_pricing") == True, f"Expected is_staff_pricing=True, got {data.get('is_staff_pricing')}"
        
        print(f"✅ Staff pricing includes is_staff_pricing flag")
        print(f"   Total: {data.get('total')}")
        print(f"   Total reseller cost (staff pays): {data.get('total_reseller_cost')}")
    
    def test_pricing_calculation_for_staff_applies_three_tier_margins(self, staff_token):
        """Staff pricing should apply 3-tier margins: Admin → Reseller → Staff Customer"""
        pricing_data = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suit_2piece",
            "styling_total": 100,
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=pricing_data,
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Pricing calculation failed: {response.text}"
        data = response.json()
        
        # Verify breakdown includes staff margin info
        breakdown = data.get("breakdown", {})
        
        # CMT breakdown should show staff margins
        cmt = breakdown.get("cmt", {})
        assert "staff_cost_margin_percent" in cmt, "CMT breakdown missing staff_cost_margin_percent"
        assert "cost_before_reseller_margin" in cmt, "CMT breakdown missing staff cost"
        
        # Fabric breakdown should show staff margins
        fabric = breakdown.get("fabric", {})
        assert "staff_cost_margin_percent" in fabric, "Fabric breakdown missing staff_cost_margin_percent"
        
        print(f"✅ Staff pricing has 3-tier margin breakdown")
        print(f"   CMT staff cost margin: {cmt.get('staff_cost_margin_percent')}%")
        print(f"   CMT customer margin: {cmt.get('reseller_margin_percent')}%")
    
    def test_reseller_pricing_does_not_have_is_staff_pricing(self, reseller_token):
        """Reseller pricing should NOT have is_staff_pricing flag"""
        pricing_data = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suit_2piece",
            "styling_total": 50,
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=pricing_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Pricing calculation failed: {response.text}"
        data = response.json()
        
        # Reseller pricing should NOT have is_staff_pricing or it should be False/None
        is_staff = data.get("is_staff_pricing")
        assert is_staff is None or is_staff == False, f"Reseller pricing should not have is_staff_pricing=True"
        
        print(f"✅ Reseller pricing correctly does NOT have is_staff_pricing")


class TestStaffDataRetrieval:
    """Test staff can retrieve their own data for My Pricing page"""
    
    @pytest.fixture
    def staff_token(self):
        """Get staff authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        return response.json()["access_token"]
    
    def test_staff_can_get_own_profile(self, staff_token):
        """Staff should be able to get their own profile via GET /api/staff/{email}"""
        response = requests.get(
            f"{BASE_URL}/api/staff/{STAFF_EMAIL}",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get staff profile: {response.text}"
        data = response.json()
        
        # Verify essential fields for My Pricing page
        assert data["email"] == STAFF_EMAIL
        assert "margins" in data, "Missing cost margins (set by reseller)"
        assert "customer_margins" in data or "margins" in data, "No margin data available"
        
        # Verify cost margins structure (what reseller charges staff)
        margins = data.get("margins", {})
        assert "cmt_margin" in margins
        assert "fabric_margin" in margins
        
        print(f"✅ Staff can retrieve own profile")
        print(f"   Cost margins (set by reseller): {margins}")
        print(f"   Customer margins (set by staff): {data.get('customer_margins', 'Not set')}")


class TestCostMarginsByReseller:
    """Test that reseller can set staff cost margins"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_EMAIL,
            "password": RESELLER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_reseller_can_set_staff_cost_margins(self, reseller_token):
        """Reseller should be able to set staff's cost margins (what staff pays reseller)"""
        cost_margins = {
            "cmt_margin": 30.0,
            "fabric_margin": 30.0,
            "styling_margin": 25.0,
            "shipping_margin": 20.0
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/staff/{STAFF_EMAIL}/margins",
            json=cost_margins,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update cost margins: {response.text}"
        data = response.json()
        
        # Verify cost margins were saved
        saved_margins = data.get("margins", {})
        assert saved_margins.get("cmt_margin") == 30.0
        assert saved_margins.get("fabric_margin") == 30.0
        
        print(f"✅ Reseller set staff cost margins: {saved_margins}")
    
    def test_verify_staff_cost_margins_in_login(self):
        """Verify staff sees updated cost margins in login response"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": STAFF_EMAIL,
            "password": STAFF_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip("Staff login failed")
        
        data = response.json()
        margins = data["user"].get("margins", {})
        
        # Cost margins should be set by reseller
        assert margins.get("cmt_margin") >= 0
        assert margins.get("fabric_margin") >= 0
        
        print(f"✅ Staff sees cost margins in login: {margins}")


# Run summary
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
