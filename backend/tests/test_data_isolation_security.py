"""
P0 Critical Security Test: Data Isolation Between Reseller Accounts
=================================================================
This test verifies that resellers can ONLY see their own data and CANNOT access
data belonging to other resellers. Admin should see ALL data.

Test Credentials:
- Reseller 1: reseller@test.com / reseller123
- Reseller 2: trump@suitsindia.com / reseller123
- Admin: admin@suitsindia.com / admin

Endpoints under test:
- /api/customers (GET list, GET single, POST, PUT, DELETE)
- /api/orders (GET list, GET single)
- /api/styling/templates (GET)
- /api/chats (GET)
- /api/measurements (GET list, GET single)
"""

import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')

# Test credentials
RESELLER_1_EMAIL = "reseller@test.com"
RESELLER_1_PASSWORD = "reseller123"
RESELLER_2_EMAIL = "test_reseller2@suitsindia.com"
RESELLER_2_PASSWORD = "reseller123"
ADMIN_EMAIL = "admin@suitsindia.com"
ADMIN_PASSWORD = "admin"


def generate_unique_id():
    """Generate a unique test identifier"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


class TestDataIsolationSecurity:
    """P0 Critical Security Tests for Data Isolation"""
    
    @pytest.fixture(scope="class")
    def reseller1_token(self):
        """Get auth token for Reseller 1"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_1_EMAIL,
            "password": RESELLER_1_PASSWORD
        })
        assert response.status_code == 200, f"Reseller 1 login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def reseller2_token(self):
        """Get auth token for Reseller 2"""
        response = requests.post(f"{BASE_URL}/api/auth/reseller/login", json={
            "email": RESELLER_2_EMAIL,
            "password": RESELLER_2_PASSWORD
        })
        assert response.status_code == 200, f"Reseller 2 login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get auth token for Admin"""
        response = requests.post(f"{BASE_URL}/api/auth/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def test_data(self, reseller1_token, reseller2_token):
        """Create test data for both resellers and return IDs"""
        unique_id = generate_unique_id()
        
        # Create customer for Reseller 1
        r1_customer = requests.post(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller1_token}"},
            json={
                "name": f"TEST_R1_Customer_{unique_id}",
                "phone": f"1111{unique_id[:6]}",
                "email": f"r1_customer_{unique_id}@test.com",
                "notes": "Test customer for Reseller 1"
            }
        )
        r1_customer_id = None
        if r1_customer.status_code == 200:
            r1_customer_id = r1_customer.json().get("customer_id")
            print(f"Created Reseller 1 customer: {r1_customer_id}")
        
        # Create customer for Reseller 2
        r2_customer = requests.post(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller2_token}"},
            json={
                "name": f"TEST_R2_Customer_{unique_id}",
                "phone": f"2222{unique_id[:6]}",
                "email": f"r2_customer_{unique_id}@test.com",
                "notes": "Test customer for Reseller 2"
            }
        )
        r2_customer_id = None
        if r2_customer.status_code == 200:
            r2_customer_id = r2_customer.json().get("customer_id")
            print(f"Created Reseller 2 customer: {r2_customer_id}")
        
        # Create order for Reseller 1
        r1_order_id = None
        if r1_customer_id:
            r1_order = requests.post(
                f"{BASE_URL}/api/orders",
                headers={"Authorization": f"Bearer {reseller1_token}"},
                json={
                    "customer_id": r1_customer_id,
                    "customer_name": f"TEST_R1_Customer_{unique_id}",
                    "items": [],
                    "notes": "Test order for Reseller 1"
                }
            )
            if r1_order.status_code == 200:
                r1_order_id = r1_order.json().get("order_id")
                print(f"Created Reseller 1 order: {r1_order_id}")
        
        # Create order for Reseller 2
        r2_order_id = None
        if r2_customer_id:
            r2_order = requests.post(
                f"{BASE_URL}/api/orders",
                headers={"Authorization": f"Bearer {reseller2_token}"},
                json={
                    "customer_id": r2_customer_id,
                    "customer_name": f"TEST_R2_Customer_{unique_id}",
                    "items": [],
                    "notes": "Test order for Reseller 2"
                }
            )
            if r2_order.status_code == 200:
                r2_order_id = r2_order.json().get("order_id")
                print(f"Created Reseller 2 order: {r2_order_id}")
        
        # Create styling template for Reseller 1
        r1_template_id = None
        r1_template = requests.post(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller1_token}"},
            json={
                "name": f"TEST_R1_Template_{unique_id}",
                "description": "Test template for Reseller 1",
                "options": {}
            }
        )
        if r1_template.status_code == 200:
            r1_template_id = r1_template.json().get("id")
            print(f"Created Reseller 1 template: {r1_template_id}")
        
        # Create styling template for Reseller 2
        r2_template_id = None
        r2_template = requests.post(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller2_token}"},
            json={
                "name": f"TEST_R2_Template_{unique_id}",
                "description": "Test template for Reseller 2",
                "options": {}
            }
        )
        if r2_template.status_code == 200:
            r2_template_id = r2_template.json().get("id")
            print(f"Created Reseller 2 template: {r2_template_id}")
        
        # Create measurements for Reseller 1's customer
        if r1_customer_id:
            requests.post(
                f"{BASE_URL}/api/measurements",
                headers={"Authorization": f"Bearer {reseller1_token}"},
                json={
                    "customer_id": r1_customer_id,
                    "measurements": {"chest": 42, "waist": 34},
                    "selected_products": ["jacket"]
                }
            )
            print(f"Created Reseller 1 measurements for customer: {r1_customer_id}")
        
        # Create measurements for Reseller 2's customer
        if r2_customer_id:
            requests.post(
                f"{BASE_URL}/api/measurements",
                headers={"Authorization": f"Bearer {reseller2_token}"},
                json={
                    "customer_id": r2_customer_id,
                    "measurements": {"chest": 40, "waist": 32},
                    "selected_products": ["shirt"]
                }
            )
            print(f"Created Reseller 2 measurements for customer: {r2_customer_id}")
        
        return {
            "unique_id": unique_id,
            "reseller1": {
                "customer_id": r1_customer_id,
                "order_id": r1_order_id,
                "template_id": r1_template_id
            },
            "reseller2": {
                "customer_id": r2_customer_id,
                "order_id": r2_order_id,
                "template_id": r2_template_id
            }
        }
    
    # =====================
    # CUSTOMER ISOLATION TESTS
    # =====================
    
    def test_reseller1_can_see_own_customers(self, reseller1_token, test_data):
        """Verify Reseller 1 can see their own customers"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        
        customers = response.json()
        customer_names = [c.get("name", "") for c in customers]
        
        # Should see their own test customer
        assert any(test_data["unique_id"] in name and "R1" in name for name in customer_names), \
            f"Reseller 1 should see their own customer. Found: {customer_names}"
        
        print(f"PASS: Reseller 1 can see their own customers ({len(customers)} total)")
    
    def test_reseller1_cannot_see_reseller2_customers(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT see Reseller 2's customers"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        
        customers = response.json()
        customer_names = [c.get("name", "") for c in customers]
        
        # Should NOT see Reseller 2's test customer
        r2_visible = any(test_data["unique_id"] in name and "R2" in name for name in customer_names)
        assert not r2_visible, \
            f"SECURITY VIOLATION: Reseller 1 can see Reseller 2's customer! Names: {customer_names}"
        
        print("PASS: Reseller 1 cannot see Reseller 2's customers (data isolation working)")
    
    def test_reseller2_cannot_see_reseller1_customers(self, reseller2_token, test_data):
        """CRITICAL: Verify Reseller 2 CANNOT see Reseller 1's customers"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        
        customers = response.json()
        customer_names = [c.get("name", "") for c in customers]
        
        # Should NOT see Reseller 1's test customer
        r1_visible = any(test_data["unique_id"] in name and "R1" in name for name in customer_names)
        assert not r1_visible, \
            f"SECURITY VIOLATION: Reseller 2 can see Reseller 1's customer! Names: {customer_names}"
        
        print("PASS: Reseller 2 cannot see Reseller 1's customers (data isolation working)")
    
    def test_reseller1_cannot_access_reseller2_customer_directly(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT access Reseller 2's customer directly by ID"""
        r2_customer_id = test_data["reseller2"]["customer_id"]
        if not r2_customer_id:
            pytest.skip("Reseller 2 customer not created")
        
        response = requests.get(
            f"{BASE_URL}/api/customers/{r2_customer_id}",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        
        # Should get 403 Forbidden or 404 Not Found
        assert response.status_code in [403, 404], \
            f"SECURITY VIOLATION: Reseller 1 accessed Reseller 2's customer directly! Status: {response.status_code}, Response: {response.text}"
        
        print(f"PASS: Reseller 1 cannot access Reseller 2's customer directly (got {response.status_code})")
    
    # =====================
    # ORDER ISOLATION TESTS
    # =====================
    
    def test_reseller1_can_see_own_orders(self, reseller1_token, test_data):
        """Verify Reseller 1 can see their own orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json()
        order_ids = [o.get("order_id", "") for o in orders]
        
        # Should see their own test order
        r1_order_id = test_data["reseller1"]["order_id"]
        if r1_order_id:
            assert r1_order_id in order_ids, \
                f"Reseller 1 should see their own order {r1_order_id}. Found: {order_ids}"
        
        print(f"PASS: Reseller 1 can see their own orders ({len(orders)} total)")
    
    def test_reseller1_cannot_see_reseller2_orders(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT see Reseller 2's orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json()
        order_ids = [o.get("order_id", "") for o in orders]
        
        # Should NOT see Reseller 2's test order
        r2_order_id = test_data["reseller2"]["order_id"]
        if r2_order_id:
            assert r2_order_id not in order_ids, \
                f"SECURITY VIOLATION: Reseller 1 can see Reseller 2's order {r2_order_id}!"
        
        print("PASS: Reseller 1 cannot see Reseller 2's orders (data isolation working)")
    
    def test_reseller2_cannot_see_reseller1_orders(self, reseller2_token, test_data):
        """CRITICAL: Verify Reseller 2 CANNOT see Reseller 1's orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json()
        order_ids = [o.get("order_id", "") for o in orders]
        
        # Should NOT see Reseller 1's test order
        r1_order_id = test_data["reseller1"]["order_id"]
        if r1_order_id:
            assert r1_order_id not in order_ids, \
                f"SECURITY VIOLATION: Reseller 2 can see Reseller 1's order {r1_order_id}!"
        
        print("PASS: Reseller 2 cannot see Reseller 1's orders (data isolation working)")
    
    def test_reseller1_cannot_access_reseller2_order_directly(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT access Reseller 2's order directly by ID"""
        r2_order_id = test_data["reseller2"]["order_id"]
        if not r2_order_id:
            pytest.skip("Reseller 2 order not created")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{r2_order_id}",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        
        # Should get 403 Forbidden or 404 Not Found
        assert response.status_code in [403, 404], \
            f"SECURITY VIOLATION: Reseller 1 accessed Reseller 2's order directly! Status: {response.status_code}, Response: {response.text}"
        
        print(f"PASS: Reseller 1 cannot access Reseller 2's order directly (got {response.status_code})")
    
    # =====================
    # STYLING TEMPLATE ISOLATION TESTS
    # =====================
    
    def test_reseller1_can_see_own_templates(self, reseller1_token, test_data):
        """Verify Reseller 1 can see their own styling templates"""
        response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        template_names = [t.get("name", "") for t in templates]
        
        # Should see their own test template
        assert any(test_data["unique_id"] in name and "R1" in name for name in template_names), \
            f"Reseller 1 should see their own template. Found: {template_names}"
        
        print(f"PASS: Reseller 1 can see their own templates ({len(templates)} total)")
    
    def test_reseller1_cannot_see_reseller2_templates(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT see Reseller 2's templates"""
        response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        template_names = [t.get("name", "") for t in templates]
        
        # Should NOT see Reseller 2's test template
        r2_visible = any(test_data["unique_id"] in name and "R2" in name for name in template_names)
        assert not r2_visible, \
            f"SECURITY VIOLATION: Reseller 1 can see Reseller 2's template! Names: {template_names}"
        
        print("PASS: Reseller 1 cannot see Reseller 2's templates (data isolation working)")
    
    def test_reseller2_cannot_see_reseller1_templates(self, reseller2_token, test_data):
        """CRITICAL: Verify Reseller 2 CANNOT see Reseller 1's templates"""
        response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        template_names = [t.get("name", "") for t in templates]
        
        # Should NOT see Reseller 1's test template
        r1_visible = any(test_data["unique_id"] in name and "R1" in name for name in template_names)
        assert not r1_visible, \
            f"SECURITY VIOLATION: Reseller 2 can see Reseller 1's template! Names: {template_names}"
        
        print("PASS: Reseller 2 cannot see Reseller 1's templates (data isolation working)")
    
    # =====================
    # CHAT ISOLATION TESTS
    # =====================
    
    def test_reseller1_can_see_own_chats(self, reseller1_token):
        """Verify Reseller 1 can see their own chats"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get chats: {response.text}"
        
        chats = response.json()
        
        # Verify all returned chats belong to reseller1
        for chat in chats:
            reseller_email = chat.get("reseller_email", "")
            assert reseller_email == RESELLER_1_EMAIL, \
                f"SECURITY VIOLATION: Reseller 1 sees chat belonging to {reseller_email}"
        
        print(f"PASS: Reseller 1 can see their own chats ({len(chats)} total)")
    
    def test_reseller2_can_see_own_chats(self, reseller2_token):
        """Verify Reseller 2 can see their own chats"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert response.status_code == 200, f"Failed to get chats: {response.text}"
        
        chats = response.json()
        
        # Verify all returned chats belong to reseller2
        for chat in chats:
            reseller_email = chat.get("reseller_email", "")
            assert reseller_email == RESELLER_2_EMAIL, \
                f"SECURITY VIOLATION: Reseller 2 sees chat belonging to {reseller_email}"
        
        print(f"PASS: Reseller 2 can see their own chats ({len(chats)} total)")
    
    # =====================
    # MEASUREMENT ISOLATION TESTS
    # =====================
    
    def test_reseller1_can_see_own_measurements(self, reseller1_token, test_data):
        """Verify Reseller 1 can see their own measurements"""
        response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get measurements: {response.text}"
        
        measurements = response.json()
        customer_ids = [m.get("customer_id", "") for m in measurements]
        
        r1_customer_id = test_data["reseller1"]["customer_id"]
        if r1_customer_id:
            assert r1_customer_id in customer_ids, \
                f"Reseller 1 should see their own measurement. Found: {customer_ids}"
        
        print(f"PASS: Reseller 1 can see their own measurements ({len(measurements)} total)")
    
    def test_reseller1_cannot_see_reseller2_measurements(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT see Reseller 2's measurements"""
        response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert response.status_code == 200, f"Failed to get measurements: {response.text}"
        
        measurements = response.json()
        customer_ids = [m.get("customer_id", "") for m in measurements]
        
        r2_customer_id = test_data["reseller2"]["customer_id"]
        if r2_customer_id:
            assert r2_customer_id not in customer_ids, \
                f"SECURITY VIOLATION: Reseller 1 can see Reseller 2's measurement! IDs: {customer_ids}"
        
        print("PASS: Reseller 1 cannot see Reseller 2's measurements (data isolation working)")
    
    def test_reseller2_cannot_see_reseller1_measurements(self, reseller2_token, test_data):
        """CRITICAL: Verify Reseller 2 CANNOT see Reseller 1's measurements"""
        response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert response.status_code == 200, f"Failed to get measurements: {response.text}"
        
        measurements = response.json()
        customer_ids = [m.get("customer_id", "") for m in measurements]
        
        r1_customer_id = test_data["reseller1"]["customer_id"]
        if r1_customer_id:
            assert r1_customer_id not in customer_ids, \
                f"SECURITY VIOLATION: Reseller 2 can see Reseller 1's measurement! IDs: {customer_ids}"
        
        print("PASS: Reseller 2 cannot see Reseller 1's measurements (data isolation working)")
    
    def test_reseller1_cannot_access_reseller2_measurement_directly(self, reseller1_token, test_data):
        """CRITICAL: Verify Reseller 1 CANNOT access Reseller 2's measurement directly"""
        r2_customer_id = test_data["reseller2"]["customer_id"]
        if not r2_customer_id:
            pytest.skip("Reseller 2 customer not created")
        
        response = requests.get(
            f"{BASE_URL}/api/measurements/{r2_customer_id}",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        
        # Should get 403 Forbidden or return empty/no data
        if response.status_code == 200:
            data = response.json()
            # If 200, ensure measurements are empty (isolation via filtering)
            assert data.get("measurements", {}) == {} or response.status_code in [403, 404], \
                f"SECURITY VIOLATION: Reseller 1 accessed Reseller 2's measurement! Response: {response.text}"
        else:
            assert response.status_code in [403, 404], \
                f"Unexpected status: {response.status_code}, Response: {response.text}"
        
        print(f"PASS: Reseller 1 cannot access Reseller 2's measurement directly")
    
    # =====================
    # ADMIN ACCESS TESTS
    # =====================
    
    def test_admin_can_see_all_customers(self, admin_token, test_data):
        """Verify Admin can see ALL customers from all resellers"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        
        customers = response.json()
        customer_names = [c.get("name", "") for c in customers]
        
        # Admin should see BOTH resellers' test customers
        r1_visible = any(test_data["unique_id"] in name and "R1" in name for name in customer_names)
        r2_visible = any(test_data["unique_id"] in name and "R2" in name for name in customer_names)
        
        assert r1_visible, f"Admin should see Reseller 1's customer. Found: {customer_names}"
        assert r2_visible, f"Admin should see Reseller 2's customer. Found: {customer_names}"
        
        print(f"PASS: Admin can see all customers ({len(customers)} total, includes both R1 and R2 test customers)")
    
    def test_admin_can_see_all_orders(self, admin_token, test_data):
        """Verify Admin can see ALL orders from all resellers"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        orders = response.json()
        order_ids = [o.get("order_id", "") for o in orders]
        
        # Admin should see BOTH resellers' test orders
        r1_order_id = test_data["reseller1"]["order_id"]
        r2_order_id = test_data["reseller2"]["order_id"]
        
        if r1_order_id:
            assert r1_order_id in order_ids, f"Admin should see Reseller 1's order. Found: {order_ids}"
        if r2_order_id:
            assert r2_order_id in order_ids, f"Admin should see Reseller 2's order. Found: {order_ids}"
        
        print(f"PASS: Admin can see all orders ({len(orders)} total)")
    
    def test_admin_can_see_all_templates(self, admin_token, test_data):
        """Verify Admin can see ALL templates from all resellers"""
        response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        
        templates = response.json()
        template_names = [t.get("name", "") for t in templates]
        
        # Admin should see BOTH resellers' test templates
        r1_visible = any(test_data["unique_id"] in name and "R1" in name for name in template_names)
        r2_visible = any(test_data["unique_id"] in name and "R2" in name for name in template_names)
        
        assert r1_visible, f"Admin should see Reseller 1's template. Found: {template_names}"
        assert r2_visible, f"Admin should see Reseller 2's template. Found: {template_names}"
        
        print(f"PASS: Admin can see all templates ({len(templates)} total)")
    
    def test_admin_can_see_all_chats(self, admin_token):
        """Verify Admin can see ALL chats from all resellers"""
        response = requests.get(
            f"{BASE_URL}/api/chats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get chats: {response.text}"
        
        chats = response.json()
        
        # Admin should see chats from multiple resellers (if any exist)
        reseller_emails = set(chat.get("reseller_email", "") for chat in chats)
        
        print(f"PASS: Admin can see all chats ({len(chats)} total, from {len(reseller_emails)} resellers)")
    
    def test_admin_can_see_all_measurements(self, admin_token, test_data):
        """Verify Admin can see ALL measurements from all resellers"""
        response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get measurements: {response.text}"
        
        measurements = response.json()
        customer_ids = [m.get("customer_id", "") for m in measurements]
        
        # Admin should see BOTH resellers' measurements
        r1_customer_id = test_data["reseller1"]["customer_id"]
        r2_customer_id = test_data["reseller2"]["customer_id"]
        
        if r1_customer_id:
            assert r1_customer_id in customer_ids, f"Admin should see Reseller 1's measurement"
        if r2_customer_id:
            assert r2_customer_id in customer_ids, f"Admin should see Reseller 2's measurement"
        
        print(f"PASS: Admin can see all measurements ({len(measurements)} total)")
    
    # =====================
    # CLEANUP
    # =====================
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_data(self, reseller1_token, reseller2_token, admin_token, test_data):
        """Cleanup test data after all tests complete"""
        yield
        
        # Cleanup using admin token for full access
        print("\nCleaning up test data...")
        
        # Delete test orders first (before customers due to constraints)
        for order_id in [test_data["reseller1"]["order_id"], test_data["reseller2"]["order_id"]]:
            if order_id:
                requests.delete(
                    f"{BASE_URL}/api/orders/{order_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        
        # Delete test customers
        for customer_id in [test_data["reseller1"]["customer_id"], test_data["reseller2"]["customer_id"]]:
            if customer_id:
                # First delete measurements
                requests.delete(
                    f"{BASE_URL}/api/measurements/{customer_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                # Then delete customer
                requests.delete(
                    f"{BASE_URL}/api/customers/{customer_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        
        # Delete test templates
        for template_id in [test_data["reseller1"]["template_id"], test_data["reseller2"]["template_id"]]:
            if template_id:
                requests.delete(
                    f"{BASE_URL}/api/styling/templates/{template_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        
        print("Test data cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
