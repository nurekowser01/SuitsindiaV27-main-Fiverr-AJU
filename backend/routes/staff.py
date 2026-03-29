"""
Staff Management Routes
Allows resellers to create and manage staff (sub-agents)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import jwt
from passlib.context import CryptContext

router = APIRouter(tags=["staff"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]

JWT_SECRET = os.environ.get("JWT_SECRET", "tailorstailor-secret-key-change-in-production")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


async def get_current_user(authorization: str = Header(None)):
    """Get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =====================
# Models
# =====================

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class StaffMargins(BaseModel):
    cmt_margin: float = 0  # % margin on CMT
    fabric_margin: float = 0  # % margin on fabric
    styling_margin: float = 0  # % margin on styling
    shipping_margin: float = 0  # % margin on shipping


# =====================
# Staff CRUD Endpoints
# =====================

@router.get("")
async def list_staff(authorization: str = Header(None)):
    """List all staff members for the current reseller"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    # Only resellers can list staff
    if role not in ["reseller", "admin"]:
        raise HTTPException(status_code=403, detail="Only resellers can manage staff")
    
    # Get staff created by this reseller
    staff_list = await db.users.find({
        "role_id": "staff",
        "parent_reseller_email": user_email
    }, {"hashed_password": 0}).to_list(100)
    
    for staff in staff_list:
        staff["_id"] = str(staff["_id"])
    
    return staff_list


@router.post("")
async def create_staff(staff_data: StaffCreate, authorization: str = Header(None)):
    """Create a new staff member"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    # Only resellers can create staff
    if role not in ["reseller", "admin"]:
        raise HTTPException(status_code=403, detail="Only resellers can create staff")
    
    # Check if email already exists
    existing = await db.users.find_one({"email": staff_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create staff user
    staff_doc = {
        "email": staff_data.email,
        "hashed_password": get_password_hash(staff_data.password),
        "full_name": staff_data.full_name,
        "phone": staff_data.phone,
        "role": "staff",
        "role_id": "staff",
        "is_admin": False,
        "is_active": True,
        "parent_reseller_email": user_email,  # Link to parent reseller
        "margins": {
            "cmt_margin": 0,
            "fabric_margin": 0,
            "styling_margin": 0,
            "shipping_margin": 0
        },
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(staff_doc)
    
    staff_doc["_id"] = str(result.inserted_id)
    staff_doc.pop("hashed_password", None)
    
    return staff_doc


@router.get("/{staff_email}")
async def get_staff(staff_email: str, authorization: str = Header(None)):
    """Get a specific staff member"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    }, {"hashed_password": 0})
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Staff can view their own record
    if role == "staff" and user_email == staff_email:
        staff["_id"] = str(staff["_id"])
        return staff
    
    # Reseller can only see their own staff
    if role == "reseller" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Admin can see all staff
    if role != "admin" and role != "reseller" and role != "staff":
        raise HTTPException(status_code=403, detail="Access denied")
    
    staff["_id"] = str(staff["_id"])
    return staff


@router.put("/{staff_email}")
async def update_staff(staff_email: str, staff_data: StaffUpdate, authorization: str = Header(None)):
    """Update staff member details"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Verify ownership
    if role != "admin" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if staff_data.full_name is not None:
        update_data["full_name"] = staff_data.full_name
    if staff_data.phone is not None:
        update_data["phone"] = staff_data.phone
    if staff_data.is_active is not None:
        update_data["is_active"] = staff_data.is_active
    
    await db.users.update_one(
        {"email": staff_email},
        {"$set": update_data}
    )
    
    updated_staff = await db.users.find_one({"email": staff_email}, {"hashed_password": 0})
    updated_staff["_id"] = str(updated_staff["_id"])
    return updated_staff


@router.patch("/{staff_email}/password")
async def update_staff_password(staff_email: str, data: dict, authorization: str = Header(None)):
    """Update staff password"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Verify ownership
    if role != "admin" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_password = data.get("password")
    if not new_password:
        raise HTTPException(status_code=400, detail="Password required")
    
    await db.users.update_one(
        {"email": staff_email},
        {"$set": {
            "hashed_password": get_password_hash(new_password),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Password updated successfully"}


@router.patch("/{staff_email}/margins")
async def update_staff_margins(staff_email: str, margins: StaffMargins, authorization: str = Header(None)):
    """Update staff margins - these are added on top of reseller's cost"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Verify ownership
    if role != "admin" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.users.update_one(
        {"email": staff_email},
        {"$set": {
            "margins": margins.model_dump(),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_staff = await db.users.find_one({"email": staff_email}, {"hashed_password": 0})
    updated_staff["_id"] = str(updated_staff["_id"])
    return updated_staff


@router.delete("/{staff_email}")
async def delete_staff(staff_email: str, authorization: str = Header(None)):
    """Delete (deactivate) a staff member"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Verify ownership
    if role != "admin" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Soft delete - just deactivate
    await db.users.update_one(
        {"email": staff_email},
        {"$set": {
            "is_active": False,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"message": "Staff deactivated successfully"}


@router.patch("/{staff_email}/customer-margins")
async def update_staff_customer_margins(staff_email: str, margins: dict, authorization: str = Header(None)):
    """Update staff's customer margins - these are the margins staff adds for their customers
    
    Staff can set their own margins to determine customer pricing.
    Customer Price = Staff Cost + Staff Customer Margin
    """
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Staff can update their own customer margins, reseller can update their staff's
    if role == "staff":
        if user_email != staff_email:
            raise HTTPException(status_code=403, detail="Access denied")
    elif role == "reseller":
        if staff.get("parent_reseller_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate and extract margins
    customer_margins = {
        "cmt_margin": float(margins.get("cmt_margin", 0)),
        "fabric_margin": float(margins.get("fabric_margin", 0)),
        "styling_margin": float(margins.get("styling_margin", 0)),
        "shipping_margin": float(margins.get("shipping_margin", 0))
    }
    
    await db.users.update_one(
        {"email": staff_email},
        {"$set": {
            "customer_margins": customer_margins,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_staff = await db.users.find_one({"email": staff_email}, {"hashed_password": 0})
    updated_staff["_id"] = str(updated_staff["_id"])
    return updated_staff


@router.patch("/{staff_email}/secret-code")
async def update_staff_secret_code(staff_email: str, data: dict, authorization: str = Header(None)):
    """Update staff's secret code for viewing cost prices"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Staff can only update their own secret code
    if role == "staff" and user_email != staff_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Reseller can update their staff's secret code
    if role == "reseller" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_code = data.get("code", "")
    
    await db.users.update_one(
        {"email": staff_email},
        {"$set": {
            "cost_view_secret_code": new_code,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "message": "Secret code updated"}


@router.post("/{staff_email}/verify-secret-code")
async def verify_staff_secret_code(staff_email: str, data: dict, authorization: str = Header(None)):
    """Verify staff's secret code for viewing cost prices"""
    # Verify user is authenticated (we don't use the user object but need auth check)
    await get_current_user(authorization)
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    stored_code = staff.get("cost_view_secret_code")
    provided_code = data.get("code", "")
    
    if not stored_code:
        raise HTTPException(status_code=400, detail="No secret code set. Please set one in My Pricing settings.")
    
    if stored_code != provided_code:
        raise HTTPException(status_code=401, detail="Invalid secret code")
    
    return {"success": True, "message": "Secret code verified"}


# =====================
# Staff Payment Tracking (Staff → Reseller)
# =====================

@router.get("/{staff_email}/settlements")
async def get_staff_settlements(staff_email: str, authorization: str = Header(None)):
    """Get settlement history between staff and reseller"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Staff can see their own settlements, reseller can see their staff's settlements
    if role == "staff" and user_email != staff_email:
        raise HTTPException(status_code=403, detail="Access denied")
    if role == "reseller" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    settlements = await db.staff_settlements.find({
        "staff_email": staff_email
    }).sort("created_at", -1).to_list(100)
    
    for s in settlements:
        s["_id"] = str(s["_id"])
    
    return settlements


@router.post("/{staff_email}/settlements")
async def create_settlement(staff_email: str, data: dict, authorization: str = Header(None)):
    """Record a settlement from staff to reseller"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    # Only reseller can record settlements
    if role not in ["reseller", "admin"]:
        raise HTTPException(status_code=403, detail="Only resellers can record settlements")
    
    staff = await db.users.find_one({
        "email": staff_email,
        "role_id": "staff"
    })
    
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    if role != "admin" and staff.get("parent_reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied")
    
    settlement = {
        "staff_email": staff_email,
        "reseller_email": staff.get("parent_reseller_email"),
        "amount": data.get("amount", 0),
        "method": data.get("method", "cash"),  # cash, bank_transfer, upi
        "notes": data.get("notes", ""),
        "order_ids": data.get("order_ids", []),  # Orders being settled
        "recorded_by": user_email,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.staff_settlements.insert_one(settlement)
    settlement["_id"] = str(result.inserted_id)
    
    # Mark associated orders as settled with reseller
    if settlement["order_ids"]:
        await db.orders.update_many(
            {"order_id": {"$in": settlement["order_ids"]}},
            {"$set": {
                "staff_settlement.status": "settled",
                "staff_settlement.settlement_id": str(result.inserted_id),
                "staff_settlement.settled_at": datetime.now(timezone.utc)
            }}
        )
    
    return settlement


# =====================
# Staff Pricing Calculation
# =====================

@router.post("/calculate-staff-price")
async def calculate_staff_price(data: dict, authorization: str = Header(None)):
    """
    Calculate price as seen by staff:
    Staff Cost = Reseller Cost + Staff Margin (set by reseller)
    Staff can then add their own margin for customer pricing
    """
    user = await get_current_user(authorization)
    user_email = user["email"]
    role = user.get("role_id", user.get("role"))
    
    if role != "staff":
        raise HTTPException(status_code=400, detail="This endpoint is for staff users")
    
    # Get staff's margins
    staff = await db.users.find_one({"email": user_email})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    staff_margins = staff.get("margins", {})
    
    # Get base pricing from request
    reseller_cost = data.get("reseller_cost", {})
    
    # Apply staff margins
    cmt_cost = reseller_cost.get("cmt", 0)
    fabric_cost = reseller_cost.get("fabric", 0)
    styling_cost = reseller_cost.get("styling", 0)
    shipping_cost = reseller_cost.get("shipping", 0)
    
    cmt_margin = staff_margins.get("cmt_margin", 0)
    fabric_margin = staff_margins.get("fabric_margin", 0)
    styling_margin = staff_margins.get("styling_margin", 0)
    shipping_margin = staff_margins.get("shipping_margin", 0)
    
    staff_cmt = cmt_cost * (1 + cmt_margin / 100)
    staff_fabric = fabric_cost * (1 + fabric_margin / 100)
    staff_styling = styling_cost * (1 + styling_margin / 100)
    staff_shipping = shipping_cost * (1 + shipping_margin / 100)
    
    total_staff_cost = staff_cmt + staff_fabric + staff_styling + staff_shipping
    
    return {
        "reseller_cost": {
            "cmt": cmt_cost,
            "fabric": fabric_cost,
            "styling": styling_cost,
            "shipping": shipping_cost,
            "total": cmt_cost + fabric_cost + styling_cost + shipping_cost
        },
        "staff_margins": staff_margins,
        "staff_cost": {
            "cmt": round(staff_cmt, 2),
            "fabric": round(staff_fabric, 2),
            "styling": round(staff_styling, 2),
            "shipping": round(staff_shipping, 2),
            "total": round(total_staff_cost, 2)
        },
        "breakdown": {
            "cmt_margin_amount": round(staff_cmt - cmt_cost, 2),
            "fabric_margin_amount": round(staff_fabric - fabric_cost, 2),
            "styling_margin_amount": round(staff_styling - styling_cost, 2),
            "shipping_margin_amount": round(staff_shipping - shipping_cost, 2)
        }
    }
