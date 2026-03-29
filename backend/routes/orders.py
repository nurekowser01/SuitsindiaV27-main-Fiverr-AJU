from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import random
import string
import jwt

router = APIRouter(tags=["orders"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]

JWT_SECRET = os.environ.get("JWT_SECRET", "tailorstailor-secret-key-change-in-production")


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


def generate_order_id(customer_name: str) -> str:
    """Generate order ID like 'Aju -- 301394'"""
    prefix = customer_name.split()[0] if customer_name else "ORD"
    number = ''.join(random.choices(string.digits, k=6))
    return f"{prefix} -- {number}"


def get_reseller_email(user: dict) -> str:
    """Get the effective reseller email - for staff, returns parent reseller's email"""
    is_staff = user.get("role") == "staff" or user.get("role_id") == "staff"
    if is_staff:
        return user.get("parent_reseller_email", user["email"])
    return user["email"]


class OrderItem(BaseModel):
    product_id: str
    product_name: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    configuration: Optional[dict] = None
    styling: Optional[dict] = None
    linked_measurements: Optional[dict] = None
    pricing: Optional[dict] = None


class Order(BaseModel):
    customer_id: str
    customer_name: str
    items: List[OrderItem] = []
    status: str = "wip"
    notes: Optional[str] = None


# =====================
# RESELLER ORDER ENDPOINTS (filtered by reseller)
# =====================

@router.post("")
async def create_order(order_data: dict, authorization: str = Header(None)):
    """Create a new WIP order"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    
    # Staff users: use parent reseller's email for order ownership
    is_staff = user.get("role") == "staff" or user.get("role_id") == "staff"
    reseller_email = user.get("parent_reseller_email", user_email) if is_staff else user_email
    
    customer_id = order_data.get("customer_id")
    customer_name = order_data.get("customer_name", "Customer")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    
    # Verify customer belongs to this reseller
    customer = await db.customers.find_one({"customer_id": customer_id})
    if customer:
        is_admin = user.get("is_admin", False) or user.get("role") == "admin"
        if not is_admin and customer.get("reseller_email") != reseller_email:
            raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    # Calculate totals from items if not provided
    items = order_data.get("items", [])
    total_customer_price = order_data.get("total_customer_price", 0)
    total_admin_cost = order_data.get("total_admin_cost", 0)
    
    # If totals not provided, calculate from items pricing
    if total_customer_price == 0 and items:
        for item in items:
            pricing = item.get("pricing", {})
            total_customer_price += pricing.get("total_customer_price", pricing.get("total", 0))
            total_admin_cost += pricing.get("total_reseller_cost", 0)
    
    order = {
        "order_id": generate_order_id(customer_name),
        "customer_id": customer_id,
        "customer_name": customer_name,
        "items": items,
        "status": "wip",
        "notes": order_data.get("notes"),
        "reseller_email": reseller_email,  # Parent reseller email (or self if reseller)
        "created_by": user_email,  # Track who actually created the order (staff or reseller)
        
        # Customer Payment Tracking (Customer → Reseller)
        "customer_payment": {
            "status": "unpaid",  # unpaid, part_paid, paid
            "total_amount": total_customer_price,  # Full customer price
            "amount_paid": 0,
            "payment_history": [],  # List of {amount, date, method, notes}
        },
        
        # Admin Payment Tracking (Reseller → Admin)
        "admin_payment": {
            "status": "unpaid",  # unpaid, paid
            "amount_due": total_admin_cost,  # Admin cost + Admin margin (NOT including reseller margin)
            "amount_paid": 0,
            "stripe_session_id": None,
            "paid_at": None,
        },
        
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.orders.insert_one(order)
    order["_id"] = str(result.inserted_id)
    order.pop("_id", None)
    
    return order


@router.get("")
async def list_orders(
    status: Optional[str] = None, 
    customer_id: Optional[str] = None,
    authorization: str = Header(None)
):
    """List orders for the current reseller"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Base query - filter by reseller
    if is_admin:
        query = {}
    else:
        # Staff sees parent reseller's orders
        is_staff = user.get("role") == "staff" or user.get("role_id") == "staff"
        reseller_email = user.get("parent_reseller_email", user_email) if is_staff else user_email
        query = {"reseller_email": reseller_email}
    
    # "staff" tab: show orders created by staff (created_by != reseller_email)
    if status == "staff":
        if not is_admin:
            is_staff_user = user.get("role") == "staff" or user.get("role_id") == "staff"
            owner_email = user.get("parent_reseller_email", user_email) if is_staff_user else user_email
            query["reseller_email"] = owner_email
            query["created_by"] = {"$ne": owner_email, "$exists": True}
        else:
            query["created_by"] = {"$ne": None, "$exists": True}
            # For admin, also need created_by != reseller_email
            # Use aggregation or just return all with created_by != reseller_email
    elif status:
        query["status"] = status
    
    if customer_id:
        query["customer_id"] = customer_id
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(100)
    
    # For "staff" tab, further filter to only orders where created_by != reseller_email
    if status == "staff" and is_admin:
        orders = [o for o in orders if o.get("created_by") and o.get("created_by") != o.get("reseller_email")]
    
    for order in orders:
        order.pop("_id", None)
    
    return orders


@router.get("/customer/{customer_id}/wip")
async def get_customer_wip_orders(customer_id: str, authorization: str = Header(None)):
    """Get all WIP orders for a customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    query = {
        "customer_id": customer_id,
        "status": "wip"
    }
    
    # Filter by reseller unless admin
    if not is_admin:
        is_staff = user.get("role") == "staff" or user.get("role_id") == "staff"
        reseller_email = user.get("parent_reseller_email", user_email) if is_staff else user_email
        query["reseller_email"] = reseller_email
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(50)
    
    for order in orders:
        order.pop("_id", None)
    
    return orders


@router.get("/{order_id}")
async def get_order(order_id: str, authorization: str = Header(None)):
    """Get a specific order"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership
    if not is_admin and order.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    order.pop("_id", None)
    return order


@router.put("/{order_id}")
async def update_order(order_id: str, order_data: dict, authorization: str = Header(None)):
    """Update an order"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    existing = await db.orders.find_one({"order_id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership (staff uses parent reseller's email)
    if not is_admin and existing.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    order_data["updated_at"] = datetime.now(timezone.utc)
    order_data.pop("order_id", None)
    order_data.pop("_id", None)
    order_data.pop("reseller_email", None)  # Don't allow changing owner
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": order_data}
    )
    
    order = await db.orders.find_one({"order_id": order_id})
    order.pop("_id", None)
    return order


@router.patch("/{order_id}/status")
async def update_order_status(order_id: str, status_data: dict, authorization: str = Header(None)):
    """Update order status"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    existing = await db.orders.find_one({"order_id": order_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership (staff uses parent reseller's email)
    if not is_admin and existing.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    new_status = status_data.get("status")
    valid_statuses = ["wip", "placed", "processing", "shipped", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    order = await db.orders.find_one({"order_id": order_id})
    order.pop("_id", None)
    return order


@router.patch("/{order_id}/link-measurement")
async def link_measurement_to_order(order_id: str, measurement_data: dict, authorization: str = Header(None)):
    """Link customer measurements to an order item with optional allowances"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership
    if not is_admin and order.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    item_index = measurement_data.get("item_index", 0)
    linked_measurements = measurement_data.get("linked_measurements", {})
    
    items = order.get("items", [])
    if item_index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    items[item_index]["linked_measurements"] = linked_measurements
    items[item_index]["measurement_linked"] = True
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}}
    )
    
    order = await db.orders.find_one({"order_id": order_id})
    order.pop("_id", None)
    return order


@router.post("/{order_id}/copy")
async def copy_order(order_id: str, authorization: str = Header(None)):
    """Create a copy of an order"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    reseller_email = get_reseller_email(user)
    
    original = await db.orders.find_one({"order_id": order_id})
    if not original:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership (staff uses parent reseller's email)
    if not is_admin and original.get("reseller_email") != reseller_email:
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    new_order = {
        "order_id": generate_order_id(original.get("customer_name", "Customer")),
        "customer_id": original.get("customer_id"),
        "customer_name": original.get("customer_name"),
        "items": original.get("items", []),
        "status": "wip",
        "notes": f"Copy of {order_id}",
        "reseller_email": reseller_email,
        "created_by": user_email,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.orders.insert_one(new_order)
    new_order.pop("_id", None)
    return new_order


# =====================
# CUSTOMER PAYMENT ENDPOINTS (Reseller tracks customer payments)
# =====================

class CustomerPaymentEntry(BaseModel):
    amount: float
    method: str = "cash"  # cash, card, upi, bank_transfer, other
    notes: Optional[str] = None


@router.post("/{order_id}/customer-payment")
async def record_customer_payment(
    order_id: str, 
    payment: CustomerPaymentEntry, 
    authorization: str = Header(None)
):
    """Record a customer payment (manual entry by reseller)"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership
    if not is_admin and order.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    # Get current customer payment info
    customer_payment = order.get("customer_payment", {
        "status": "unpaid",
        "total_amount": 0,
        "amount_paid": 0,
        "payment_history": []
    })
    
    # Add payment entry
    payment_entry = {
        "amount": payment.amount,
        "method": payment.method,
        "notes": payment.notes,
        "recorded_by": user_email,
        "recorded_at": datetime.now(timezone.utc).isoformat()
    }
    
    payment_history = customer_payment.get("payment_history", [])
    payment_history.append(payment_entry)
    
    # Calculate new totals
    new_amount_paid = customer_payment.get("amount_paid", 0) + payment.amount
    total_amount = customer_payment.get("total_amount", 0)
    
    # Determine status
    if new_amount_paid >= total_amount and total_amount > 0:
        new_status = "paid"
    elif new_amount_paid > 0:
        new_status = "part_paid"
    else:
        new_status = "unpaid"
    
    # Update order
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "customer_payment.amount_paid": new_amount_paid,
            "customer_payment.status": new_status,
            "customer_payment.payment_history": payment_history,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_order = await db.orders.find_one({"order_id": order_id})
    updated_order.pop("_id", None)
    return updated_order


@router.patch("/{order_id}/customer-payment/mark-paid")
async def mark_customer_payment_paid(
    order_id: str,
    authorization: str = Header(None)
):
    """Mark customer payment as fully paid"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not is_admin and order.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    customer_payment = order.get("customer_payment", {})
    total_amount = customer_payment.get("total_amount", 0)
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "customer_payment.status": "paid",
            "customer_payment.amount_paid": total_amount,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    updated_order = await db.orders.find_one({"order_id": order_id})
    updated_order.pop("_id", None)
    return updated_order


@router.delete("/{order_id}")
async def delete_order(order_id: str, authorization: str = Header(None)):
    """Delete an order - WIP orders can be deleted by reseller"""
    user = await get_current_user(authorization)
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check ownership
    if not is_admin and order.get("reseller_email") != get_reseller_email(user):
        raise HTTPException(status_code=403, detail="Access denied - not your order")
    
    # Resellers can only delete WIP orders
    if not is_admin and order.get("status") != "wip":
        raise HTTPException(
            status_code=403, 
            detail="Only WIP orders can be deleted. Placed orders can only be deleted by admin."
        )
    
    result = await db.orders.delete_one({"order_id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}


# =====================
# ADMIN ORDER ENDPOINTS
# =====================

@router.get("/admin/all")
async def get_all_orders_admin(status: Optional[str] = None, authorization: str = Header(None)):
    """Admin endpoint - Get all orders across all customers"""
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    query = {}
    if status and status != 'all':
        query["status"] = status
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(500)
    for order in orders:
        order.pop("_id", None)
    
    return orders


@router.put("/admin/{order_id}")
async def admin_update_order(order_id: str, order_data: dict, authorization: str = Header(None)):
    """Admin endpoint - Full update of an order"""
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    order_data["updated_at"] = datetime.now(timezone.utc)
    order_data.pop("order_id", None)
    order_data.pop("_id", None)
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": order_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = await db.orders.find_one({"order_id": order_id})
    order.pop("_id", None)
    return order


@router.patch("/admin/{order_id}/status")
async def admin_update_order_status(order_id: str, status_data: dict, authorization: str = Header(None)):
    """Admin endpoint - Update order status"""
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    new_status = status_data.get("status")
    valid_statuses = ["wip", "placed", "processing", "shipped", "delivered", "cancelled"]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {new_status}"}


@router.delete("/admin/{order_id}")
async def admin_delete_order(order_id: str, authorization: str = Header(None)):
    """Admin endpoint - Delete any order regardless of status"""
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    result = await db.orders.delete_one({"order_id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted by admin"}


# =====================
# ORDER SETTINGS
# =====================

@router.get("/settings/order-config")
async def get_order_settings():
    """Get order configuration settings"""
    settings = await db.order_settings.find_one({"_id": "default"})
    if not settings:
        settings = {
            "_id": "default",
            "edit_time_limit_minutes": 60,
            "admin_visibility_delay_minutes": 60,
            "allow_reseller_delete_placed": False
        }
        await db.order_settings.insert_one(settings)
    
    settings.pop("_id", None)
    return settings


@router.put("/settings/order-config")
async def update_order_settings(settings_data: dict, authorization: str = Header(None)):
    """Update order configuration settings (Admin only)"""
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    settings_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.order_settings.update_one(
        {"_id": "default"},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"message": "Order settings updated"}
