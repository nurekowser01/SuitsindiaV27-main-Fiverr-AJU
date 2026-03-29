"""
Size Repository — Admin-managed base sizes for Try-On measurement flow.
Stores garment types (Jacket, Pants), fits per garment, and base measurements per size.
"""
from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import jwt

router = APIRouter(tags=["size-repository"])

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tailorstailor")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

JWT_SECRET = os.environ.get("JWT_SECRET", "suits-india-secret-key-2024")


async def get_current_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"email": payload["sub"]})
        if not user or not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"email": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─── Admin: Garment Types & Fits ───

@router.get("/garment-types")
async def get_garment_types(authorization: str = Header(None)):
    """Get all garment types with fits and size definitions"""
    await get_current_user(authorization)
    
    garments = await db.size_repository.find({}).sort("order", 1).to_list(20)
    for g in garments:
        g.pop("_id", None)
    return garments


@router.put("/garment-types")
async def save_garment_types(data: dict, authorization: str = Header(None)):
    """Save all garment types (full replace)"""
    await get_current_admin(authorization)
    
    garment_types = data.get("garment_types", [])
    
    # Clear and re-insert all
    await db.size_repository.delete_many({})
    
    for i, gt in enumerate(garment_types):
        gt["order"] = i
        gt["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.size_repository.insert_one(gt)
    
    # Return saved data
    saved = await db.size_repository.find({}).sort("order", 1).to_list(20)
    for s in saved:
        s.pop("_id", None)
    
    # Fire webhook
    try:
        from routes.sync import fire_webhooks
        import asyncio
        asyncio.ensure_future(fire_webhooks("size_repository.updated", {}))
    except Exception:
        pass
    
    return saved


# ─── Admin: Size Measurements for a specific fit ───

@router.get("/sizes/{garment_id}/{fit_id}")
async def get_fit_sizes(garment_id: str, fit_id: str, authorization: str = Header(None)):
    """Get all size measurements for a specific fit"""
    await get_current_user(authorization)
    
    sizes = await db.size_measurements.find({
        "garment_id": garment_id,
        "fit_id": fit_id
    }).sort("size", 1).to_list(100)
    
    for s in sizes:
        s.pop("_id", None)
    return sizes


@router.put("/sizes/{garment_id}/{fit_id}")
async def save_fit_sizes(garment_id: str, fit_id: str, data: dict, authorization: str = Header(None)):
    """Save all size measurements for a specific fit (full replace)"""
    await get_current_admin(authorization)
    
    sizes = data.get("sizes", [])
    
    # Clear existing for this garment/fit
    await db.size_measurements.delete_many({
        "garment_id": garment_id,
        "fit_id": fit_id
    })
    
    # Insert all sizes
    for size_data in sizes:
        size_data["garment_id"] = garment_id
        size_data["fit_id"] = fit_id
        size_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.size_measurements.insert_one(size_data)
    
    # Return saved
    saved = await db.size_measurements.find({
        "garment_id": garment_id,
        "fit_id": fit_id
    }).sort("size", 1).to_list(100)
    for s in saved:
        s.pop("_id", None)
    return saved


# ─── Reseller: Get size for try-on ───

@router.get("/lookup/{garment_id}/{fit_id}/{size}")
async def lookup_size(garment_id: str, fit_id: str, size: int, authorization: str = Header(None)):
    """Get base measurements for a specific garment/fit/size combination"""
    await get_current_user(authorization)
    
    size_doc = await db.size_measurements.find_one({
        "garment_id": garment_id,
        "fit_id": fit_id,
        "size": size
    })
    
    if not size_doc:
        raise HTTPException(status_code=404, detail=f"Size {size} not found for {garment_id}/{fit_id}")
    
    size_doc.pop("_id", None)
    return size_doc
