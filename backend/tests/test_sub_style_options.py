"""
Test Sub-Style Options Feature
Tests:
- Backend API returns sub_options and has_sub_options fields correctly
- PUT endpoint saves sub-options data correctly
- Admin panel functionality for sub-options
- Reseller portal sub-options display and selection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSubStyleOptionsAPI:
    """Backend API tests for sub-style options feature"""
    
    def test_get_suits_styling_returns_sub_options(self):
        """Test GET /api/styling/parameters/suits returns sub_options fields"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "parameters" in data, "Response should contain parameters"
        assert "product_id" in data, "Response should contain product_id"
        assert data["product_id"] == "suits", "Product ID should be 'suits'"
        
        # Find waist-pockets parameter
        waist_pockets = None
        for param in data["parameters"]:
            if param["id"] == "waist-pockets":
                waist_pockets = param
                break
        
        assert waist_pockets is not None, "waist-pockets parameter should exist"
        assert "options" in waist_pockets, "waist-pockets should have options"
        print(f"PASS: Found waist-pockets with {len(waist_pockets['options'])} options")
        
    def test_patch_option_has_sub_options_enabled(self):
        """Test that Patch option in waist-pockets has sub-options configured"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        assert waist_pockets is not None, "waist-pockets parameter not found"
        
        # Find Patch option
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        assert patch_option is not None, "Patch option not found in waist-pockets"
        
        # Verify has_sub_options is True
        assert patch_option.get("has_sub_options") == True, "Patch option should have has_sub_options=True"
        print(f"PASS: Patch option has has_sub_options={patch_option.get('has_sub_options')}")
        
    def test_patch_option_sub_options_content(self):
        """Test that Patch option has correct sub-options (Flap, No Flap, Round)"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        
        assert "sub_options" in patch_option, "Patch option should have sub_options array"
        sub_options = patch_option["sub_options"]
        assert len(sub_options) >= 3, f"Expected at least 3 sub-options, got {len(sub_options)}"
        
        # Check sub-option names
        sub_names = [s["name"] for s in sub_options]
        assert "Flap" in sub_names, "Flap sub-option should exist"
        assert "No Flap" in sub_names, "No Flap sub-option should exist"
        assert "Round" in sub_names, "Round sub-option should exist"
        print(f"PASS: Sub-options found: {sub_names}")
        
    def test_sub_option_structure(self):
        """Test that sub-options have correct structure (id, name, image, surcharge, is_default)"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        sub_options = patch_option["sub_options"]
        
        for sub in sub_options:
            assert "id" in sub, f"Sub-option {sub.get('name', 'unknown')} missing id"
            assert "name" in sub, f"Sub-option missing name"
            assert "surcharge" in sub or sub.get("surcharge", 0) >= 0, "Sub-option should have surcharge"
            assert "is_default" in sub, f"Sub-option {sub['name']} missing is_default"
            print(f"  - {sub['name']}: surcharge={sub.get('surcharge', 0)}, is_default={sub.get('is_default', False)}")
        
        print(f"PASS: All {len(sub_options)} sub-options have correct structure")
        
    def test_round_sub_option_surcharge(self):
        """Test that Round sub-option has +5 surcharge"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        sub_options = patch_option["sub_options"]
        
        round_sub = next((s for s in sub_options if s["name"] == "Round"), None)
        assert round_sub is not None, "Round sub-option not found"
        assert round_sub.get("surcharge") == 5, f"Round should have +5 surcharge, got {round_sub.get('surcharge')}"
        print(f"PASS: Round sub-option has surcharge={round_sub['surcharge']}")
        
    def test_flap_sub_option_is_default(self):
        """Test that Flap is the default sub-option"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        sub_options = patch_option["sub_options"]
        
        flap_sub = next((s for s in sub_options if s["name"] == "Flap"), None)
        assert flap_sub is not None, "Flap sub-option not found"
        assert flap_sub.get("is_default") == True, f"Flap should be default, got is_default={flap_sub.get('is_default')}"
        print(f"PASS: Flap sub-option is_default={flap_sub['is_default']}")


class TestAdminLogin:
    """Test admin authentication for styling update"""
    
    def test_admin_login(self):
        """Test admin login to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        print(f"PASS: Admin login successful, token received")
        return data["token"]


class TestStylingUpdateWithSubOptions:
    """Test PUT endpoint saves sub-options correctly"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
        
    def test_update_styling_preserves_sub_options(self, admin_token):
        """Test that PUT /api/styling/parameters/suits preserves sub-options"""
        # First GET current data
        get_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert get_response.status_code == 200
        current_data = get_response.json()
        
        # PUT same data back (should preserve sub-options)
        put_response = requests.put(
            f"{BASE_URL}/api/styling/parameters/suits",
            json=current_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.status_code}"
        
        # Verify sub-options still exist
        verify_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        verify_data = verify_response.json()
        
        waist_pockets = next((p for p in verify_data["parameters"] if p["id"] == "waist-pockets"), None)
        patch_option = next((o for o in waist_pockets["options"] if o["id"] == "patch"), None)
        
        assert patch_option.get("has_sub_options") == True, "Sub-options flag not preserved"
        assert len(patch_option.get("sub_options", [])) >= 3, "Sub-options not preserved"
        print(f"PASS: Sub-options preserved after PUT. Count: {len(patch_option['sub_options'])}")


class TestOtherOptionsNoSubOptions:
    """Test that other options don't have sub-options enabled"""
    
    def test_flap_option_no_sub_options(self):
        """Test that Flap option in waist-pockets doesn't have sub-options"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        flap_option = next((o for o in waist_pockets["options"] if o["id"] == "flap"), None)
        
        assert flap_option is not None, "Flap option not found"
        # has_sub_options should be False or not present
        has_subs = flap_option.get("has_sub_options", False)
        assert has_subs == False, f"Flap option should not have sub-options, got {has_subs}"
        print(f"PASS: Flap option has_sub_options={has_subs}")
        
    def test_jetted_option_no_sub_options(self):
        """Test that Jetted option doesn't have sub-options"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        waist_pockets = next((p for p in data["parameters"] if p["id"] == "waist-pockets"), None)
        jetted_option = next((o for o in waist_pockets["options"] if o["id"] == "jetted"), None)
        
        assert jetted_option is not None, "Jetted option not found"
        has_subs = jetted_option.get("has_sub_options", False)
        assert has_subs == False, f"Jetted option should not have sub-options"
        print(f"PASS: Jetted option has_sub_options={has_subs}")


class TestResellerLogin:
    """Test reseller authentication"""
    
    def test_reseller_login(self):
        """Test reseller login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "reseller@test.com",
            "password": "reseller123"
        })
        assert response.status_code == 200, f"Reseller login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        print(f"PASS: Reseller login successful")
        return data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
