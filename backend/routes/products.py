from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone
import motor.motor_asyncio
import os
import asyncio

router = APIRouter(tags=["products"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


class ProductItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: bool = True
    # Configuration parameters for this product
    config_fields: List[dict] = []


class ProductCategory(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    products: List[ProductItem] = []
    order: int = 0
    is_active: bool = True


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = 0


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None


# Default configuration fields for products
DEFAULT_CONFIG_FIELDS = {
    "suits": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "lining", "name": "Lining", "type": "code_with_image", "required": False},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
    "jackets": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "lining", "name": "Lining", "type": "code_with_image", "required": False},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
    "pants": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "lining", "name": "Lining", "type": "code_with_image", "required": False},
    ],
    "bandhgala": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "lining", "name": "Lining", "type": "code_with_image", "required": False},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
    "bomber-jackets": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "lining", "name": "Lining", "type": "code_with_image", "required": False},
        {"id": "zipper", "name": "Zipper", "type": "code_with_image", "required": False},
    ],
    "casual-shirts": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
    "formal-shirts": [
        {"id": "fabric", "name": "Fabric", "type": "code_with_image", "required": True},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
        {"id": "collar", "name": "Collar Style", "type": "dropdown", "required": False, "options": ["Spread", "Point", "Button Down", "Cutaway"]},
    ],
    "denim-jacket": [
        {"id": "fabric", "name": "Denim Fabric", "type": "code_with_image", "required": True},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
    "jeans": [
        {"id": "fabric", "name": "Denim Fabric", "type": "code_with_image", "required": True},
        {"id": "button", "name": "Button", "type": "code_with_image", "required": False},
    ],
}

# Default categories and products
DEFAULT_CATEGORIES = [
    {
        "id": "suits-jackets",
        "name": "Suits & Jackets",
        "icon": "suit",
        "description": "Premium suits and jackets collection",
        "order": 1,
        "is_active": True,
        "products": [
            {"id": "suits", "name": "Suits", "description": "Classic and modern suits", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("suits", [])},
            {"id": "jackets", "name": "Jackets", "description": "Blazers and sport coats", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("jackets", [])},
            {"id": "pants", "name": "Pants", "description": "Formal and casual pants", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("pants", [])},
            {"id": "bandhgala", "name": "Bandhgala", "description": "Traditional Indian formal wear", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("bandhgala", [])},
            {"id": "bomber-jackets", "name": "Bomber Jackets", "description": "Casual bomber jackets", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("bomber-jackets", [])},
        ]
    },
    {
        "id": "shirts",
        "name": "Shirts",
        "icon": "shirt",
        "description": "Premium shirts collection",
        "order": 2,
        "is_active": True,
        "products": [
            {"id": "casual-shirts", "name": "Casual Shirts", "description": "Relaxed fit casual shirts", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("casual-shirts", [])},
            {"id": "formal-shirts", "name": "Formal Shirts", "description": "Business and formal shirts", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("formal-shirts", [])},
        ]
    },
    {
        "id": "denim-wear",
        "name": "Denim Wear",
        "icon": "denim",
        "description": "Denim collection",
        "order": 3,
        "is_active": True,
        "products": [
            {"id": "denim-jacket", "name": "Jacket", "description": "Denim jackets", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("denim-jacket", [])},
            {"id": "jeans", "name": "Jeans", "description": "Premium jeans", "is_active": True, "config_fields": DEFAULT_CONFIG_FIELDS.get("jeans", [])},
        ]
    },
    {
        "id": "shoes",
        "name": "Shoes",
        "icon": "shoe",
        "description": "Footwear collection",
        "order": 4,
        "is_active": True,
        "products": []
    },
]


@router.get("/categories")
async def get_categories():
    """Get all product categories with their products"""
    # Check if categories exist in DB
    categories = await db.product_categories.find({}).sort("order", 1).to_list(100)
    
    if not categories:
        # Initialize with default categories
        for cat in DEFAULT_CATEGORIES:
            cat["created_at"] = datetime.now(timezone.utc)
            cat["updated_at"] = datetime.now(timezone.utc)
            await db.product_categories.insert_one(cat)
        categories = await db.product_categories.find({}).sort("order", 1).to_list(100)
    
    # Remove MongoDB _id from response
    for cat in categories:
        cat.pop("_id", None)
    
    return categories


@router.get("/categories/{category_id}")
async def get_category(category_id: str):
    """Get a single category by ID"""
    category = await db.product_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.pop("_id", None)
    return category


@router.post("/categories")
async def create_category(category: CategoryCreate):
    """Create a new product category"""
    # Generate ID from name
    category_id = category.name.lower().replace(" ", "-").replace("&", "and")
    
    # Check if exists
    existing = await db.product_categories.find_one({"id": category_id})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    now = datetime.now(timezone.utc)
    doc = {
        "id": category_id,
        "name": category.name,
        "icon": category.icon,
        "description": category.description,
        "order": category.order or 0,
        "is_active": True,
        "products": [],
        "created_at": now,
        "updated_at": now,
    }
    
    await db.product_categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/categories/bulk")
async def bulk_update_categories(categories: List[Any] = Body(...)):
    """Bulk update all categories (for WYSIWYG editor)"""
    now = datetime.now(timezone.utc)
    
    # Delete all existing and insert new
    await db.product_categories.delete_many({})
    
    for i, cat in enumerate(categories):
        cat["order"] = i
        cat["updated_at"] = now
        if "created_at" not in cat:
            cat["created_at"] = now
        await db.product_categories.insert_one(cat)
    
    # Return updated categories
    result = await db.product_categories.find({}).sort("order", 1).to_list(100)
    for cat in result:
        cat.pop("_id", None)
    
    return result


@router.put("/categories/{category_id}")
async def update_category(category_id: str, category: CategoryCreate):
    """Update a category"""
    existing = await db.product_categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data = {
        "name": category.name,
        "icon": category.icon,
        "description": category.description,
        "order": category.order or existing.get("order", 0),
        "updated_at": datetime.now(timezone.utc),
    }
    
    await db.product_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.product_categories.find_one({"id": category_id})
    updated.pop("_id", None)
    
    # Fire webhook for product change
    try:
        from routes.sync import fire_webhooks
        asyncio.ensure_future(fire_webhooks("products.updated", {"category_id": category_id}))
    except Exception:
        pass
    
    return updated


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    """Delete a category"""
    result = await db.product_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}


@router.post("/categories/{category_id}/products")
async def add_product_to_category(category_id: str, product: ProductCreate):
    """Add a product to a category"""
    category = await db.product_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Generate product ID
    product_id = product.name.lower().replace(" ", "-")
    
    # Check if product already exists in category
    existing_products = category.get("products", [])
    for p in existing_products:
        if p["id"] == product_id:
            raise HTTPException(status_code=400, detail="Product already exists in category")
    
    new_product = {
        "id": product_id,
        "name": product.name,
        "description": product.description,
        "image": product.image,
        "is_active": True,
    }
    
    await db.product_categories.update_one(
        {"id": category_id},
        {
            "$push": {"products": new_product},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    # Fire webhook for product change
    try:
        from routes.sync import fire_webhooks
        asyncio.ensure_future(fire_webhooks("products.created", {"category_id": category_id, "product_id": product_id}))
    except Exception:
        pass
    
    return new_product


@router.delete("/categories/{category_id}/products/{product_id}")
async def remove_product_from_category(category_id: str, product_id: str):
    """Remove a product from a category"""
    result = await db.product_categories.update_one(
        {"id": category_id},
        {
            "$pull": {"products": {"id": product_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found in category")
    
    return {"message": "Product removed"}
