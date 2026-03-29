from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import jwt
import asyncio

router = APIRouter(tags=["measurements"])

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


# Models
class MeasurementField(BaseModel):
    id: str
    name: str
    default_value: Optional[float] = None
    unit: str = "inches"
    is_required: bool = True
    is_text: bool = False
    order: int = 0


class MeasurementConfig(BaseModel):
    fields: List[MeasurementField] = []
    product_types: List[dict] = []


class CustomerMeasurement(BaseModel):
    customer_id: str
    photos: Optional[dict] = None
    height: Optional[dict] = None
    weight: Optional[dict] = None
    selected_products: List[str] = []
    measurements: dict = {}
    preference: Optional[str] = None


# Default measurement configuration
DEFAULT_MEASUREMENT_CONFIG = {
    "fields": [
        {"id": "biceps", "name": "BICEPS", "default_value": 15, "unit": "inches", "order": 1},
        {"id": "chest", "name": "CHEST", "default_value": 41, "unit": "inches", "order": 2},
        {"id": "hips", "name": "HIPS", "default_value": 42, "unit": "inches", "order": 3},
        {"id": "jacket-length", "name": "JACKET LENGTH", "default_value": 31, "unit": "inches", "order": 4},
        {"id": "shoulders", "name": "SHOULDERS", "default_value": 18, "unit": "inches", "order": 5},
        {"id": "sleeve-length", "name": "SLEEVE LENGTH", "default_value": 26, "unit": "inches", "order": 6},
        {"id": "stomach", "name": "STOMACH", "default_value": 40, "unit": "inches", "order": 7},
        {"id": "waist", "name": "WAIST", "default_value": 37, "unit": "inches", "order": 8},
        {"id": "wrist", "name": "WRIST", "default_value": 10, "unit": "inches", "order": 9},
    ],
    "product_types": [
        {"id": "jacket", "name": "Jacket", "measurement_ids": ["chest", "shoulders", "sleeve-length", "jacket-length", "biceps"]},
        {"id": "2pc-suit", "name": "2 pc Suit", "measurement_ids": ["chest", "shoulders", "sleeve-length", "jacket-length", "waist", "hips"]},
        {"id": "3pc-suit", "name": "3 pc Suit", "measurement_ids": ["chest", "shoulders", "sleeve-length", "jacket-length", "waist", "hips"]},
        {"id": "vest", "name": "Vest", "measurement_ids": ["chest", "stomach", "jacket-length"]},
        {"id": "pant", "name": "Pant", "measurement_ids": ["waist", "hips"]},
        {"id": "shirt", "name": "Shirt", "measurement_ids": ["chest", "shoulders", "sleeve-length", "wrist"]},
        {"id": "legal-gown", "name": "Legal Gown", "measurement_ids": ["chest", "shoulders"]},
        {"id": "t-shirt", "name": "T Shirt", "measurement_ids": ["chest", "shoulders"]},
        {"id": "jeans", "name": "Jeans", "measurement_ids": ["waist", "hips"]},
        {"id": "legal-jacket", "name": "Legal Jacket", "measurement_ids": ["chest", "shoulders", "sleeve-length"]},
        {"id": "shoe", "name": "Shoe", "measurement_ids": []},
    ],
    "body_preferences": [
        {"id": "back-shape", "name": "Back Shape", "options": [{"name": "Normal", "image": ""}, {"name": "Hunched", "image": ""}, {"name": "Erect", "image": ""}, {"name": "Slight Forward Stoop", "image": ""}]},
        {"id": "arms", "name": "Arms", "options": [{"name": "Normal", "image": ""}, {"name": "Forward", "image": ""}, {"name": "Backward", "image": ""}]},
        {"id": "seat-type", "name": "Seat Type", "options": [{"name": "Normal", "image": ""}, {"name": "Flat", "image": ""}, {"name": "Prominent", "image": ""}]},
        {"id": "shoulder-type", "name": "Shoulder Type", "options": [{"name": "Normal", "image": ""}, {"name": "Square", "image": ""}, {"name": "Sloping", "image": ""}]},
        {"id": "chest-type", "name": "Chest Type", "options": [{"name": "Normal", "image": ""}, {"name": "Pigeon", "image": ""}, {"name": "Hollow", "image": ""}]},
        {"id": "thigh-type", "name": "Thigh Type", "options": [{"name": "Normal", "image": ""}, {"name": "Heavy", "image": ""}, {"name": "Thin", "image": ""}]},
        {"id": "shoulder-angle", "name": "Shoulder Angle", "options": [{"name": "Normal", "image": ""}, {"name": "Left High", "image": ""}, {"name": "Right High", "image": ""}]},
        {"id": "stomach-type", "name": "Stomach Type", "options": [{"name": "Normal", "image": ""}, {"name": "Flat", "image": ""}, {"name": "Prominent", "image": ""}]},
        {"id": "trouser-position", "name": "Trouser Position", "options": [{"name": "Normal", "image": ""}, {"name": "Above Waist", "image": ""}, {"name": "Below Waist", "image": ""}]}
    ]
}


