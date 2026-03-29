"""
Pricing Module API Tests

Tests for:
1. Fabric Price Codes - CRUD operations with sizes A/B/C
2. Size Categories - Configuration of size ranges
3. Shipping Rates - Per-product shipping configuration  
4. Country Surcharges - Country-specific shipping costs
5. Reseller Margins - Per-reseller margin configurations
6. Price Calculation - Calculate total price with margins
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')

class TestPricingModule:
    """Tests for Pricing Module APIs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "trump@suitsindia.com", "password": "trump123"}
        )
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin authentication"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def reseller_headers(self, reseller_token):
        """Headers with reseller authentication"""
        return {
            "Authorization": f"Bearer {reseller_token}",
            "Content-Type": "application/json"
        }
    
    # ==================
    # FABRIC PRICE CODES
    # ==================
    
    def test_get_fabric_prices_all(self, admin_headers):
        """Test GET /api/pricing/fabric-prices/all - Admin can see all fabric prices"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/fabric-prices/all",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify P001 and P002 exist
        codes = [p["code"] for p in data]
        assert "P001" in codes, "P001 fabric code should exist"
        assert "P002" in codes, "P002 fabric code should exist"
        print(f"Found {len(data)} fabric price codes")
    
    def test_get_fabric_prices_active(self, admin_headers):
        """Test GET /api/pricing/fabric-prices - Admin can see active fabric prices"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/fabric-prices",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned prices should be active
        for price in data:
            assert price.get("is_active", True) == True
        print(f"Found {len(data)} active fabric price codes")
    
    def test_fabric_price_lookup_success(self, reseller_headers):
        """Test GET /api/pricing/fabric-prices/lookup/{code} - Reseller can lookup price"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/fabric-prices/lookup/P001",
            headers=reseller_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "P001"
        assert data["name"] == "Premium Italian Wool"
        assert "price_size_a" in data
        assert "price_size_b" in data
        assert "price_size_c" in data
        print(f"Lookup P001: {data['name']} - A:{data['price_size_a']}, B:{data['price_size_b']}, C:{data['price_size_c']}")
    
    def test_fabric_price_lookup_case_insensitive(self, reseller_headers):
        """Test fabric price lookup is case-insensitive"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/fabric-prices/lookup/p001",
            headers=reseller_headers
        )
        assert response.status_code == 200
        assert response.json()["code"] == "P001"
        print("Case-insensitive lookup works")
    
    def test_fabric_price_lookup_not_found(self, reseller_headers):
        """Test fabric price lookup returns 404 for non-existent code"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/fabric-prices/lookup/NONEXISTENT",
            headers=reseller_headers
        )
        assert response.status_code == 404
        print("Non-existent code returns 404 as expected")
    
    def test_create_fabric_price(self, admin_headers):
        """Test POST /api/pricing/fabric-prices - Create new fabric price code"""
        test_code = f"TEST{int(time.time() % 10000)}"
        payload = {
            "code": test_code,
            "name": "Test Fabric",
            "description": "Test description",
            "price_size_a": 100,
            "price_size_b": 120,
            "price_size_c": 140,
            "consumption_size_a": 2.5,
            "consumption_size_b": 3.0,
            "consumption_size_c": 3.5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/fabric-prices",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == test_code.upper()
        assert data["name"] == "Test Fabric"
        assert data["price_size_a"] == 100
        assert "id" in data
        print(f"Created fabric price code: {data['code']} with id: {data['id']}")
        
        # Cleanup - delete the created price
        fabric_id = data["id"]
        delete_response = requests.delete(
            f"{BASE_URL}/api/pricing/fabric-prices/{fabric_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200
        print(f"Cleaned up test fabric code {test_code}")
    
    def test_create_fabric_price_duplicate(self, admin_headers):
        """Test duplicate fabric code returns 400"""
        payload = {
            "code": "P001",  # Already exists
            "name": "Duplicate Test",
            "price_size_a": 100,
            "price_size_b": 120,
            "price_size_c": 140
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/fabric-prices",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 400
        assert "already exists" in response.json().get("detail", "").lower()
        print("Duplicate code correctly rejected")
    
    # ==================
    # SIZE CATEGORIES
    # ==================
    
    def test_get_size_categories(self, admin_headers):
        """Test GET /api/pricing/size-categories - Get size range configuration"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/size-categories",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify size category structure
        assert "size_a_min" in data
        assert "size_a_max" in data
        assert "size_b_min" in data
        assert "size_b_max" in data
        assert "size_c_min" in data
        
        print(f"Size Categories: A({data['size_a_min']}-{data['size_a_max']}), B({data['size_b_min']}-{data['size_b_max']}), C({data['size_c_min']}+)")
    
    def test_update_size_categories(self, admin_headers):
        """Test PUT /api/pricing/size-categories - Update size ranges"""
        # First get current values
        get_response = requests.get(
            f"{BASE_URL}/api/pricing/size-categories",
            headers=admin_headers
        )
        original = get_response.json()
        
        # Update to new values
        new_config = {
            "size_a_min": 34,
            "size_a_max": 46,
            "size_b_min": 47,
            "size_b_max": 54,
            "size_c_min": 55
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pricing/size-categories",
            headers=admin_headers,
            json=new_config
        )
        assert response.status_code == 200
        
        # Verify update persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/pricing/size-categories",
            headers=admin_headers
        )
        verified = verify_response.json()
        assert verified["size_a_min"] == 34
        assert verified["size_a_max"] == 46
        print("Size categories updated and verified")
    
    # ==================
    # SHIPPING RATES
    # ==================
    
    def test_get_shipping_rates(self, admin_headers):
        """Test GET /api/pricing/shipping-rates - Get all shipping rates"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/shipping-rates",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} shipping rates configured")
    
    def test_create_shipping_rate(self, admin_headers):
        """Test POST /api/pricing/shipping-rates - Create/upsert shipping rate"""
        payload = {
            "product_id": "TEST_PRODUCT_ID",
            "product_name": "Test Product",
            "base_shipping_rate": 75.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/shipping-rates",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200
        assert response.json().get("message") == "Shipping rate saved"
        print("Shipping rate created/updated successfully")
    
    # ==================
    # COUNTRY SURCHARGES
    # ==================
    
    def test_get_country_surcharges(self, admin_headers):
        """Test GET /api/pricing/country-surcharges - Get all country surcharges"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/country-surcharges",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} country surcharges")
    
    def test_create_country_surcharge(self, admin_headers):
        """Test POST /api/pricing/country-surcharges - Create country surcharge"""
        test_code = f"T{int(time.time() % 100)}"  # e.g., T42
        payload = {
            "country_code": test_code,
            "country_name": f"Test Country {test_code}",
            "surcharge_amount": 25.0,
            "surcharge_percentage": 0,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/country-surcharges",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200
        assert response.json().get("message") == "Country surcharge saved"
        print(f"Created country surcharge for {test_code}")
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/pricing/country-surcharges/{test_code}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200
        print(f"Cleaned up test country surcharge {test_code}")
    
    # ==================
    # RESELLER MARGINS
    # ==================
    
    def test_get_all_reseller_margins(self, admin_headers):
        """Test GET /api/pricing/reseller-margins - Get all reseller margins"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/reseller-margins",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} reseller margin configurations")
    
    def test_get_reseller_margins_specific(self, admin_headers):
        """Test GET /api/pricing/reseller-margins/{email} - Get specific reseller margins"""
        response = requests.get(
            f"{BASE_URL}/api/pricing/reseller-margins/trump@suitsindia.com",
            headers=admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "reseller_email" in data
        assert "cmt_margin_percentage" in data
        assert "fabric_margin_percentage" in data
        assert "styling_margin_percentage" in data
        assert "shipping_margin_percentage" in data
        print(f"Reseller margins: CMT={data['cmt_margin_percentage']}%, Fabric={data['fabric_margin_percentage']}%")
    
    def test_update_reseller_margins(self, admin_headers):
        """Test PUT /api/pricing/reseller-margins/{email} - Update reseller margins"""
        payload = {
            "reseller_email": "trump@suitsindia.com",
            "cmt_margin_percentage": 10,
            "fabric_margin_percentage": 15,
            "styling_margin_percentage": 5,
            "shipping_margin_percentage": 8
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pricing/reseller-margins/trump@suitsindia.com",
            headers=admin_headers,
            json=payload
        )
        assert response.status_code == 200
        assert response.json().get("message") == "Reseller margins updated"
        
        # Verify update
        verify_response = requests.get(
            f"{BASE_URL}/api/pricing/reseller-margins/trump@suitsindia.com",
            headers=admin_headers
        )
        verified = verify_response.json()
        assert verified["cmt_margin_percentage"] == 10
        assert verified["fabric_margin_percentage"] == 15
        print("Reseller margins updated and verified")
    
    # ==================
    # PRICE CALCULATION
    # ==================
    
    def test_calculate_price(self, reseller_headers):
        """Test POST /api/pricing/calculate-price - Calculate total price with margins"""
        payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "test-product",
            "styling_total": 50,
            "base_cmt": 100,
            "country_code": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/calculate-price",
            headers=reseller_headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify breakdown structure
        assert "breakdown" in data
        assert "total" in data
        breakdown = data["breakdown"]
        assert "cmt" in breakdown
        assert "fabric" in breakdown
        assert "styling" in breakdown
        assert "shipping" in breakdown
        
        print(f"Price calculation: Total={data['total']}")
        print(f"  CMT: base={breakdown['cmt']['base']}, with_margin={breakdown['cmt']['with_margin']}")
        print(f"  Fabric: code={breakdown['fabric']['code']}, with_margin={breakdown['fabric']['with_margin']}")
    
    def test_calculate_price_different_sizes(self, reseller_headers):
        """Test price calculation varies by size category"""
        results = {}
        for size in ['A', 'B', 'C']:
            payload = {
                "fabric_price_code": "P001",
                "size_category": size,
                "product_id": "test-product",
                "styling_total": 50,
                "base_cmt": 100
            }
            
            response = requests.post(
                f"{BASE_URL}/api/pricing/calculate-price",
                headers=reseller_headers,
                json=payload
            )
            assert response.status_code == 200
            results[size] = response.json()["total"]
        
        # Size C should be more expensive than B, B more than A (due to consumption)
        print(f"Price by size: A={results['A']}, B={results['B']}, C={results['C']}")
        # The prices should differ due to different consumption rates
        assert results['A'] != results['B'] or results['B'] != results['C'], \
            "Prices should vary by size category"
    
    # ==================
    # AUTHENTICATION TESTS
    # ==================
    
    def test_fabric_prices_requires_auth(self):
        """Test fabric prices endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pricing/fabric-prices")
        assert response.status_code == 401
        print("Fabric prices endpoint correctly requires authentication")
    
    def test_reseller_cannot_create_fabric_price(self, reseller_headers):
        """Test reseller cannot create fabric prices (admin only)"""
        payload = {
            "code": "RESELLER_TEST",
            "name": "Reseller Test",
            "price_size_a": 100,
            "price_size_b": 120,
            "price_size_c": 140
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pricing/fabric-prices",
            headers=reseller_headers,
            json=payload
        )
        assert response.status_code == 403
        print("Reseller correctly denied from creating fabric prices")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
