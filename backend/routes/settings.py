from fastapi import APIRouter, HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Optional, List
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


class HeroImage(BaseModel):
    url: str
    alt: Optional[str] = ""
    active: Optional[bool] = False


class UISettings(BaseModel):
    hero_images: List[HeroImage] = []
    display_mode: str = "carousel"
    active_hero_index: int = 0
    carousel_images: List[int] = []


@router.get("/ui")
async def get_ui_settings(authorization: str = Header(None)):
    await get_current_admin(authorization)
    settings = await db.settings.find_one({"_id": "ui_settings"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {
        "hero_images": [],
        "display_mode": "carousel",
        "active_hero_index": 0,
        "carousel_images": [],
    }


@router.put("/ui")
async def update_ui_settings(settings: UISettings, authorization: str = Header(None)):
    await get_current_admin(authorization)
    settings_dict = settings.model_dump()
    settings_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"_id": "ui_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return {"message": "UI settings updated"}


@router.get("/ui/public")
async def get_public_ui_settings():
    """Public endpoint to get hero display settings for frontend"""
    settings = await db.settings.find_one({"_id": "ui_settings"})
    if settings:
        hero_images = settings.get("hero_images", [])
        display_mode = settings.get("display_mode", "carousel")
        active_index = settings.get("active_hero_index", 0)
        carousel_indices = settings.get("carousel_images", [])
        
        if display_mode == "carousel" and carousel_indices and len(carousel_indices) >= 2:
            carousel_images = [hero_images[i] for i in carousel_indices if i < len(hero_images)]
            return {
                "display_mode": "carousel",
                "carousel_images": [{"url": img.get("url"), "alt": img.get("alt", "")} for img in carousel_images]
            }
        else:
            if hero_images and len(hero_images) > active_index:
                return {
                    "display_mode": "individual",
                    "active_hero_image": hero_images[active_index].get("url"),
                    "active_hero_alt": hero_images[active_index].get("alt", "")
                }
    
    return {
        "display_mode": "carousel",
        "carousel_images": []
    }


@router.get("/homepage")
async def get_homepage_content():
    settings = await db.settings.find_one({"_id": "homepage_content"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {
        "hero_title": "DESIGN AND ORDER CUSTOM",
        "hero_subtitle": "MADE-TO-MEASURE SUITS AT EASE",
        "cta_title": "Ready to Partner with Us?",
        "cta_subtitle": "Start your journey to build your custom clothing business today.",
        "why_choose_us": [
            {"title": "Customer Service", "description": "Award-winning tailoring experience and knowledge."},
            {"title": "Fabrics", "description": "Luxurious suiting fabrics from the finest mills."},
            {"title": "A Great Fit", "description": "Seamless fit and personalized garments."},
            {"title": "100+ Customisations", "description": "Multiple customisation options for each garment."},
            {"title": "Quick Turnarounds", "description": "Manufacture and ship within three weeks."},
        ],
        "footer": {
            "description": "Private label custom Menswear manufacturer.",
            "email": "tailorstailor.hk@gmail.com",
            "phone": "+91 79071 68498",
            "address": "Kowloon, Hong Kong",
        },
    }


@router.put("/homepage")
async def update_homepage_content(content: dict, authorization: str = Header(None)):
    await get_current_admin(authorization)
    
    existing = await db.settings.find_one({"_id": "homepage_content"})
    if existing:
        existing.pop("_id", None)
        merged_content = {**existing, **content}
    else:
        merged_content = content
    
    merged_content["updated_at"] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"_id": "homepage_content"},
        {"$set": merged_content},
        upsert=True
    )
    return {"message": "Homepage content updated"}


@router.get("/ui-pages")
async def get_ui_pages_settings(authorization: str = Header(None)):
    """Get hero images for all pages"""
    await get_current_admin(authorization)
    settings = await db.settings.find_one({"_id": "ui_pages_settings"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {}


@router.put("/ui-pages")
async def update_ui_pages_settings(settings: dict, authorization: str = Header(None)):
    """Update hero images for all pages"""
    await get_current_admin(authorization)
    settings["updated_at"] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"_id": "ui_pages_settings"},
        {"$set": settings},
        upsert=True
    )
    return {"message": "UI pages settings updated"}


@router.get("/all-content")
async def get_all_content():
    """Get all editable content for all pages"""
    settings = await db.settings.find_one({"_id": "all_content"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {}


@router.put("/all-content")
async def update_all_content(content: dict, authorization: str = Header(None)):
    """Update all editable content for all pages"""
    await get_current_admin(authorization)
    content["updated_at"] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"_id": "all_content"},
        {"$set": content},
        upsert=True
    )
    return {"message": "All content updated"}


@router.get("/all-images")
async def get_all_images(authorization: str = Header(None)):
    """Get all images for all pages"""
    await get_current_admin(authorization)
    settings = await db.settings.find_one({"_id": "all_images"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {}


@router.get("/all-images/public")
async def get_all_images_public():
    """Public endpoint to get all images for all pages (no auth required)"""
    settings = await db.settings.find_one({"_id": "all_images"})
    if settings:
        settings.pop("_id", None)
        return settings
    return {}


@router.put("/all-images")
async def update_all_images(images: dict, authorization: str = Header(None)):
    """Update all images for all pages"""
    await get_current_admin(authorization)
    images["updated_at"] = datetime.now(timezone.utc)
    
    await db.settings.update_one(
        {"_id": "all_images"},
        {"$set": images},
        upsert=True
    )
    return {"message": "All images updated"}
