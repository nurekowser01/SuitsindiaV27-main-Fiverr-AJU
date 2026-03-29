"""
Test suite for Measurements and Styling Templates API - Integration Tests
Tests the reported bug fix: 'measurements are not saving'
Tests the Styling Templates feature

Run: pytest /app/backend/tests/test_measurements_styling_integration.py -v --tb=short
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com')


class TestMeasurementSaving:
    """Test suite for measurement saving - the main bug that was reported"""
    
    @pytest.fixture
    def test_customer_id(self):
        return f"TEST_measurement_save_{int(time.time())}"
    
    def test_save_measurement_with_full_payload(self, test_customer_id):
        """Test saving measurement with full payload - matches frontend format"""
        measurement_data = {
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"},
            "weight": {"value": "80", "unit": "kgs"},
            "selected_products": ["jacket", "pant"],
            "measurements": {
                "chest": "42",
                "waist": "34",
                "shoulders": "18",
                "biceps": "15",
                "jacket-length": "31"
            },
            "preference": "Slim fit",
            "body_preferences": {"posture": "normal"},
            "photos": [],  # Fixed: was duplicate key issue before
            "created_at": "2026-02-19T10:00:00.000Z"
        }
        
        # Save measurement
        response = requests.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        assert response.status_code == 200, f"Failed to save: {response.text}"
        
        saved_data = response.json()
        assert saved_data["customer_id"] == test_customer_id
        assert saved_data["height"]["value"] == "175"
        assert saved_data["weight"]["value"] == "80"
        assert "jacket" in saved_data["selected_products"]
        assert saved_data["measurements"]["chest"] == "42"
        print(f"PASS: Measurement saved successfully for customer {test_customer_id}")
        
        # Verify GET returns the saved data
        get_response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        assert get_response.status_code == 200
        
        retrieved_data = get_response.json()
        assert retrieved_data["customer_id"] == test_customer_id
        assert retrieved_data["measurements"]["chest"] == "42"
        print("PASS: GET endpoint returns saved measurement data")
        
    def test_measurement_update_persists(self, test_customer_id):
        """Test that updating measurement persists changes"""
        # First save
        initial_data = {
            "customer_id": test_customer_id,
            "height": {"value": "170", "unit": "cms"},
            "measurements": {"chest": "40"}
        }
        requests.post(f"{BASE_URL}/api/measurements", json=initial_data)
        
        # Update
        updated_data = {
            "customer_id": test_customer_id,
            "height": {"value": "180", "unit": "cms"},
            "measurements": {"chest": "44", "waist": "36"}
        }
        update_response = requests.post(f"{BASE_URL}/api/measurements", json=updated_data)
        assert update_response.status_code == 200
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        data = get_response.json()
        assert data["height"]["value"] == "180"
        assert data["measurements"]["chest"] == "44"
        print("PASS: Measurement update persisted correctly")
        
    def test_measurement_validation_requires_customer_id(self):
        """Test that customer_id is required"""
        response = requests.post(f"{BASE_URL}/api/measurements", json={
            "height": {"value": "175", "unit": "cms"}
        })
        assert response.status_code == 400
        print("PASS: API correctly rejects request without customer_id")
        
    def test_delete_and_cleanup(self, test_customer_id):
        """Test measurement deletion"""
        # Create
        requests.post(f"{BASE_URL}/api/measurements", json={
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"}
        })
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/measurements/{test_customer_id}")
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        data = get_response.json()
        assert data.get("measurements", {}) == {}
        print("PASS: Measurement deleted successfully")


class TestStylingTemplatesAPI:
    """Test suite for Styling Templates feature"""
    
    @pytest.fixture
    def template_id(self):
        """Create a test template and return its ID"""
        template_data = {
            "name": f"TEST_Template_{int(time.time())}",
            "product_id": "suits",
            "product_name": "Suits",
            "options": {"lapel": "notch", "buttons": "2"},
            "is_global": False
        }
        response = requests.post(f"{BASE_URL}/api/styling/templates", json=template_data)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_get_templates_returns_list(self):
        """GET /api/styling/templates returns list of templates"""
        response = requests.get(f"{BASE_URL}/api/styling/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET templates returns {len(data)} templates")
        
    def test_create_template(self):
        """POST /api/styling/templates creates new template"""
        template_data = {
            "name": f"TEST_Create_Template_{int(time.time())}",
            "product_id": "suits",
            "product_name": "Business Suit",
            "options": {
                "lapel": {"id": "notched", "name": "Notched"},
                "pockets": {"id": "flap", "name": "Flap Pockets"}
            },
            "construction": {"id": "half-canvas", "name": "Half Canvas"},
            "is_global": False
        }
        
        response = requests.post(f"{BASE_URL}/api/styling/templates", json=template_data)
        assert response.status_code == 200
        
        created = response.json()
        assert "id" in created
        assert created["name"] == template_data["name"]
        assert created["product_id"] == "suits"
        assert created["options"]["lapel"]["id"] == "notched"
        print(f"PASS: Template created with ID {created['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/styling/templates/{created['id']}")
        
    def test_get_single_template(self, template_id):
        """GET /api/styling/templates/{id} returns single template"""
        response = requests.get(f"{BASE_URL}/api/styling/templates/{template_id}")
        assert response.status_code == 200
        
        template = response.json()
        assert template["id"] == template_id
        assert "name" in template
        assert "options" in template
        print(f"PASS: Single template retrieved: {template['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/styling/templates/{template_id}")
        
    def test_update_template(self, template_id):
        """PUT /api/styling/templates/{id} updates template"""
        update_data = {
            "name": "UPDATED_Template_Name",
            "options": {"lapel": "peak"},
            "is_global": True
        }
        
        response = requests.put(f"{BASE_URL}/api/styling/templates/{template_id}", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/styling/templates/{template_id}")
        updated = get_response.json()
        assert updated["name"] == "UPDATED_Template_Name"
        assert updated["is_global"] == True
        print("PASS: Template updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/styling/templates/{template_id}")
        
    def test_delete_template(self, template_id):
        """DELETE /api/styling/templates/{id} removes template"""
        response = requests.delete(f"{BASE_URL}/api/styling/templates/{template_id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Template deleted successfully"
        
        # Verify deleted
        get_response = requests.get(f"{BASE_URL}/api/styling/templates/{template_id}")
        assert get_response.status_code == 404
        print("PASS: Template deleted successfully")
        
    def test_template_not_found_returns_404(self):
        """GET non-existent template returns 404"""
        response = requests.get(f"{BASE_URL}/api/styling/templates/000000000000000000000000")
        assert response.status_code == 404
        print("PASS: Non-existent template returns 404")


class TestMeasurementConfig:
    """Test measurement configuration endpoint"""
    
    def test_get_measurement_config(self):
        """GET /api/measurements/config returns configuration"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        assert response.status_code == 200
        
        config = response.json()
        assert "fields" in config
        assert "product_types" in config
        assert len(config["fields"]) >= 9  # Default fields
        assert len(config["product_types"]) >= 11  # Default product types
        print(f"PASS: Config has {len(config['fields'])} fields and {len(config['product_types'])} product types")
        
    def test_default_fields_present(self):
        """Verify all default measurement fields exist"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        config = response.json()
        
        expected_fields = ["biceps", "chest", "hips", "jacket-length", "shoulders", 
                          "sleeve-length", "stomach", "waist", "wrist"]
        field_ids = [f["id"] for f in config["fields"]]
        
        for expected in expected_fields:
            assert expected in field_ids, f"Missing field: {expected}"
        print("PASS: All default measurement fields present")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests"""
    yield
    # Cleanup TEST_ prefixed measurements
    try:
        response = requests.get(f"{BASE_URL}/api/measurements")
        if response.status_code == 200:
            measurements = response.json()
            for m in measurements:
                if m.get("customer_id", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/measurements/{m['customer_id']}")
        
        # Cleanup TEST_ prefixed templates
        templates_response = requests.get(f"{BASE_URL}/api/styling/templates")
        if templates_response.status_code == 200:
            templates = templates_response.json()
            for t in templates:
                if t.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/styling/templates/{t['id']}")
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
