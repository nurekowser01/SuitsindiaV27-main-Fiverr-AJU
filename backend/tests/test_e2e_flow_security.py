"""
E2E Flow and Security Tests for Suits India
Tests: Credentials, Data Isolation, Order Flow, Sales Partner Commission
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "admin": {"email": "admin@suitsindia.com", "password": "admin"},
    "reseller1": {"email": "reseller@test.com", "password": "reseller123"},
    "reseller2": {"email": "trump@suitsindia.com", "password": "trump123"},
    "sales_partner": {"email": "donald@suitsindia.com", "password": "donald123"}
}


class TestCredentialLogin:
    """Test that all provided credentials work correctly"""
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json=CREDENTIALS["admin"]
        )
        print(f"Admin login response: {response.status_code} - {response.json() if response.status_code != 500 else response.text[:200]}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"Admin login SUCCESS - Role: {data['user'].get('role')}")
    
    def test_reseller1_login(self):
        """Test Reseller 1 (reseller@test.com) login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller1"]
        )
        print(f"Reseller1 login response: {response.status_code}")
        assert response.status_code == 200, f"Reseller1 login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "reseller@test.com"
        print(f"Reseller1 login SUCCESS - Role: {data['user'].get('role')}")
    
    def test_reseller2_login(self):
        """Test Reseller 2 (Trump - trump@suitsindia.com) login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller2"]
        )
        print(f"Reseller2 login response: {response.status_code}")
        assert response.status_code == 200, f"Reseller2 (Trump) login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "trump@suitsindia.com"
        print(f"Reseller2 (Trump) login SUCCESS - Role: {data['user'].get('role')}")
    
    def test_sales_partner_login(self):
        """Test Sales Partner (Donald) login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["sales_partner"]
        )
        print(f"Sales Partner login response: {response.status_code}")
        assert response.status_code == 200, f"Sales Partner login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "donald@suitsindia.com"
        assert data["user"].get("role") == "sales_partner" or data["user"].get("role_id") == "sales_partner"
        print(f"Sales Partner login SUCCESS - Role: {data['user'].get('role')}")


