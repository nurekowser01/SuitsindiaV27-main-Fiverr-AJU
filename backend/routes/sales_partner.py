from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional
import os
import jwt

router = APIRouter(prefix="/sales-partner", tags=["Sales Partner"])

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "reseller_pos")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

JWT_SECRET = os.environ.get("JWT_SECRET", "tailorstailor-secret-key-change-in-production")

async def get_current_partner(authorization: str):
    """Verify JWT token and return current sales partner"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get("role") != "sales_partner":
            raise HTTPException(status_code=403, detail="Access denied - Sales Partner only")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def calculate_product_commissions(orders: list, commission_settings: dict) -> dict:
    """Calculate commission breakdown by product category"""
    product_commissions = commission_settings.get("product_commissions", {})
    commission_percentage = commission_settings.get("commission_percentage", 0) / 100
    
    # Track quantities and commissions per product type
    product_breakdown = {}
    total_order_commission = 0.0
    
    for order in orders:
        for item in order.get("items", []):
            item_total = item.get("pricing", {}).get("total", 0)
            product_id = item.get("product_id", "").lower()
            product_name = item.get("product_name", "").lower()
            quantity = item.get("quantity", 1)  # Default to 1 if not specified
            
            # Find matching product commission rate
            matched_key = None
            per_unit_commission = 0
            
            for key, value in product_commissions.items():
                key_lower = key.lower()
                if key_lower in product_id or key_lower in product_name or product_id in key_lower or product_name in key_lower:
                    matched_key = key
                    per_unit_commission = value
                    break
            
            if matched_key:
                # Fixed per-product commission × quantity
                item_commission = per_unit_commission * quantity
                total_order_commission += item_commission
                
                # Track breakdown
                if matched_key not in product_breakdown:
                    product_breakdown[matched_key] = {
                        "quantity": 0,
                        "per_unit": per_unit_commission,
                        "total": 0
                    }
                product_breakdown[matched_key]["quantity"] += quantity
                product_breakdown[matched_key]["total"] += item_commission
            elif commission_percentage > 0:
                # Fall back to percentage commission
                item_commission = item_total * commission_percentage
                total_order_commission += item_commission
                
                # Track as percentage-based
                if "_percentage_based" not in product_breakdown:
                    product_breakdown["_percentage_based"] = {
                        "quantity": 0,
                        "percentage": commission_percentage * 100,
                        "total": 0
                    }
                product_breakdown["_percentage_based"]["quantity"] += quantity
                product_breakdown["_percentage_based"]["total"] += item_commission
    
    return {
        "total": total_order_commission,
        "breakdown": product_breakdown
    }


@router.get("/stats")
async def get_partner_stats(authorization: str = Header(None)):
    """Get statistics for the current sales partner with comprehensive commission calculation"""
    partner = await get_current_partner(authorization)
    partner_email = partner.get("email")
    commission_settings = partner.get("commission_settings", {})
    
    # Get resellers referred by this partner
    referred_resellers = await db.users.find({
        "role": "reseller",
        "referred_by": partner_email
    }).to_list(1000)
    
    reseller_emails = [r.get("email") for r in referred_resellers]
    num_referrals = len(referred_resellers)
    
    # Get only PLACED orders from referred resellers (exclude WIP orders)
    orders = await db.orders.find({
        "reseller_email": {"$in": reseller_emails},
        "status": {"$in": ["placed", "confirmed", "in_production", "shipped", "delivered", "completed"]}
    }).to_list(1000)
    
    total_orders = len(orders)
    
    # Calculate total revenue and count products
    total_revenue = 0
    total_products_sold = 0
    for order in orders:
        for item in order.get("items", []):
            total_revenue += item.get("pricing", {}).get("total", 0)
            total_products_sold += item.get("quantity", 1)
    
    # === COMMISSION CALCULATION ===
    # 1. Monthly Retainer (fixed monthly amount)
    monthly_retainer = commission_settings.get("monthly_retainer", 0)
    
    # 2. Onboarding Commission (per referred reseller)
    onboarding_commission_per = commission_settings.get("onboarding_commission", 0)
    total_onboarding_commission = onboarding_commission_per * num_referrals
    
    # 3. Product Commission (per product type × quantity sold)
    product_commission_result = calculate_product_commissions(orders, commission_settings)
    total_product_commission = product_commission_result["total"]
    product_breakdown = product_commission_result["breakdown"]
    
    # Standard calculation: Retainer + Onboarding + Product Commission
    total_commission = monthly_retainer + total_onboarding_commission + total_product_commission
    
    # Get pending commission (unpaid)
    paid_commission = partner.get("paid_commission", 0)
    pending_commission = max(0, total_commission - paid_commission)
    
    return {
        "total_referrals": num_referrals,
        "total_orders": total_orders,
        "total_products_sold": total_products_sold,
        "total_revenue": round(total_revenue, 2),
        "total_commission": round(total_commission, 2),
        "pending_commission": round(pending_commission, 2),
        # Breakdown for transparency
        "commission_breakdown": {
            "monthly_retainer": round(monthly_retainer, 2),
            "onboarding_total": round(total_onboarding_commission, 2),
            "onboarding_per_reseller": round(onboarding_commission_per, 2),
            "product_commission_total": round(total_product_commission, 2),
            "product_breakdown": product_breakdown,
        },
        "commission_settings": {
            "monthly_retainer": commission_settings.get("monthly_retainer", 0),
            "onboarding_commission": commission_settings.get("onboarding_commission", 0),
            "commission_percentage": commission_settings.get("commission_percentage", 0),
            "product_commissions": commission_settings.get("product_commissions", {}),
        }
    }


@router.get("/referrals")
async def get_referred_resellers(authorization: str = Header(None)):
    """Get list of resellers referred by the current sales partner"""
    partner = await get_current_partner(authorization)
    partner_email = partner.get("email")
    
    # Get referred resellers (excluding sensitive fields)
    resellers = await db.users.find({
        "role": "reseller",
        "referred_by": partner_email
    }, {
        "_id": 0,
        "hashed_password": 0,
        "password": 0
    }).to_list(100)
    
    # Add order count for each reseller
    for reseller in resellers:
        reseller_email = reseller.get("email")
        order_count = await db.orders.count_documents({
            "reseller_email": reseller_email
        })
        reseller["order_count"] = order_count
        reseller["id"] = reseller.get("email")  # Use email as ID for frontend
    
    return resellers


@router.get("/orders")
async def get_referred_orders(authorization: str = Header(None)):
    """Get orders from referred resellers with detailed commission breakdown"""
    partner = await get_current_partner(authorization)
    partner_email = partner.get("email")
    commission_settings = partner.get("commission_settings", {})
    product_commissions = commission_settings.get("product_commissions", {})
    
    # Get referred reseller emails
    referred_resellers = await db.users.find({
        "role": "reseller",
        "referred_by": partner_email
    }).to_list(1000)
    
    reseller_emails = [r.get("email") for r in referred_resellers]
    reseller_names = {r.get("email"): r.get("full_name", "Unknown") for r in referred_resellers}
    
    # Get only PLACED orders from referred resellers (exclude WIP orders)
    orders = await db.orders.find({
        "reseller_email": {"$in": reseller_emails},
        "status": {"$in": ["placed", "confirmed", "in_production", "shipped", "delivered", "completed"]}
    }).sort("created_at", -1).limit(50).to_list(50)
    
    result = []
    for order in orders:
        order_total = 0
        order_commission = 0
        products_in_order = []
        
        for item in order.get("items", []):
            item_total = item.get("pricing", {}).get("total", 0)
            order_total += item_total
            
            product_name = item.get("product_name", "")
            product_id = item.get("product_id", "").lower()
            quantity = item.get("quantity", 1)
            
            # Find matching commission rate
            per_unit = 0
            for key, value in product_commissions.items():
                if key.lower() in product_id or key.lower() in product_name.lower():
                    per_unit = value
                    break
            
            item_commission = per_unit * quantity
            order_commission += item_commission
            
            products_in_order.append({
                "name": product_name,
                "quantity": quantity,
                "commission": item_commission
            })
        
        result.append({
            "id": str(order.get("_id")),
            "order_id": order.get("order_id"),
            "customer_name": order.get("customer_name"),
            "reseller_email": order.get("reseller_email"),
            "reseller_name": reseller_names.get(order.get("reseller_email"), "Unknown"),
            "total": order_total,
            "commission": round(order_commission, 2),
            "products": products_in_order,
            "status": order.get("status"),
            "created_at": order.get("created_at")
        })
    
    return result
