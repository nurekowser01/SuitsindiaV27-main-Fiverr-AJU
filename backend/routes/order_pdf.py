from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
import io

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
        raise HTTPException(status_code=403, detail="Not authorized - Admin only")
    return user


def generate_order_pdf_html(order: dict, customer: dict = None) -> str:
    """Generate HTML content for order PDF"""
    
    items_html = ""
    total_amount = 0
    
    for idx, item in enumerate(order.get("items", [])):
        pricing = item.get("pricing", {})
        item_total = pricing.get("total", 0)
        total_amount += item_total
        
        # Configuration details - show both Code and SKU
        config_html = ""
        config = item.get("configuration", {})
        if isinstance(config, list):
            for cfg in config:
                for key, val in cfg.items():
                    if key not in ['id', 'size_category'] and val and isinstance(val, dict):
                        code_str = val.get('code', '')
                        sku_str = val.get('sku', '')
                        display = f"Code: {code_str}" if code_str else ""
                        if sku_str:
                            display += f" | SKU: {sku_str}" if display else f"SKU: {sku_str}"
                        if display:
                            config_html += f"<div style='margin: 4px 0;'><strong>{key.title()}:</strong> {display}</div>"
        elif isinstance(config, dict):
            for key, val in config.items():
                if key not in ['id', 'size_category'] and val and isinstance(val, dict):
                    code_str = val.get('code', '')
                    sku_str = val.get('sku', '')
                    display = f"Code: {code_str}" if code_str else ""
                    if sku_str:
                        display += f" | SKU: {sku_str}" if display else f"SKU: {sku_str}"
                    if display:
                        config_html += f"<div style='margin: 4px 0;'><strong>{key.title()}:</strong> {display}</div>"
        
        # Styling details
        styling_html = ""
        styling = item.get("styling", {})
        if styling.get("construction"):
            styling_html += f"<div><strong>Construction:</strong> {styling['construction'].get('name', '-')}</div>"
        
        options = styling.get("options", {})
        for key, opt in options.items():
            if opt:
                styling_html += f"<div><strong>{key.replace('-', ' ').title()}:</strong> {opt.get('name', '-')}</div>"
        
        # Measurements table
        measurements_html = ""
        linked = item.get("linked_measurements", {}).get("measurements", {})
        if linked:
            measurements_html = """
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Measurement</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Body</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Allowance</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Final</th>
                    </tr>
                </thead>
                <tbody>
            """
            for field_id, data in linked.items():
                body = data.get("body_measurement", "-")
                allowance = data.get("allowance", 0)
                final = data.get("final_measurement", body)
                allowance_str = f"+{allowance}" if allowance > 0 else str(allowance) if allowance != 0 else "-"
                measurements_html += f"""
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 6px; text-transform: capitalize;">{field_id.replace('-', ' ')}</td>
                        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">{body}"</td>
                        <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">{allowance_str}"</td>
                        <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">{final}"</td>
                    </tr>
                """
            measurements_html += "</tbody></table>"
        
        items_html += f"""
        <div style="border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; overflow: hidden;">
            <div style="background: #1a2744; color: white; padding: 12px 16px;">
                <strong>Item #{idx + 1}: {item.get('product_name', 'Product')}</strong>
                {f"<span style='float: right;'>₹{item_total}</span>" if item_total else ""}
            </div>
            <div style="padding: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1a2744;">Configuration</h4>
                        {config_html or '<p style="color: #666;">No configuration</p>'}
                    </div>
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #1a2744;">Styling</h4>
                        {styling_html or '<p style="color: #666;">No styling options</p>'}
                    </div>
                </div>
                
                {f'''<div style="margin-top: 16px;">
                    <h4 style="margin: 0 0 10px 0; color: #1a2744;">Measurements</h4>
                    {measurements_html}
                </div>''' if measurements_html else ''}
                
                {f'''<div style="margin-top: 16px; padding: 10px; background: #f0f9ff; border-radius: 6px;">
                    <strong>Comments:</strong> {styling.get('comments', '')}
                </div>''' if styling.get('comments') else ''}
            </div>
        </div>
        """
    
    # Customer info
    customer_name = order.get("customer_name", "N/A")
    customer_phone = ""
    customer_address = ""
    
    if customer:
        customer_phone = customer.get("phone", "")
        address_parts = [
            customer.get("address", ""),
            customer.get("city", ""),
            customer.get("state", ""),
            customer.get("pincode", "")
        ]
        customer_address = ", ".join([p for p in address_parts if p])
    
    created_at = order.get("created_at", "")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            created_at = created_at.strftime("%d %b %Y, %I:%M %p")
        except ValueError:
            pass
    elif isinstance(created_at, datetime):
        created_at = created_at.strftime("%d %b %Y, %I:%M %p")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Order {order.get('order_id', 'N/A')}</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; }}
            .container {{ max-width: 800px; margin: 0 auto; padding: 40px; }}
            .header {{ text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #c9a962; }}
            .header h1 {{ color: #1a2744; margin-bottom: 5px; }}
            .header .subtitle {{ color: #666; }}
            .order-meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
            .meta-box {{ background: #f9fafb; padding: 16px; border-radius: 8px; }}
            .meta-box h3 {{ color: #1a2744; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }}
            .status-badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }}
            .status-wip {{ background: #fef3c7; color: #92400e; }}
            .status-placed {{ background: #dbeafe; color: #1e40af; }}
            .status-processing {{ background: #f3e8ff; color: #7c3aed; }}
            .status-shipped {{ background: #dcfce7; color: #166534; }}
            .status-delivered {{ background: #bbf7d0; color: #14532d; }}
            .status-cancelled {{ background: #fee2e2; color: #991b1b; }}
            .total-section {{ text-align: right; margin-top: 30px; padding: 20px; background: #1a2744; color: white; border-radius: 8px; }}
            .total-section .label {{ font-size: 14px; opacity: 0.8; }}
            .total-section .amount {{ font-size: 28px; font-weight: bold; color: #c9a962; }}
            .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }}
            @media print {{
                .container {{ padding: 20px; }}
                body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>SUITS INDIA</h1>
                <p class="subtitle">Order Details</p>
            </div>
            
            <div class="order-meta">
                <div class="meta-box">
                    <h3>Order Information</h3>
                    <p><strong>Order ID:</strong> {order.get('order_id', 'N/A')}</p>
                    <p><strong>Date:</strong> {created_at}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-{order.get('status', 'wip')}">{order.get('status', 'WIP').upper()}</span></p>
                    <p><strong>Payment:</strong> {order.get('payment_method', 'Not Set').replace('_', ' ').title()}</p>
                </div>
                <div class="meta-box">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> {customer_name}</p>
                    <p><strong>ID:</strong> {order.get('customer_id', 'N/A')}</p>
                    {f'<p><strong>Phone:</strong> {customer_phone}</p>' if customer_phone else ''}
                    {f'<p><strong>Address:</strong> {customer_address}</p>' if customer_address else ''}
                </div>
            </div>
            
            <h2 style="color: #1a2744; margin-bottom: 20px;">Order Items</h2>
            {items_html}
            
            <div class="total-section">
                <div class="label">TOTAL AMOUNT</div>
                <div class="amount">₹{total_amount}</div>
            </div>
            
            {f'''<div style="margin-top: 20px; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                <strong>Admin Comments:</strong><br>
                {order.get('admin_comments', '')}
            </div>''' if order.get('admin_comments') else ''}
            
            <div class="footer">
                <p>Generated on {datetime.now().strftime("%d %b %Y at %I:%M %p")}</p>
                <p>Suits India - Premium Custom Tailoring</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html


@router.get("/orders/{order_id}/pdf")
async def generate_order_pdf(order_id: str, authorization: str = Header(None)):
    """Generate PDF for an order - Admin only"""
    await get_current_admin(authorization)
    
    # Get the order
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.pop("_id", None)
    
    # Get customer details
    customer = None
    if order.get("customer_id"):
        customer = await db.customers.find_one({"customer_id": order["customer_id"]})
        if customer:
            customer.pop("_id", None)
    
    # Generate HTML
    html_content = generate_order_pdf_html(order, customer)
    
    # Return HTML for now (browser can print to PDF)
    # For actual PDF generation, we'd need a library like weasyprint or pdfkit
    return Response(
        content=html_content,
        media_type="text/html",
        headers={
            "Content-Disposition": f"inline; filename=order_{order_id}.html"
        }
    )


@router.get("/orders/{order_id}/pdf-data")
async def get_order_pdf_data(order_id: str, authorization: str = Header(None)):
    """Get order data for PDF generation - Admin only"""
    await get_current_admin(authorization)
    
    # Get the order
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.pop("_id", None)
    
    # Get customer details
    customer = None
    if order.get("customer_id"):
        customer = await db.customers.find_one({"customer_id": order["customer_id"]})
        if customer:
            customer.pop("_id", None)
    
    # Get measurement config for field names
    measurement_config = await db.measurement_config.find_one({"_id": "default"})
    if measurement_config:
        measurement_config.pop("_id", None)
    
    return {
        "order": order,
        "customer": customer,
        "measurement_config": measurement_config
    }
