from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from bson import ObjectId, json_util
import json
import io
import os

router = APIRouter(prefix="/database", tags=["database"])

# MongoDB connection
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def get_current_admin(authorization: str):
    """Verify admin token and return user"""
    import jwt
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    
    try:
        SECRET_KEY = os.getenv("JWT_SECRET", "tailorstailor-secret-key-change-in-production")
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": payload.get("sub")})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


@router.get("/export")
async def export_database(authorization: str = Header(None)):
    """Export entire database as JSON file"""
    await get_current_admin(authorization)
    
    try:
        # Collections to export
        collections_to_export = [
            "users", "customers", "orders", "fabrics", "product_categories",
            "product_styling", "measurement_config", "reseller_settings",
            "reseller_pricing", "roles", "settings", "order_settings",
            "order_statuses", "chats", "chat_messages", "product_consumption"
        ]
        
        export_data = {
            "export_info": {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "database_name": DB_NAME,
                "version": "1.0"
            },
            "collections": {}
        }
        
        for collection_name in collections_to_export:
            try:
                collection = db[collection_name]
                documents = await collection.find({}).to_list(length=None)
                # Convert ObjectIds to strings for JSON serialization
                export_data["collections"][collection_name] = json.loads(
                    json_util.dumps(documents)
                )
            except Exception as e:
                print(f"Warning: Could not export {collection_name}: {e}")
                export_data["collections"][collection_name] = []
        
        # Create JSON file
        json_content = json.dumps(export_data, indent=2, default=str)
        
        # Return as downloadable file
        filename = f"suitsindia_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return StreamingResponse(
            io.BytesIO(json_content.encode('utf-8')),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/import")
async def import_database(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """Import database from JSON backup file"""
    await get_current_admin(authorization)
    
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    try:
        # Read file content
        content = await file.read()
        import_data = json.loads(content.decode('utf-8'))
        
        if "collections" not in import_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        results = {
            "success": True,
            "imported_collections": {},
            "errors": []
        }
        
        for collection_name, documents in import_data["collections"].items():
            try:
                if not documents:
                    results["imported_collections"][collection_name] = 0
                    continue
                
                collection = db[collection_name]
                
                # Clear existing data (optional - can be made configurable)
                await collection.delete_many({})
                
                # Convert back ObjectIds from the JSON format
                processed_docs = json.loads(
                    json_util.dumps(documents),
                    object_hook=json_util.object_hook
                )
                
                # Reparse to handle the $oid format properly
                processed_docs = json_util.loads(json.dumps(documents))
                
                # Insert documents
                if processed_docs:
                    await collection.insert_many(processed_docs)
                
                results["imported_collections"][collection_name] = len(processed_docs)
                
            except Exception as e:
                results["errors"].append(f"{collection_name}: {str(e)}")
        
        if results["errors"]:
            results["success"] = False
            
        return results
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/stats")
async def get_database_stats(authorization: str = Header(None)):
    """Get database statistics"""
    await get_current_admin(authorization)
    
    try:
        stats = {
            "database_name": DB_NAME,
            "collections": {}
        }
        
        collection_names = await db.list_collection_names()
        
        for name in collection_names:
            count = await db[name].count_documents({})
            stats["collections"][name] = count
        
        stats["total_documents"] = sum(stats["collections"].values())
        
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
