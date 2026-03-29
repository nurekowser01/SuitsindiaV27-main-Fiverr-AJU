"""
Test Size Repository Lookup Bug Fixes
=====================================
Tests for the bug fix in Try-On Measurement feature:
1. 'Size not found' error when selecting a size that IS defined
2. Different sizes showing the same measurement values (stale data)

Key fix: handleTryOnSelect in LinkMeasurementPage.jsx now:
- Clears baseSizeMeasurements and adjustments when lookup fails
- Always resets adjustments to 0 when a new size is loaded
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://reseller-pos.preview.emergentagent.com').rstrip('/')


class TestSizeLookupBugFix:
    """Tests verifying the size lookup returns correct measurements for different sizes"""

    @pytest.fixture(scope="class")
    def reseller_token(self):
        """Get reseller authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reseller/login",
            json={"email": "george@reseller.com", "password": "george123"}
        )
        assert response.status_code == 200, f"Reseller login failed: {response.text}"
        return response.json().get("access_token")

    @pytest.fixture(scope="class")
    def auth_headers(self, reseller_token):
        """Auth headers for API requests"""
        return {"Authorization": f"Bearer {reseller_token}"}

    # ═══ Test 1: jacket/slim/36 returns correct measurements (chest=36) ═══
    def test_lookup_jacket_slim_36(self, auth_headers):
        """Verify jacket/slim/36 returns chest=36"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/36",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["size"] == 36
        assert data["garment_id"] == "jacket"
        assert data["fit_id"] == "slim"
        
        # Verify measurements exist and chest = 36
        measurements = data.get("measurements", {})
        assert "chest" in measurements, "chest measurement missing"
        assert measurements["chest"] == 36, f"Expected chest=36, got {measurements['chest']}"

    # ═══ Test 2: jacket/slim/42 returns correct measurements (chest=42) ═══
    def test_lookup_jacket_slim_42(self, auth_headers):
        """Verify jacket/slim/42 returns chest=42"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/42",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["size"] == 42
        
        measurements = data.get("measurements", {})
        assert measurements["chest"] == 42, f"Expected chest=42, got {measurements['chest']}"

    # ═══ Test 3: jacket/regular/42 returns correct measurements (chest=44) ═══
    def test_lookup_jacket_regular_42(self, auth_headers):
        """Verify jacket/regular/42 returns chest=44 (regular fit adds 2 inches)"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/regular/42",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["size"] == 42
        assert data["fit_id"] == "regular"
        
        measurements = data.get("measurements", {})
        assert measurements["chest"] == 44, f"Expected chest=44 for regular/42, got {measurements['chest']}"

    # ═══ Test 4: jacket/regular/44 returns correct measurements (chest=46) ═══
    def test_lookup_jacket_regular_44(self, auth_headers):
        """Verify jacket/regular/44 returns chest=46"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/regular/44",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["size"] == 44
        assert data["fit_id"] == "regular"
        
        measurements = data.get("measurements", {})
        assert measurements["chest"] == 46, f"Expected chest=46 for regular/44, got {measurements['chest']}"

    # ═══ Test 5: Portly fit (fit-1773922431515) returns 404 (no sizes defined) ═══
    def test_lookup_portly_returns_404(self, auth_headers):
        """Verify Portly fit (fit-1773922431515) returns 404 since it has no sizes"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/fit-1773922431515/42",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        # Verify error message contains fit name and size
        error_detail = response.json().get("detail", "")
        assert "42" in error_detail, "Error message should contain size number"
        assert "fit-1773922431515" in error_detail, "Error message should contain fit id"

    # ═══ Test 6: Different sizes return different measurement values ═══
    def test_different_sizes_different_measurements(self, auth_headers):
        """
        BUG FIX VERIFICATION: Switching between size 42 and 44 in same fit
        should return DIFFERENT measurement values (not stale data).
        """
        # Get size 42
        response_42 = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/regular/42",
            headers=auth_headers
        )
        assert response_42.status_code == 200
        
        # Get size 44
        response_44 = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/regular/44",
            headers=auth_headers
        )
        assert response_44.status_code == 200
        
        measurements_42 = response_42.json().get("measurements", {})
        measurements_44 = response_44.json().get("measurements", {})
        
        # CRITICAL: Different sizes MUST have different measurements
        assert measurements_42["chest"] != measurements_44["chest"], \
            f"BUG: Size 42 and 44 have same chest: {measurements_42['chest']}"
        
        # Verify specific expected values
        assert measurements_42["chest"] == 44, f"Size 42 chest should be 44, got {measurements_42['chest']}"
        assert measurements_44["chest"] == 46, f"Size 44 chest should be 46, got {measurements_44['chest']}"

    # ═══ Test 7: Error message format on lookup failure ═══
    def test_error_message_format(self, auth_headers):
        """When size lookup fails, error should contain fit name and size number"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/nonexistent-fit/42",
            headers=auth_headers
        )
        assert response.status_code == 404
        
        error = response.json().get("detail", "")
        assert "42" in error, "Error should mention size number"
        assert "nonexistent-fit" in error, "Error should mention fit id"

    # ═══ Test 8: All jacket/slim sizes have unique chest values ═══
    def test_all_slim_sizes_unique(self, auth_headers):
        """Verify all slim sizes 36-46 have unique measurement values (no stale/duplicate data)"""
        chest_values = []
        # Test sizes 36-46 (skip 34 which has test data)
        sizes = [36, 38, 40, 42, 44, 46]
        
        for size in sizes:
            response = requests.get(
                f"{BASE_URL}/api/size-repo/lookup/jacket/slim/{size}",
                headers=auth_headers
            )
            if response.status_code == 200:
                chest = response.json().get("measurements", {}).get("chest", 0)
                chest_values.append((size, chest))
        
        # All chest values should be unique - this tests that we don't have stale data
        unique_chests = set(c for s, c in chest_values)
        assert len(unique_chests) == len(chest_values), \
            f"BUG: Duplicate chest values found (stale data issue): {chest_values}"
        
        # Verify at least we got data back (not all 404s)
        assert len(chest_values) >= 4, f"Expected at least 4 sizes with data, got {len(chest_values)}"


class TestSizeLookupAuth:
    """Tests for authentication requirements on lookup endpoint"""

    def test_lookup_requires_auth(self):
        """Lookup endpoint should require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/38"
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"

    def test_lookup_with_invalid_token(self):
        """Lookup should reject invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/size-repo/lookup/jacket/slim/38",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
