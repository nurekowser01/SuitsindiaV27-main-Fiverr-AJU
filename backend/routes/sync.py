"""
API Keys management and Sync API for external integrations.
Provides read-only access to Products, Style Options, and Measurements.
Supports webhook notifications for auto-sync on data changes.
"""
from fastapi import APIRouter, Header, HTTPException, Request
from datetime import datetime, timezone
from typing import Optional
import secrets
import hashlib
import httpx

router = APIRouter(tags=["sync"])

# MongoDB reference - set during startup
db = None

def set_db(database):
    global db
    db = database


# ─── API Key Helpers ───

def generate_api_key():
    """Generate a secure API key with si_ prefix"""
    raw = secrets.token_urlsafe(32)
    return f"si_{raw}"


def hash_key(key: str) -> str:
    """Hash API key for storage"""
    return hashlib.sha256(key.encode()).hexdigest()


async def validate_api_key(x_api_key: str = Header(None)):
    """Validate API key from header"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Missing X-API-Key header")
    
    key_hash = hash_key(x_api_key)
    key_doc = await db.api_keys.find_one({"key_hash": key_hash, "is_active": True})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid or revoked API key")
    
    # Update last_used
    await db.api_keys.update_one(
        {"key_hash": key_hash},
        {"$set": {"last_used_at": datetime.now(timezone.utc)}, "$inc": {"usage_count": 1}}
    )
    key_doc.pop("_id", None)
    return key_doc


async def get_current_admin(authorization: str = Header(None)):
    """Verify admin token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    import jwt
    import os
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, os.environ.get("JWT_SECRET", "suits-india-secret-key-2024"), algorithms=["HS256"])
        user = await db.users.find_one({"email": payload["sub"]})
        if not user or not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─── Admin: API Key Management ───

@router.post("/api-keys")
async def create_api_key(data: dict, authorization: str = Header(None)):
    """Create a new API key (admin only)"""
    await get_current_admin(authorization)
    
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    webhook_url = (data.get("webhook_url") or "").strip() or None
    
    raw_key = generate_api_key()
    key_hash = hash_key(raw_key)
    
    key_doc = {
        "name": name,
        "key_hash": key_hash,
        "key_prefix": raw_key[:12] + "...",
        "webhook_url": webhook_url,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "last_used_at": None,
        "usage_count": 0,
        "scopes": ["products", "styling", "measurements"],
    }
    
    await db.api_keys.insert_one(key_doc)
    key_doc.pop("_id", None)
    
    # Return the raw key ONLY on creation (never stored or shown again)
    return {
        "api_key": raw_key,
        "name": name,
        "key_prefix": key_doc["key_prefix"],
        "webhook_url": webhook_url,
        "message": "Save this key securely. It will not be shown again."
    }


@router.get("/api-keys")
async def list_api_keys(authorization: str = Header(None)):
    """List all API keys (admin only, without hashes)"""
    await get_current_admin(authorization)
    
    keys = await db.api_keys.find({}).sort("created_at", -1).to_list(100)
    for k in keys:
        k.pop("_id", None)
        k.pop("key_hash", None)
    return keys


