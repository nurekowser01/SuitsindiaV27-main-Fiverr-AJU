"""
Backend API tests for Products/Categories endpoints
Tests the Reseller POS module APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')


class TestHealthCheck:
    """Health check tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestProductCategories:
    """Product Categories API tests"""
    
    def test_get_categories_returns_list(self):
        """Test GET /api/products/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} categories")
    
    def test_categories_have_required_fields(self):
        """Test categories have all required fields"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        for category in data:
            assert "id" in category, "Category missing 'id' field"
            assert "name" in category, "Category missing 'name' field"
            assert "is_active" in category, "Category missing 'is_active' field"
            assert "products" in category, "Category missing 'products' field"
            print(f"Category '{category['name']}' has all required fields")
    
    def test_products_have_config_fields(self):
        """Test products within categories have config_fields"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        products_with_config = 0
        for category in data:
            for product in category.get("products", []):
                assert "id" in product, f"Product missing 'id' in category {category['name']}"
                assert "name" in product, f"Product missing 'name' in category {category['name']}"
                assert "config_fields" in product, f"Product '{product['name']}' missing 'config_fields'"
                
                config_fields = product.get("config_fields", [])
                if len(config_fields) > 0:
                    products_with_config += 1
                    print(f"Product '{product['name']}' has {len(config_fields)} config fields")
        
        assert products_with_config > 0, "No products have config_fields defined"
        print(f"Total products with config_fields: {products_with_config}")
    
    def test_config_fields_structure(self):
        """Test config_fields have proper structure (id, name, type, required)"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        for category in data:
            for product in category.get("products", []):
                for field in product.get("config_fields", []):
                    assert "id" in field, f"Config field missing 'id' in product {product['name']}"
                    assert "name" in field, f"Config field missing 'name' in product {product['name']}"
                    assert "type" in field, f"Config field missing 'type' in product {product['name']}"
                    assert "required" in field, f"Config field missing 'required' in product {product['name']}"
                    
                    # Validate type is one of expected values
                    valid_types = ["code_with_image", "text", "dropdown", "number"]
                    assert field["type"] in valid_types, f"Invalid config field type: {field['type']}"
                    print(f"Config field '{field['name']}' in '{product['name']}' is valid")
    
    def test_suits_jackets_category_exists(self):
        """Test Suits & Jackets category exists with products"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        suits_category = None
        for cat in data:
            if cat["id"] == "suits-jackets":
                suits_category = cat
                break
        
        assert suits_category is not None, "Suits & Jackets category not found"
        assert suits_category["name"] == "Suits & Jackets"
        assert len(suits_category.get("products", [])) > 0, "Suits & Jackets has no products"
        print(f"Suits & Jackets category has {len(suits_category['products'])} products")
    
    def test_shirts_category_exists(self):
        """Test Shirts category exists with products"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        shirts_category = None
        for cat in data:
            if cat["id"] == "shirts":
                shirts_category = cat
                break
        
        assert shirts_category is not None, "Shirts category not found"
        assert len(shirts_category.get("products", [])) > 0, "Shirts has no products"
        print(f"Shirts category has {len(shirts_category['products'])} products")
    
    def test_get_single_category(self):
        """Test GET /api/products/categories/{category_id} returns single category"""
        response = requests.get(f"{BASE_URL}/api/products/categories/suits-jackets")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "suits-jackets"
        assert data["name"] == "Suits & Jackets"
        assert "products" in data
        print(f"Single category fetch successful: {data['name']}")
    
    def test_get_nonexistent_category_returns_404(self):
        """Test GET /api/products/categories/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/categories/nonexistent-category")
        assert response.status_code == 404
        print("Nonexistent category correctly returns 404")


class TestCustomersAPI:
    """Customers API tests"""
    
    def test_get_customers_returns_list(self):
        """Test GET /api/customers returns list"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} customers")
    
    def test_customers_have_required_fields(self):
        """Test customers have required fields"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            customer = data[0]
            assert "customer_id" in customer, "Customer missing 'customer_id'"
            assert "name" in customer, "Customer missing 'name'"
            assert "phone" in customer, "Customer missing 'phone'"
            print(f"Customer '{customer['name']}' has all required fields")
    
    def test_rahul_sharma_exists(self):
        """Test that test customer Rahul Sharma exists"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        data = response.json()
        
        rahul = None
        for customer in data:
            if customer["name"] == "Rahul Sharma":
                rahul = customer
                break
        
        assert rahul is not None, "Test customer 'Rahul Sharma' not found"
        assert rahul["phone"] == "+91 9876543210"
        print(f"Found test customer: {rahul['name']} (ID: {rahul['customer_id']})")


class TestProductConfigFields:
    """Tests for specific product config fields"""
    
    def test_suits_has_fabric_lining_button(self):
        """Test Suits product has Fabric, Lining, Button config fields"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        suits_product = None
        for cat in data:
            for product in cat.get("products", []):
                if product["id"] == "suits":
                    suits_product = product
                    break
        
        assert suits_product is not None, "Suits product not found"
        
        config_ids = [f["id"] for f in suits_product.get("config_fields", [])]
        assert "fabric" in config_ids, "Suits missing 'fabric' config field"
        assert "lining" in config_ids, "Suits missing 'lining' config field"
        assert "button" in config_ids, "Suits missing 'button' config field"
        print(f"Suits has config fields: {config_ids}")
    
    def test_pants_has_fabric_and_optional_lining(self):
        """Test Pants product has Fabric (required) and Lining (optional)"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        pants_product = None
        for cat in data:
            for product in cat.get("products", []):
                if product["id"] == "pants":
                    pants_product = product
                    break
        
        assert pants_product is not None, "Pants product not found"
        
        config_fields = {f["id"]: f for f in pants_product.get("config_fields", [])}
        assert "fabric" in config_fields, "Pants missing 'fabric' config field"
        assert config_fields["fabric"]["required"] == True, "Pants fabric should be required"
        
        if "lining" in config_fields:
            assert config_fields["lining"]["required"] == False, "Pants lining should be optional"
        print(f"Pants config fields validated correctly")
    
    def test_formal_shirts_has_collar_dropdown(self):
        """Test Formal Shirts has collar style dropdown field"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        
        formal_shirts = None
        for cat in data:
            for product in cat.get("products", []):
                if product["id"] == "formal-shirts":
                    formal_shirts = product
                    break
        
        assert formal_shirts is not None, "Formal Shirts product not found"
        
        collar_field = None
        for field in formal_shirts.get("config_fields", []):
            if field["id"] == "collar":
                collar_field = field
                break
        
        assert collar_field is not None, "Formal Shirts missing 'collar' config field"
        assert collar_field["type"] == "dropdown", "Collar field should be dropdown type"
        assert "options" in collar_field, "Collar dropdown missing options"
        print(f"Formal Shirts collar options: {collar_field.get('options', [])}")


class TestAuthenticationAPI:
    """Authentication API tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, "Login response missing access_token"
        print("Admin login successful")
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": "admin@suitsindia.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
