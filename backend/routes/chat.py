from fastapi import APIRouter, HTTPException, Header, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
from bson import ObjectId
import os
import uuid
import base64

router = APIRouter()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB


async def get_current_user(authorization: str = Header(None)):
    """Get current user from token"""
    from routes.auth import get_current_user as auth_get_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await auth_get_user(authorization)


class MessageCreate(BaseModel):
    content: str
    message_type: str = "text"  # text, file, image
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


# =====================
# CHAT ENDPOINTS
# =====================

@router.get("/chats")
async def get_user_chats(authorization: str = Header(None)):
    """Get all chats for current user with unread counts"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    
    # Build query based on role
    if user_role == "admin":
        # Admin sees all chats
        query = {}
    elif user_role == "sales_partner":
        # Sales partner sees chats where they are a participant
        query = {"participants": user_email}
    else:
        # Reseller sees only their own chats
        query = {"reseller_email": user_email}
    
    chats = await db.chats.find(query).sort("updated_at", -1).to_list(100)
    
    result = []
    for chat in chats:
        # Count unread messages for this user
        unread_count = await db.chat_messages.count_documents({
            "chat_id": str(chat["_id"]),
            "read_by": {"$ne": user_email},
            "sender_email": {"$ne": user_email}
        })
        
        # Get last message
        last_message = await db.chat_messages.find_one(
            {"chat_id": str(chat["_id"])},
            sort=[("created_at", -1)]
        )
        
        result.append({
            "id": str(chat["_id"]),
            "order_id": chat["order_id"],
            "order_display": chat.get("order_display", chat["order_id"]),
            "customer_name": chat.get("customer_name", ""),
            "reseller_email": chat["reseller_email"],
            "reseller_name": chat.get("reseller_name", ""),
            "sales_partner_email": chat.get("sales_partner_email"),
            "sales_partner_name": chat.get("sales_partner_name"),
            "participants": chat.get("participants", []),
            "unread_count": unread_count,
            "last_message": {
                "content": last_message.get("content", "") if last_message else "",
                "sender_name": last_message.get("sender_name", "") if last_message else "",
                "created_at": last_message.get("created_at").isoformat() if last_message and last_message.get("created_at") else None
            } if last_message else None,
            "created_at": chat.get("created_at").isoformat() if chat.get("created_at") else None,
            "updated_at": chat.get("updated_at").isoformat() if chat.get("updated_at") else None,
        })
    
    return result


@router.get("/chats/unread-count")
async def get_unread_count(authorization: str = Header(None)):
    """Get total unread message count for current user"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    
    # Get chat IDs user can access
    if user_role == "admin":
        chat_ids = [str(c["_id"]) async for c in db.chats.find({}, {"_id": 1})]
    elif user_role == "sales_partner":
        chat_ids = [str(c["_id"]) async for c in db.chats.find({"participants": user_email}, {"_id": 1})]
    else:
        chat_ids = [str(c["_id"]) async for c in db.chats.find({"reseller_email": user_email}, {"_id": 1})]
    
    if not chat_ids:
        return {"unread_count": 0}
    
    unread_count = await db.chat_messages.count_documents({
        "chat_id": {"$in": chat_ids},
        "read_by": {"$ne": user_email},
        "sender_email": {"$ne": user_email}
    })
    
    return {"unread_count": unread_count}


