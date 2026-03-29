from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import motor.motor_asyncio
import os

router = APIRouter(tags=["reseller-settings"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


# Models
class MarginSettings(BaseModel):
    base_product_margin: float = 0  # Percentage margin on base product
    fabric_margin: float = 0  # Percentage margin on fabric
    style_options_margin: float = 0  # Percentage margin on style surcharges


class ThemeSettings(BaseModel):
    primary_color: str = "#c9a962"  # Gold/brass color
    secondary_color: str = "#1a2744"  # Dark blue
    button_color: str = "#c9a962"
    text_color: str = "#ffffff"
    background_color: str = "#0f1829"


class ResellerSettings(BaseModel):
    reseller_id: str
    company_name: str = "Suits India"
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    margins: MarginSettings = MarginSettings()
    theme: ThemeSettings = ThemeSettings()
    show_pricing: bool = True
    cost_view_secret_code: Optional[str] = None  # Secret code to view cost prices (for reseller eyes only)
    # Reseller's own Stripe configuration for customer payments
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_enabled: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Default settings
DEFAULT_RESELLER_SETTINGS = {
    "company_name": "Suits India",
    "logo_url": "https://customer-assets.emergentagent.com/job_bespoke-dashboard/artifacts/ikgkayzt_suits.jpg",
    "banner_url": "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920",
    "margins": {
        "base_product_margin": 0,
        "fabric_margin": 0,
        "style_options_margin": 0
    },
    "theme": {
        "primary_color": "#c9a962",
        "secondary_color": "#1a2744",
        "button_color": "#c9a962",
        "text_color": "#ffffff",
        "background_color": "#0f1829"
    },
    "show_pricing": True,
    "cost_view_secret_code": None  # Default: no secret code set
}


@router.get("/{reseller_id}")
async def get_reseller_settings(reseller_id: str):
    """Get settings for a specific reseller"""
    settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    
    if not settings:
        # Create default settings for this reseller
        default = DEFAULT_RESELLER_SETTINGS.copy()
        default["reseller_id"] = reseller_id
        default["created_at"] = datetime.now(timezone.utc)
        default["updated_at"] = datetime.now(timezone.utc)
        await db.reseller_settings.insert_one(default)
        settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    
    settings.pop("_id", None)
    return settings


@router.put("/{reseller_id}")
async def update_reseller_settings(reseller_id: str, settings_data: dict):
    """Update settings for a specific reseller"""
    existing = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    
    settings_data["reseller_id"] = reseller_id
    settings_data["updated_at"] = datetime.now(timezone.utc)
    
    if existing:
        await db.reseller_settings.update_one(
            {"reseller_id": reseller_id},
            {"$set": settings_data}
        )
    else:
        settings_data["created_at"] = datetime.now(timezone.utc)
        await db.reseller_settings.insert_one(settings_data)
    
    result = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    result.pop("_id", None)
    return result


@router.patch("/{reseller_id}/margins")
async def update_margins(reseller_id: str, margins: dict):
    """Update only margin settings"""
    await db.reseller_settings.update_one(
        {"reseller_id": reseller_id},
        {
            "$set": {
                "margins": margins,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    result = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    result.pop("_id", None)
    return result


@router.patch("/{reseller_id}/theme")
async def update_theme(reseller_id: str, theme: dict):
    """Update only theme settings"""
    await db.reseller_settings.update_one(
        {"reseller_id": reseller_id},
        {
            "$set": {
                "theme": theme,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    result = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    result.pop("_id", None)
    return result


@router.patch("/{reseller_id}/branding")
async def update_branding(reseller_id: str, branding: dict):
    """Update company name, logo, and banner"""
    update_data = {"updated_at": datetime.now(timezone.utc)}
    
    if "company_name" in branding:
        update_data["company_name"] = branding["company_name"]
    if "logo_url" in branding:
        update_data["logo_url"] = branding["logo_url"]
    if "banner_url" in branding:
        update_data["banner_url"] = branding["banner_url"]
    
    await db.reseller_settings.update_one(
        {"reseller_id": reseller_id},
        {"$set": update_data},
        upsert=True
    )
    
    result = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    result.pop("_id", None)
    return result


@router.patch("/{reseller_id}/toggle-pricing")
async def toggle_pricing_visibility(reseller_id: str):
    """Toggle pricing visibility on/off"""
    settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    current_state = settings.get("show_pricing", True) if settings else True
    
    await db.reseller_settings.update_one(
        {"reseller_id": reseller_id},
        {
            "$set": {
                "show_pricing": not current_state,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    result = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    result.pop("_id", None)
    return result


@router.get("/")
async def list_all_reseller_settings():
    """List all reseller settings (admin only)"""
    settings = await db.reseller_settings.find({}).to_list(100)
    for s in settings:
        s.pop("_id", None)
    return settings


@router.post("/{reseller_id}/verify-cost-code")
async def verify_cost_view_code(reseller_id: str, data: dict):
    """
    Verify the secret code for viewing cost prices.
    Returns success if code matches, error if not.
    """
    code = data.get("code", "")
    
    settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    if not settings:
        raise HTTPException(status_code=404, detail="Reseller settings not found")
    
    stored_code = settings.get("cost_view_secret_code")
    
    if not stored_code:
        raise HTTPException(status_code=400, detail="Secret code not configured. Please set it in Settings.")
    
    if code == stored_code:
        return {"success": True, "message": "Cost view unlocked"}
    else:
        raise HTTPException(status_code=401, detail="Invalid secret code")


@router.patch("/{reseller_id}/secret-code")
async def update_secret_code(reseller_id: str, data: dict):
    """Update the cost view secret code"""
    new_code = data.get("code")
    
    await db.reseller_settings.update_one(
        {"reseller_id": reseller_id},
        {
            "$set": {
                "cost_view_secret_code": new_code,
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Secret code updated"}