class TestDataIsolation:
    """Test that data is properly isolated between resellers"""
    
    @pytest.fixture
    def reseller1_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller1"]
        )
        if response.status_code != 200:
            pytest.skip(f"Reseller1 login failed: {response.status_code}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def reseller2_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller2"]
        )
        if response.status_code != 200:
            pytest.skip(f"Reseller2 login failed: {response.status_code}")
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/admin/login",
            json=CREDENTIALS["admin"]
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_customers_isolation(self, reseller1_token, reseller2_token):
        """Verify resellers only see their own customers"""
        # Get Reseller1 customers
        r1_response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert r1_response.status_code == 200, f"Reseller1 customers fetch failed: {r1_response.text}"
        r1_customers = r1_response.json()
        r1_customer_ids = {c["customer_id"] for c in r1_customers}
        print(f"Reseller1 sees {len(r1_customers)} customers")
        
        # Get Reseller2 customers
        r2_response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert r2_response.status_code == 200, f"Reseller2 customers fetch failed: {r2_response.text}"
        r2_customers = r2_response.json()
        r2_customer_ids = {c["customer_id"] for c in r2_customers}
        print(f"Reseller2 sees {len(r2_customers)} customers")
        
        # Verify no overlap (complete isolation)
        overlap = r1_customer_ids & r2_customer_ids
        assert len(overlap) == 0, f"SECURITY ISSUE: Customers overlap found: {overlap}"
        print("PASS: No customer data overlap between resellers")
    
    def test_orders_isolation(self, reseller1_token, reseller2_token):
        """Verify resellers only see their own orders"""
        # Get Reseller1 orders
        r1_response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert r1_response.status_code == 200
        r1_orders = r1_response.json()
        r1_order_ids = {o["order_id"] for o in r1_orders}
        print(f"Reseller1 sees {len(r1_orders)} orders")
        
        # Get Reseller2 orders
        r2_response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert r2_response.status_code == 200
        r2_orders = r2_response.json()
        r2_order_ids = {o["order_id"] for o in r2_orders}
        print(f"Reseller2 sees {len(r2_orders)} orders")
        
        # Verify no overlap
        overlap = r1_order_ids & r2_order_ids
        assert len(overlap) == 0, f"SECURITY ISSUE: Orders overlap found: {overlap}"
        print("PASS: No order data overlap between resellers")
    
    def test_styling_templates_isolation(self, reseller1_token, reseller2_token):
        """Verify resellers only see their own templates (plus global)"""
        # Get Reseller1 templates
        r1_response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert r1_response.status_code == 200
        r1_templates = r1_response.json()
        r1_own_templates = [t for t in r1_templates if not t.get("is_global")]
        print(f"Reseller1 sees {len(r1_templates)} templates ({len(r1_own_templates)} own)")
        
        # Get Reseller2 templates
        r2_response = requests.get(
            f"{BASE_URL}/api/styling/templates",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert r2_response.status_code == 200
        r2_templates = r2_response.json()
        r2_own_templates = [t for t in r2_templates if not t.get("is_global")]
        print(f"Reseller2 sees {len(r2_templates)} templates ({len(r2_own_templates)} own)")
        
        # Verify no overlap in own templates (global templates can overlap)
        r1_own_ids = {t["id"] for t in r1_own_templates}
        r2_own_ids = {t["id"] for t in r2_own_templates}
        overlap = r1_own_ids & r2_own_ids
        assert len(overlap) == 0, f"SECURITY ISSUE: Own templates overlap found: {overlap}"
        print("PASS: No styling template data overlap between resellers")
    
    def test_measurements_isolation(self, reseller1_token, reseller2_token):
        """Verify resellers only see their own customer measurements"""
        # Get Reseller1 measurements
        r1_response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        assert r1_response.status_code == 200
        r1_measurements = r1_response.json()
        r1_customer_ids = {m.get("customer_id") for m in r1_measurements}
        print(f"Reseller1 sees {len(r1_measurements)} measurement records")
        
        # Get Reseller2 measurements
        r2_response = requests.get(
            f"{BASE_URL}/api/measurements",
            headers={"Authorization": f"Bearer {reseller2_token}"}
        )
        assert r2_response.status_code == 200
        r2_measurements = r2_response.json()
        r2_customer_ids = {m.get("customer_id") for m in r2_measurements}
        print(f"Reseller2 sees {len(r2_measurements)} measurement records")
        
        # Verify no overlap
        overlap = r1_customer_ids & r2_customer_ids
        # Filter out None values
        overlap = {c for c in overlap if c is not None}
        assert len(overlap) == 0, f"SECURITY ISSUE: Measurements overlap found for customers: {overlap}"
        print("PASS: No measurement data overlap between resellers")
    
    def test_direct_customer_access_blocked(self, reseller1_token, reseller2_token):
        """Verify direct access to another reseller's customer by ID is blocked"""
        # First, get a customer from Reseller1
        r1_response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        r1_customers = r1_response.json()
        
        if len(r1_customers) > 0:
            # Try to access R1's customer with R2's token
            r1_customer_id = r1_customers[0]["customer_id"]
            cross_access = requests.get(
                f"{BASE_URL}/api/customers/{r1_customer_id}",
                headers={"Authorization": f"Bearer {reseller2_token}"}
            )
            assert cross_access.status_code in [403, 404], f"SECURITY ISSUE: R2 could access R1's customer! Status: {cross_access.status_code}"
            print(f"PASS: Cross-access to customer blocked with status {cross_access.status_code}")
        else:
            print("SKIP: No R1 customers to test direct access")
    
    def test_direct_order_access_blocked(self, reseller1_token, reseller2_token):
        """Verify direct access to another reseller's order by ID is blocked"""
        # First, get an order from Reseller1
        r1_response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {reseller1_token}"}
        )
        r1_orders = r1_response.json()
        
        if len(r1_orders) > 0:
            # Try to access R1's order with R2's token
            r1_order_id = r1_orders[0]["order_id"]
            cross_access = requests.get(
                f"{BASE_URL}/api/orders/{r1_order_id}",
                headers={"Authorization": f"Bearer {reseller2_token}"}
            )
            assert cross_access.status_code in [403, 404], f"SECURITY ISSUE: R2 could access R1's order! Status: {cross_access.status_code}"
            print(f"PASS: Cross-access to order blocked with status {cross_access.status_code}")
        else:
            print("SKIP: No R1 orders to test direct access")


