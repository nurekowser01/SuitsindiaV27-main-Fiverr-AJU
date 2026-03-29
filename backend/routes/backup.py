"""
Database Backup & Restore Module

Security Features:
- Super Admin only access
- Replace-only restore (no merge)
- Re-authentication required before restore
- Restore event logging
- Pure data restoration (no business logic execution)

Excluded Collections:
- failed_logins
- request_logs
- activity_logs
- Any audit/security/cache collections
"""

from fastapi import APIRouter, HTTPException, Header, Response
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId, json_util
import json
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# MongoDB setup
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections to EXCLUDE from backup (security/audit/cache)
EXCLUDED_COLLECTIONS = {
    "failed_logins",
    "request_logs", 
    "activity_logs",
    "audit_logs",
    "security_logs",
    "cache",
    "sessions",
    "temp_data",
    "system.indexes",
    "system.profile",
}

# Collections that are business-critical (whitelist approach)
BUSINESS_COLLECTIONS = {
    "users",
    "roles",
    "settings",
    "fabrics",
    "products",
    "product_consumption",
    "product_styling",
    "customers",
    "orders",
    "reseller_settings",
    "reseller_pricing",
    "app_settings",
    "country_surcharges",
    "pages",
    "hero_images",
    "styling_templates",
    "measurement_profiles",
    "chats",
    "chat_messages",
    "chat_settings",
    "status_checks",
}


class RestoreRequest(BaseModel):
    backup_data: str  # JSON string of backup
    confirmation_text: str  # Must be "RESTORE"
    admin_password: str  # Re-authentication


class VerifyAdminRequest(BaseModel):
    password: str


async def get_super_admin(authorization: str = Header(None)):
    """Verify super admin authentication - highest privilege level"""
    from routes.auth import get_current_user, verify_password
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = await get_current_user(authorization)
    
    # Must be admin with is_admin=True (super admin)
    if not user.get("is_admin") or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    
    # Additional check: must be the primary admin email
    if user.get("email") not in ["admin@suitsindia.com", "admin@tailorstailor.com"]:
        raise HTTPException(status_code=403, detail="Only primary Super Admin can access backup features")
    
    return user


def serialize_document(doc):
    """Serialize MongoDB document to JSON-safe format"""
    if doc is None:
        return None
    
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["_id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_document(value)
        elif isinstance(value, list):
            result[key] = [serialize_document(item) if isinstance(item, dict) else 
                          str(item) if isinstance(item, ObjectId) else 
                          item.isoformat() if isinstance(item, datetime) else item 
                          for item in value]
        else:
            result[key] = value
    return result


@router.get("/backup/info")
async def get_backup_info(authorization: str = Header(None)):
    """Get information about collections available for backup"""
    await get_super_admin(authorization)
    
    try:
        collections = await db.list_collection_names()
        
        collection_info = []
        total_documents = 0
        
        for coll_name in sorted(collections):
            # Skip excluded collections
            if coll_name in EXCLUDED_COLLECTIONS or coll_name.startswith("system."):
                continue
            
            # Only include business collections
            if coll_name not in BUSINESS_COLLECTIONS:
                # Include it anyway if it exists and not excluded (future-proofing)
                pass
            
            count = await db[coll_name].count_documents({})
            total_documents += count
            
            collection_info.append({
                "name": coll_name,
                "document_count": count,
                "included": coll_name not in EXCLUDED_COLLECTIONS
            })
        
        return {
            "collections": collection_info,
            "total_collections": len(collection_info),
            "total_documents": total_documents,
            "excluded_collections": list(EXCLUDED_COLLECTIONS),
            "database_name": DB_NAME,
            "environment": os.environ.get("ENVIRONMENT", "development"),
        }
    except Exception as e:
        logger.error(f"Error getting backup info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get backup info: {str(e)}")


@router.get("/backup/export")
async def export_backup(authorization: str = Header(None)):
    """Export all business-critical collections as JSON backup file"""
    user = await get_super_admin(authorization)
    
    try:
        logger.info(f"Backup export initiated by: {user.get('email')}")
        
        collections = await db.list_collection_names()
        
        backup_data = {
            "metadata": {
                "backup_date": datetime.now(timezone.utc).isoformat(),
                "environment": os.environ.get("ENVIRONMENT", "development"),
                "database_name": DB_NAME,
                "app_version": "1.0.0",
                "created_by": user.get("email"),
                "total_collections": 0,
                "total_documents": 0,
                "collection_counts": {}
            },
            "collections": {}
        }
        
        total_documents = 0
        
        for coll_name in sorted(collections):
            # Skip excluded and system collections
            if coll_name in EXCLUDED_COLLECTIONS or coll_name.startswith("system."):
                continue
            
            # Get all documents from collection
            documents = []
            cursor = db[coll_name].find({})
            
            async for doc in cursor:
                serialized = serialize_document(doc)
                documents.append(serialized)
            
            if documents:
                backup_data["collections"][coll_name] = documents
                backup_data["metadata"]["collection_counts"][coll_name] = len(documents)
                total_documents += len(documents)
        
        backup_data["metadata"]["total_collections"] = len(backup_data["collections"])
        backup_data["metadata"]["total_documents"] = total_documents
        
        # Generate filename with timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"suitsindia_backup_{timestamp}.json"
        
        # Convert to JSON string
        json_content = json.dumps(backup_data, indent=2, default=str)
        
        logger.info(f"Backup export completed: {total_documents} documents from {len(backup_data['collections'])} collections")
        
        # Return as downloadable file
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "X-Backup-Documents": str(total_documents),
                "X-Backup-Collections": str(len(backup_data["collections"])),
            }
        )
        
    except Exception as e:
        logger.error(f"Error exporting backup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to export backup: {str(e)}")


