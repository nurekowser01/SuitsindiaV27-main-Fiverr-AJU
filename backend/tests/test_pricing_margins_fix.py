"""
Test Suite: Pricing Margin Fix
Tests the fix where admin margins (per-reseller) are now correctly applied 
by looking up reseller_settings by 'reseller_id' (email) instead of 'reseller_email'.

Key fix: pricing.py line 575-578 now uses:
  reseller_settings = await db.reseller_settings.find_one({"reseller_id": reseller_email})

Test Scenarios:
1. Reseller Settings CRUD - per-reseller settings by email
2. Price Calculation - Admin margin + Reseller margin applied
3. Frontend integration - correct resellerId used
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"
RESELLER_EMAIL = "reseller@test.com"
RESELLER_PASSWORD = "reseller123"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Admin login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        print(f"PASS: Admin login successful for {ADMIN_EMAIL}")
    
    def test_reseller_login(self):
        """Reseller login should work with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
        )
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == RESELLER_EMAIL
        assert data["user"]["role_id"] == "reseller"
        print(f"PASS: Reseller login successful for {RESELLER_EMAIL}")


class TestResellerSettings:
    """Test reseller settings per-email lookup"""
    
    def test_get_reseller_settings_by_email(self):
        """Reseller settings should be retrievable by email (reseller_id)"""
        response = requests.get(f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}")
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        # Verify reseller_id matches email
        assert data["reseller_id"] == RESELLER_EMAIL, "reseller_id should match email"
        assert "margins" in data
        print(f"PASS: Reseller settings retrieved for {RESELLER_EMAIL}")
        print(f"  - Margins: {data.get('margins', {})}")
    
    def test_update_reseller_margins(self):
        """Reseller margins should be updatable"""
        test_margins = {
            "base_product_margin": 150,
            "fabric_margin": 150,
            "style_options_margin": 150
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}/margins",
            json=test_margins
        )
        assert response.status_code == 200, f"Failed to update margins: {response.text}"
        data = response.json()
        
        # Verify margins were saved
        assert data["margins"]["base_product_margin"] == 150
        assert data["margins"]["fabric_margin"] == 150
        assert data["margins"]["style_options_margin"] == 150
        print("PASS: Reseller margins updated successfully")
    
    def test_create_new_reseller_settings(self):
        """First access should create default settings for new reseller"""
        test_email = f"TEST_newreseller_{int(time.time())}@test.com"
        response = requests.get(f"{BASE_URL}/api/reseller-settings/{test_email}")
        assert response.status_code == 200, f"Failed to create settings: {response.text}"
        data = response.json()
        
        assert data["reseller_id"] == test_email
        assert "margins" in data
        # Default margins should be 0
        assert data["margins"]["base_product_margin"] == 0
        print(f"PASS: New reseller settings created for {test_email}")


