from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from bson import ObjectId
import os

router = APIRouter()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def get_current_admin(authorization: str = Header(None)):
    from routes.auth import get_current_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return user


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[str] = None
    payment_methods: Optional[dict] = None
    reseller_source: Optional[str] = "direct"  # "direct" or "referred"
    referred_by: Optional[str] = None  # Sales partner user ID
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    role_id: Optional[str] = None
    payment_methods: Optional[dict] = None
    reseller_source: Optional[str] = None
    referred_by: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users")
async def get_users(authorization: str = Header(None)):
    current_admin = await get_current_admin(authorization)
    users = await db.users.find().to_list(1000)
    result = []
    for u in users:
        user_data = {
            "id": str(u["_id"]),
            "email": u["email"],
            "full_name": u.get("full_name", ""),
            "phone": u.get("phone", ""),
            "company": u.get("company", ""),
            "address": u.get("address", ""),
            "role": u.get("role", "user"),
            "role_id": u.get("role_id", ""),
            "is_active": u.get("is_active", True),
            "is_admin": u.get("is_admin", False),
            "payment_methods": u.get("payment_methods", {"bank_transfer": True, "stripe": False}),
            "commission_settings": u.get("commission_settings", {}),
            "reseller_source": u.get("reseller_source", "direct"),
            "referred_by": u.get("referred_by", ""),
            "created_at": u.get("created_at"),
        }
        result.append(user_data)
    return result


@router.post("/users")
async def create_user(user_data: dict, authorization: str = Header(None)):
    from routes.auth import get_password_hash
    current_admin = await get_current_admin(authorization)
    
    email = user_data.get("email")
    password = user_data.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Map role_id to role field for authentication
    role_id = user_data.get("role_id", "")
    role = "user"  # Default role
    if role_id == "sales_partner":
        role = "sales_partner"
    elif role_id == "reseller":
        role = "reseller"
    elif role_id == "admin":
        role = "admin"
    elif role_id == "staff":
        role = "staff"
    
    user_dict = {
        "email": email,
        "hashed_password": get_password_hash(password),
        "full_name": user_data.get("full_name", ""),
        "phone": user_data.get("phone", ""),
        "company": user_data.get("company", ""),
        "address": user_data.get("address", ""),
        "role": role,
        "role_id": role_id,
        "is_admin": role == "admin",
        "is_active": user_data.get("is_active", True),
        "payment_methods": user_data.get("payment_methods", {"bank_transfer": True, "stripe": False}),
        "reseller_source": user_data.get("reseller_source", "direct"),
        "referred_by": user_data.get("referred_by", ""),
        "created_at": datetime.now(timezone.utc),
    }
    
    result = await db.users.insert_one(user_dict)
    return {"id": str(result.inserted_id), "email": email}


@router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, authorization: str = Header(None)):
    from routes.auth import get_password_hash
    current_admin = await get_current_admin(authorization)
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {"updated_at": datetime.now(timezone.utc)}
    
    if user_data.get("email"):
        update_dict["email"] = user_data["email"]
    if user_data.get("password"):
        update_dict["hashed_password"] = get_password_hash(user_data["password"])
    if "full_name" in user_data:
        update_dict["full_name"] = user_data["full_name"]
    if "phone" in user_data:
        update_dict["phone"] = user_data["phone"]
    if "company" in user_data:
        update_dict["company"] = user_data["company"]
    if "address" in user_data:
        update_dict["address"] = user_data["address"]
    if "role_id" in user_data:
        role_id = user_data["role_id"]
        update_dict["role_id"] = role_id
        # Sync role field with role_id
        if role_id == "sales_partner":
            update_dict["role"] = "sales_partner"
            update_dict["is_admin"] = False
        elif role_id == "reseller":
            update_dict["role"] = "reseller"
            update_dict["is_admin"] = False
        elif role_id == "admin":
            update_dict["role"] = "admin"
            update_dict["is_admin"] = True
        elif role_id == "staff":
            update_dict["role"] = "staff"
            update_dict["is_admin"] = False
        else:
            update_dict["role"] = "user"
            update_dict["is_admin"] = False
    if "payment_methods" in user_data:
        update_dict["payment_methods"] = user_data["payment_methods"]
    if "reseller_source" in user_data:
        update_dict["reseller_source"] = user_data["reseller_source"]
    if "referred_by" in user_data:
        update_dict["referred_by"] = user_data["referred_by"]
    if "is_active" in user_data:
        update_dict["is_active"] = user_data["is_active"]
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "full_name": updated_user.get("full_name", ""),
    }


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, authorization: str = Header(None)):
    current_admin = await get_current_admin(authorization)
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role, "is_admin": role == "admin", "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User role updated"}


@router.put("/users/{user_email}/commissions")
async def update_user_commissions(
    user_email: str, 
    commission_data: dict,
    authorization: str = Header(None)
):
    """Update commission settings for a sales partner"""
    current_admin = await get_current_admin(authorization)
    
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") != "sales_partner":
        raise HTTPException(status_code=400, detail="User is not a sales partner")
    
    commission_settings = commission_data.get("commission_settings", {})
    
    result = await db.users.update_one(
        {"email": user_email},
        {"$set": {"commission_settings": commission_settings}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update commission settings")
    
    return {"message": "Commission settings updated successfully"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, authorization: str = Header(None)):
    current_admin = await get_current_admin(authorization)
    
    if str(current_admin.get("_id")) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}


@router.get("/dashboard/stats")
async def get_dashboard_stats(authorization: str = Header(None)):
    current_admin = await get_current_admin(authorization)
    
    total_users = await db.users.count_documents({})
    
    # Get hero images count
    ui_settings = await db.settings.find_one({"_id": "ui_settings"})
    hero_images = len(ui_settings.get("hero_images", [])) if ui_settings else 0
    
    # Get order statistics
    total_orders = await db.orders.count_documents({})
    
    # Count orders by status
    status_counts = {}
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    async for doc in db.orders.aggregate(pipeline):
        status_counts[doc["_id"] or "unknown"] = doc["count"]
    
    # Calculate total revenue from all orders
    revenue_pipeline = [
        {"$unwind": "$items"},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": {"$ifNull": ["$items.pricing.total", 0]}}
        }}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
    
    # Get recent orders (last 5)
    recent_orders = await db.orders.find().sort("created_at", -1).limit(5).to_list(5)
    for order in recent_orders:
        order["id"] = str(order.pop("_id"))
    
    # Get total customers
    total_customers = await db.customers.count_documents({})
    
    # Count orders from last 30 days
    from datetime import timedelta
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    orders_last_30_days = await db.orders.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    return {
        "total_users": total_users,
        "total_pages": 4,
        "hero_images": hero_images,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_customers": total_customers,
        "orders_by_status": status_counts,
        "orders_last_30_days": orders_last_30_days,
        "recent_orders": recent_orders
    }
