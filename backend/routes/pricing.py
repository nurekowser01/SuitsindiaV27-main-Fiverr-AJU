"""
Pricing Module - Restructured

Logic:
1. Fabric Module: Fabric codes + base price per meter
2. Product Consumption: Meters of fabric needed per product
3. Size Margins: % markup on fabric price per size (A=0%, B=30%, C=50%)
4. Reseller Module: Per-reseller margins on CMT, Fabric, Styling, Shipping

Calculation:
- Fabric Cost = Base Price/m × Product Consumption × (1 + Size Margin %) × (1 + Reseller Fabric Margin %)
- CMT Cost = Base CMT × (1 + Reseller CMT Margin %)
- Styling Cost = Base Styling × (1 + Reseller Styling Margin %)
- Shipping Cost = Base Shipping × (1 + Reseller Shipping Margin %)
- Total = CMT + Fabric + Styling + Shipping
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from bson import ObjectId
import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "suits_india")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter()


async def get_current_admin(authorization: str = Header(None)):
    """Verify admin authentication"""
    from routes.auth import get_current_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def get_current_user_any(authorization: str):
    """Verify any authenticated user"""
    from routes.auth import get_current_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await get_current_user(authorization)


# =====================
# FABRIC MODULE
# Fabric codes with base price per meter
# =====================

class FabricCode(BaseModel):
    code: str  # Fabric Price Code - e.g., "P001", "P002" - used for pricing lookup
    sku: Optional[str] = None  # Fabric SKU - e.g., "FAB001", "WOOL-001" - for inventory tracking
    name: str  # e.g., "Premium Italian Wool"
    description: Optional[str] = None
    base_price_per_meter: float  # Base price per meter in $
    is_active: bool = True


@router.get("/fabrics")
async def get_fabrics(authorization: str = Header(None)):
    """Get all fabric codes"""
    await get_current_admin(authorization)
    
    fabrics = await db.fabrics.find({"is_active": True}).sort("code", 1).to_list(200)
    for f in fabrics:
        f["id"] = str(f.pop("_id"))
    return fabrics


@router.get("/fabrics/all")
async def get_all_fabrics(authorization: str = Header(None)):
    """Get all fabric codes including inactive"""
    await get_current_admin(authorization)
    
    fabrics = await db.fabrics.find().sort("code", 1).to_list(200)
    for f in fabrics:
        f["id"] = str(f.pop("_id"))
    return fabrics


@router.post("/fabrics")
async def create_fabric(fabric: FabricCode, authorization: str = Header(None)):
    """Create a new fabric code"""
    await get_current_admin(authorization)
    
    # Check for duplicate code
    existing = await db.fabrics.find_one({"code": fabric.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Fabric code already exists")
    
    fabric_data = fabric.dict()
    fabric_data["code"] = fabric_data["code"].upper()
    fabric_data["created_at"] = datetime.now(timezone.utc)
    fabric_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.fabrics.insert_one(fabric_data)
    fabric_data["id"] = str(result.inserted_id)
    if "_id" in fabric_data:
        del fabric_data["_id"]
    
    return fabric_data


@router.put("/fabrics/{fabric_id}")
async def update_fabric(fabric_id: str, fabric: FabricCode, authorization: str = Header(None)):
    """Update a fabric code"""
    await get_current_admin(authorization)
    
    fabric_data = fabric.dict()
    fabric_data["code"] = fabric_data["code"].upper()
    fabric_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.fabrics.update_one(
        {"_id": ObjectId(fabric_id)},
        {"$set": fabric_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fabric not found")
    
    return {"message": "Fabric updated", "id": fabric_id}


@router.delete("/fabrics/{fabric_id}")
async def delete_fabric(fabric_id: str, authorization: str = Header(None)):
    """Delete (deactivate) a fabric code"""
    await get_current_admin(authorization)
    
    result = await db.fabrics.update_one(
        {"_id": ObjectId(fabric_id)},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Fabric not found")
    
    return {"message": "Fabric deleted"}


@router.get("/fabrics/lookup/{code}")
async def lookup_fabric(code: str, authorization: str = Header(None)):
    """Lookup a fabric by code - for reseller use"""
    await get_current_user_any(authorization)
    
    fabric = await db.fabrics.find_one({"code": code.upper(), "is_active": True})
    if not fabric:
        raise HTTPException(status_code=404, detail="Fabric code not found")
    
    fabric["id"] = str(fabric.pop("_id"))
    return fabric


# =====================
# PRODUCT CONSUMPTION
# Meters of fabric needed per product
# =====================

class ProductConsumption(BaseModel):
    product_id: str
    product_name: str
    fabric_consumption_meters: float  # How many meters of fabric needed
    base_cmt: float = 0  # Base CMT (stitching) cost for this product
    base_shipping: float = 60  # Base shipping cost for this product
    # Note: CMT variant surcharges (Half Canvas, Full Canvas, etc.) come from Style Options configuration


@router.get("/product-consumption")
async def get_product_consumption(authorization: str = Header(None)):
    """Get fabric consumption for all products"""
    await get_current_admin(authorization)
    
    consumptions = await db.product_consumption.find().to_list(100)
    for c in consumptions:
        c["id"] = str(c.pop("_id"))
    return consumptions


@router.post("/product-consumption")
async def set_product_consumption(consumption: ProductConsumption, authorization: str = Header(None)):
    """Set fabric consumption for a product"""
    await get_current_admin(authorization)
    
    consumption_data = consumption.dict()
    consumption_data["updated_at"] = datetime.now(timezone.utc)
    
    # Upsert by product_id
    await db.product_consumption.update_one(
        {"product_id": consumption.product_id},
        {"$set": consumption_data},
        upsert=True
    )
    
    return {"message": "Product consumption saved"}


@router.get("/product-consumption/{product_id}")
async def get_product_consumption_by_id(product_id: str, authorization: str = Header(None)):
    """Get fabric consumption for a specific product"""
    await get_current_user_any(authorization)
    
    consumption = await db.product_consumption.find_one({"product_id": product_id})
    if not consumption:
        return {
            "product_id": product_id,
            "fabric_consumption_meters": 3.0,  # Default
            "base_cmt": 0,
            "base_shipping": 60
        }
    
    consumption["id"] = str(consumption.pop("_id"))
    return consumption


# =====================
# SIZE MARGINS
# % markup on fabric price per size
# =====================

class SizeMargins(BaseModel):
    size_a_margin_percent: float = 0  # e.g., 0%
    size_b_margin_percent: float = 30  # e.g., 30%
    size_c_margin_percent: float = 50  # e.g., 50%
    # Size ranges for reference
    size_a_range: str = "34-46"
    size_b_range: str = "47-54"
    size_c_range: str = "55+"


@router.get("/size-margins")
async def get_size_margins(authorization: str = Header(None)):
    """Get size margin configuration"""
    await get_current_admin(authorization)
    
    config = await db.app_settings.find_one({"type": "size_margins"})
    if not config:
        return {
            "size_a_margin_percent": 0,
            "size_b_margin_percent": 30,
            "size_c_margin_percent": 50,
            "size_a_range": "34-46",
            "size_b_range": "47-54",
            "size_c_range": "55+"
        }
    
    return {
        "size_a_margin_percent": config.get("size_a_margin_percent", 0),
        "size_b_margin_percent": config.get("size_b_margin_percent", 30),
        "size_c_margin_percent": config.get("size_c_margin_percent", 50),
        "size_a_range": config.get("size_a_range", "34-46"),
        "size_b_range": config.get("size_b_range", "47-54"),
        "size_c_range": config.get("size_c_range", "55+")
    }


@router.put("/size-margins")
async def update_size_margins(margins: SizeMargins, authorization: str = Header(None)):
    """Update size margin configuration"""
    await get_current_admin(authorization)
    
    await db.app_settings.update_one(
        {"type": "size_margins"},
        {"$set": {
            **margins.dict(),
            "type": "size_margins",
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    
    return {"message": "Size margins updated"}


# =====================
# RESELLER MODULE
# Per-reseller margins on CMT, Fabric, Styling, Shipping
# =====================

class ResellerPricing(BaseModel):
    reseller_email: str
    reseller_name: Optional[str] = None
    # CMT (Stitching) pricing
    cmt_margin_percent: float = 0
    # Fabric pricing
    fabric_margin_percent: float = 0
    # Styling pricing
    styling_margin_percent: float = 0
    # Shipping pricing
    shipping_margin_percent: float = 0
    # Optional: Custom base values (if different from global)
    custom_base_cmt: Optional[float] = None
    custom_base_shipping: Optional[float] = None


@router.get("/reseller-pricing")
async def get_all_reseller_pricing(authorization: str = Header(None)):
    """Get all reseller pricing configurations"""
    await get_current_admin(authorization)
    
    # Get all resellers
    resellers = await db.users.find({"role": "reseller"}).to_list(100)
    
    result = []
    for reseller in resellers:
        pricing = await db.reseller_pricing.find_one({"reseller_email": reseller["email"]})
        result.append({
            "reseller_email": reseller["email"],
            "reseller_name": reseller.get("company") or reseller.get("name", ""),
            "cmt_margin_percent": pricing.get("cmt_margin_percent", 0) if pricing else 0,
            "fabric_margin_percent": pricing.get("fabric_margin_percent", 0) if pricing else 0,
            "styling_margin_percent": pricing.get("styling_margin_percent", 0) if pricing else 0,
            "shipping_margin_percent": pricing.get("shipping_margin_percent", 0) if pricing else 0,
            "custom_base_cmt": pricing.get("custom_base_cmt") if pricing else None,
            "custom_base_shipping": pricing.get("custom_base_shipping") if pricing else None,
        })
    
    return result


@router.get("/reseller-pricing/{reseller_email}")
async def get_reseller_pricing(reseller_email: str, authorization: str = Header(None)):
    """Get pricing for a specific reseller"""
    await get_current_admin(authorization)
    
    pricing = await db.reseller_pricing.find_one({"reseller_email": reseller_email})
    if not pricing:
        return {
            "reseller_email": reseller_email,
            "cmt_margin_percent": 0,
            "fabric_margin_percent": 0,
            "styling_margin_percent": 0,
            "shipping_margin_percent": 0,
            "custom_base_cmt": None,
            "custom_base_shipping": None
        }
    
    pricing["id"] = str(pricing.pop("_id"))
    return pricing


@router.put("/reseller-pricing/{reseller_email}")
async def update_reseller_pricing(reseller_email: str, pricing: ResellerPricing, authorization: str = Header(None)):
    """Update pricing for a specific reseller"""
    await get_current_admin(authorization)
    
    pricing_data = pricing.dict()
    pricing_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.reseller_pricing.update_one(
        {"reseller_email": reseller_email},
        {"$set": pricing_data},
        upsert=True
    )
    
    return {"message": "Reseller pricing updated"}


# =====================
# COUNTRY SURCHARGES
# =====================

class CountrySurcharge(BaseModel):
    country_code: str
    country_name: str
    surcharge_amount: float
    is_active: bool = True


@router.get("/country-surcharges")
async def get_country_surcharges(authorization: str = Header(None)):
    """Get all country shipping surcharges"""
    await get_current_admin(authorization)
    
    surcharges = await db.country_surcharges.find({"is_active": True}).to_list(200)
    for s in surcharges:
        s["id"] = str(s.pop("_id"))
    return surcharges


@router.post("/country-surcharges")
async def create_country_surcharge(surcharge: CountrySurcharge, authorization: str = Header(None)):
    """Create a country surcharge"""
    await get_current_admin(authorization)
    
    surcharge_data = surcharge.dict()
    surcharge_data["country_code"] = surcharge_data["country_code"].upper()
    surcharge_data["created_at"] = datetime.now(timezone.utc)
    
    await db.country_surcharges.update_one(
        {"country_code": surcharge.country_code.upper()},
        {"$set": surcharge_data},
        upsert=True
    )
    
    return {"message": "Country surcharge saved"}


@router.delete("/country-surcharges/{country_code}")
async def delete_country_surcharge(country_code: str, authorization: str = Header(None)):
    """Delete a country surcharge"""
    await get_current_admin(authorization)
    
    await db.country_surcharges.update_one(
        {"country_code": country_code.upper()},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Country surcharge deleted"}


# =====================
# SHIPPING TRACKING
# =====================

class ShippingDetails(BaseModel):
    order_id: str
    courier_name: str
    awb_number: str
    shipped_date: str
    expected_delivery: Optional[str] = None
    tracking_url: Optional[str] = None
    notes: Optional[str] = None


@router.post("/shipping-tracking")
async def add_shipping_tracking(details: ShippingDetails, authorization: str = Header(None)):
    """Add shipping tracking details to an order"""
    await get_current_admin(authorization)
    
    result = await db.orders.update_one(
        {"order_id": details.order_id},
        {"$set": {
            "shipping_details": {
                "courier_name": details.courier_name,
                "awb_number": details.awb_number,
                "shipped_date": details.shipped_date,
                "expected_delivery": details.expected_delivery,
                "tracking_url": details.tracking_url,
                "notes": details.notes,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "status": "shipped"
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Shipping details added"}


@router.get("/shipping-tracking/{order_id}")
async def get_shipping_tracking(order_id: str, authorization: str = Header(None)):
    """Get shipping tracking details for an order"""
    await get_current_user_any(authorization)
    
    order = await db.orders.find_one({"order_id": order_id}, {"shipping_details": 1})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order.get("shipping_details", {})


# =====================
# PRICE CALCULATION
# =====================

@router.post("/calculate-price")
async def calculate_order_price(data: dict, authorization: str = Header(None)):
    """
    Calculate the total price for an order item.
    
    Input:
    - fabric_price_code: str (the fabric price code for pricing lookup)
    - size_category: "A" | "B" | "C"
    - product_id: str
    - styling_total: float (base styling cost from styling options)
    - construction_type: str (optional - e.g., "half_canvas", "full_canvas")
    - reseller_email: str
    - country_code: str (optional)
    
    Calculation for RESELLER:
    1. Fabric Cost = Base Price/m × Consumption × (1 + Size Margin %) × (1 + Admin Margin %) × (1 + Reseller Margin %)
    
    Calculation for STAFF:
    1. Get Reseller Cost (after admin margin)
    2. Apply Staff Cost Margin (set by reseller) → Staff Cost
    3. Apply Staff Customer Margin (set by staff) → Customer Price
    """
    user = await get_current_user_any(authorization)
    user_role = user.get("role_id", user.get("role", "reseller"))
    
    # Support both "fabric_code" and "fabric_price_code" for backward compatibility
    fabric_price_code = (data.get("fabric_price_code") or data.get("fabric_code", "")).upper()
    size_category = data.get("size_category", "A").upper()
    product_id = data.get("product_id")
    styling_total = data.get("styling_total", 0)
    construction_type = data.get("construction_type", "").lower()  # e.g., "half_canvas", "full_canvas"
    reseller_email = data.get("reseller_email") or user.get("email")
    country_code = data.get("country_code", "").upper()
    
    # For staff users, use parent reseller's email for base pricing
    is_staff = user_role == "staff"
    parent_reseller_email = None
    staff_cost_margins = {}
    staff_customer_margins = {}
    
    if is_staff:
        parent_reseller_email = user.get("parent_reseller_email")
        staff_cost_margins = user.get("margins", {})  # What reseller charges staff
        staff_customer_margins = user.get("customer_margins", {})  # What staff charges customer
        reseller_email = parent_reseller_email  # Use parent reseller for base pricing
    
    # 1. Get fabric base price by price code
    fabric = await db.fabrics.find_one({"code": fabric_price_code, "is_active": True})
    fabric_base_price = fabric.get("base_price_per_meter", 0) if fabric else 0
    fabric_name = fabric.get("name", "Unknown") if fabric else "Unknown"
    fabric_sku = fabric.get("sku", "") if fabric else ""
    
    # 2. Get product consumption and base costs
    consumption_data = await db.product_consumption.find_one({"product_id": product_id})
    fabric_consumption = consumption_data.get("fabric_consumption_meters", 3.0) if consumption_data else 3.0
    base_cmt = consumption_data.get("base_cmt", 0) if consumption_data else 0
    base_shipping = consumption_data.get("base_shipping", 60) if consumption_data else 60
    
    # 2.5 Get construction variant surcharge from STYLING CONFIGURATION (not hardcoded)
    construction_surcharge = 0
    construction_name = "Standard"
    if construction_type:
        # Fetch styling configuration for this product to get construction surcharges
        styling_config = await db.product_styling.find_one({"product_id": product_id})
        constructions = styling_config.get("constructions", []) if styling_config else []
        
        # Normalize construction type (convert "half_canvas" to "half-canvas" for matching)
        normalized_type = construction_type.replace("_", "-").lower()
        
        for construction in constructions:
            construction_id = construction.get("id", "").lower()
            if construction_id == normalized_type or construction_id == construction_type.lower():
                construction_surcharge = construction.get("base_price", 0)
                construction_name = construction.get("name", construction_type.title())
                break
    
    # 3. Get size margins
    size_config = await db.app_settings.find_one({"type": "size_margins"})
    if size_category == "A":
        size_margin = size_config.get("size_a_margin_percent", 0) if size_config else 0
    elif size_category == "B":
        size_margin = size_config.get("size_b_margin_percent", 30) if size_config else 30
    else:  # C
        size_margin = size_config.get("size_c_margin_percent", 50) if size_config else 50
    
    # 4. Get ADMIN margins from reseller_pricing (what admin charges reseller)
    reseller_pricing = await db.reseller_pricing.find_one({"reseller_email": reseller_email})
    admin_cmt_margin = reseller_pricing.get("cmt_margin_percent", 0) if reseller_pricing else 0
    admin_fabric_margin = reseller_pricing.get("fabric_margin_percent", 0) if reseller_pricing else 0
    admin_styling_margin = reseller_pricing.get("styling_margin_percent", 0) if reseller_pricing else 0
    admin_shipping_margin = reseller_pricing.get("shipping_margin_percent", 0) if reseller_pricing else 0
    
    # Use custom base values from reseller_pricing if set
    if reseller_pricing and reseller_pricing.get("custom_base_cmt") is not None:
        base_cmt = reseller_pricing["custom_base_cmt"]
    if reseller_pricing and reseller_pricing.get("custom_base_shipping") is not None:
        base_shipping = reseller_pricing["custom_base_shipping"]
    
    # 4b. Get RESELLER margins from reseller_settings (what reseller charges customer)
    # Look up by reseller_id (which stores the reseller's email)
    reseller_settings = await db.reseller_settings.find_one({"reseller_id": reseller_email})
    if not reseller_settings:
        reseller_settings = await db.reseller_settings.find_one({"reseller_id": "default"})
    
    settings_margins = reseller_settings.get("margins", {}) if reseller_settings else {}
    reseller_cmt_margin = settings_margins.get("base_product_margin", 0)
    reseller_fabric_margin = settings_margins.get("fabric_margin", 0)
    reseller_styling_margin = settings_margins.get("style_options_margin", 0)
    reseller_shipping_margin = settings_margins.get("shipping_margin", 0)
    
    # 5. Get country surcharge
    country_surcharge = 0
    if country_code:
        surcharge_data = await db.country_surcharges.find_one({"country_code": country_code, "is_active": True})
        if surcharge_data:
            country_surcharge = surcharge_data.get("surcharge_amount", 0)
    
    # Calculate costs with TWO-LAYER margins (or THREE-LAYER for staff):
    # Base Cost → + Admin Margin → Reseller Cost → + Reseller Margin → Customer Price
    # For Staff: + Staff Cost Margin → Staff Cost → + Staff Customer Margin → Customer Price
    
    # FABRIC: Base × Consumption × (1 + Size %) × (1 + Admin %)
    fabric_after_size = fabric_base_price * (1 + size_margin / 100)
    fabric_base_cost = fabric_after_size * fabric_consumption
    fabric_reseller_cost = fabric_base_cost * (1 + admin_fabric_margin / 100)  # Cost to reseller (after admin margin)
    
    # CMT: (Base + Construction Surcharge) × (1 + Admin %)
    cmt_base_with_construction = base_cmt + construction_surcharge
    cmt_reseller_cost = cmt_base_with_construction * (1 + admin_cmt_margin / 100)
    
    # STYLING: Base × (1 + Admin %)
    styling_reseller_cost = styling_total * (1 + admin_styling_margin / 100)
    
    # SHIPPING: (Base + Country) × (1 + Admin %)
    shipping_base_total = base_shipping + country_surcharge
    shipping_reseller_cost = shipping_base_total * (1 + admin_shipping_margin / 100)
    
    if is_staff:
        # For STAFF: Apply staff cost margins (what staff pays reseller)
        staff_cmt_cost_margin = staff_cost_margins.get("cmt_margin", 0)
        staff_fabric_cost_margin = staff_cost_margins.get("fabric_margin", 0)
        staff_styling_cost_margin = staff_cost_margins.get("styling_margin", 0)
        staff_shipping_cost_margin = staff_cost_margins.get("shipping_margin", 0)
        
        # Staff Cost = Reseller Cost × (1 + Staff Cost Margin %)
        fabric_staff_cost = fabric_reseller_cost * (1 + staff_fabric_cost_margin / 100)
        cmt_staff_cost = cmt_reseller_cost * (1 + staff_cmt_cost_margin / 100)
        styling_staff_cost = styling_reseller_cost * (1 + staff_styling_cost_margin / 100)
        shipping_staff_cost = shipping_reseller_cost * (1 + staff_shipping_cost_margin / 100)
        
        # Get staff's customer margins
        staff_cmt_customer_margin = staff_customer_margins.get("cmt_margin", 0)
        staff_fabric_customer_margin = staff_customer_margins.get("fabric_margin", 0)
        staff_styling_customer_margin = staff_customer_margins.get("styling_margin", 0)
        staff_shipping_customer_margin = staff_customer_margins.get("shipping_margin", 0)
        
        # Customer Price = Staff Cost × (1 + Staff Customer Margin %)
        fabric_customer_price = fabric_staff_cost * (1 + staff_fabric_customer_margin / 100)
        cmt_customer_price = cmt_staff_cost * (1 + staff_cmt_customer_margin / 100)
        styling_customer_price = styling_staff_cost * (1 + staff_styling_customer_margin / 100)
        shipping_customer_price = shipping_staff_cost * (1 + staff_shipping_customer_margin / 100)
        
        # Use staff cost as the "cost_before_reseller_margin" (what staff pays reseller)
        final_reseller_cost = fabric_staff_cost + cmt_staff_cost + styling_staff_cost + shipping_staff_cost
        
        return {
            "breakdown": {
                "fabric": {
                    "price_code": fabric_price_code,
                    "sku": fabric_sku,
                    "name": fabric_name,
                    "base_price_per_meter": fabric_base_price,
                    "consumption_meters": fabric_consumption,
                    "size_category": size_category,
                    "size_margin_percent": size_margin,
                    "price_after_size": round(fabric_after_size, 2),
                    "base_cost": round(fabric_base_cost, 2),
                    "admin_margin_percent": admin_fabric_margin,
                    "staff_cost_margin_percent": staff_fabric_cost_margin,
                    "cost_before_reseller_margin": round(fabric_staff_cost, 2),  # Staff's cost
                    "reseller_margin_percent": staff_fabric_customer_margin,  # Staff's customer margin
                    "final_cost": round(fabric_customer_price, 2)  # Customer price
                },
                "cmt": {
                    "base": base_cmt,
                    "construction_type": construction_name,
                    "construction_surcharge": construction_surcharge,
                    "base_with_construction": cmt_base_with_construction,
                    "admin_margin_percent": admin_cmt_margin,
                    "staff_cost_margin_percent": staff_cmt_cost_margin,
                    "cost_before_reseller_margin": round(cmt_staff_cost, 2),
                    "reseller_margin_percent": staff_cmt_customer_margin,
                    "final_cost": round(cmt_customer_price, 2)
                },
                "styling": {
                    "base": styling_total,
                    "admin_margin_percent": admin_styling_margin,
                    "staff_cost_margin_percent": staff_styling_cost_margin,
                    "cost_before_reseller_margin": round(styling_staff_cost, 2),
                    "reseller_margin_percent": staff_styling_customer_margin,
                    "final_cost": round(styling_customer_price, 2)
                },
                "shipping": {
                    "base": base_shipping,
                    "country_surcharge": country_surcharge,
                    "base_total": shipping_base_total,
                    "admin_margin_percent": admin_shipping_margin,
                    "staff_cost_margin_percent": staff_shipping_cost_margin,
                    "cost_before_reseller_margin": round(shipping_staff_cost, 2),
                    "reseller_margin_percent": staff_shipping_customer_margin,
                    "final_cost": round(shipping_customer_price, 2)
                }
            },
            "total_reseller_cost": round(final_reseller_cost, 2),  # What staff pays reseller
            "total": round(fabric_customer_price + cmt_customer_price + styling_customer_price + shipping_customer_price, 2),
            "is_staff_pricing": True
        }
    else:
        # For RESELLER: Apply reseller customer margins
        fabric_customer_price = fabric_reseller_cost * (1 + reseller_fabric_margin / 100)
        cmt_customer_price = cmt_reseller_cost * (1 + reseller_cmt_margin / 100)
        styling_customer_price = styling_reseller_cost * (1 + reseller_styling_margin / 100)
        shipping_customer_price = shipping_reseller_cost * (1 + reseller_shipping_margin / 100)
        
        # Totals
        total_reseller_cost = fabric_reseller_cost + cmt_reseller_cost + styling_reseller_cost + shipping_reseller_cost
        total_customer_price = fabric_customer_price + cmt_customer_price + styling_customer_price + shipping_customer_price
        
        return {
            "breakdown": {
                "fabric": {
                    "price_code": fabric_price_code,
                    "sku": fabric_sku,
                    "name": fabric_name,
                    "base_price_per_meter": fabric_base_price,
                    "consumption_meters": fabric_consumption,
                    "size_category": size_category,
                    "size_margin_percent": size_margin,
                    "price_after_size": round(fabric_after_size, 2),
                    "base_cost": round(fabric_base_cost, 2),
                    "admin_margin_percent": admin_fabric_margin,
                    "cost_before_reseller_margin": round(fabric_reseller_cost, 2),  # Reseller's cost
                    "reseller_margin_percent": reseller_fabric_margin,
                    "final_cost": round(fabric_customer_price, 2)  # Customer price
                },
                "cmt": {
                    "base": base_cmt,
                    "construction_type": construction_name,
                    "construction_surcharge": construction_surcharge,
                    "base_with_construction": cmt_base_with_construction,
                    "admin_margin_percent": admin_cmt_margin,
                    "cost_before_reseller_margin": round(cmt_reseller_cost, 2),
                    "reseller_margin_percent": reseller_cmt_margin,
                    "final_cost": round(cmt_customer_price, 2)
                },
                "styling": {
                    "base": styling_total,
                    "admin_margin_percent": admin_styling_margin,
                    "cost_before_reseller_margin": round(styling_reseller_cost, 2),
                    "reseller_margin_percent": reseller_styling_margin,
                    "final_cost": round(styling_customer_price, 2)
                },
                "shipping": {
                    "base": base_shipping,
                    "country_surcharge": country_surcharge,
                    "base_total": shipping_base_total,
                    "admin_margin_percent": admin_shipping_margin,
                    "cost_before_reseller_margin": round(shipping_reseller_cost, 2),
                    "reseller_margin_percent": reseller_shipping_margin,
                    "final_cost": round(shipping_customer_price, 2)
                }
            },
            "total_reseller_cost": round(total_reseller_cost, 2),
            "total": round(total_customer_price, 2)
        }