@router.post("/backup/verify-admin")
async def verify_admin_for_restore(
    request: VerifyAdminRequest,
    authorization: str = Header(None)
):
    """Re-authenticate admin before allowing restore"""
    from routes.auth import verify_password
    
    user = await get_super_admin(authorization)
    
    # Get user's hashed password from DB
    db_user = await db.users.find_one({"email": user.get("email")})
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify password
    if not verify_password(request.password, db_user.get("hashed_password", "")):
        logger.warning(f"Failed restore authentication attempt by: {user.get('email')}")
        raise HTTPException(status_code=401, detail="Invalid password")
    
    logger.info(f"Admin verified for restore: {user.get('email')}")
    return {"verified": True, "admin_email": user.get("email")}


@router.post("/backup/restore")
async def restore_backup(
    request: RestoreRequest,
    authorization: str = Header(None)
):
    """
    Restore database from backup file.
    
    CRITICAL SAFEGUARDS:
    - Requires "RESTORE" confirmation text
    - Requires admin re-authentication
    - REPLACE mode only (wipes all data)
    - Pure data restoration (no business logic)
    - Logged for audit trail
    """
    from routes.auth import verify_password
    
    user = await get_super_admin(authorization)
    admin_email = user.get("email")
    
    # Safeguard 1: Confirmation text must be exactly "RESTORE"
    if request.confirmation_text != "RESTORE":
        raise HTTPException(
            status_code=400, 
            detail="Invalid confirmation. You must type 'RESTORE' exactly."
        )
    
    # Safeguard 2: Re-authenticate admin
    db_user = await db.users.find_one({"email": admin_email})
    if not db_user or not verify_password(request.admin_password, db_user.get("hashed_password", "")):
        logger.warning(f"Failed restore authentication: {admin_email}")
        raise HTTPException(status_code=401, detail="Invalid password. Restore cancelled.")
    
    try:
        # Parse backup data
        backup_data = json.loads(request.backup_data)
        
        if "metadata" not in backup_data or "collections" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        metadata = backup_data["metadata"]
        collections_data = backup_data["collections"]
        
        backup_date = metadata.get("backup_date", "unknown")
        backup_source = metadata.get("created_by", "unknown")
        
        logger.info(f"RESTORE INITIATED by {admin_email}")
        logger.info(f"Backup date: {backup_date}, Created by: {backup_source}")
        logger.info(f"Collections to restore: {list(collections_data.keys())}")
        
        # Create restore log entry BEFORE wiping (in case of failure)
        restore_log = {
            "event": "database_restore",
            "timestamp": datetime.now(timezone.utc),
            "admin_email": admin_email,
            "backup_date": backup_date,
            "backup_created_by": backup_source,
            "collections_restored": list(collections_data.keys()),
            "total_documents": metadata.get("total_documents", 0),
            "status": "started"
        }
        
        # Store in a separate audit collection that won't be wiped
        await db.restore_audit_log.insert_one(restore_log)
        
        restored_counts = {}
        
        # REPLACE MODE: Drop and recreate each collection
        for coll_name, documents in collections_data.items():
            # Skip excluded collections even if in backup
            if coll_name in EXCLUDED_COLLECTIONS:
                logger.info(f"Skipping excluded collection: {coll_name}")
                continue
            
            # Skip restore_audit_log to preserve audit trail
            if coll_name == "restore_audit_log":
                continue
            
            try:
                # Drop existing collection
                await db[coll_name].drop()
                logger.info(f"Dropped collection: {coll_name}")
                
                # Insert documents if any
                if documents:
                    # Convert string IDs back to ObjectId where needed
                    processed_docs = []
                    for doc in documents:
                        processed = {}
                        for key, value in doc.items():
                            if key == "_id" and isinstance(value, str):
                                try:
                                    processed["_id"] = ObjectId(value)
                                except:
                                    processed["_id"] = value
                            else:
                                processed[key] = value
                        processed_docs.append(processed)
                    
                    await db[coll_name].insert_many(processed_docs)
                    restored_counts[coll_name] = len(processed_docs)
                    logger.info(f"Restored {len(processed_docs)} documents to {coll_name}")
                else:
                    restored_counts[coll_name] = 0
                    
            except Exception as e:
                logger.error(f"Error restoring collection {coll_name}: {str(e)}")
                restored_counts[coll_name] = f"ERROR: {str(e)}"
        
        # Update restore log with completion status
        await db.restore_audit_log.update_one(
            {"event": "database_restore", "status": "started", "admin_email": admin_email},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc),
                "restored_counts": restored_counts
            }}
        )
        
        logger.info(f"RESTORE COMPLETED by {admin_email}")
        
        return {
            "success": True,
            "message": "Database restored successfully",
            "backup_date": backup_date,
            "collections_restored": len(restored_counts),
            "restored_counts": restored_counts,
            "restored_by": admin_email,
            "restored_at": datetime.now(timezone.utc).isoformat()
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in backup file")
    except Exception as e:
        logger.error(f"RESTORE FAILED: {str(e)}")
        
        # Log failure
        await db.restore_audit_log.update_one(
            {"event": "database_restore", "status": "started", "admin_email": admin_email},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "failed_at": datetime.now(timezone.utc)
            }}
        )
        
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.get("/backup/restore-history")
async def get_restore_history(authorization: str = Header(None)):
    """Get history of restore operations"""
    await get_super_admin(authorization)
    
    try:
        history = await db.restore_audit_log.find({}).sort("timestamp", -1).limit(20).to_list(20)
        
        # Serialize for JSON response
        serialized = []
        for entry in history:
            serialized.append(serialize_document(entry))
        
        return {"history": serialized}
    except Exception as e:
        logger.error(f"Error getting restore history: {str(e)}")
        return {"history": []}
