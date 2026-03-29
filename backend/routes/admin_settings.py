from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
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


# =====================
# RESELLER SOURCES
# =====================

class ResellerSourceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class ResellerSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/reseller-sources")
async def get_reseller_sources(authorization: str = Header(None)):
    """Get all reseller sources"""
    await get_current_admin(authorization)
    
    sources = await db.reseller_sources.find().sort("created_at", -1).to_list(100)
    
    result = []
    for s in sources:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "description": s.get("description"),
            "is_active": s.get("is_active", True),
            "created_at": s.get("created_at").isoformat() if s.get("created_at") else None,
        })
    
    return result


@router.post("/reseller-sources")
async def create_reseller_source(source: ResellerSourceCreate, authorization: str = Header(None)):
    """Create a new reseller source"""
    await get_current_admin(authorization)
    
    # Check for duplicate name
    existing = await db.reseller_sources.find_one({"name": {"$regex": f"^{source.name}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="A source with this name already exists")
    
    doc = {
        "name": source.name,
        "description": source.description,
        "is_active": source.is_active,
        "created_at": datetime.now(timezone.utc),
    }
    
    result = await db.reseller_sources.insert_one(doc)
    
    return {
        "id": str(result.inserted_id),
        "name": source.name,
        "message": "Reseller source created successfully"
    }


@router.put("/reseller-sources/{source_id}")
async def update_reseller_source(source_id: str, source: ResellerSourceUpdate, authorization: str = Header(None)):
    """Update a reseller source"""
    from bson import ObjectId
    await get_current_admin(authorization)
    
    update_data = {k: v for k, v in source.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.reseller_sources.update_one(
        {"_id": ObjectId(source_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reseller source not found")
    
    return {"message": "Reseller source updated successfully"}


@router.delete("/reseller-sources/{source_id}")
async def delete_reseller_source(source_id: str, authorization: str = Header(None)):
    """Delete a reseller source"""
    from bson import ObjectId
    await get_current_admin(authorization)
    
    result = await db.reseller_sources.delete_one({"_id": ObjectId(source_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reseller source not found")
    
    return {"message": "Reseller source deleted successfully"}


# =====================
# ORDER STATUSES
# =====================

class OrderStatusCreate(BaseModel):
    name: str
    display_name: str
    color: str = "#6b7280"  # Default gray
    description: Optional[str] = None
    order_index: int = 0
    is_active: bool = True


class OrderStatusUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


# Default system statuses
DEFAULT_STATUSES = [
    {"name": "wip", "display_name": "Work in Progress", "color": "#eab308", "order_index": 0, "is_system": True},
    {"name": "placed", "display_name": "Placed", "color": "#3b82f6", "order_index": 1, "is_system": True},
    {"name": "processing", "display_name": "Processing", "color": "#a855f7", "order_index": 2, "is_system": True},
    {"name": "shipped", "display_name": "Shipped", "color": "#22c55e", "order_index": 3, "is_system": True},
    {"name": "delivered", "display_name": "Delivered", "color": "#15803d", "order_index": 4, "is_system": True},
    {"name": "cancelled", "display_name": "Cancelled", "color": "#ef4444", "order_index": 5, "is_system": True},
]


@router.get("/order-statuses")
async def get_order_statuses(authorization: str = Header(None)):
    """Get all order statuses"""
    await get_current_admin(authorization)
    
    statuses = await db.order_statuses.find().sort("order_index", 1).to_list(50)
    
    # If no statuses exist, initialize with defaults
    if not statuses:
        now = datetime.now(timezone.utc)
        for status in DEFAULT_STATUSES:
            status["created_at"] = now
            await db.order_statuses.insert_one(status)
        statuses = await db.order_statuses.find().sort("order_index", 1).to_list(50)
    
    result = []
    for s in statuses:
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "display_name": s["display_name"],
            "color": s.get("color", "#6b7280"),
            "description": s.get("description"),
            "order_index": s.get("order_index", 0),
            "is_active": s.get("is_active", True),
            "is_system": s.get("is_system", False),
        })
    
    return result


@router.post("/order-statuses")
async def create_order_status(status: OrderStatusCreate, authorization: str = Header(None)):
    """Create a new custom order status"""
    await get_current_admin(authorization)
    
    # Check for duplicate name
    existing = await db.order_statuses.find_one({"name": status.name})
    if existing:
        raise HTTPException(status_code=400, detail="A status with this name already exists")
    
    doc = {
        "name": status.name.lower().replace(" ", "_"),
        "display_name": status.display_name,
        "color": status.color,
        "description": status.description,
        "order_index": status.order_index,
        "is_active": status.is_active,
        "is_system": False,
        "created_at": datetime.now(timezone.utc),
    }
    
    result = await db.order_statuses.insert_one(doc)
    
    return {
        "id": str(result.inserted_id),
        "name": doc["name"],
        "message": "Order status created successfully"
    }


@router.put("/order-statuses/{status_id}")
async def update_order_status(status_id: str, status: OrderStatusUpdate, authorization: str = Header(None)):
    """Update an order status"""
    from bson import ObjectId
    await get_current_admin(authorization)
    
    existing = await db.order_statuses.find_one({"_id": ObjectId(status_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Order status not found")
    
    # Cannot change name of system statuses
    if existing.get("is_system") and status.name:
        raise HTTPException(status_code=400, detail="Cannot change the name of system statuses")
    
    update_data = {k: v for k, v in status.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.order_statuses.update_one(
        {"_id": ObjectId(status_id)},
        {"$set": update_data}
    )
    
    return {"message": "Order status updated successfully"}


@router.delete("/order-statuses/{status_id}")
async def delete_order_status(status_id: str, authorization: str = Header(None)):
    """Delete a custom order status"""
    from bson import ObjectId
    await get_current_admin(authorization)
    
    existing = await db.order_statuses.find_one({"_id": ObjectId(status_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Order status not found")
    
    # Cannot delete system statuses
    if existing.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system statuses")
    
    # Check if any orders use this status
    order_count = await db.orders.count_documents({"status": existing["name"]})
    if order_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete status used by {order_count} orders"
        )
    
    await db.order_statuses.delete_one({"_id": ObjectId(status_id)})
    
    return {"message": "Order status deleted successfully"}


@router.put("/order-statuses/reorder")
async def reorder_statuses(order_data: dict, authorization: str = Header(None)):
    """Reorder statuses"""
    from bson import ObjectId
    await get_current_admin(authorization)
    
    status_order = order_data.get("status_order", [])
    
    for idx, status_id in enumerate(status_order):
        await db.order_statuses.update_one(
            {"_id": ObjectId(status_id)},
            {"$set": {"order_index": idx}}
        )
    
    return {"message": "Status order updated successfully"}


# =====================
# CHAT SETTINGS
# =====================

class ChatSettingsUpdate(BaseModel):
    polling_interval_seconds: Optional[int] = None
    max_file_size_mb: Optional[int] = None
    allowed_file_types: Optional[List[str]] = None
    enable_notifications: Optional[bool] = None


DEFAULT_CHAT_SETTINGS = {
    "polling_interval_seconds": 5,
    "max_file_size_mb": 2,
    "allowed_file_types": ["image/*", "application/pdf", ".doc", ".docx"],
    "enable_notifications": True
}


@router.get("/chat-settings")
async def get_chat_settings(authorization: str = Header(None)):
    """Get chat configuration settings"""
    await get_current_admin(authorization)
    
    settings = await db.app_settings.find_one({"type": "chat_settings"})
    
    if not settings:
        # Return defaults
        return DEFAULT_CHAT_SETTINGS
    
    return {
        "polling_interval_seconds": settings.get("polling_interval_seconds", 5),
        "max_file_size_mb": settings.get("max_file_size_mb", 2),
        "allowed_file_types": settings.get("allowed_file_types", ["image/*", "application/pdf", ".doc", ".docx"]),
        "enable_notifications": settings.get("enable_notifications", True)
    }


@router.put("/chat-settings")
async def update_chat_settings(settings: ChatSettingsUpdate, authorization: str = Header(None)):
    """Update chat configuration settings"""
    await get_current_admin(authorization)
    
    update_data = {}
    if settings.polling_interval_seconds is not None:
        # Validate polling interval (min 1 sec, max 60 sec)
        if settings.polling_interval_seconds < 1:
            settings.polling_interval_seconds = 1
        if settings.polling_interval_seconds > 60:
            settings.polling_interval_seconds = 60
        update_data["polling_interval_seconds"] = settings.polling_interval_seconds
    
    if settings.max_file_size_mb is not None:
        update_data["max_file_size_mb"] = settings.max_file_size_mb
    
    if settings.allowed_file_types is not None:
        update_data["allowed_file_types"] = settings.allowed_file_types
    
    if settings.enable_notifications is not None:
        update_data["enable_notifications"] = settings.enable_notifications
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.app_settings.update_one(
            {"type": "chat_settings"},
            {"$set": {**update_data, "type": "chat_settings"}},
            upsert=True
        )
    
    return await get_chat_settings(authorization)


# Public endpoint for frontend to get chat settings (no auth required for polling interval)
@router.get("/chat-settings/public")
async def get_public_chat_settings():
    """Get public chat settings (polling interval for frontend)"""
    settings = await db.app_settings.find_one({"type": "chat_settings"})
    
    return {
        "polling_interval_seconds": settings.get("polling_interval_seconds", 5) if settings else 5
    }



# =====================
# GENERAL SITE SETTINGS
# =====================

class GeneralSettingsUpdate(BaseModel):
    site_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None


DEFAULT_GENERAL_SETTINGS = {
    "site_name": "Suits India",
    "contact_email": "tailorstailor.hk@gmail.com",
    "contact_phone": "+91 79071 68498"
}


@router.get("/general-settings")
async def get_general_settings(authorization: str = Header(None)):
    """Get general site settings"""
    await get_current_admin(authorization)
    
    settings = await db.app_settings.find_one({"type": "general_settings"})
    
    if not settings:
        return DEFAULT_GENERAL_SETTINGS
    
    return {
        "site_name": settings.get("site_name", DEFAULT_GENERAL_SETTINGS["site_name"]),
        "contact_email": settings.get("contact_email", DEFAULT_GENERAL_SETTINGS["contact_email"]),
        "contact_phone": settings.get("contact_phone", DEFAULT_GENERAL_SETTINGS["contact_phone"])
    }


@router.put("/general-settings")
async def update_general_settings(settings: GeneralSettingsUpdate, authorization: str = Header(None)):
    """Update general site settings"""
    await get_current_admin(authorization)
    
    update_data = {}
    if settings.site_name is not None:
        update_data["site_name"] = settings.site_name
    if settings.contact_email is not None:
        update_data["contact_email"] = settings.contact_email
    if settings.contact_phone is not None:
        update_data["contact_phone"] = settings.contact_phone
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.app_settings.update_one(
            {"type": "general_settings"},
            {"$set": {**update_data, "type": "general_settings"}},
            upsert=True
        )
    
    return await get_general_settings(authorization)



# =====================
# EMAIL SETTINGS
# =====================

class EmailSettingsUpdate(BaseModel):
    email_provider: Optional[str] = None  # 'smtp' or 'mailgun'
    # SMTP settings (Google Workspace)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    # Mailgun settings
    mailgun_api_key: Optional[str] = None
    mailgun_domain: Optional[str] = None
    # Common
    sender_email: Optional[str] = None


@router.get("/email-settings")
async def get_email_settings(authorization: str = Header(None)):
    """Get email settings"""
    await get_current_admin(authorization)
    
    settings = await db.settings.find_one({"_id": "email_keys"})
    if settings:
        # Mask sensitive credentials for security
        smtp_password = settings.get("smtp_password", "")
        masked_smtp_password = smtp_password[:4] + "..." if len(smtp_password) > 4 else smtp_password
        
        api_key = settings.get("mailgun_api_key", "")
        masked_api_key = api_key[:15] + "..." if len(api_key) > 15 else api_key
        
        return {
            "email_provider": settings.get("email_provider", "smtp"),
            # SMTP settings
            "smtp_host": settings.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": settings.get("smtp_port", 587),
            "smtp_username": settings.get("smtp_username", ""),
            "smtp_password": masked_smtp_password,
            # Mailgun settings
            "mailgun_api_key": masked_api_key,
            "mailgun_domain": settings.get("mailgun_domain", ""),
            # Common
            "sender_email": settings.get("sender_email", "")
        }
    return {
        "email_provider": "smtp",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_username": "",
        "smtp_password": "",
        "mailgun_api_key": "",
        "mailgun_domain": "",
        "sender_email": ""
    }


@router.put("/email-settings")
async def update_email_settings(settings: EmailSettingsUpdate, authorization: str = Header(None)):
    """Update email settings"""
    await get_current_admin(authorization)
    
    # Get existing settings to preserve non-updated fields
    existing = await db.settings.find_one({"_id": "email_keys"}) or {}
    
    update_data = {
        "_id": "email_keys",
        "email_provider": settings.email_provider or existing.get("email_provider", "smtp"),
        "smtp_host": settings.smtp_host or existing.get("smtp_host", "smtp.gmail.com"),
        "smtp_port": settings.smtp_port or existing.get("smtp_port", 587),
        "smtp_username": settings.smtp_username if settings.smtp_username is not None else existing.get("smtp_username", ""),
        "mailgun_domain": settings.mailgun_domain if settings.mailgun_domain is not None else existing.get("mailgun_domain", ""),
        "sender_email": settings.sender_email if settings.sender_email is not None else existing.get("sender_email", ""),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Only update password if a new one is provided (not masked)
    if settings.smtp_password and "..." not in settings.smtp_password:
        update_data["smtp_password"] = settings.smtp_password
    else:
        update_data["smtp_password"] = existing.get("smtp_password", "")
    
    # Only update API key if a new one is provided (not masked)
    if settings.mailgun_api_key and "..." not in settings.mailgun_api_key:
        update_data["mailgun_api_key"] = settings.mailgun_api_key
    else:
        update_data["mailgun_api_key"] = existing.get("mailgun_api_key", "")
    
    await db.settings.update_one(
        {"_id": "email_keys"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Email settings updated successfully"}


@router.post("/email-settings/test")
async def test_email_settings(authorization: str = Header(None)):
    """Send a test email to verify settings"""
    from utils.email import send_email
    
    admin = await get_current_admin(authorization)
    admin_email = admin.get("email")
    
    success = await send_email(
        admin_email,
        "Test Email - Suits India",
        """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email</h2>
            <p>This is a test email from your Suits India admin panel.</p>
            <p>If you received this email, your email settings are configured correctly!</p>
        </body>
        </html>
        """
    )
    
    if success:
        return {"message": f"Test email sent successfully to {admin_email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Please check your email settings.")
