"""
Size Repository & Try-On Measurement Feature Tests
Tests:
- Admin Size Repository CRUD (garment types, fits, sizes)
- GET /api/size-repo/garment-types
- PUT /api/size-repo/garment-types
- GET /api/size-repo/sizes/{garment_id}/{fit_id}
- PUT /api/size-repo/sizes/{garment_id}/{fit_id}
- GET /api/size-repo/lookup/{garment_id}/{fit_id}/{size}
- PATCH /api/orders/{order_id}/link-measurement (Try-On mode)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com')
if BASE_URL.endswith('/'):
    BASE_URL = BASE_URL.rstrip('/')


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login(self):
        """Test admin login returns access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json={"email": "admin@suitsindia.com", "password": "admin"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["is_admin"] == True
        print("✓ Admin login successful")


class TestResellerAuth:
    """Reseller authentication tests"""
    
    def test_reseller_login(self):
        """Test reseller login returns access_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "george@reseller.com", "password": "george123"}
        )
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "reseller"
        print("✓ Reseller login successful")


@pytest.fixture(scope="class")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/admin/login",
        json={"email": "admin@suitsindia.com", "password": "admin"}
    )
    if response.status_code != 200:
        pytest.skip("Admin authentication failed")
    return response.json()["access_token"]


@pytest.fixture(scope="class")
def reseller_token():
    """Get reseller auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/reseller/login",
        json={"email": "george@reseller.com", "password": "george123"}
    )
    if response.status_code != 200:
        pytest.skip("Reseller authentication failed")
    return response.json()["access_token"]