@router.get("/config")
async def get_measurement_config():
    """Get measurement configuration"""
    config = await db.measurement_config.find_one({"_id": "default"})
    
    if not config:
        # Initialize with default config
        default = DEFAULT_MEASUREMENT_CONFIG.copy()
        default["_id"] = "default"
        default["created_at"] = datetime.now(timezone.utc)
        default["updated_at"] = datetime.now(timezone.utc)
        await db.measurement_config.insert_one(default)
        config = await db.measurement_config.find_one({"_id": "default"})
    
    # Ensure body_preferences exists (for backward compatibility with existing configs)
    if "body_preferences" not in config or not config["body_preferences"]:
        config["body_preferences"] = DEFAULT_MEASUREMENT_CONFIG["body_preferences"]
        # Update DB with the defaults
        await db.measurement_config.update_one(
            {"_id": "default"},
            {"$set": {"body_preferences": config["body_preferences"]}}
        )
    
    config.pop("_id", None)
    return config


@router.put("/config")
async def update_measurement_config(config_data: dict):
    """Update measurement configuration (Admin only)"""
    config_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.measurement_config.update_one(
        {"_id": "default"},
        {"$set": config_data},
        upsert=True
    )
    
    result = await db.measurement_config.find_one({"_id": "default"})
    result.pop("_id", None)
    
    # Fire webhook for measurement config change
    try:
        from routes.sync import fire_webhooks
        asyncio.ensure_future(fire_webhooks("measurements.updated", {}))
    except Exception:
        pass
    
    return result


@router.post("")
async def save_customer_measurement(measurement: dict, authorization: str = Header(None)):
    """Save customer measurement data"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    customer_id = measurement.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")
    
    # Verify customer belongs to this reseller
    customer = await db.customers.find_one({"customer_id": customer_id})
    if customer and not is_admin:
        if customer.get("reseller_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    measurement["updated_at"] = datetime.now(timezone.utc)
    measurement["reseller_email"] = user_email  # Track ownership
    
    # Check if measurement exists for this customer
    existing = await db.customer_measurements.find_one({"customer_id": customer_id})
    
    if existing:
        # Verify ownership for update
        if not is_admin and existing.get("reseller_email") and existing.get("reseller_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied - not your measurement record")
        
        await db.customer_measurements.update_one(
            {"customer_id": customer_id},
            {"$set": measurement}
        )
    else:
        measurement["created_at"] = datetime.now(timezone.utc)
        await db.customer_measurements.insert_one(measurement)
    
    result = await db.customer_measurements.find_one({"customer_id": customer_id})
    result.pop("_id", None)
    return result


@router.get("/{customer_id}")
async def get_customer_measurement(customer_id: str, authorization: str = Header(None)):
    """Get measurement data for a customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Verify customer belongs to this reseller
    customer = await db.customers.find_one({"customer_id": customer_id})
    if customer and not is_admin:
        if customer.get("reseller_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied - not your customer")
    
    measurement = await db.customer_measurements.find_one({"customer_id": customer_id})
    
    if not measurement:
        return {"customer_id": customer_id, "measurements": {}}
    
    # Additional ownership check on measurement record
    if not is_admin and measurement.get("reseller_email") and measurement.get("reseller_email") != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your measurement record")
    
    measurement.pop("_id", None)
    return measurement


@router.get("")
async def list_all_measurements(authorization: str = Header(None)):
    """List customer measurements for the current reseller"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Filter by reseller unless admin
    if is_admin:
        query = {}
    else:
        query = {"reseller_email": user_email}
    
    measurements = await db.customer_measurements.find(query).to_list(100)
    for m in measurements:
        m.pop("_id", None)
    return measurements


@router.delete("/{customer_id}")
async def delete_customer_measurement(customer_id: str, authorization: str = Header(None)):
    """Delete measurement data for a customer"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Verify ownership
    existing = await db.customer_measurements.find_one({"customer_id": customer_id})
    if existing and not is_admin:
        if existing.get("reseller_email") and existing.get("reseller_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied - not your measurement record")
    
    result = await db.customer_measurements.delete_one({"customer_id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return {"message": "Measurement deleted"}