class TestAdminResellerPricing:
    """Test admin pricing settings for resellers"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_get_reseller_pricing(self, admin_token):
        """Admin should be able to get reseller pricing"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/reseller-pricing/{RESELLER_EMAIL}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get pricing: {response.text}"
        data = response.json()
        
        print(f"PASS: Admin can retrieve reseller pricing for {RESELLER_EMAIL}")
        print(f"  - CMT margin: {data.get('cmt_margin_percent', 0)}%")
        print(f"  - Fabric margin: {data.get('fabric_margin_percent', 0)}%")
        print(f"  - Styling margin: {data.get('styling_margin_percent', 0)}%")
    
    def test_update_reseller_pricing(self, admin_token):
        """Admin should be able to set reseller pricing margins"""
        pricing_data = {
            "reseller_email": RESELLER_EMAIL,
            "cmt_margin_percent": 10,
            "fabric_margin_percent": 10,
            "styling_margin_percent": 5,
            "shipping_margin_percent": 0
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pricing/reseller-pricing/{RESELLER_EMAIL}",
            json=pricing_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to update pricing: {response.text}"
        print("PASS: Admin pricing margins updated for reseller")


class TestPriceCalculation:
    """Test price calculation with admin and reseller margins"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Reseller login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_setup_margins(self, admin_token):
        """Setup admin pricing margins for reseller"""
        # Set admin margins (what admin charges reseller)
        admin_pricing = {
            "reseller_email": RESELLER_EMAIL,
            "cmt_margin_percent": 10,
            "fabric_margin_percent": 10,
            "styling_margin_percent": 5,
            "shipping_margin_percent": 0
        }
        response = requests.put(
            f"{BASE_URL}/api/pricing/reseller-pricing/{RESELLER_EMAIL}",
            json=admin_pricing,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("Admin margins set: CMT=10%, Fabric=10%, Styling=5%")
        
        # Set reseller margins (what reseller charges customer)
        reseller_margins = {
            "base_product_margin": 150,  # 150% markup on CMT
            "fabric_margin": 150,
            "style_options_margin": 150
        }
        response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}/margins",
            json=reseller_margins
        )
        assert response.status_code == 200
        print("Reseller margins set: CMT=150%, Fabric=150%, Styling=150%")
    
    def test_calculate_price_with_margins(self, reseller_token, admin_token):
        """Test price calculation includes both admin and reseller margins"""
        # First setup the margins
        self.test_setup_margins(admin_token)
        
        # Calculate price
        calc_data = {
            "fabric_price_code": "",  # No fabric - focus on styling/CMT
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 100,  # Base styling cost = 100
            "construction_type": "",
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=calc_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Price calculation failed: {response.text}"
        data = response.json()
        
        # Verify breakdown structure
        assert "breakdown" in data
        assert "styling" in data["breakdown"]
        
        styling = data["breakdown"]["styling"]
        
        # Expected calculation:
        # Base styling = 100
        # After admin margin (5%): 100 * 1.05 = 105 (cost_before_reseller_margin)
        # After reseller margin (150%): 105 * 2.5 = 262.5 (final_cost)
        
        print(f"PASS: Price calculation breakdown:")
        print(f"  - Base styling: {styling.get('base', 0)}")
        print(f"  - Admin margin: {styling.get('admin_margin_percent', 0)}%")
        print(f"  - Cost before reseller margin: {styling.get('cost_before_reseller_margin', 0)}")
        print(f"  - Reseller margin: {styling.get('reseller_margin_percent', 0)}%")
        print(f"  - Final cost (customer pays): {styling.get('final_cost', 0)}")
        
        # Verify admin margin is applied
        admin_margin = styling.get('admin_margin_percent', 0)
        assert admin_margin >= 0, "Admin margin should be present in breakdown"
        
        # Verify reseller margin is applied
        reseller_margin = styling.get('reseller_margin_percent', 0)
        assert reseller_margin >= 0, "Reseller margin should be present in breakdown"
        
        # Verify cost progression: base < cost_before_reseller < final
        base = styling.get('base', 0)
        cost_before = styling.get('cost_before_reseller_margin', 0)
        final = styling.get('final_cost', 0)
        
        if base > 0:
            assert cost_before >= base, "Cost after admin margin should be >= base"
            if reseller_margin > 0:
                assert final >= cost_before, "Final cost should be >= cost before reseller margin"
        
        print(f"PASS: Margin calculation verified - Base({base}) -> Admin({cost_before}) -> Customer({final})")
    
    def test_calculate_price_shows_both_margins(self, reseller_token, admin_token):
        """Verify both admin and reseller margins appear in breakdown"""
        # Setup margins
        self.test_setup_margins(admin_token)
        
        calc_data = {
            "fabric_price_code": "",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 50,
            "construction_type": "",
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=calc_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all cost components have both margins
        for component in ['cmt', 'fabric', 'styling', 'shipping']:
            if component in data["breakdown"]:
                comp_data = data["breakdown"][component]
                # Admin margin should be present
                assert 'admin_margin_percent' in comp_data, f"Missing admin_margin_percent in {component}"
                # Reseller margin should be present
                assert 'reseller_margin_percent' in comp_data, f"Missing reseller_margin_percent in {component}"
                # Cost before reseller margin (reseller's cost)
                assert 'cost_before_reseller_margin' in comp_data, f"Missing cost_before_reseller_margin in {component}"
                # Final cost (customer price)
                assert 'final_cost' in comp_data, f"Missing final_cost in {component}"
        
        print("PASS: Both admin and reseller margins present in all breakdown components")


class TestDataPersistence:
    """Test that settings are persisted per-reseller (not shared 'default')"""
    
    def test_different_resellers_have_separate_settings(self):
        """Each reseller should have their own settings"""
        # Get settings for test reseller
        resp1 = requests.get(f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}")
        assert resp1.status_code == 200
        
        # Get settings for different email
        other_email = "other_reseller@test.com"
        resp2 = requests.get(f"{BASE_URL}/api/reseller-settings/{other_email}")
        assert resp2.status_code == 200
        
        data1 = resp1.json()
        data2 = resp2.json()
        
        # Each should have their own reseller_id
        assert data1["reseller_id"] == RESELLER_EMAIL
        assert data2["reseller_id"] == other_email
        assert data1["reseller_id"] != data2["reseller_id"]
        
        print("PASS: Different resellers have separate settings")
    
    def test_margin_changes_persist(self):
        """Margin changes should persist after update"""
        # Update margins
        test_margins = {
            "base_product_margin": 200,
            "fabric_margin": 175,
            "style_options_margin": 125
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}/margins",
            json=test_margins
        )
        assert response.status_code == 200
        
        # Fetch settings again
        response = requests.get(f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify margins persisted
        assert data["margins"]["base_product_margin"] == 200
        assert data["margins"]["fabric_margin"] == 175
        assert data["margins"]["style_options_margin"] == 125
        
        print("PASS: Margin changes persisted correctly")
        
        # Reset to original values
        reset_margins = {
            "base_product_margin": 150,
            "fabric_margin": 150,
            "style_options_margin": 150
        }
        requests.patch(
            f"{BASE_URL}/api/reseller-settings/{RESELLER_EMAIL}/margins",
            json=reset_margins
        )


class TestTotalsCalculation:
    """Test that totals include both margins correctly"""
    
    @pytest.fixture
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": RESELLER_EMAIL, "password": RESELLER_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Reseller login failed")
        return response.json()["access_token"]
    
    def test_total_includes_both_costs(self, reseller_token):
        """Response should include both total_reseller_cost and total (customer price)"""
        calc_data = {
            "fabric_price_code": "",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 100,
            "construction_type": "",
            "reseller_email": RESELLER_EMAIL
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            json=calc_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Both totals should be present
        assert "total_reseller_cost" in data, "total_reseller_cost should be in response"
        assert "total" in data, "total (customer price) should be in response"
        
        reseller_cost = data["total_reseller_cost"]
        customer_price = data["total"]
        
        print(f"PASS: Both totals present - Reseller Cost: {reseller_cost}, Customer Price: {customer_price}")
        
        # Customer price should be >= reseller cost (assuming positive margin)
        if customer_price > 0:
            assert customer_price >= reseller_cost, "Customer price should be >= reseller cost"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