class TestSizeRepositoryGarmentTypes:
    """Test garment types CRUD operations"""
    
    def test_get_garment_types(self, admin_token):
        """GET /api/size-repo/garment-types returns garment types with fits"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/garment-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get garment types: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET garment-types returned {len(data)} garment types")
        
        # Verify seeded data
        garment_names = [g["name"] for g in data]
        assert "Jacket" in garment_names, "Jacket not found in seeded data"
        assert "Pants" in garment_names, "Pants not found in seeded data"
        
        # Verify structure
        jacket = next((g for g in data if g["name"] == "Jacket"), None)
        assert jacket is not None
        assert "fits" in jacket
        assert "measurement_field_ids" in jacket
        assert len(jacket["fits"]) >= 2, "Jacket should have at least 2 fits (Slim, Regular)"
        
        fit_names = [f["name"] for f in jacket["fits"]]
        assert "Slim" in fit_names
        assert "Regular" in fit_names
        print("✓ Garment types structure verified (Jacket with Slim/Regular fits)")
    
    def test_get_garment_types_requires_auth(self):
        """GET /api/size-repo/garment-types requires authentication"""
        response = requests.get(f"{BASE_URL}/api/size-repo/garment-types")
        assert response.status_code == 401
        print("✓ GET garment-types requires auth (401 without)")
    
    def test_put_garment_types_requires_admin(self, reseller_token):
        """PUT /api/size-repo/garment-types requires admin (not reseller)"""
        response = requests.put(
            f"{BASE_URL}/api/size-repo/garment-types",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json={"garment_types": []}
        )
        assert response.status_code == 403, "Reseller should not be able to update garment types"
        print("✓ PUT garment-types rejects reseller (403)")
    
    def test_put_garment_types_admin(self, admin_token):
        """PUT /api/size-repo/garment-types saves garment types structure"""
        # First get current data
        get_response = requests.get(
            f"{BASE_URL}/api/size-repo/garment-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_data = get_response.json()
        
        # Add a test garment type
        test_garment = {
            "id": f"test-garment-{int(time.time())}",
            "name": "Test Vest",
            "fits": [
                {"id": "slim", "name": "Slim", "size_min": 36, "size_max": 44, "size_step": 2}
            ],
            "measurement_field_ids": ["chest", "stomach"]
        }
        
        new_data = original_data + [test_garment]
        
        response = requests.put(
            f"{BASE_URL}/api/size-repo/garment-types",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"garment_types": new_data}
        )
        assert response.status_code == 200, f"PUT failed: {response.text}"
        saved = response.json()
        assert len(saved) == len(new_data)
        print("✓ PUT garment-types saves structure (admin)")
        
        # Restore original data
        requests.put(
            f"{BASE_URL}/api/size-repo/garment-types",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"garment_types": original_data}
        )
        print("✓ Restored original garment types data")


class TestSizeRepositorySizes:
    """Test size measurements CRUD operations"""
    
    def test_get_sizes_for_fit(self, admin_token):
        """GET /api/size-repo/sizes/{garment_id}/{fit_id} returns size measurements"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get sizes: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET sizes/jacket/slim returned {len(data)} sizes")
        
        # Verify structure
        if len(data) > 0:
            size_row = data[0]
            assert "size" in size_row
            assert "measurements" in size_row
            assert "garment_id" in size_row
            assert "fit_id" in size_row
            assert size_row["garment_id"] == "jacket"
            assert size_row["fit_id"] == "slim"
            print(f"✓ Size structure verified: size={size_row['size']}, fields={list(size_row['measurements'].keys())}")
    
    def test_get_sizes_empty_fit(self, admin_token):
        """GET /api/size-repo/sizes for non-existent fit returns empty array"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/sizes/jacket/nonexistent",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []
        print("✓ GET sizes for non-existent fit returns empty array")
    
    def test_put_sizes_for_fit(self, admin_token):
        """PUT /api/size-repo/sizes/{garment_id}/{fit_id} saves size measurements"""
        # First get current data
        get_response = requests.get(
            f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_data = get_response.json()
        
        # Modify a measurement value
        if len(original_data) > 0:
            modified_data = original_data.copy()
            # Add a small adjustment to first size's chest measurement
            original_chest = modified_data[0]["measurements"].get("chest", 0)
            modified_data[0]["measurements"]["chest"] = original_chest
            
            response = requests.put(
                f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"sizes": modified_data}
            )
            assert response.status_code == 200, f"PUT failed: {response.text}"
            saved = response.json()
            assert len(saved) == len(modified_data)
            print("✓ PUT sizes/jacket/slim saves measurements (admin)")
            
            # Restore original
            requests.put(
                f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"sizes": original_data}
            )
    
    def test_put_sizes_requires_admin(self, reseller_token):
        """PUT /api/size-repo/sizes requires admin"""
        response = requests.put(
            f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json={"sizes": []}
        )
        assert response.status_code == 403
        print("✓ PUT sizes requires admin (403 for reseller)")


class TestSizeRepositoryLookup:
    """Test single size lookup for Try-On mode"""
    
    def test_lookup_size_success(self, reseller_token):
        """GET /api/size-repo/lookup/{garment}/{fit}/{size} returns measurements"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/38",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        data = response.json()
        assert data["size"] == 38
        assert data["garment_id"] == "jacket"
        assert data["fit_id"] == "slim"
        assert "measurements" in data
        assert "chest" in data["measurements"]
        print(f"✓ Lookup jacket/slim/38 returned measurements: {data['measurements']}")
    
    def test_lookup_size_not_found(self, reseller_token):
        """GET /api/size-repo/lookup returns 404 for non-existent size"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/99",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 404
        print("✓ Lookup for non-existent size returns 404")
    
    def test_lookup_requires_auth(self):
        """GET /api/size-repo/lookup requires authentication"""
        response = requests.get(f"{BASE_URL}/api/size-repo/lookup/jacket/slim/38")
        assert response.status_code == 401
        print("✓ Lookup requires authentication (401 without)")
    
    def test_lookup_pants(self, reseller_token):
        """Verify pants sizes also available"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/pants/slim/32",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Pants lookup failed: {response.text}"
        data = response.json()
        assert data["garment_id"] == "pants"
        print(f"✓ Lookup pants/slim/32 successful")


