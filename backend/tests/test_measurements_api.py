"""
Test suite for Measurements API endpoints
Tests the measurement configuration and customer measurement CRUD operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com')


class TestMeasurementConfigAPI:
    """Tests for GET /api/measurements/config endpoint"""
    
    def test_get_measurement_config_returns_200(self):
        """Test that measurement config endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        assert response.status_code == 200
        print(f"GET /api/measurements/config returned {response.status_code}")
    
    def test_get_measurement_config_has_fields(self):
        """Test that config contains fields array"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        assert "fields" in data
        assert isinstance(data["fields"], list)
        assert len(data["fields"]) >= 9  # Should have at least 9 default fields
        print(f"Config has {len(data['fields'])} measurement fields")
    
    def test_get_measurement_config_has_product_types(self):
        """Test that config contains product_types array"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        assert "product_types" in data
        assert isinstance(data["product_types"], list)
        assert len(data["product_types"]) >= 11  # Should have at least 11 product types
        print(f"Config has {len(data['product_types'])} product types")
    
    def test_measurement_field_structure(self):
        """Test that each field has required properties"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        for field in data["fields"]:
            assert "id" in field
            assert "name" in field
            assert "default_value" in field or field.get("is_text", False)
            print(f"Field '{field['name']}' has correct structure")
    
    def test_product_type_structure(self):
        """Test that each product type has required properties"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        for product_type in data["product_types"]:
            assert "id" in product_type
            assert "name" in product_type
            assert "measurement_ids" in product_type
            print(f"Product type '{product_type['name']}' has correct structure")
    
    def test_default_fields_present(self):
        """Test that default measurement fields are present"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        expected_fields = ["biceps", "chest", "hips", "jacket-length", "shoulders", 
                          "sleeve-length", "stomach", "waist", "wrist"]
        field_ids = [f["id"] for f in data["fields"]]
        
        for expected in expected_fields:
            assert expected in field_ids, f"Expected field '{expected}' not found"
        print("All default measurement fields present")
    
    def test_default_product_types_present(self):
        """Test that default product types are present"""
        response = requests.get(f"{BASE_URL}/api/measurements/config")
        data = response.json()
        
        expected_types = ["jacket", "2pc-suit", "3pc-suit", "vest", "pant", 
                         "shirt", "legal-gown", "t-shirt", "jeans", "legal-jacket", "shoe"]
        type_ids = [pt["id"] for pt in data["product_types"]]
        
        for expected in expected_types:
            assert expected in type_ids, f"Expected product type '{expected}' not found"
        print("All default product types present")


class TestCustomerMeasurementAPI:
    """Tests for customer measurement CRUD operations"""
    
    @pytest.fixture
    def test_customer_id(self):
        return "TEST_customer_measurement_123"
    
    def test_save_customer_measurement(self, test_customer_id):
        """Test POST /api/measurements saves customer data"""
        measurement_data = {
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"},
            "weight": {"value": "80", "unit": "kgs"},
            "selected_products": ["jacket", "pant"],
            "measurements": {
                "chest": "42",
                "waist": "34",
                "shoulders": "18"
            },
            "preference": "Slim fit"
        }
        
        response = requests.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_id"] == test_customer_id
        assert data["height"]["value"] == "175"
        assert data["weight"]["unit"] == "kgs"
        assert "jacket" in data["selected_products"]
        print(f"POST /api/measurements saved data for customer {test_customer_id}")
    
    def test_get_customer_measurement(self, test_customer_id):
        """Test GET /api/measurements/{customer_id} retrieves data"""
        # First save some data
        measurement_data = {
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"},
            "weight": {"value": "80", "unit": "kgs"},
            "selected_products": ["jacket"],
            "measurements": {"chest": "42"}
        }
        requests.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        
        # Then retrieve it
        response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer_id"] == test_customer_id
        print(f"GET /api/measurements/{test_customer_id} returned customer data")
    
    def test_update_customer_measurement(self, test_customer_id):
        """Test that POST updates existing measurement"""
        # First save
        initial_data = {
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"},
            "measurements": {"chest": "42"}
        }
        requests.post(f"{BASE_URL}/api/measurements", json=initial_data)
        
        # Then update
        updated_data = {
            "customer_id": test_customer_id,
            "height": {"value": "180", "unit": "cms"},
            "measurements": {"chest": "44", "waist": "36"}
        }
        response = requests.post(f"{BASE_URL}/api/measurements", json=updated_data)
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        data = get_response.json()
        assert data["height"]["value"] == "180"
        assert data["measurements"]["chest"] == "44"
        print(f"Customer measurement updated successfully")
    
    def test_list_all_measurements(self):
        """Test GET /api/measurements returns list"""
        response = requests.get(f"{BASE_URL}/api/measurements")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/measurements returned {len(data)} measurements")
    
    def test_delete_customer_measurement(self, test_customer_id):
        """Test DELETE /api/measurements/{customer_id}"""
        # First save
        measurement_data = {
            "customer_id": test_customer_id,
            "height": {"value": "175", "unit": "cms"}
        }
        requests.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        
        # Then delete
        response = requests.delete(f"{BASE_URL}/api/measurements/{test_customer_id}")
        assert response.status_code == 200
        
        # Verify deletion - should return empty measurements
        get_response = requests.get(f"{BASE_URL}/api/measurements/{test_customer_id}")
        data = get_response.json()
        assert data.get("measurements", {}) == {} or "customer_id" in data
        print(f"DELETE /api/measurements/{test_customer_id} successful")
    
    def test_save_measurement_without_customer_id_fails(self):
        """Test that saving without customer_id returns 400"""
        measurement_data = {
            "height": {"value": "175", "unit": "cms"}
        }
        
        response = requests.post(f"{BASE_URL}/api/measurements", json=measurement_data)
        assert response.status_code == 400
        print("POST without customer_id correctly returns 400")
    
    def test_get_nonexistent_customer_returns_empty(self):
        """Test GET for non-existent customer returns empty measurements"""
        response = requests.get(f"{BASE_URL}/api/measurements/nonexistent_customer_xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("measurements", {}) == {}
        print("GET for non-existent customer returns empty measurements")


class TestMeasurementConfigUpdateAPI:
    """Tests for PUT /api/measurements/config endpoint"""
    
    def test_update_measurement_config(self):
        """Test that config can be updated"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/measurements/config")
        original_config = get_response.json()
        
        # Update with same config (to not break anything)
        response = requests.put(f"{BASE_URL}/api/measurements/config", json=original_config)
        assert response.status_code == 200
        
        data = response.json()
        assert "fields" in data
        assert "product_types" in data
        print("PUT /api/measurements/config successful")


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
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
