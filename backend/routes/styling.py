from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import asyncio

router = APIRouter(tags=["styling"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


# Models
class SubStyleOption(BaseModel):
    id: str
    name: str
    image: Optional[str] = None
    surcharge: float = 0
    is_default: bool = False
    has_text_input: bool = False
    text_label: Optional[str] = None


class StyleOption(BaseModel):
    id: str
    name: str
    image: Optional[str] = None
    surcharge: float = 0
    is_default: bool = False
    has_sub_options: bool = False
    sub_options: List[SubStyleOption] = []
    has_text_input: bool = False
    text_label: Optional[str] = None


class StyleParameter(BaseModel):
    id: str
    name: str
    options: List[StyleOption] = []
    is_required: bool = True
    order: int = 0
    input_type: str = "image_only"  # "image_only", "text_only", "image_and_text"
    text_label: Optional[str] = None


class ConstructionType(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    base_price: float = 0
    is_default: bool = False


class ProductStyling(BaseModel):
    product_id: str
    parameters: List[StyleParameter] = []
    constructions: List[ConstructionType] = []
    base_cmt_price: float = 0  # CMT = Cut, Make, Trim


# Default style parameters for suits
DEFAULT_SUIT_STYLING = {
    "product_id": "suits",
    "base_cmt_price": 185,
    "constructions": [
        {"id": "fused", "name": "Fused", "description": "Machine-fused interlining", "base_price": 0, "is_default": True},
        {"id": "half-canvas", "name": "Half Canvas", "description": "Hand-stitched chest canvas", "base_price": 50, "is_default": False},
        {"id": "full-canvas", "name": "Full Canvas", "description": "Full floating canvas construction", "base_price": 100, "is_default": False},
    ],
    "parameters": [
        {
            "id": "lapel",
            "name": "Lapel",
            "order": 1,
            "is_required": True,
            "options": [
                {"id": "notched-slim", "name": "Notched Slim", "image": "", "surcharge": 10, "is_default": False},
                {"id": "normal-notched", "name": "Normal Notched", "image": "", "surcharge": 15, "is_default": False},
                {"id": "notched-wide", "name": "Notched Wide", "image": "", "surcharge": 0, "is_default": True},
                {"id": "peaked-lapel", "name": "Peaked Lapel", "image": "", "surcharge": 5, "is_default": False},
                {"id": "peaked-wide", "name": "Peaked Wide", "image": "", "surcharge": 0, "is_default": False},
                {"id": "shawl-lapel", "name": "Shawl Lapel", "image": "", "surcharge": 0, "is_default": False},
                {"id": "shawl-wide", "name": "Shawl Wide", "image": "", "surcharge": 0, "is_default": False},
            ]
        },
        {
            "id": "chest-pocket",
            "name": "Chest Pocket",
            "order": 2,
            "is_required": True,
            "options": [
                {"id": "welt", "name": "Welt", "image": "", "surcharge": 0, "is_default": True},
                {"id": "patched", "name": "Patched", "image": "", "surcharge": 3, "is_default": False},
            ]
        },
        {
            "id": "button-style",
            "name": "Button Style",
            "order": 3,
            "is_required": True,
            "options": [
                {"id": "1-button", "name": "1 Button", "image": "", "surcharge": 0, "is_default": False},
                {"id": "2-button", "name": "2 Button", "image": "", "surcharge": 0, "is_default": True},
                {"id": "3-button", "name": "3 Button", "image": "", "surcharge": 5, "is_default": False},
                {"id": "double-breasted", "name": "Double Breasted", "image": "", "surcharge": 15, "is_default": False},
            ]
        },
        {
            "id": "waist-pockets",
            "name": "Waist Pockets",
            "order": 4,
            "is_required": True,
            "options": [
                {"id": "flap", "name": "Flap", "image": "", "surcharge": 0, "is_default": True},
                {"id": "jetted", "name": "Jetted", "image": "", "surcharge": 0, "is_default": False},
                {"id": "patch", "name": "Patch", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
        {
            "id": "sleeve-construction",
            "name": "Sleeve Construction",
            "order": 5,
            "is_required": True,
            "options": [
                {"id": "regular", "name": "Regular", "image": "", "surcharge": 0, "is_default": True},
                {"id": "surgeon-cuff", "name": "Surgeon Cuff", "image": "", "surcharge": 10, "is_default": False},
            ]
        },
        {
            "id": "jacket-vent",
            "name": "Jacket Vent",
            "order": 6,
            "is_required": True,
            "options": [
                {"id": "no-vent", "name": "No Vent", "image": "", "surcharge": 0, "is_default": False},
                {"id": "single-vent", "name": "Single Vent", "image": "", "surcharge": 0, "is_default": True},
                {"id": "double-vent", "name": "Double Vent", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
        {
            "id": "ticket-pocket",
            "name": "Ticket Pocket",
            "order": 7,
            "is_required": False,
            "options": [
                {"id": "no", "name": "No", "image": "", "surcharge": 0, "is_default": True},
                {"id": "yes", "name": "Yes", "image": "", "surcharge": 8, "is_default": False},
            ]
        },
        {
            "id": "pick-stitch",
            "name": "Pick Stitch",
            "order": 8,
            "is_required": False,
            "options": [
                {"id": "no", "name": "No", "image": "", "surcharge": 0, "is_default": True},
                {"id": "yes", "name": "Yes", "image": "", "surcharge": 12, "is_default": False},
            ]
        },
        {
            "id": "functional-cuff",
            "name": "Functional Cuff",
            "order": 9,
            "is_required": False,
            "options": [
                {"id": "no", "name": "No", "image": "", "surcharge": 0, "is_default": True},
                {"id": "yes", "name": "Yes", "image": "", "surcharge": 15, "is_default": False},
            ]
        },
        {
            "id": "monogram-text",
            "name": "Monogram Text",
            "order": 10,
            "is_required": False,
            "options": [
                {"id": "none", "name": "None", "image": "", "surcharge": 0, "is_default": True},
                {"id": "custom", "name": "Custom Text", "image": "", "surcharge": 10, "is_default": False},
            ]
        },
    ]
}

DEFAULT_PANTS_STYLING = {
    "product_id": "pants",
    "base_cmt_price": 65,
    "constructions": [],
    "parameters": [
        {
            "id": "pant-front-pocket",
            "name": "Pant Front Pocket",
            "order": 1,
            "is_required": True,
            "options": [
                {"id": "slant", "name": "Slant", "image": "", "surcharge": 0, "is_default": True},
                {"id": "straight", "name": "Straight", "image": "", "surcharge": 0, "is_default": False},
            ]
        },
        {
            "id": "watch-pocket",
            "name": "Watch Pocket",
            "order": 2,
            "is_required": False,
            "options": [
                {"id": "no", "name": "No", "image": "", "surcharge": 0, "is_default": True},
                {"id": "yes", "name": "Yes", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
        {
            "id": "waistband",
            "name": "Waistband",
            "order": 3,
            "is_required": True,
            "options": [
                {"id": "standard", "name": "Standard", "image": "", "surcharge": 0, "is_default": True},
                {"id": "extended", "name": "Extended Tab", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
        {
            "id": "front-pleat",
            "name": "Front Pleat",
            "order": 4,
            "is_required": True,
            "options": [
                {"id": "flat-front", "name": "Flat Front", "image": "", "surcharge": 0, "is_default": True},
                {"id": "single-pleat", "name": "Single Pleat", "image": "", "surcharge": 0, "is_default": False},
                {"id": "double-pleat", "name": "Double Pleat", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
        {
            "id": "back-pockets",
            "name": "Back Pockets",
            "order": 5,
            "is_required": True,
            "options": [
                {"id": "both-with-button", "name": "Both with Button", "image": "", "surcharge": 0, "is_default": True},
                {"id": "one-with-button", "name": "One with Button", "image": "", "surcharge": 0, "is_default": False},
                {"id": "no-button", "name": "No Button", "image": "", "surcharge": 0, "is_default": False},
            ]
        },
        {
            "id": "cuff",
            "name": "Cuff",
            "order": 6,
            "is_required": True,
            "options": [
                {"id": "no-cuff", "name": "No Cuff", "image": "", "surcharge": 0, "is_default": True},
                {"id": "with-cuff", "name": "With Cuff", "image": "", "surcharge": 5, "is_default": False},
            ]
        },
    ]
}


# API Endpoints
@router.get("/parameters/{product_id}")
async def get_product_styling(product_id: str):
    """Get styling parameters for a product"""
    styling = await db.product_styling.find_one({"product_id": product_id})
    
    if not styling:
        # Return defaults based on product type
        if product_id == "suits":
            default_data = DEFAULT_SUIT_STYLING.copy()
        elif product_id == "pants":
            default_data = DEFAULT_PANTS_STYLING.copy()
        else:
            # Generic default for other products
            default_data = {
                "product_id": product_id,
                "base_cmt_price": 100,
                "constructions": [],
                "parameters": []
            }
        
        # Save to database
        default_data["created_at"] = datetime.now(timezone.utc)
        default_data["updated_at"] = datetime.now(timezone.utc)
        await db.product_styling.insert_one(default_data)
        
        styling = await db.product_styling.find_one({"product_id": product_id})
    
    styling.pop("_id", None)
    return styling


@router.put("/parameters/{product_id}")
async def update_product_styling(product_id: str, styling_data: dict):
    """Update styling parameters for a product"""
    existing = await db.product_styling.find_one({"product_id": product_id})
    
    styling_data["product_id"] = product_id
    styling_data["updated_at"] = datetime.now(timezone.utc)
    
    if existing:
        await db.product_styling.update_one(
            {"product_id": product_id},
            {"$set": styling_data}
        )
    else:
        styling_data["created_at"] = datetime.now(timezone.utc)
        await db.product_styling.insert_one(styling_data)
    
    result = await db.product_styling.find_one({"product_id": product_id})
    result.pop("_id", None)
    
    # Fire webhook for styling change
    try:
        from routes.sync import fire_webhooks
        asyncio.ensure_future(fire_webhooks("styling.updated", {"product_id": product_id}))
    except Exception:
        pass
    
    return result


@router.get("/all-parameters")
async def get_all_styling_parameters():
    """Get all product styling configurations"""
    stylings = await db.product_styling.find({}).to_list(100)
    for s in stylings:
        s.pop("_id", None)
    return stylings


@router.put("/all-parameters/bulk")
async def bulk_update_styling(stylings: List[dict]):
    """Bulk update all styling configurations"""
    now = datetime.now(timezone.utc)
    
    for styling in stylings:
        product_id = styling.get("product_id")
        if not product_id:
            continue
            
        styling["updated_at"] = now
        existing = await db.product_styling.find_one({"product_id": product_id})
        
        if existing:
            await db.product_styling.update_one(
                {"product_id": product_id},
                {"$set": styling}
            )
        else:
            styling["created_at"] = now
            await db.product_styling.insert_one(styling)
    
    result = await db.product_styling.find({}).to_list(100)
    for s in result:
        s.pop("_id", None)
    return result