class TestSalesPartnerCommission:
    """Test Sales Partner stats and commission calculation"""
    
    @pytest.fixture
    def sales_partner_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["sales_partner"]
        )
        if response.status_code != 200:
            pytest.skip(f"Sales Partner login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_sales_partner_stats_endpoint(self, sales_partner_token):
        """Test that sales partner can access their stats"""
        response = requests.get(
            f"{BASE_URL}/api/sales-partner/stats",
            headers={"Authorization": f"Bearer {sales_partner_token}"}
        )
        print(f"Sales Partner stats response: {response.status_code}")
        assert response.status_code == 200, f"Stats fetch failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "total_referrals" in data
        assert "total_orders" in data
        assert "total_commission" in data
        assert "commission_breakdown" in data
        
        print(f"Stats: {data['total_referrals']} referrals, {data['total_orders']} orders, ₹{data['total_commission']} commission")
        print(f"Commission breakdown: {data['commission_breakdown']}")
    
    def test_sales_partner_referrals(self, sales_partner_token):
        """Test that sales partner can see their referred resellers"""
        response = requests.get(
            f"{BASE_URL}/api/sales-partner/referrals",
            headers={"Authorization": f"Bearer {sales_partner_token}"}
        )
        print(f"Referrals response: {response.status_code}")
        assert response.status_code == 200, f"Referrals fetch failed: {response.text}"
        referrals = response.json()
        
        print(f"Referred resellers: {[r.get('email') for r in referrals]}")
        
        # Check if Trump is in the referred list (as per problem statement)
        trump_found = any(r.get("email") == "trump@suitsindia.com" for r in referrals)
        print(f"Trump (trump@suitsindia.com) is referred by Donald: {trump_found}")
    
    def test_sales_partner_orders(self, sales_partner_token):
        """Test that sales partner can see orders from referred resellers"""
        response = requests.get(
            f"{BASE_URL}/api/sales-partner/orders",
            headers={"Authorization": f"Bearer {sales_partner_token}"}
        )
        print(f"Orders response: {response.status_code}")
        assert response.status_code == 200, f"Orders fetch failed: {response.text}"
        orders = response.json()
        
        print(f"Sales partner sees {len(orders)} orders")
        
        # Verify only PLACED orders are shown (not WIP)
        for order in orders:
            status = order.get("status", "")
            assert status != "wip", f"WIP order {order.get('order_id')} should not be visible to sales partner"
            print(f"Order {order.get('order_id')}: status={status}, reseller={order.get('reseller_email')}")
    
    def test_sales_partner_cannot_see_other_resellers_orders(self, sales_partner_token):
        """Verify sales partner only sees orders from their referred resellers"""
        # Get referrals first
        ref_response = requests.get(
            f"{BASE_URL}/api/sales-partner/referrals",
            headers={"Authorization": f"Bearer {sales_partner_token}"}
        )
        referrals = ref_response.json()
        referred_emails = {r.get("email") for r in referrals}
        print(f"Referred reseller emails: {referred_emails}")
        
        # Get orders
        orders_response = requests.get(
            f"{BASE_URL}/api/sales-partner/orders",
            headers={"Authorization": f"Bearer {sales_partner_token}"}
        )
        orders = orders_response.json()
        
        # Verify all orders are from referred resellers
        for order in orders:
            reseller_email = order.get("reseller_email")
            assert reseller_email in referred_emails, f"Order from non-referred reseller: {reseller_email}"
        
        print(f"PASS: All {len(orders)} orders are from referred resellers only")


class TestOrderFlow:
    """Test order creation and status flow"""
    
    @pytest.fixture
    def reseller_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller2"]  # Use Trump's account
        )
        if response.status_code != 200:
            pytest.skip(f"Reseller login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_get_product_categories(self, reseller_token):
        """Test fetching product categories"""
        response = requests.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Categories fetch failed: {response.text}"
        categories = response.json()
        
        print(f"Found {len(categories)} product categories")
        for cat in categories:
            print(f"  - {cat.get('name')}: {len(cat.get('products', []))} products")
        
        assert len(categories) > 0, "No product categories found"
    
    def test_get_customers(self, reseller_token):
        """Test fetching customers"""
        response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Customers fetch failed: {response.text}"
        customers = response.json()
        
        print(f"Found {len(customers)} customers for reseller")
        for cust in customers[:3]:  # Print first 3
            print(f"  - {cust.get('name')} (ID: {cust.get('customer_id')})")
    
    def test_get_wip_orders(self, reseller_token):
        """Test fetching WIP orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "wip"},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"WIP orders fetch failed: {response.text}"
        orders = response.json()
        
        print(f"Found {len(orders)} WIP orders")
        for order in orders[:3]:
            print(f"  - {order.get('order_id')}: {order.get('customer_name')}")
    
    def test_get_placed_orders(self, reseller_token):
        """Test fetching placed orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            params={"status": "placed"},
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        assert response.status_code == 200, f"Placed orders fetch failed: {response.text}"
        orders = response.json()
        
        print(f"Found {len(orders)} placed orders")
        for order in orders[:3]:
            print(f"  - {order.get('order_id')}: {order.get('customer_name')}")
    
    def test_order_creation_workflow(self, reseller_token):
        """Test basic order creation API"""
        # First get a customer
        cust_response = requests.get(
            f"{BASE_URL}/api/customers",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        customers = cust_response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers available to create order")
        
        customer = customers[0]
        
        # Create WIP order
        order_data = {
            "customer_id": customer["customer_id"],
            "customer_name": customer["name"],
            "items": [{
                "product_id": "test-product",
                "product_name": "Test Product",
                "category_id": "test-cat",
                "category_name": "Test Category",
                "configuration": {},
                "styling": {},
                "pricing": {"cmt": 100, "styling": 50, "total": 150}
            }],
            "status": "wip"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        created_order = response.json()
        
        print(f"Created order: {created_order.get('order_id')}")
        assert "order_id" in created_order
        
        # Clean up - delete the test order
        delete_response = requests.delete(
            f"{BASE_URL}/api/orders/{created_order['order_id']}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        print(f"Cleanup: deleted test order - status {delete_response.status_code}")


class TestStylingParameters:
    """Test styling parameters API"""
    
    @pytest.fixture
    def reseller_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller1"]
        )
        if response.status_code != 200:
            pytest.skip(f"Reseller login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_get_styling_parameters(self, reseller_token):
        """Test fetching styling parameters for a product"""
        # First get categories to find a product
        cat_response = requests.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        categories = cat_response.json()
        
        # Find first active product
        product_id = None
        for cat in categories:
            for product in cat.get("products", []):
                if product.get("is_active"):
                    product_id = product.get("id")
                    print(f"Testing styling for product: {product.get('name')} (ID: {product_id})")
                    break
            if product_id:
                break
        
        if not product_id:
            pytest.skip("No active products found")
        
        # Get styling parameters
        response = requests.get(
            f"{BASE_URL}/api/styling/parameters/{product_id}",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Styling parameters fetch failed: {response.text}"
        styling_data = response.json()
        
        print(f"Styling data keys: {styling_data.keys()}")
        if "parameters" in styling_data:
            print(f"Found {len(styling_data['parameters'])} styling parameters")
        if "constructions" in styling_data:
            print(f"Found {len(styling_data['constructions'])} construction options")


class TestMeasurementConfig:
    """Test measurement configuration API"""
    
    @pytest.fixture
    def reseller_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json=CREDENTIALS["reseller1"]
        )
        if response.status_code != 200:
            pytest.skip(f"Reseller login failed: {response.status_code}")
        return response.json()["access_token"]
    
    def test_get_measurement_config(self, reseller_token):
        """Test fetching measurement configuration"""
        response = requests.get(
            f"{BASE_URL}/api/measurements/config",
            headers={"Authorization": f"Bearer {reseller_token}"}
        )
        
        assert response.status_code == 200, f"Measurement config fetch failed: {response.text}"
        config = response.json()
        
        print(f"Measurement config keys: {config.keys()}")
        if "fields" in config:
            print(f"Found {len(config['fields'])} measurement fields")
        if "product_types" in config:
            print(f"Found {len(config['product_types'])} product types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