class TestLinkMeasurement:
    """Test PATCH /api/orders/{order_id}/link-measurement endpoint"""
    
    @pytest.fixture
    def test_order(self, reseller_token):
        """Create a test order for measurement linking"""
        # First get a customer
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No customers available for testing")
        
        customers = response.json()
        customer = customers[0]
        
        # Create order
        order_data = {
            "customer_id": customer["customer_id"],
            "customer_name": customer.get("name", "Test Customer"),
            "items": [
                {
                    "product_id": "test-jacket",
                    "product_name": "Test Jacket",
                    "configuration": {},
                    "pricing": {"total_customer_price": 500, "total_reseller_cost": 300}
                }
            ],
            "status": "wip"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json=order_data
        )
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        order = response.json()
        yield order
        
        # Cleanup - delete the order
        requests.delete(
            f"{BASE_URL}/api/orders/{order['order_id']}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
    
    def test_link_measurement_manual_mode(self, reseller_token, test_order):
        """PATCH link-measurement with manual mode measurements"""
        order_id = test_order["order_id"]
        
        measurement_data = {
            "item_index": 0,
            "linked_measurements": {
                "product_type": "jacket",
                "measurement_mode": "manual",
                "measurements": {
                    "chest": {
                        "body_measurement": 40,
                        "allowance": 2,
                        "final_measurement": 42,
                        "needed": True,
                        "method": "manual"
                    },
                    "shoulders": {
                        "body_measurement": 18,
                        "allowance": 0.5,
                        "final_measurement": 18.5,
                        "needed": True,
                        "method": "manual"
                    }
                }
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/link-measurement",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json=measurement_data
        )
        assert response.status_code == 200, f"Link measurement failed: {response.text}"
        
        updated = response.json()
        item = updated["items"][0]
        assert item.get("measurement_linked") == True
        assert "linked_measurements" in item
        assert item["linked_measurements"]["measurement_mode"] == "manual"
        print(f"✓ Manual mode measurement linked to order {order_id}")
    
    def test_link_measurement_tryon_mode(self, reseller_token, test_order):
        """PATCH link-measurement with try-on mode measurements"""
        order_id = test_order["order_id"]
        
        measurement_data = {
            "item_index": 0,
            "linked_measurements": {
                "product_type": "jacket",
                "measurement_mode": "tryon",
                "tryon_selections": {
                    "jacket": {"fit_id": "slim", "size": 38}
                },
                "measurements": {
                    "chest": {
                        "body_measurement": 38,
                        "allowance": 0.25,
                        "final_measurement": 38.25,
                        "needed": True,
                        "method": "tryon",
                        "tryon_selections": {"jacket": {"fit_id": "slim", "size": 38}}
                    }
                }
            }
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/link-measurement",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json=measurement_data
        )
        assert response.status_code == 200, f"Link measurement failed: {response.text}"
        
        updated = response.json()
        item = updated["items"][0]
        assert item["linked_measurements"]["measurement_mode"] == "tryon"
        assert item["linked_measurements"]["tryon_selections"]["jacket"]["size"] == 38
        print(f"✓ Try-on mode measurement linked to order {order_id}")
    
    def test_link_measurement_invalid_item_index(self, reseller_token, test_order):
        """PATCH link-measurement with invalid item_index returns 400"""
        order_id = test_order["order_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/link-measurement",
            headers={"Authorization": f"Bearer {reseller_token}"},
            json={"item_index": 99, "linked_measurements": {}}
        )
        assert response.status_code == 400
        print("✓ Link measurement rejects invalid item_index (400)")
    
    def test_link_measurement_requires_auth(self, test_order):
        """PATCH link-measurement requires authentication"""
        order_id = test_order["order_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/link-measurement",
            json={"item_index": 0, "linked_measurements": {}}
        )
        assert response.status_code == 401
        print("✓ Link measurement requires authentication (401)")


class TestAdjustmentIncrements:
    """Test 1/8 inch adjustment increments work correctly"""
    
    def test_eighth_inch_precision(self, reseller_token, admin_token):
        """Verify 1/8 inch (0.125) increments are stored correctly"""
        # Get current sizes
        response = requests.get(
            f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_data = response.json()
        
        if len(original_data) > 0:
            # Create a measurement with 1/8 inch precision
            modified_data = original_data.copy()
            modified_data[0]["measurements"]["chest"] = 38.125  # 38 + 1/8"
            modified_data[0]["measurements"]["stomach"] = 36.375  # 36 + 3/8"
            modified_data[0]["measurements"]["shoulders"] = 18.875  # 18 + 7/8"
            
            response = requests.put(
                f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"sizes": modified_data}
            )
            assert response.status_code == 200
            
            # Verify lookup returns precise values
            lookup = requests.get(
                f"{BASE_URL}/api/size-repo/lookup/jacket/slim/{modified_data[0]['size']}",
                headers={"Authorization": f"Bearer {reseller_token}"}
            )
            data = lookup.json()
            assert data["measurements"]["chest"] == 38.125
            assert data["measurements"]["stomach"] == 36.375
            assert data["measurements"]["shoulders"] == 18.875
            print("✓ 1/8 inch precision preserved: 38.125, 36.375, 18.875")
            
            # Restore
            requests.put(
                f"{BASE_URL}/api/size-repo/sizes/jacket/slim",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"sizes": original_data}
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
