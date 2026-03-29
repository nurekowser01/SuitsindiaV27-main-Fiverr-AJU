from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import motor.motor_asyncio
import os

router = APIRouter(tags=["marketing"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


class MarketingSettings(BaseModel):
    # Site Branding (shown in browser tab)
    site_name: Optional[str] = "Suits India"
    site_tagline: Optional[str] = "Premium Custom Tailoring"
    
    # Analytics
    meta_pixel_id: Optional[str] = ""
    meta_pixel_enabled: bool = False
    ga4_measurement_id: Optional[str] = ""
    ga4_enabled: bool = False
    
    # SEO
    seo_title: Optional[str] = ""
    seo_description: Optional[str] = ""
    seo_keywords: Optional[str] = ""
    og_title: Optional[str] = ""
    og_description: Optional[str] = ""
    og_image: Optional[str] = ""


@router.get("/settings")
async def get_marketing_settings():
    """Get marketing and SEO settings"""
    settings = await db.marketing_settings.find_one({"id": "default"})
    if not settings:
        return MarketingSettings().model_dump()
    
    settings.pop("_id", None)
    settings.pop("id", None)
    return settings


@router.put("/settings")
async def update_marketing_settings(settings: MarketingSettings):
    """Update marketing and SEO settings"""
    update_data = settings.model_dump()
    update_data["id"] = "default"
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.marketing_settings.update_one(
        {"id": "default"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Marketing settings updated successfully"}


@router.post("/track")
async def track_event(event_data: dict):
    """Track a marketing event"""
    event = {
        "event_type": event_data.get("event_type"),
        "event_data": event_data.get("data", {}),
        "page_url": event_data.get("page_url"),
        "user_agent": event_data.get("user_agent"),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.marketing_events.insert_one(event)
    return {"message": "Event tracked"}


@router.get("/analytics")
async def get_basic_analytics():
    """Get basic analytics data"""
    # Count events by type in last 30 days
    from datetime import timedelta
    
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}}
    ]
    
    events = await db.marketing_events.aggregate(pipeline).to_list(100)
    
    return {
        "period": "last_30_days",
        "events": {e["_id"]: e["count"] for e in events if e["_id"]}
    }