@router.get("/chats/order/{order_id}")
async def get_or_create_chat(order_id: str, authorization: str = Header(None)):
    """Get or create a chat for an order"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    
    # Get the order
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if chat exists
    existing_chat = await db.chats.find_one({"order_id": order_id})
    
    if existing_chat:
        # Verify user has access
        if user_role == "admin":
            pass  # Admin can access all
        elif user_role == "sales_partner":
            if user_email not in existing_chat.get("participants", []):
                raise HTTPException(status_code=403, detail="Not authorized to access this chat")
        else:
            if existing_chat["reseller_email"] != user_email:
                raise HTTPException(status_code=403, detail="Not authorized to access this chat")
        
        return {
            "id": str(existing_chat["_id"]),
            "order_id": existing_chat["order_id"],
            "order_display": existing_chat.get("order_display", order_id),
            "customer_name": existing_chat.get("customer_name", ""),
            "reseller_email": existing_chat["reseller_email"],
            "reseller_name": existing_chat.get("reseller_name", ""),
            "sales_partner_email": existing_chat.get("sales_partner_email"),
            "sales_partner_name": existing_chat.get("sales_partner_name"),
            "participants": existing_chat.get("participants", []),
            "created_at": existing_chat.get("created_at").isoformat() if existing_chat.get("created_at") else None,
        }
    
    # Create new chat
    # Get reseller info - we need to find who created this order
    # For now, use the current user if they're a reseller, or look up from order
    reseller_email = user_email if user_role == "reseller" else None
    reseller_name = user.get("full_name", user_email) if user_role == "reseller" else None
    
    # If admin is creating, we need to find the reseller from order metadata or users
    if user_role == "admin":
        # Try to find reseller from order or default to empty
        reseller_email = order.get("reseller_email", "")
        if reseller_email:
            reseller_user = await db.users.find_one({"email": reseller_email})
            reseller_name = reseller_user.get("full_name", reseller_email) if reseller_user else reseller_email
        else:
            # Can't create chat without reseller
            raise HTTPException(status_code=400, detail="Cannot create chat - order has no associated reseller")
    
    # Build participants list
    participants = [reseller_email]
    
    # Check if reseller has a sales partner (referrer)
    reseller_user = await db.users.find_one({"email": reseller_email})
    sales_partner_email = None
    sales_partner_name = None
    
    if reseller_user and reseller_user.get("referred_by"):
        sales_partner_email = reseller_user.get("referred_by")
        sales_partner = await db.users.find_one({"email": sales_partner_email})
        if sales_partner and sales_partner.get("role") == "sales_partner":
            sales_partner_name = sales_partner.get("full_name", sales_partner_email)
            participants.append(sales_partner_email)
    
    # Admin is always a participant (represented by role, not specific email)
    # We'll handle admin access separately in queries
    
    now = datetime.now(timezone.utc)
    
    chat_doc = {
        "order_id": order_id,
        "order_display": order_id,
        "customer_name": order.get("customer_name", ""),
        "reseller_email": reseller_email,
        "reseller_name": reseller_name,
        "sales_partner_email": sales_partner_email,
        "sales_partner_name": sales_partner_name,
        "participants": participants,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.chats.insert_one(chat_doc)
    chat_doc["id"] = str(result.inserted_id)
    chat_doc.pop("_id", None)
    chat_doc["created_at"] = now.isoformat()
    chat_doc["updated_at"] = now.isoformat()
    
    return chat_doc


@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str, 
    limit: int = 50,
    before: Optional[str] = None,
    authorization: str = Header(None)
):
    """Get messages for a chat"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    
    # Get chat and verify access
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Verify access
    if user_role == "admin":
        pass
    elif user_role == "sales_partner":
        if user_email not in chat.get("participants", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if chat["reseller_email"] != user_email:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Build query
    query = {"chat_id": chat_id}
    if before:
        query["created_at"] = {"$lt": datetime.fromisoformat(before)}
    
    messages = await db.chat_messages.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()  # Return in chronological order
    
    result = []
    for msg in messages:
        result.append({
            "id": str(msg["_id"]),
            "chat_id": msg["chat_id"],
            "sender_email": msg["sender_email"],
            "sender_name": msg.get("sender_name", ""),
            "sender_role": msg.get("sender_role", ""),
            "content": msg["content"],
            "message_type": msg.get("message_type", "text"),
            "file_url": msg.get("file_url"),
            "file_name": msg.get("file_name"),
            "file_size": msg.get("file_size"),
            "read_by": msg.get("read_by", []),
            "created_at": msg.get("created_at").isoformat() if msg.get("created_at") else None,
        })
    
    return result


@router.post("/chats/{chat_id}/messages")
async def send_message(chat_id: str, message: MessageCreate, authorization: str = Header(None)):
    """Send a message to a chat"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    user_name = user.get("full_name", user_email)
    
    # Get chat and verify access
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Verify access
    if user_role == "admin":
        pass
    elif user_role == "sales_partner":
        if user_email not in chat.get("participants", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if chat["reseller_email"] != user_email:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    now = datetime.now(timezone.utc)
    
    msg_doc = {
        "chat_id": chat_id,
        "sender_email": user_email,
        "sender_name": user_name,
        "sender_role": user_role,
        "content": message.content,
        "message_type": message.message_type,
        "file_url": message.file_url,
        "file_name": message.file_name,
        "file_size": message.file_size,
        "read_by": [user_email],  # Sender has read their own message
        "created_at": now,
    }
    
    result = await db.chat_messages.insert_one(msg_doc)
    
    # Update chat's updated_at
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {"$set": {"updated_at": now}}
    )
    
    msg_doc["id"] = str(result.inserted_id)
    msg_doc.pop("_id", None)
    msg_doc["created_at"] = now.isoformat()
    
    return msg_doc


@router.patch("/chats/{chat_id}/read")
async def mark_messages_read(chat_id: str, authorization: str = Header(None)):
    """Mark all messages in a chat as read by current user"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    
    # Update all messages in this chat to include user in read_by
    result = await db.chat_messages.update_many(
        {
            "chat_id": chat_id,
            "read_by": {"$ne": user_email}
        },
        {"$addToSet": {"read_by": user_email}}
    )
    
    return {"marked_read": result.modified_count}


@router.post("/chats/{chat_id}/upload")
async def upload_file(chat_id: str, file: UploadFile = File(...), authorization: str = Header(None)):
    """Upload a file to a chat (max 2MB)"""
    user = await get_current_user(authorization)
    user_email = user["email"]
    user_role = user.get("role", "user")
    
    # Get chat and verify access
    chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Verify access
    if user_role == "admin":
        pass
    elif user_role == "sales_partner":
        if user_email not in chat.get("participants", []):
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if chat["reseller_email"] != user_email:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail="File too large. Maximum size is 2MB. Please share a download link instead."
        )
    
    # Store file as base64 in database (simple approach for small files)
    # For production, you'd use cloud storage like S3
    file_id = str(uuid.uuid4())
    
    file_doc = {
        "file_id": file_id,
        "chat_id": chat_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": file_size,
        "data": base64.b64encode(content).decode('utf-8'),
        "uploaded_by": user_email,
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.chat_files.insert_one(file_doc)
    
    # Generate URL to retrieve file
    file_url = f"/chats/files/{file_id}"
    
    return {
        "file_id": file_id,
        "file_url": file_url,
        "file_name": file.filename,
        "file_size": file_size,
        "content_type": file.content_type,
    }


@router.get("/chats/files/{file_id}")
async def get_file(file_id: str):
    """Get an uploaded file"""
    from fastapi.responses import Response
    
    file_doc = await db.chat_files.find_one({"file_id": file_id})
    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")
    
    content = base64.b64decode(file_doc["data"])
    
    return Response(
        content=content,
        media_type=file_doc.get("content_type", "application/octet-stream"),
        headers={
            "Content-Disposition": f"inline; filename=\"{file_doc.get('filename', 'file')}\""
        }
    )


# =====================
# ADMIN-SPECIFIC ENDPOINTS
# =====================

@router.get("/admin/chats/resellers")
async def get_resellers_for_chat(authorization: str = Header(None)):
    """Admin endpoint - Get list of resellers to start chat with"""
    user = await get_current_user(authorization)
    if user.get("role") != "admin" and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    
    resellers = await db.users.find({"role": "reseller"}).to_list(500)
    
    result = []
    for r in resellers:
        result.append({
            "email": r["email"],
            "name": r.get("full_name", r["email"]),
            "company": r.get("company", ""),
        })
    
    return result


@router.get("/admin/chats/reseller/{reseller_email}/orders")
async def get_reseller_orders_for_chat(reseller_email: str, authorization: str = Header(None)):
    """Admin endpoint - Get orders for a specific reseller to start chat"""
    user = await get_current_user(authorization)
    if user.get("role") != "admin" and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Get orders for the specific reseller only
    orders = await db.orders.find({"reseller_email": reseller_email}).sort("created_at", -1).limit(100).to_list(100)
    
    result = []
    for o in orders:
        # Check if chat exists for this order
        chat_exists = await db.chats.find_one({"order_id": o["order_id"]})
        
        # Handle created_at - may already be a string or a datetime
        created_at = o.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                created_at_str = created_at
            else:
                created_at_str = created_at.isoformat()
        else:
            created_at_str = None
        
        result.append({
            "order_id": o["order_id"],
            "customer_name": o.get("customer_name", ""),
            "status": o.get("status", ""),
            "created_at": created_at_str,
            "has_chat": bool(chat_exists),
        })
    
    return result


# =====================
# SALES PARTNER ENDPOINTS
# =====================

@router.get("/sales-partner/chats/resellers")
async def get_referred_resellers_for_chat(authorization: str = Header(None)):
    """Sales Partner endpoint - Get list of referred resellers"""
    user = await get_current_user(authorization)
    if user.get("role") != "sales_partner":
        raise HTTPException(status_code=403, detail="Sales Partner only")
    
    user_email = user["email"]
    
    # Get resellers referred by this sales partner
    resellers = await db.users.find({
        "role": "reseller",
        "referred_by": user_email
    }).to_list(500)
    
    result = []
    for r in resellers:
        result.append({
            "email": r["email"],
            "name": r.get("full_name", r["email"]),
            "company": r.get("company", ""),
        })
    
    return result
