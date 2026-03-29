from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import random
import string

router = APIRouter(tags=["customers"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


async def get_current_user(authorization: str = Header(None)):
    """Get current user from JWT token"""
    import jwt
    JWT_SECRET = os.environ.get("JWT_SECRET", "tailorstailor-secret-key-change-in-production")
    
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


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    email: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


def generate_customer_id():
    """Generate a unique 6-digit customer ID"""
    return ''.join(random.choices(string.digits, k=6))


@router.get("", response_model=List[CustomerResponse])
async def get_customers(search: Optional[str] = None, authorization: str = Header(None)):
    """Get all customers for the current reseller, optionally filtered by search query"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Base query - filter by reseller_email (unless admin)
    if is_admin:
        query = {}
    else:
        query = {"reseller_email": user_email}
    
    # Add search filter
    if search:
        search_conditions = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"customer_id": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]
        }
        if is_admin:
            query = search_conditions
        else:
            query = {"$and": [{"reseller_email": user_email}, search_conditions]}
    
    customers = []
    cursor = db.customers.find(query).sort("created_at", -1).limit(1000)
    async for doc in cursor:
        customers.append(CustomerResponse(
            id=str(doc["_id"]),
            customer_id=doc["customer_id"],
            name=doc["name"],
            email=doc.get("email"),
            phone=doc["phone"],
            address=doc.get("address"),
            city=doc.get("city"),
            state=doc.get("state"),
            pincode=doc.get("pincode"),
            notes=doc.get("notes"),
            created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
            updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
        ))
    return customers


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, authorization: str = Header(None)):
    """Get a single customer by customer_id"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    doc = await db.customers.find_one({"customer_id": customer_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check ownership (unless admin)
    if not is_admin and doc.get("reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    return CustomerResponse(
        id=str(doc["_id"]),
        customer_id=doc["customer_id"],
        name=doc["name"],
        email=doc.get("email"),
        phone=doc["phone"],
        address=doc.get("address"),
        city=doc.get("city"),
        state=doc.get("state"),
        pincode=doc.get("pincode"),
        notes=doc.get("notes"),
        created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
        updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
    )


@router.post("", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, authorization: str = Header(None)):
    """Create a new customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    
    # Generate unique customer ID
    customer_id = generate_customer_id()
    
    # Check if customer_id already exists (unlikely but possible)
    while await db.customers.find_one({"customer_id": customer_id}):
        customer_id = generate_customer_id()
    
    now = datetime.now(timezone.utc)
    
    doc = {
        "customer_id": customer_id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "city": customer.city,
        "state": customer.state,
        "pincode": customer.pincode,
        "notes": customer.notes,
        "reseller_email": user_email,  # Associate customer with reseller
        "created_by": user_email,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.customers.insert_one(doc)
    
    return CustomerResponse(
        id=str(result.inserted_id),
        customer_id=customer_id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address,
        city=customer.city,
        state=customer.state,
        pincode=customer.pincode,
        notes=customer.notes,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerUpdate, authorization: str = Header(None)):
    """Update an existing customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    existing = await db.customers.find_one({"customer_id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check ownership (unless admin)
    if not is_admin and existing.get("reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    update_data = {k: v for k, v in customer.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.customers.update_one(
        {"customer_id": customer_id},
        {"$set": update_data}
    )
    
    # Fetch updated document
    doc = await db.customers.find_one({"customer_id": customer_id})
    
    return CustomerResponse(
        id=str(doc["_id"]),
        customer_id=doc["customer_id"],
        name=doc["name"],
        email=doc.get("email"),
        phone=doc["phone"],
        address=doc.get("address"),
        city=doc.get("city"),
        state=doc.get("state"),
        pincode=doc.get("pincode"),
        notes=doc.get("notes"),
        created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
        updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
    )


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, authorization: str = Header(None)):
    """Delete a customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    existing = await db.customers.find_one({"customer_id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check ownership (unless admin)
    if not is_admin and existing.get("reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    result = await db.customers.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}
