from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr
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


class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None


def generate_customer_id():
    import random
    import string
    return ''.join(random.choices(string.digits, k=6))


@router.get("/customers")
async def get_all_customers(
    search: Optional[str] = None,
    authorization: str = Header(None)
):
    """Admin endpoint - Get all customers with optional search"""
    await get_current_admin(authorization)
    
    query = {}
    if search:
        query = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"customer_id": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]
        }
    
    customers = await db.customers.find(query).sort("created_at", -1).to_list(500)
    
    result = []
    for c in customers:
        # Get order count for each customer
        order_count = await db.orders.count_documents({"customer_id": c["customer_id"]})
        
        result.append({
            "id": str(c["_id"]),
            "customer_id": c["customer_id"],
            "name": c["name"],
            "email": c.get("email"),
            "phone": c.get("phone", ""),
            "address": c.get("address"),
            "city": c.get("city"),
            "state": c.get("state"),
            "pincode": c.get("pincode"),
            "notes": c.get("notes"),
            "order_count": order_count,
            "created_at": c.get("created_at").isoformat() if c.get("created_at") else None,
            "updated_at": c.get("updated_at").isoformat() if c.get("updated_at") else None,
        })
    
    return result


@router.get("/customers/{customer_id}")
async def get_customer_details(customer_id: str, authorization: str = Header(None)):
    """Admin endpoint - Get customer details with order history"""
    await get_current_admin(authorization)
    
    customer = await db.customers.find_one({"customer_id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get all orders for this customer
    orders = await db.orders.find({"customer_id": customer_id}).sort("created_at", -1).to_list(100)
    for order in orders:
        order.pop("_id", None)
    
    # Get total spent
    total_spent = 0
    for order in orders:
        for item in order.get("items", []):
            total_spent += item.get("pricing", {}).get("total", 0)
    
    return {
        "id": str(customer["_id"]),
        "customer_id": customer["customer_id"],
        "name": customer["name"],
        "email": customer.get("email"),
        "phone": customer.get("phone", ""),
        "address": customer.get("address"),
        "city": customer.get("city"),
        "state": customer.get("state"),
        "pincode": customer.get("pincode"),
        "notes": customer.get("notes"),
        "created_at": customer.get("created_at").isoformat() if customer.get("created_at") else None,
        "updated_at": customer.get("updated_at").isoformat() if customer.get("updated_at") else None,
        "orders": orders,
        "total_orders": len(orders),
        "total_spent": total_spent
    }


@router.post("/customers")
async def create_customer(customer: CustomerCreate, authorization: str = Header(None)):
    """Admin endpoint - Create a new customer"""
    await get_current_admin(authorization)
    
    # Generate unique customer ID
    customer_id = generate_customer_id()
    while await db.customers.find_one({"customer_id": customer_id}):
        customer_id = generate_customer_id()
    
    now = datetime.now(timezone.utc)
    
    doc = {
        "customer_id": customer_id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "city": customer.city,
        "state": customer.state,
        "pincode": customer.pincode,
        "notes": customer.notes,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.customers.insert_one(doc)
    
    return {
        "id": str(result.inserted_id),
        "customer_id": customer_id,
        "name": customer.name,
        "message": "Customer created successfully"
    }


@router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, customer: CustomerUpdate, authorization: str = Header(None)):
    """Admin endpoint - Update a customer"""
    await get_current_admin(authorization)
    
    existing = await db.customers.find_one({"customer_id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.customers.update_one(
        {"customer_id": customer_id},
        {"$set": update_data}
    )
    
    return {"message": "Customer updated successfully"}


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, authorization: str = Header(None)):
    """Admin endpoint - Delete a customer"""
    await get_current_admin(authorization)
    
    # Check if customer has orders
    order_count = await db.orders.count_documents({"customer_id": customer_id})
    if order_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete customer with {order_count} orders. Delete orders first or archive instead."
        )
    
    result = await db.customers.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted successfully"}