@router.put("/api-keys/{key_prefix}")
async def update_api_key(key_prefix: str, data: dict, authorization: str = Header(None)):
    """Update an API key (webhook URL, name)"""
    await get_current_admin(authorization)
    
    update_fields = {}
    if "name" in data:
        update_fields["name"] = data["name"].strip()
    if "webhook_url" in data:
        update_fields["webhook_url"] = data["webhook_url"].strip() or None
    if "is_active" in data:
        update_fields["is_active"] = data["is_active"]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.api_keys.update_one(
        {"key_prefix": key_prefix},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key updated"}


@router.delete("/api-keys/{key_prefix}")
async def delete_api_key(key_prefix: str, authorization: str = Header(None)):
    """Revoke/delete an API key"""
    await get_current_admin(authorization)
    
    result = await db.api_keys.delete_one({"key_prefix": key_prefix})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key deleted"}


@router.post("/api-keys/{key_prefix}/test-webhook")
async def test_webhook(key_prefix: str, authorization: str = Header(None)):
    """Send a test webhook to the configured URL"""
    await get_current_admin(authorization)
    
    key_doc = await db.api_keys.find_one({"key_prefix": key_prefix})
    if not key_doc:
        raise HTTPException(status_code=404, detail="API key not found")
    
    webhook_url = key_doc.get("webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="No webhook URL configured")
    
    payload = {
        "event": "test",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": "This is a test webhook from Suits India"
    }
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return {
                "success": resp.status_code < 400,
                "status_code": resp.status_code,
                "message": f"Webhook sent. Response: {resp.status_code}"
            }
    except Exception as e:
        return {"success": False, "message": f"Webhook failed: {str(e)}"}


# ─── Public Sync API (API Key authenticated) ───

def normalize_styling(styling):
    """Ensure all styling parameters have default values for new fields"""
    for param in styling.get("parameters", []):
        param.setdefault("input_type", "image_only")
        param.setdefault("text_label", None)
        for opt in param.get("options", []):
            opt.setdefault("has_text_input", False)
            opt.setdefault("text_label", None)
            opt.setdefault("has_sub_options", False)
            opt.setdefault("sub_options", [])
            for sub in opt.get("sub_options", []):
                sub.setdefault("has_text_input", False)
                sub.setdefault("text_label", None)
    return styling

@router.get("/sync/products")
async def sync_products(x_api_key: str = Header(None)):
    """Get all product categories and products"""
    await validate_api_key(x_api_key)
    
    categories = await db.product_categories.find({}).sort("order", 1).to_list(100)
    for cat in categories:
        cat.pop("_id", None)
    
    return {"data": categories, "synced_at": datetime.now(timezone.utc).isoformat()}


@router.get("/sync/styling/{product_id}")
async def sync_styling(product_id: str, x_api_key: str = Header(None)):
    """Get style options for a product"""
    await validate_api_key(x_api_key)
    
    styling = await db.product_styling.find_one({"product_id": product_id})
    if not styling:
        raise HTTPException(status_code=404, detail="Styling not found for this product")
    
    styling.pop("_id", None)
    normalize_styling(styling)
    return {"data": styling, "synced_at": datetime.now(timezone.utc).isoformat()}


@router.get("/sync/measurements")
async def sync_measurements(x_api_key: str = Header(None)):
    """Get measurement configuration"""
    await validate_api_key(x_api_key)
    
    config = await db.measurement_config.find_one({"_id": "default"})
    if config:
        config.pop("_id", None)
    else:
        config = {"fields": [], "config_id": "default"}
    
    return {"data": config, "synced_at": datetime.now(timezone.utc).isoformat()}


@router.get("/sync/all")
async def sync_all(x_api_key: str = Header(None)):
    """Get everything in one call: products, styling for all products, measurements"""
    await validate_api_key(x_api_key)
    
    # Products (products are embedded in categories)
    categories = await db.product_categories.find({}).sort("order", 1).to_list(100)
    all_product_ids = []
    for cat in categories:
        cat.pop("_id", None)
        for p in cat.get("products", []):
            all_product_ids.append(p["id"])
    
    # Styling for all products
    styling_data = {}
    for pid in all_product_ids:
        s = await db.product_styling.find_one({"product_id": pid})
        if s:
            s.pop("_id", None)
            normalize_styling(s)
            styling_data[pid] = s
    
    # Measurements
    config = await db.measurement_config.find_one({"_id": "default"})
    if config:
        config.pop("_id", None)
    else:
        config = {"fields": [], "config_id": "default"}
    
    return {
        "products": categories,
        "styling": styling_data,
        "measurements": config,
        "synced_at": datetime.now(timezone.utc).isoformat()
    }


# ─── Webhook Dispatcher ───

async def fire_webhooks(event_type: str, data: dict):
    """Fire webhooks to all active API keys with webhook URLs configured"""
    if not db:
        return
    
    keys = await db.api_keys.find({"is_active": True, "webhook_url": {"$ne": None}}).to_list(100)
    
    payload = {
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data
    }
    
    for key_doc in keys:
        webhook_url = key_doc.get("webhook_url")
        if not webhook_url:
            continue
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(webhook_url, json=payload)
            # Log success
            await db.webhook_logs.insert_one({
                "key_prefix": key_doc["key_prefix"],
                "event": event_type,
                "url": webhook_url,
                "status": "success",
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as e:
            # Log failure
            await db.webhook_logs.insert_one({
                "key_prefix": key_doc["key_prefix"],
                "event": event_type,
                "url": webhook_url,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc)
            })


@router.get("/api-keys/{key_prefix}/webhook-logs")
async def get_webhook_logs(key_prefix: str, authorization: str = Header(None)):
    """Get recent webhook delivery logs for a key"""
    await get_current_admin(authorization)
    
    logs = await db.webhook_logs.find(
        {"key_prefix": key_prefix}
    ).sort("timestamp", -1).to_list(20)
    
    for log in logs:
        log.pop("_id", None)
    return logs
