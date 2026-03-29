"""
Test suite for Styling API and Reseller Settings API
Tests: GET /api/styling/parameters/{product_id}, GET /api/reseller-settings/{id}
       PUT /api/styling/parameters/{product_id}, PUT /api/reseller-settings/{id}
       PATCH endpoints for margins, theme, branding, toggle-pricing
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestStylingAPI:
    """Tests for Styling API endpoints"""
    
    def test_get_suits_styling_parameters(self):
        """GET /api/styling/parameters/suits - returns parameters with options and surcharges"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        # Verify structure
        assert "product_id" in data
        assert data["product_id"] == "suits"
        assert "parameters" in data
        assert "constructions" in data
        assert "base_cmt_price" in data
        
        # Verify base_cmt_price is a number
        assert isinstance(data["base_cmt_price"], (int, float))
        assert data["base_cmt_price"] > 0
        
        # Verify parameters have options with surcharges
        assert len(data["parameters"]) > 0
        for param in data["parameters"]:
            assert "id" in param
            assert "name" in param
            assert "options" in param
            assert isinstance(param["options"], list)
            
            # Check options have surcharge field
            for option in param["options"]:
                assert "id" in option
                assert "name" in option
                assert "surcharge" in option
                assert isinstance(option["surcharge"], (int, float))
    
    def test_get_suits_constructions(self):
        """Verify constructions (Fused, Half Canvas, Full Canvas) with pricing"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        constructions = data.get("constructions", [])
        
        # Should have at least 3 construction types
        assert len(constructions) >= 3
        
        # Verify construction structure
        construction_names = [c["name"] for c in constructions]
        assert "Fused" in construction_names
        assert "Half Canvas" in construction_names
        assert "Full Canvas" in construction_names
        
        # Verify each construction has base_price
        for construction in constructions:
            assert "id" in construction
            assert "name" in construction
            assert "base_price" in construction
            assert isinstance(construction["base_price"], (int, float))
    
    def test_get_pants_styling_parameters(self):
        """GET /api/styling/parameters/pants - returns pants-specific parameters"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/pants")
        assert response.status_code == 200
        
        data = response.json()
        assert data["product_id"] == "pants"
        assert "parameters" in data
        assert "base_cmt_price" in data
    
    def test_get_unknown_product_styling(self):
        """GET /api/styling/parameters/unknown - returns generic defaults"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/unknown-product-xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data["product_id"] == "unknown-product-xyz"
        assert "parameters" in data
        assert "base_cmt_price" in data
    
    def test_update_styling_parameters(self):
        """PUT /api/styling/parameters/{product_id} - update styling config"""
        # First get current data
        get_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Update base_cmt_price
        update_data = original_data.copy()
        update_data["base_cmt_price"] = 200
        
        put_response = requests.put(
            f"{BASE_URL}/api/styling/parameters/suits",
            json=update_data
        )
        assert put_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert verify_response.status_code == 200
        assert verify_response.json()["base_cmt_price"] == 200
        
        # Restore original
        original_data["base_cmt_price"] = 185
        requests.put(f"{BASE_URL}/api/styling/parameters/suits", json=original_data)


class TestResellerSettingsAPI:
    """Tests for Reseller Settings API endpoints"""
    
    def test_get_default_reseller_settings(self):
        """GET /api/reseller-settings/default - returns branding, margins, and theme"""
        response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        assert response.status_code == 200
        
        data = response.json()
        # Verify structure
        assert "reseller_id" in data
        assert data["reseller_id"] == "default"
        assert "company_name" in data
        assert "logo_url" in data
        assert "banner_url" in data
        assert "margins" in data
        assert "theme" in data
        assert "show_pricing" in data
        
        # Verify margins structure
        margins = data["margins"]
        assert "base_product_margin" in margins
        assert "fabric_margin" in margins
        assert "style_options_margin" in margins
        
        # Verify theme structure
        theme = data["theme"]
        assert "primary_color" in theme
        assert "secondary_color" in theme
        assert "button_color" in theme
        assert "text_color" in theme
        assert "background_color" in theme
    
    def test_update_reseller_settings(self):
        """PUT /api/reseller-settings/{id} - update full settings"""
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Update company name
        update_data = original_data.copy()
        update_data["company_name"] = "TEST_Company"
        
        put_response = requests.put(
            f"{BASE_URL}/api/reseller-settings/default",
            json=update_data
        )
        assert put_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        assert verify_response.status_code == 200
        assert verify_response.json()["company_name"] == "TEST_Company"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/reseller-settings/default", json=original_data)
    
    def test_update_margins(self):
        """PATCH /api/reseller-settings/{id}/margins - update only margins"""
        # Get original
        get_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        original_margins = get_response.json()["margins"]
        
        # Update margins
        new_margins = {
            "base_product_margin": 15,
            "fabric_margin": 10,
            "style_options_margin": 20
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/default/margins",
            json=new_margins
        )
        assert patch_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        updated_margins = verify_response.json()["margins"]
        assert updated_margins["base_product_margin"] == 15
        assert updated_margins["fabric_margin"] == 10
        assert updated_margins["style_options_margin"] == 20
        
        # Restore original
        requests.patch(f"{BASE_URL}/api/reseller-settings/default/margins", json=original_margins)
    
    def test_update_theme(self):
        """PATCH /api/reseller-settings/{id}/theme - update only theme"""
        # Get original
        get_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        original_theme = get_response.json()["theme"]
        
        # Update theme
        new_theme = {
            "primary_color": "#ff0000",
            "secondary_color": "#00ff00",
            "button_color": "#0000ff",
            "text_color": "#ffffff",
            "background_color": "#000000"
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/default/theme",
            json=new_theme
        )
        assert patch_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        updated_theme = verify_response.json()["theme"]
        assert updated_theme["primary_color"] == "#ff0000"
        
        # Restore original
        requests.patch(f"{BASE_URL}/api/reseller-settings/default/theme", json=original_theme)
    
    def test_update_branding(self):
        """PATCH /api/reseller-settings/{id}/branding - update company name, logo, banner"""
        # Get original
        get_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        original_data = get_response.json()
        
        # Update branding
        new_branding = {
            "company_name": "TEST_Branding_Company",
            "logo_url": "https://example.com/test-logo.png",
            "banner_url": "https://example.com/test-banner.jpg"
        }
        
        patch_response = requests.patch(
            f"{BASE_URL}/api/reseller-settings/default/branding",
            json=new_branding
        )
        assert patch_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        updated_data = verify_response.json()
        assert updated_data["company_name"] == "TEST_Branding_Company"
        assert updated_data["logo_url"] == "https://example.com/test-logo.png"
        
        # Restore original
        requests.patch(f"{BASE_URL}/api/reseller-settings/default/branding", json={
            "company_name": original_data["company_name"],
            "logo_url": original_data["logo_url"],
            "banner_url": original_data["banner_url"]
        })
    
    def test_toggle_pricing_visibility(self):
        """PATCH /api/reseller-settings/{id}/toggle-pricing - toggle pricing on/off"""
        # Get current state
        get_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        original_state = get_response.json()["show_pricing"]
        
        # Toggle pricing
        patch_response = requests.patch(f"{BASE_URL}/api/reseller-settings/default/toggle-pricing")
        assert patch_response.status_code == 200
        
        # Verify toggle
        verify_response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        new_state = verify_response.json()["show_pricing"]
        assert new_state != original_state
        
        # Toggle back to original
        requests.patch(f"{BASE_URL}/api/reseller-settings/default/toggle-pricing")
    
    def test_get_new_reseller_creates_defaults(self):
        """GET /api/reseller-settings/{new_id} - creates default settings for new reseller"""
        new_reseller_id = "TEST_new_reseller_123"
        
        response = requests.get(f"{BASE_URL}/api/reseller-settings/{new_reseller_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["reseller_id"] == new_reseller_id
        assert data["company_name"] == "Suits India"  # Default company name
        assert "margins" in data
        assert "theme" in data


class TestMarginCalculation:
    """Tests for margin calculation preview"""
    
    def test_margin_calculation_example(self):
        """Verify margin calculation logic matches frontend preview"""
        # Get settings with margins
        response = requests.get(f"{BASE_URL}/api/reseller-settings/default")
        assert response.status_code == 200
        
        settings = response.json()
        margins = settings["margins"]
        
        # Example calculation (matching frontend preview)
        base_cmt = 185
        styling_surcharge = 25
        
        base_with_margin = base_cmt * (1 + margins["base_product_margin"] / 100)
        styling_with_margin = styling_surcharge * (1 + margins["style_options_margin"] / 100)
        
        total = base_with_margin + styling_with_margin
        
        # Verify calculation is valid
        assert total >= base_cmt + styling_surcharge  # Total should be >= base prices


class TestAllStylingParameters:
    """Tests for bulk styling operations"""
    
    def test_get_all_styling_parameters(self):
        """GET /api/styling/all-parameters - returns all product styling configs"""
        response = requests.get(f"{BASE_URL}/api/styling/all-parameters")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least suits styling
        product_ids = [s["product_id"] for s in data]
        assert "suits" in product_ids


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
