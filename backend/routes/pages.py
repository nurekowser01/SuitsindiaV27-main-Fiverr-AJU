from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os

router = APIRouter()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Default content for each page
DEFAULT_PAGES = {
    "faq": {
        "title": "FAQ",
        "content": "<h1>Frequently Asked Questions</h1><h2>How long does it take to make a custom suit?</h2><p>Production typically takes 3-4 weeks, plus shipping time.</p><h2>Can I modify my measurements after ordering?</h2><p>Yes! Contact us within 24 hours of ordering to update measurements.</p>"
    },
    "shipping-return": {
        "title": "Shipping and Return",
        "content": "<h1>Shipping and Return</h1><h2>Shipping</h2><p>We offer worldwide shipping on all orders. Standard delivery takes 7-14 business days.</p><h2>Returns</h2><p>Not satisfied? Return your suit within 30 days for a full refund.</p>"
    },
    "care-instruction": {
        "title": "Care Instruction",
        "content": "<h1>Suit Care Instructions</h1><h2>Dry Cleaning</h2><p>We recommend professional dry cleaning for your custom suit. Dry clean only when necessary.</p><h2>Storage</h2><p>Always hang your suit on a wooden or padded hanger.</p>"
    },
    "privacy-policy": {
        "title": "Privacy Policy",
        "content": "<h1>Privacy Policy</h1><p><em>Last Updated: July 2025</em></p><h2>Information We Collect</h2><p>We collect information you provide directly to us, including name, email, phone number, and measurements.</p>"
    }
}


async def get_current_admin(authorization: str = Header(None)):
    from routes.auth import get_current_user
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = await get_current_user(authorization)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return user


@router.get("/list")
async def list_pages(authorization: str = Header(None)):
    """Get list of all editable pages"""
    await get_current_admin(authorization)
    return [
        {"slug": "faq", "title": "FAQ"},
        {"slug": "shipping-return", "title": "Shipping and Return"},
        {"slug": "care-instruction", "title": "Care Instruction"},
        {"slug": "privacy-policy", "title": "Privacy Policy"},
    ]


@router.get("/{page_slug}")
async def get_page_content(page_slug: str):
    """Get content for a specific page"""
    page = await db.pages.find_one({"slug": page_slug}, {"_id": 0})
    
    if not page:
        if page_slug in DEFAULT_PAGES:
            return DEFAULT_PAGES[page_slug]
        raise HTTPException(status_code=404, detail="Page not found")
    
    return page


@router.put("/{page_slug}")
async def update_page_content(
    page_slug: str,
    page_data: dict,
    authorization: str = Header(None)
):
    """Update content for a specific page"""
    await get_current_admin(authorization)
    
    page_data["slug"] = page_slug
    page_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.pages.update_one(
        {"slug": page_slug},
        {"$set": page_data},
        upsert=True
    )
    
    return {"message": "Page content updated successfully"}



# Contact Queries
@router.post("/contact/submit")
async def submit_contact_query(query_data: dict):
    """Submit a contact query from the public website"""
    query = {
        "name": query_data.get("name", ""),
        "email": query_data.get("email", ""),
        "phone": query_data.get("phone", ""),
        "subject": query_data.get("subject", ""),
        "message": query_data.get("message", ""),
        "status": "new",
        "created_at": datetime.now(timezone.utc),
        "admin_email": "admin@suitsindia.in"
    }
    
    result = await db.contact_queries.insert_one(query)
    query["id"] = str(result.inserted_id)
    
    return {"message": "Query submitted successfully", "id": query["id"]}


@router.get("/contact/queries")
async def get_contact_queries(authorization: str = Header(None)):
    """Get all contact queries (admin only)"""
    await get_current_admin(authorization)
    
    queries = await db.contact_queries.find().sort("created_at", -1).to_list(100)
    for q in queries:
        q["id"] = str(q.pop("_id"))
    
    return queries


@router.put("/contact/queries/{query_id}")
async def update_contact_query(
    query_id: str,
    update_data: dict,
    authorization: str = Header(None)
):
    """Update contact query status (admin only)"""
    await get_current_admin(authorization)
    from bson import ObjectId
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.contact_queries.update_one(
        {"_id": ObjectId(query_id)},
        {"$set": update_data}
    )
    
    return {"message": "Query updated successfully"}
