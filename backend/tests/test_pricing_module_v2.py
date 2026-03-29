"""
Pricing Module V2 Tests - Updated with SKU and CMT Variants

Tests for:
1. Fabric Price Codes - CRUD with SKU field
2. Product Consumption - CMT Variants (Half Canvas, Full Canvas)
3. Size Margins - % markup on fabric price
4. Reseller Margins - Per-reseller margin configurations
5. Price Calculation - With construction type surcharges
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')


class TestFabricPriceCodesWithSKU:
    """Tests for Fabric Price Codes API with SKU field"""
    
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
            json={"email": "reseller@test.com", "password": "reseller123"}
        )
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def reseller_headers(self, reseller_token):
        return {"Authorization": f"Bearer {reseller_token}", "Content-Type": "application/json"}
    
    # ==================
    # FABRIC CRUD WITH SKU
    # ==================
    
    def test_get_all_fabrics_includes_sku(self, admin_headers):
        """GET /api/pricing/fabrics/all - Returns fabrics with SKU field"""
        response = requests.get(f"{BASE_URL}/api/pricing/fabrics/all", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Find P001 and verify SKU
        p001 = next((f for f in data if f["code"] == "P001"), None)
        assert p001 is not None, "Fabric P001 should exist"
        assert "sku" in p001, "Fabric should have SKU field"
        assert p001["sku"] == "FAB-WOOL-001", f"P001 SKU should be FAB-WOOL-001, got {p001.get('sku')}"
        print(f"P001: {p001['name']}, SKU: {p001['sku']}, Price: ${p001['base_price_per_meter']}/m")
    
    def test_fabric_lookup_returns_sku(self, reseller_headers):
        """GET /api/pricing/fabrics/lookup/{code} - Returns SKU in response"""
        response = requests.get(f"{BASE_URL}/api/pricing/fabrics/lookup/P001", headers=reseller_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["code"] == "P001"
        assert "sku" in data, "Lookup should return SKU"
        assert data["sku"] == "FAB-WOOL-001"
        assert "base_price_per_meter" in data
        print(f"Lookup P001: SKU={data['sku']}, Price=${data['base_price_per_meter']}/m")
    
    def test_create_fabric_with_sku(self, admin_headers):
        """POST /api/pricing/fabrics - Create fabric with SKU"""
        test_code = f"TEST{int(time.time() % 10000)}"
        test_sku = f"SKU-TEST-{int(time.time() % 10000)}"
        
        payload = {
            "code": test_code,
            "sku": test_sku,
            "name": "Test Fabric with SKU",
            "description": "Testing SKU field",
            "base_price_per_meter": 30.0
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/fabrics", headers=admin_headers, json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        assert data["code"] == test_code.upper()
        assert data["sku"] == test_sku.upper()
        assert data["base_price_per_meter"] == 30.0
        assert "id" in data
        print(f"Created fabric: Code={data['code']}, SKU={data['sku']}")
        
        # Cleanup
        fabric_id = data["id"]
        delete_resp = requests.delete(f"{BASE_URL}/api/pricing/fabrics/{fabric_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
        print(f"Cleaned up test fabric {test_code}")
    
    def test_update_fabric_with_sku(self, admin_headers):
        """PUT /api/pricing/fabrics/{id} - Update fabric including SKU"""
        # First create a fabric
        test_code = f"UPDT{int(time.time() % 10000)}"
        create_payload = {
            "code": test_code,
            "sku": "OLD-SKU",
            "name": "Original Name",
            "base_price_per_meter": 20.0
        }
        create_resp = requests.post(f"{BASE_URL}/api/pricing/fabrics", headers=admin_headers, json=create_payload)
        assert create_resp.status_code == 200
        fabric_id = create_resp.json()["id"]
        
        # Update with new SKU
        update_payload = {
            "code": test_code,
            "sku": "NEW-SKU-123",
            "name": "Updated Name",
            "base_price_per_meter": 25.0
        }
        update_resp = requests.put(f"{BASE_URL}/api/pricing/fabrics/{fabric_id}", headers=admin_headers, json=update_payload)
        assert update_resp.status_code == 200
        
        # Verify update via lookup
        lookup_resp = requests.get(f"{BASE_URL}/api/pricing/fabrics/lookup/{test_code}", headers=admin_headers)
        assert lookup_resp.status_code == 200
        data = lookup_resp.json()
        assert data["sku"] == "NEW-SKU-123"
        assert data["name"] == "Updated Name"
        print(f"Updated fabric: SKU changed to {data['sku']}")
        
        # Cleanup
        delete_resp = requests.delete(f"{BASE_URL}/api/pricing/fabrics/{fabric_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
    
    def test_delete_fabric(self, admin_headers):
        """DELETE /api/pricing/fabrics/{id} - Soft delete fabric"""
        # Create fabric to delete
        test_code = f"DEL{int(time.time() % 10000)}"
        create_payload = {
            "code": test_code,
            "sku": "DELETE-TEST",
            "name": "To Be Deleted",
            "base_price_per_meter": 10.0
        }
        create_resp = requests.post(f"{BASE_URL}/api/pricing/fabrics", headers=admin_headers, json=create_payload)
        assert create_resp.status_code == 200
        fabric_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/pricing/fabrics/{fabric_id}", headers=admin_headers)
        assert delete_resp.status_code == 200
        
        # Verify lookup returns 404 (soft delete makes it inactive)
        lookup_resp = requests.get(f"{BASE_URL}/api/pricing/fabrics/lookup/{test_code}", headers=admin_headers)
        assert lookup_resp.status_code == 404, "Deleted fabric should not be found via lookup"
        print(f"Fabric {test_code} successfully deleted (soft)")


class TestCMTVariants:
    """Tests for CMT Variants (Half Canvas, Full Canvas)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_product_consumption_with_cmt_variants(self, admin_headers):
        """GET /api/pricing/product-consumption - Returns CMT variants"""
        response = requests.get(f"{BASE_URL}/api/pricing/product-consumption", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find suits product
        suits = next((p for p in data if p["product_id"] == "suits"), None)
        assert suits is not None, "Suits product consumption should exist"
        
        assert "cmt_variants" in suits, "Product should have cmt_variants field"
        variants = suits["cmt_variants"]
        assert "half_canvas" in variants, "Should have half_canvas variant"
        assert "full_canvas" in variants, "Should have full_canvas variant"
        assert variants["half_canvas"] == 50.0, f"Half canvas should be $50, got {variants['half_canvas']}"
        assert variants["full_canvas"] == 100.0, f"Full canvas should be $100, got {variants['full_canvas']}"
        print(f"Suits CMT Variants: Half Canvas=+${variants['half_canvas']}, Full Canvas=+${variants['full_canvas']}")
    
    def test_set_product_consumption_with_cmt_variants(self, admin_headers):
        """POST /api/pricing/product-consumption - Set CMT variants"""
        payload = {
            "product_id": "test_product",
            "product_name": "Test Product",
            "fabric_consumption_meters": 2.5,
            "base_cmt": 100.0,
            "base_shipping": 50.0,
            "cmt_variants": {
                "half_canvas": 25.0,
                "full_canvas": 75.0
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/product-consumption", headers=admin_headers, json=payload)
        assert response.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/pricing/product-consumption/test_product", headers=admin_headers)
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["cmt_variants"]["half_canvas"] == 25.0
        assert data["cmt_variants"]["full_canvas"] == 75.0
        print(f"Set test_product CMT Variants: {data['cmt_variants']}")


class TestPriceCalculationWithConstructionTypes:
    """Tests for price calculation with construction type surcharges"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def reseller_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "reseller@test.com", "password": "reseller123"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_calculate_price_standard_construction(self, headers):
        """Calculate price without construction type (standard)"""
        payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 50,
            "construction_type": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["breakdown"]["cmt"]["construction_type"] == "Standard"
        assert data["breakdown"]["cmt"]["construction_surcharge"] == 0
        assert data["breakdown"]["cmt"]["base"] == 185.0
        assert data["breakdown"]["cmt"]["base_with_construction"] == 185.0
        print(f"Standard construction: CMT=${data['breakdown']['cmt']['final_cost']}, Total=${data['total']}")
    
    def test_calculate_price_half_canvas(self, headers):
        """Calculate price with Half Canvas (+$50)"""
        payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 50,
            "construction_type": "half_canvas"
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["breakdown"]["cmt"]["construction_type"] == "Half Canvas"
        assert data["breakdown"]["cmt"]["construction_surcharge"] == 50.0
        assert data["breakdown"]["cmt"]["base_with_construction"] == 235.0  # 185 + 50
        print(f"Half Canvas: CMT=${data['breakdown']['cmt']['final_cost']}, Total=${data['total']}")
    
    def test_calculate_price_full_canvas(self, headers):
        """Calculate price with Full Canvas (+$100)"""
        payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 50,
            "construction_type": "full_canvas"
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["breakdown"]["cmt"]["construction_type"] == "Full Canvas"
        assert data["breakdown"]["cmt"]["construction_surcharge"] == 100.0
        assert data["breakdown"]["cmt"]["base_with_construction"] == 285.0  # 185 + 100
        print(f"Full Canvas: CMT=${data['breakdown']['cmt']['final_cost']}, Total=${data['total']}")
    
    def test_price_includes_sku_in_breakdown(self, headers):
        """Verify price breakdown includes SKU"""
        payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 0,
            "construction_type": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=payload)
        assert response.status_code == 200
        data = response.json()
        
        fabric_breakdown = data["breakdown"]["fabric"]
        assert "sku" in fabric_breakdown, "Breakdown should include SKU"
        assert fabric_breakdown["sku"] == "FAB-WOOL-001"
        assert fabric_breakdown["price_code"] == "P001"
        print(f"Breakdown includes SKU: {fabric_breakdown['sku']}")
    
    def test_construction_type_price_difference(self, headers):
        """Verify price increases with construction type"""
        base_payload = {
            "fabric_price_code": "P001",
            "size_category": "A",
            "product_id": "suits",
            "styling_total": 50
        }
        
        # Standard
        base_payload["construction_type"] = ""
        std_resp = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=base_payload)
        std_total = std_resp.json()["total"]
        
        # Half Canvas
        base_payload["construction_type"] = "half_canvas"
        half_resp = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=base_payload)
        half_total = half_resp.json()["total"]
        
        # Full Canvas
        base_payload["construction_type"] = "full_canvas"
        full_resp = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=base_payload)
        full_total = full_resp.json()["total"]
        
        assert half_total == std_total + 50, f"Half canvas should be $50 more: {half_total} vs {std_total}"
        assert full_total == std_total + 100, f"Full canvas should be $100 more: {full_total} vs {std_total}"
        print(f"Price progression: Standard=${std_total}, Half=${half_total} (+50), Full=${full_total} (+100)")


class TestSizeMargins:
    """Tests for size margin calculations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_size_margins(self, headers):
        """GET /api/pricing/size-margins - Get margin config"""
        response = requests.get(f"{BASE_URL}/api/pricing/size-margins", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "size_a_margin_percent" in data
        assert "size_b_margin_percent" in data
        assert "size_c_margin_percent" in data
        print(f"Size Margins: A={data['size_a_margin_percent']}%, B={data['size_b_margin_percent']}%, C={data['size_c_margin_percent']}%")
    
    def test_size_a_has_lowest_fabric_cost(self, headers):
        """Size A should have lowest fabric cost (0% margin)"""
        base_payload = {
            "fabric_price_code": "P001",
            "product_id": "suits",
            "styling_total": 0,
            "construction_type": ""
        }
        
        results = {}
        for size in ['A', 'B', 'C']:
            base_payload["size_category"] = size
            resp = requests.post(f"{BASE_URL}/api/pricing/calculate-price", headers=headers, json=base_payload)
            assert resp.status_code == 200
            data = resp.json()
            results[size] = {
                "fabric_cost": data["breakdown"]["fabric"]["final_cost"],
                "margin_percent": data["breakdown"]["fabric"]["size_margin_percent"]
            }
        
        # Size A should have 0% margin and lowest cost
        assert results["A"]["margin_percent"] == 0
        assert results["A"]["fabric_cost"] < results["B"]["fabric_cost"]
        assert results["B"]["fabric_cost"] < results["C"]["fabric_cost"]
        print(f"Fabric costs by size: A=${results['A']['fabric_cost']}, B=${results['B']['fabric_cost']}, C=${results['C']['fabric_cost']}")


class TestResellerMargins:
    """Tests for reseller margin applications"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_reseller_pricing(self, headers):
        """GET /api/pricing/reseller-pricing - Get all reseller pricing"""
        response = requests.get(f"{BASE_URL}/api/pricing/reseller-pricing", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} reseller pricing configurations")
    
    def test_update_reseller_margins(self, headers):
        """PUT /api/pricing/reseller-pricing/{email} - Update margins"""
        payload = {
            "reseller_email": "reseller@test.com",
            "cmt_margin_percent": 10,
            "fabric_margin_percent": 15,
            "styling_margin_percent": 5,
            "shipping_margin_percent": 8
        }
        
        response = requests.put(f"{BASE_URL}/api/pricing/reseller-pricing/reseller@test.com", headers=headers, json=payload)
        assert response.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/pricing/reseller-pricing/reseller@test.com", headers=headers)
        assert verify_resp.status_code == 200
        data = verify_resp.json()
        assert data["cmt_margin_percent"] == 10
        assert data["fabric_margin_percent"] == 15
        print(f"Reseller margins updated: CMT={data['cmt_margin_percent']}%, Fabric={data['fabric_margin_percent']}%")


class TestAuthorizationChecks:
    """Tests for authorization requirements"""
    
    @pytest.fixture(scope="class")
    def reseller_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "reseller@test.com", "password": "reseller123"}
        )
        assert response.status_code == 200
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def reseller_headers(self, reseller_token):
        return {"Authorization": f"Bearer {reseller_token}", "Content-Type": "application/json"}
    
    def test_reseller_cannot_create_fabric(self, reseller_headers):
        """Reseller should not be able to create fabric codes"""
        payload = {
            "code": "RESELLER_TEST",
            "sku": "RES-TEST",
            "name": "Reseller Test",
            "base_price_per_meter": 20.0
        }
        
        response = requests.post(f"{BASE_URL}/api/pricing/fabrics", headers=reseller_headers, json=payload)
        assert response.status_code == 403, f"Should be forbidden, got {response.status_code}"
        print("Reseller correctly denied from creating fabric codes")
    
    def test_reseller_can_lookup_fabric(self, reseller_headers):
        """Reseller should be able to lookup fabric codes"""
        response = requests.get(f"{BASE_URL}/api/pricing/fabrics/lookup/P001", headers=reseller_headers)
        assert response.status_code == 200
        print("Reseller can lookup fabric codes")
    
    def test_unauthenticated_cannot_access_fabrics(self):
        """Unauthenticated requests should be denied"""
        response = requests.get(f"{BASE_URL}/api/pricing/fabrics")
        assert response.status_code == 401
        print("Unauthenticated access correctly denied")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
