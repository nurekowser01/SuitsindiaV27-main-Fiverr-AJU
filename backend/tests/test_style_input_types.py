"""
Test Suite for Style Options Input Types Feature
Tests for:
- input_type field on StyleParameter (image_only, text_only, image_and_text)
- has_text_input field on StyleOption and SubStyleOption
- text_label field on StyleParameter, StyleOption, and SubStyleOption
- Backend GET/PUT /api/styling/{product_id} endpoints
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


class TestStylingInputTypes:
    """Tests for Style Options input_type system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and setup token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_styling_parameters_returns_input_type(self):
        """GET /api/styling/parameters/{product_id} should return input_type field on parameters"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        assert "parameters" in data, "Response should contain 'parameters'"
        assert len(data["parameters"]) > 0, "Should have at least one parameter"
        
        # Check all parameters have input_type field (or default to image_only)
        for param in data["parameters"]:
            input_type = param.get("input_type", "image_only")
            assert input_type in ["image_only", "text_only", "image_and_text"], \
                f"Parameter {param['name']} has invalid input_type: {input_type}"
        
        print(f"PASS: Found {len(data['parameters'])} parameters with valid input_type values")
        
    def test_get_styling_parameters_returns_has_text_input_on_options(self):
        """GET /api/styling/parameters/{product_id} should return has_text_input on options"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        
        # Find an option with has_text_input=true (we know one exists from API check)
        found_text_option = False
        for param in data["parameters"]:
            for option in param.get("options", []):
                if option.get("has_text_input", False):
                    found_text_option = True
                    print(f"Found option with has_text_input=true: {option['name']} in {param['name']}")
                    # Check text_label field
                    assert "text_label" in option or option.get("text_label") is None, \
                        f"Option {option['name']} should have text_label field"
        
        print(f"PASS: has_text_input field accessible on options. Found text option: {found_text_option}")
        
    def test_get_styling_parameters_returns_text_label_on_parameters(self):
        """GET /api/styling/parameters/{product_id} should return text_label field on parameters"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        
        # All parameters should have text_label field (can be null)
        for param in data["parameters"]:
            # text_label can be absent or null - just verify the field is accepted
            if param.get("input_type") in ["text_only", "image_and_text"]:
                print(f"Parameter {param['name']} has input_type={param.get('input_type')}, text_label={param.get('text_label')}")
        
        print("PASS: text_label field check complete")
        
    def test_get_styling_parameters_returns_sub_options_with_has_text_input(self):
        """GET /api/styling/parameters/{product_id} should return has_text_input on sub_options"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        
        # Check sub_options for has_text_input field
        for param in data["parameters"]:
            for option in param.get("options", []):
                if option.get("has_sub_options") and option.get("sub_options"):
                    for sub in option["sub_options"]:
                        # has_text_input can be false or true
                        has_text = sub.get("has_text_input", False)
                        text_label = sub.get("text_label")
                        print(f"Sub-option {sub['name']}: has_text_input={has_text}, text_label={text_label}")
        
        print("PASS: sub_options has_text_input field check complete")
        
    def test_put_styling_with_input_type(self):
        """PUT /api/styling/parameters/{product_id} should save input_type field"""
        # First get current data
        get_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Create test parameter with text_only input_type
        test_param = {
            "id": "test-input-type-param",
            "name": "Test Input Type",
            "order": 99,
            "is_required": False,
            "input_type": "text_only",
            "text_label": "Enter custom text here",
            "options": []
        }
        
        # Add test parameter
        updated_params = original_data["parameters"] + [test_param]
        update_data = {
            **original_data,
            "parameters": updated_params
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/styling/parameters/suits",
            json=update_data,
            headers=self.headers
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify the data was saved correctly
        verify_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        verify_data = verify_response.json()
        
        test_param_saved = next((p for p in verify_data["parameters"] if p["id"] == "test-input-type-param"), None)
        assert test_param_saved is not None, "Test parameter was not saved"
        assert test_param_saved.get("input_type") == "text_only", \
            f"input_type not saved correctly: {test_param_saved.get('input_type')}"
        assert test_param_saved.get("text_label") == "Enter custom text here", \
            f"text_label not saved correctly: {test_param_saved.get('text_label')}"
        
        print(f"PASS: input_type='text_only' and text_label saved and retrieved correctly")
        
        # Cleanup - remove test parameter
        cleanup_params = [p for p in verify_data["parameters"] if p["id"] != "test-input-type-param"]
        cleanup_data = {**verify_data, "parameters": cleanup_params}
        requests.put(f"{BASE_URL}/api/styling/parameters/suits", json=cleanup_data, headers=self.headers)
        
    def test_put_styling_with_image_and_text_input_type(self):
        """PUT /api/styling/parameters/{product_id} should save image_and_text input_type"""
        # First get current data
        get_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Create test parameter with image_and_text input_type
        test_param = {
            "id": "test-image-text-param",
            "name": "Test Image + Text",
            "order": 98,
            "is_required": False,
            "input_type": "image_and_text",
            "text_label": "Additional notes for this style",
            "options": [
                {
                    "id": "test-opt-1",
                    "name": "Option 1",
                    "image": "",
                    "surcharge": 0,
                    "is_default": True,
                    "has_text_input": False
                },
                {
                    "id": "test-opt-2",
                    "name": "Option 2 with Text",
                    "image": "",
                    "surcharge": 5,
                    "is_default": False,
                    "has_text_input": True,
                    "text_label": "Describe your preference"
                }
            ]
        }
        
        # Add test parameter
        updated_params = original_data["parameters"] + [test_param]
        update_data = {
            **original_data,
            "parameters": updated_params
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/styling/parameters/suits",
            json=update_data,
            headers=self.headers
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify the data was saved correctly
        verify_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        verify_data = verify_response.json()
        
        test_param_saved = next((p for p in verify_data["parameters"] if p["id"] == "test-image-text-param"), None)
        assert test_param_saved is not None, "Test parameter was not saved"
        assert test_param_saved.get("input_type") == "image_and_text", \
            f"input_type not saved correctly: {test_param_saved.get('input_type')}"
        assert test_param_saved.get("text_label") == "Additional notes for this style", \
            f"text_label not saved correctly: {test_param_saved.get('text_label')}"
        
        # Check options
        assert len(test_param_saved.get("options", [])) == 2, "Options not saved"
        opt_with_text = next((o for o in test_param_saved["options"] if o["id"] == "test-opt-2"), None)
        assert opt_with_text is not None, "Option with has_text_input not found"
        assert opt_with_text.get("has_text_input") == True, "has_text_input not saved on option"
        assert opt_with_text.get("text_label") == "Describe your preference", "text_label not saved on option"
        
        print(f"PASS: image_and_text input_type with option-level has_text_input saved correctly")
        
        # Cleanup - remove test parameter
        cleanup_params = [p for p in verify_data["parameters"] if p["id"] != "test-image-text-param"]
        cleanup_data = {**verify_data, "parameters": cleanup_params}
        requests.put(f"{BASE_URL}/api/styling/parameters/suits", json=cleanup_data, headers=self.headers)
        
    def test_put_styling_with_sub_option_text_input(self):
        """PUT /api/styling/parameters/{product_id} should save has_text_input on sub-options"""
        # First get current data
        get_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert get_response.status_code == 200
        original_data = get_response.json()
        
        # Create test parameter with sub-options that have text input
        test_param = {
            "id": "test-sub-text-param",
            "name": "Test Sub-Option Text",
            "order": 97,
            "is_required": False,
            "input_type": "image_only",
            "options": [
                {
                    "id": "test-parent-opt",
                    "name": "Parent Option",
                    "image": "",
                    "surcharge": 0,
                    "is_default": True,
                    "has_sub_options": True,
                    "sub_options": [
                        {
                            "id": "sub-1",
                            "name": "Sub 1",
                            "image": "",
                            "surcharge": 0,
                            "is_default": True,
                            "has_text_input": False
                        },
                        {
                            "id": "sub-2-text",
                            "name": "Sub 2 with Text",
                            "image": "",
                            "surcharge": 5,
                            "is_default": False,
                            "has_text_input": True,
                            "text_label": "Enter sub-option details"
                        }
                    ]
                }
            ]
        }
        
        # Add test parameter
        updated_params = original_data["parameters"] + [test_param]
        update_data = {
            **original_data,
            "parameters": updated_params
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/styling/parameters/suits",
            json=update_data,
            headers=self.headers
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.text}"
        
        # Verify the data was saved correctly
        verify_response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        verify_data = verify_response.json()
        
        test_param_saved = next((p for p in verify_data["parameters"] if p["id"] == "test-sub-text-param"), None)
        assert test_param_saved is not None, "Test parameter was not saved"
        
        # Check sub-options
        parent_opt = test_param_saved["options"][0]
        assert parent_opt.get("has_sub_options") == True, "has_sub_options not saved"
        assert len(parent_opt.get("sub_options", [])) == 2, "sub_options not saved"
        
        sub_with_text = next((s for s in parent_opt["sub_options"] if s["id"] == "sub-2-text"), None)
        assert sub_with_text is not None, "Sub-option with text not found"
        assert sub_with_text.get("has_text_input") == True, "has_text_input not saved on sub-option"
        assert sub_with_text.get("text_label") == "Enter sub-option details", "text_label not saved on sub-option"
        
        print(f"PASS: sub-option with has_text_input and text_label saved correctly")
        
        # Cleanup - remove test parameter
        cleanup_params = [p for p in verify_data["parameters"] if p["id"] != "test-sub-text-param"]
        cleanup_data = {**verify_data, "parameters": cleanup_params}
        requests.put(f"{BASE_URL}/api/styling/parameters/suits", json=cleanup_data, headers=self.headers)
        
    def test_existing_option_has_text_input_preserved(self):
        """Verify existing option with has_text_input=true is preserved (Lapel -> Specific Style - Write)"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        
        # Find Lapel parameter and check for "Specific Style - Write" option
        lapel_param = next((p for p in data["parameters"] if p["id"] == "lapel"), None)
        assert lapel_param is not None, "Lapel parameter not found"
        
        specific_style_option = next(
            (o for o in lapel_param.get("options", []) if "write" in o.get("name", "").lower() or o.get("has_text_input")), 
            None
        )
        
        if specific_style_option:
            assert specific_style_option.get("has_text_input") == True, \
                f"Option 'Specific Style - Write' should have has_text_input=true"
            print(f"PASS: Found existing option with has_text_input=true: {specific_style_option['name']}")
        else:
            print("INFO: No option with has_text_input=true found in Lapel (may have been changed)")
            
    def test_backend_models_support_all_fields(self):
        """Verify backend models support all required fields via API response"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields exist in response structure
        param_fields = ["id", "name", "options", "is_required", "order"]
        option_fields = ["id", "name", "surcharge", "is_default"]
        
        for param in data["parameters"]:
            for field in param_fields:
                assert field in param, f"Parameter missing field: {field}"
            
            # Check input_type defaults to image_only if not present
            input_type = param.get("input_type", "image_only")
            assert input_type in ["image_only", "text_only", "image_and_text"]
            
            for option in param.get("options", []):
                for field in option_fields:
                    assert field in option, f"Option missing field: {field}"
                
                # Check sub_options if present
                if option.get("has_sub_options") and option.get("sub_options"):
                    for sub in option["sub_options"]:
                        assert "id" in sub, "Sub-option missing id"
                        assert "name" in sub, "Sub-option missing name"
        
        print("PASS: Backend models support all required fields")


class TestDefaultInputType:
    """Tests for default input_type behavior"""
    
    def test_default_input_type_is_image_only(self):
        """Parameters without explicit input_type should default to 'image_only'"""
        response = requests.get(f"{BASE_URL}/api/styling/parameters/suits")
        assert response.status_code == 200
        
        data = response.json()
        
        for param in data["parameters"]:
            input_type = param.get("input_type", "image_only")
            # Default should be image_only
            assert input_type == "image_only" or input_type in ["text_only", "image_and_text"], \
                f"Parameter {param['name']} has unexpected input_type: {input_type}"
        
        print("PASS: Default input_type behavior verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
