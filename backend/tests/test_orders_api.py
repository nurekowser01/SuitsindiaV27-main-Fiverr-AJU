"""
Test Orders API - WIP Orders and Link Measurement functionality
Tests: POST /api/orders, GET /api/orders, PATCH /api/orders/{id}/link-measurement
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
TEST_CUSTOMER_ID = f"TEST_customer_{random.randint(10000, 99999)}"
TEST_CUSTOMER_NAME = "Rahul Sharma"
created_order_ids = []


class TestOrdersAPI:
    """Test Orders API endpoints"""
    
    def test_health_check(self):
        """Verify API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_create_wip_order(self):
        """POST /api/orders - Create a new WIP order"""
        order_data = {
            "customer_id": TEST_CUSTOMER_ID,
            "customer_name": TEST_CUSTOMER_NAME,
            "items": [{
                "product_id": "jacket_001",
                "product_name": "Classic Jacket",
                "category_id": "suits",
                "category_name": "Suits",
                "configuration": {"fabric": "wool"},
                "styling": {"lapel": "notch"},
                "pricing": {"cmt": 1000, "styling": 200, "total": 1200},
                "linked_measurements": None,
                "measurement_linked": False
            }]
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "order_id" in data
        assert data["customer_id"] == TEST_CUSTOMER_ID
        assert data["customer_name"] == TEST_CUSTOMER_NAME
        assert data["status"] == "wip"
        assert len(data["items"]) == 1
        assert data["items"][0]["product_name"] == "Classic Jacket"
        assert data["items"][0]["measurement_linked"] == False
        
        # Store order_id for cleanup
        created_order_ids.append(data["order_id"])
        print(f"Created order: {data['order_id']}")
    
    def test_create_order_without_customer_id_fails(self):
        """POST /api/orders - Should fail without customer_id"""
        order_data = {
            "customer_name": "Test Customer",
            "items": []
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert response.status_code == 400
    
    def test_list_orders_by_customer(self):
        """GET /api/orders - List orders filtered by customer_id"""
        response = requests.get(f"{BASE_URL}/api/orders", params={"customer_id": TEST_CUSTOMER_ID})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the order we created
        assert len(data) >= 1
        
        # Verify all returned orders belong to our test customer
        for order in data:
            assert order["customer_id"] == TEST_CUSTOMER_ID
    
    def test_list_orders_by_status(self):
        """GET /api/orders - List orders filtered by status"""
        response = requests.get(f"{BASE_URL}/api/orders", params={"status": "wip"})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all returned orders have wip status
        for order in data:
            assert order["status"] == "wip"
    
    def test_get_specific_order(self):
        """GET /api/orders/{order_id} - Get a specific order"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["order_id"] == order_id
        assert data["customer_id"] == TEST_CUSTOMER_ID
    
    def test_get_nonexistent_order_returns_404(self):
        """GET /api/orders/{order_id} - Should return 404 for non-existent order"""
        response = requests.get(f"{BASE_URL}/api/orders/NONEXISTENT_ORDER_123")
        assert response.status_code == 404
    
    def test_link_measurement_to_order(self):
        """PATCH /api/orders/{order_id}/link-measurement - Link measurements to order item"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        measurement_data = {
            "item_index": 0,
            "linked_measurements": {
                "product_type": "jacket",
                "measurements": {
                    "chest": {
                        "body_measurement": 40,
                        "allowance": 2,
                        "final_measurement": 42,
                        "needed": True
                    },
                    "shoulders": {
                        "body_measurement": 18,
                        "allowance": 0.5,
                        "final_measurement": 18.5,
                        "needed": True
                    },
                    "sleeve_length": {
                        "body_measurement": 25,
                        "allowance": 0,
                        "final_measurement": 25,
                        "needed": True
                    }
                }
            }
        }
        
        response = requests.patch(f"{BASE_URL}/api/orders/{order_id}/link-measurement", json=measurement_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["order_id"] == order_id
        assert data["items"][0]["measurement_linked"] == True
        assert data["items"][0]["linked_measurements"] is not None
        assert data["items"][0]["linked_measurements"]["product_type"] == "jacket"
        
        # Verify measurement values
        measurements = data["items"][0]["linked_measurements"]["measurements"]
        assert measurements["chest"]["final_measurement"] == 42
        assert measurements["shoulders"]["allowance"] == 0.5
        print(f"Linked measurements to order: {order_id}")
    
    def test_link_measurement_invalid_item_index(self):
        """PATCH /api/orders/{order_id}/link-measurement - Should fail with invalid item_index"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        measurement_data = {
            "item_index": 999,  # Invalid index
            "linked_measurements": {}
        }
        
        response = requests.patch(f"{BASE_URL}/api/orders/{order_id}/link-measurement", json=measurement_data)
        assert response.status_code == 400
    
    def test_update_order_status_to_placed(self):
        """PATCH /api/orders/{order_id}/status - Update order status to placed"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        response = requests.patch(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "placed"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "placed"
        print(f"Updated order status to placed: {order_id}")
    
    def test_update_order_status_invalid(self):
        """PATCH /api/orders/{order_id}/status - Should fail with invalid status"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        response = requests.patch(f"{BASE_URL}/api/orders/{order_id}/status", json={"status": "invalid_status"})
        assert response.status_code == 400
    
    def test_copy_order(self):
        """POST /api/orders/{order_id}/copy - Copy an existing order"""
        if not created_order_ids:
            pytest.skip("No order created to test")
        
        order_id = created_order_ids[0]
        response = requests.post(f"{BASE_URL}/api/orders/{order_id}/copy")
        assert response.status_code == 200
        
        data = response.json()
        assert data["order_id"] != order_id  # New order ID
        assert data["customer_id"] == TEST_CUSTOMER_ID
        assert data["status"] == "wip"  # Copied orders start as WIP
        assert "Copy of" in data.get("notes", "")
        
        # Store for cleanup
        created_order_ids.append(data["order_id"])
        print(f"Copied order {order_id} to {data['order_id']}")
    
    def test_get_customer_wip_orders(self):
        """GET /api/orders/customer/{customer_id}/wip - Get WIP orders for customer"""
        response = requests.get(f"{BASE_URL}/api/orders/customer/{TEST_CUSTOMER_ID}/wip")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned orders should be WIP status
        for order in data:
            assert order["status"] == "wip"
            assert order["customer_id"] == TEST_CUSTOMER_ID
    
    def test_delete_order(self):
        """DELETE /api/orders/{order_id} - Delete an order"""
        # Create a new order specifically for deletion
        order_data = {
            "customer_id": TEST_CUSTOMER_ID,
            "customer_name": TEST_CUSTOMER_NAME,
            "items": [{
                "product_id": "test_delete",
                "product_name": "Test Delete Product"
            }]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]
        
        # Delete the order
        delete_response = requests.delete(f"{BASE_URL}/api/orders/{order_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert get_response.status_code == 404
        print(f"Deleted order: {order_id}")
    
    def test_delete_nonexistent_order_returns_404(self):
        """DELETE /api/orders/{order_id} - Should return 404 for non-existent order"""
        response = requests.delete(f"{BASE_URL}/api/orders/NONEXISTENT_ORDER_456")
        assert response.status_code == 404


class TestOrdersIntegration:
    """Integration tests for complete order flow"""
    
    def test_complete_wip_to_link_measurement_flow(self):
        """Test complete flow: Create WIP order -> Link measurements -> Verify"""
        # Step 1: Create WIP order
        order_data = {
            "customer_id": f"TEST_flow_{random.randint(10000, 99999)}",
            "customer_name": "Flow Test Customer",
            "items": [{
                "product_id": "pant_001",
                "product_name": "Classic Pant",
                "measurement_linked": False
            }]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/orders", json=order_data)
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]
        
        # Step 2: Verify order is WIP
        get_response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "wip"
        assert get_response.json()["items"][0]["measurement_linked"] == False
        
        # Step 3: Link measurements
        measurement_data = {
            "item_index": 0,
            "linked_measurements": {
                "product_type": "pant",
                "measurements": {
                    "waist": {
                        "body_measurement": 32,
                        "allowance": 1,
                        "final_measurement": 33,
                        "needed": True
                    },
                    "hips": {
                        "body_measurement": 38,
                        "allowance": 2,
                        "final_measurement": 40,
                        "needed": True
                    }
                }
            }
        }
        
        link_response = requests.patch(f"{BASE_URL}/api/orders/{order_id}/link-measurement", json=measurement_data)
        assert link_response.status_code == 200
        
        # Step 4: Verify measurements are linked
        verify_response = requests.get(f"{BASE_URL}/api/orders/{order_id}")
        assert verify_response.status_code == 200
        order = verify_response.json()
        assert order["items"][0]["measurement_linked"] == True
        assert order["items"][0]["linked_measurements"]["measurements"]["waist"]["final_measurement"] == 33
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/orders/{order_id}")
        print(f"Complete flow test passed for order: {order_id}")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_orders():
    """Cleanup test orders after all tests complete"""
    yield
    # Cleanup created orders
    for order_id in created_order_ids:
        try:
            requests.delete(f"{BASE_URL}/api/orders/{order_id}")
            print(f"Cleaned up order: {order_id}")
        except Exception as e:
            print(f"Failed to cleanup order {order_id}: {e}")
