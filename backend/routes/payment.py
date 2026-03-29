from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import motor.motor_asyncio
import os

router = APIRouter(tags=["payment"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[os.environ.get("DB_NAME", "suits_india")]


class StripeKeys(BaseModel):
    publishable_key: str
    secret_key: Optional[str] = None


async def get_stripe_keys():
    """Get Stripe keys from database"""
    settings = await db.stripe_settings.find_one({"id": "default"})
    if not settings:
        return None, None
    return settings.get("publishable_key"), settings.get("secret_key")


# ====================
# Stripe Settings APIs
# ====================

@router.get("/stripe")
async def get_stripe_settings():
    """Get Stripe publishable key (secret is never returned)"""
    settings = await db.stripe_settings.find_one({"id": "default"})
    if not settings:
        return {"publishable_key": "", "has_secret_key": False}
    
    return {
        "publishable_key": settings.get("publishable_key", ""),
        "has_secret_key": bool(settings.get("secret_key"))
    }


@router.put("/stripe")
async def update_stripe_settings(keys: StripeKeys):
    """Update Stripe API keys"""
    update_data = {
        "id": "default",
        "publishable_key": keys.publishable_key,
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Only update secret key if provided
    if keys.secret_key:
        update_data["secret_key"] = keys.secret_key
    
    await db.stripe_settings.update_one(
        {"id": "default"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Stripe settings updated successfully"}


@router.get("/stripe/public-key")
async def get_stripe_public_key():
    """Get only the publishable key for frontend use"""
    publishable_key, _ = await get_stripe_keys()
    return {"publishable_key": publishable_key or ""}


# ======================
# Stripe Checkout APIs
# ======================

@router.post("/checkout/create-session")
async def create_checkout_session(request: Request):
    """Create a Stripe Checkout session for admin payment (Reseller → Admin)
    
    This is for the reseller to pay the admin their cost portion:
    - Amount = Admin Base Cost + Admin Margin
    - NOT the full customer price
    """
    import stripe
    
    data = await request.json()
    order_id = data.get("order_id")
    amount = data.get("amount")  # Amount in INR (should be admin_cost + admin_margin)
    success_url = data.get("success_url")
    cancel_url = data.get("cancel_url")
    payment_type = data.get("payment_type", "admin")  # "admin" or "customer"
    
    if not all([order_id, amount, success_url, cancel_url]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get Stripe secret key
    _, secret_key = await get_stripe_keys()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe.api_key = secret_key
    
    try:
        # Create checkout session
        # Handle success_url - add session_id as proper query param
        if '?' in success_url:
            final_success_url = success_url + '&session_id={CHECKOUT_SESSION_ID}'
        else:
            final_success_url = success_url + '?session_id={CHECKOUT_SESSION_ID}'
        
        description = 'Admin Payment - Suits India Order' if payment_type == 'admin' else 'Customer Payment - Suits India Order'
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f'Order #{order_id}',
                        'description': description,
                    },
                    'unit_amount': int(amount * 100),  # Convert to paise
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=final_success_url,
            cancel_url=cancel_url,
            metadata={
                'order_id': order_id,
                'payment_type': payment_type
            }
        )
        
        # Update order with session ID based on payment type
        if payment_type == 'admin':
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "admin_payment.stripe_session_id": session.id,
                    "admin_payment.status": "pending",
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            await db.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "stripe_session_id": session.id,
                    "payment_method": "stripe",
                    "payment_status": "pending",
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        
        return {"session_id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/checkout/verify-payment")
async def verify_payment(request: Request):
    """Verify a payment after Stripe redirect"""
    import stripe
    
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    _, secret_key = await get_stripe_keys()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe.api_key = secret_key
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == 'paid':
            order_id = session.metadata.get('order_id')
            payment_type = session.metadata.get('payment_type', 'admin')
            
            if payment_type == 'admin':
                # Admin payment - Reseller paid admin
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "admin_payment.status": "paid",
                        "admin_payment.paid_at": datetime.now(timezone.utc),
                        "admin_payment.stripe_payment_id": session.payment_intent,
                        "status": "placed",  # Move to placed once admin is paid
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            else:
                # Customer payment via Stripe
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "stripe_payment_id": session.payment_intent,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            
            return {"status": "paid", "order_id": order_id, "payment_type": payment_type}
        else:
            return {"status": session.payment_status}
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    import stripe
    import json
    
    payload = await request.body()
    
    _, secret_key = await get_stripe_keys()
    if not secret_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    stripe.api_key = secret_key
    
    try:
        event_data = json.loads(payload)
        event = stripe.Event.construct_from(event_data, secret_key)
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    # Handle the event
    if event.type == 'checkout.session.completed':
        session = event.data.object
        order_id = session.metadata.get('order_id')
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "payment_status": "paid",
                "status": "placed",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    return {"status": "success"}


# ======================
# Customer Payment APIs (Using Reseller's Stripe Keys)
# ======================

@router.post("/customer/create-checkout-session")
async def create_customer_checkout_session(request: Request):
    """Create a Stripe Checkout session for CUSTOMER payment using RESELLER's Stripe keys
    
    This is for customers paying the reseller (the full customer price).
    Uses the reseller's own Stripe account, not the admin's.
    """
    import stripe
    
    data = await request.json()
    order_ids = data.get("order_ids")  # Can be a list of order IDs
    amount = data.get("amount")  # Full customer price
    success_url = data.get("success_url")
    cancel_url = data.get("cancel_url")
    reseller_id = data.get("reseller_id", "default")
    
    if not all([order_ids, amount, success_url, cancel_url]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get reseller's Stripe keys
    reseller_settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    if not reseller_settings:
        raise HTTPException(status_code=404, detail="Reseller settings not found")
    
    reseller_stripe_secret = reseller_settings.get("stripe_secret_key")
    if not reseller_stripe_secret or not reseller_settings.get("stripe_enabled"):
        raise HTTPException(status_code=400, detail="Reseller Stripe not configured. Please add Stripe keys in Settings.")
    
    stripe.api_key = reseller_stripe_secret
    
    try:
        # Handle success_url - add session_id as proper query param
        if '?' in success_url:
            final_success_url = success_url + '&session_id={CHECKOUT_SESSION_ID}'
        else:
            final_success_url = success_url + '?session_id={CHECKOUT_SESSION_ID}'
        
        # Create order ID string for metadata
        order_id_str = order_ids if isinstance(order_ids, str) else ','.join(order_ids)
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f'Order(s): {order_id_str}',
                        'description': 'Customer Payment - Custom Tailoring',
                    },
                    'unit_amount': int(amount * 100),  # Convert to paise
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=final_success_url,
            cancel_url=cancel_url,
            metadata={
                'order_ids': order_id_str,
                'payment_type': 'customer',
                'reseller_id': reseller_id
            }
        )
        
        # Update orders with customer payment session info
        order_id_list = order_ids if isinstance(order_ids, list) else order_ids.split(',')
        for oid in order_id_list:
            await db.orders.update_one(
                {"order_id": oid.strip()},
                {"$set": {
                    "customer_payment.stripe_session_id": session.id,
                    "customer_payment.status": "pending",
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        
        return {"session_id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/customer/verify-payment")
async def verify_customer_payment(request: Request):
    """Verify a customer payment after Stripe redirect"""
    import stripe
    
    data = await request.json()
    session_id = data.get("session_id")
    reseller_id = data.get("reseller_id", "default")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")
    
    # Get reseller's Stripe keys
    reseller_settings = await db.reseller_settings.find_one({"reseller_id": reseller_id})
    if not reseller_settings:
        raise HTTPException(status_code=404, detail="Reseller settings not found")
    
    reseller_stripe_secret = reseller_settings.get("stripe_secret_key")
    if not reseller_stripe_secret:
        raise HTTPException(status_code=400, detail="Reseller Stripe not configured")
    
    stripe.api_key = reseller_stripe_secret
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == 'paid':
            order_ids_str = session.metadata.get('order_ids', '')
            order_id_list = [oid.strip() for oid in order_ids_str.split(',') if oid.strip()]
            
            # Update all orders with customer payment status
            for order_id in order_id_list:
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "customer_payment.status": "paid",
                        "customer_payment.paid_at": datetime.now(timezone.utc),
                        "customer_payment.stripe_payment_id": session.payment_intent,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            
            return {"status": "paid", "order_ids": order_id_list}
        else:
            return {"status": session.payment_status}
            
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
