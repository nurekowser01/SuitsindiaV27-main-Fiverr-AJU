from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import uuid

router = APIRouter(tags=["roles"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: Dict = {}


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Dict] = None


# Seed default roles
async def seed_default_roles():
    """Create default roles if they don't exist"""
    default_roles = [
        {
            "id": "admin",
            "name": "Admin",
            "description": "Full system access",
            "permissions": {"all": True},
            "is_system": True
        },
        {
            "id": "reseller",
            "name": "Reseller",
            "description": "Can create orders for customers",
            "permissions": {"orders": ["create", "read", "update"], "customers": ["create", "read"]},
            "is_system": True
        },
        {
            "id": "sales_partner",
            "name": "Sales Partner",
            "description": "Can manage their assigned resellers",
            "permissions": {"orders": ["read"], "resellers": ["read"]},
            "is_system": True
        }
    ]
    
    for role in default_roles:
        existing = await db.roles.find_one({"id": role["id"]})
        if not existing:
            role["created_at"] = datetime.now(timezone.utc)
            await db.roles.insert_one(role)


@router.on_event("startup")
async def startup():
    await seed_default_roles()


# ==============
# Role Endpoints
# ==============

@router.get("/roles")
async def list_roles():
    """Get all roles"""
    # Ensure default roles exist
    await seed_default_roles()
    
    roles = await db.roles.find({}).sort("name", 1).to_list(100)
    for role in roles:
        role.pop("_id", None)
    return roles


@router.post("/roles")
async def create_role(role_data: RoleCreate):
    """Create a new role"""
    existing = await db.roles.find_one({"name": role_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Role with this name already exists")
    
    role = {
        "id": str(uuid.uuid4())[:8],
        "name": role_data.name,
        "description": role_data.description,
        "permissions": role_data.permissions,
        "is_system": False,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.roles.insert_one(role)
    role.pop("_id", None)
    return role


@router.get("/roles/{role_id}")
async def get_role(role_id: str):
    """Get a specific role"""
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    role.pop("_id", None)
    return role


@router.put("/roles/{role_id}")
async def update_role(role_id: str, role_data: RoleUpdate):
    """Update a role"""
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Don't allow editing system roles name
    if role.get("is_system") and role_data.name and role_data.name != role["name"]:
        raise HTTPException(status_code=400, detail="Cannot rename system roles")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if role_data.name is not None:
        update_data["name"] = role_data.name
    if role_data.description is not None:
        update_data["description"] = role_data.description
    if role_data.permissions is not None:
        update_data["permissions"] = role_data.permissions
    
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    role = await db.roles.find_one({"id": role_id})
    role.pop("_id", None)
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str):
    """Delete a role"""
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if any users have this role
    users_with_role = await db.users.count_documents({"role_id": role_id})
    if users_with_role > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role. {users_with_role} users have this role assigned.")
    
    await db.roles.delete_one({"id": role_id})
    return {"message": "Role deleted"}
