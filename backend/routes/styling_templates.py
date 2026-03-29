from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from bson import ObjectId
import os
import jwt

router = APIRouter()

# Database connection
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

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


@router.get("/templates")
async def get_styling_templates(authorization: str = Header(None)):
    """Get styling templates for the current user only"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Filter by user_email (reseller's own templates) or global templates
    if is_admin:
        query = {}  # Admin sees all
    else:
        query = {
            "$or": [
                {"user_email": user_email},
                {"user_id": user_email},  # Legacy field
                {"is_global": True}
            ]
        }
    
    templates = await db.styling_templates.find(query).sort("created_at", -1).to_list(100)
    for t in templates:
        t["id"] = str(t.pop("_id"))
    
    return templates


@router.get("/templates/{template_id}")
async def get_styling_template(template_id: str, authorization: str = Header(None)):
    """Get a single styling template by ID"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    template = await db.styling_templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check ownership (unless admin or global template)
    if not is_admin and not template.get("is_global"):
        template_owner = template.get("user_email") or template.get("user_id")
        if template_owner != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
    
    template["id"] = str(template.pop("_id"))
    return template


@router.post("/templates")
async def create_styling_template(template_data: dict, authorization: str = Header(None)):
    """Create a new styling template"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    
    template = {
        "name": template_data.get("name", "Untitled Template"),
        "description": template_data.get("description", ""),
        "product_id": template_data.get("product_id"),
        "product_name": template_data.get("product_name"),
        "options": template_data.get("options", {}),
        "sub_options": template_data.get("sub_options", {}),
        "construction": template_data.get("construction"),
        "user_id": user_email,  # Legacy field
        "user_email": user_email,  # New field for clarity
        "is_global": False,  # Only admin can create global templates
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.styling_templates.insert_one(template)
    template["id"] = str(result.inserted_id)
    if "_id" in template:
        del template["_id"]
    
    return template


@router.put("/templates/{template_id}")
async def update_styling_template(template_id: str, template_data: dict, authorization: str = Header(None)):
    """Update an existing styling template"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Check ownership
    existing = await db.styling_templates.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template_owner = existing.get("user_email") or existing.get("user_id")
    if not is_admin and template_owner != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your template")
    
    update_data = {
        "name": template_data.get("name"),
        "description": template_data.get("description"),
        "options": template_data.get("options"),
        "sub_options": template_data.get("sub_options"),
        "construction": template_data.get("construction"),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.styling_templates.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated successfully"}


@router.delete("/templates/{template_id}")
async def delete_styling_template(template_id: str, authorization: str = Header(None)):
    """Delete a styling template"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    is_admin = user.get("is_admin", False) or user.get("role") == "admin"
    
    # Check ownership
    existing = await db.styling_templates.find_one({"_id": ObjectId(template_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template_owner = existing.get("user_email") or existing.get("user_id")
    if not is_admin and template_owner != user_email:
        raise HTTPException(status_code=403, detail="Access denied - not your template")
    
    result = await db.styling_templates.delete_one({"_id": ObjectId(template_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted successfully"}
