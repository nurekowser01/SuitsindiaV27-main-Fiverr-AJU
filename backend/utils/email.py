import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from motor.motor_asyncio import AsyncIOMotorClient
import requests

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "tailorstailor")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Frontend URL for password reset links - use FRONTEND_URL env var
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://india-apparel-dev.emergent.host")

async def get_email_settings():
    """Fetch email settings from database"""
    settings = await db.settings.find_one({"_id": "email_keys"})
    if settings:
        return {
            "provider": settings.get("email_provider", "smtp"),
            # SMTP settings (Google Workspace)
            "smtp_host": settings.get("smtp_host", "smtp.gmail.com"),
            "smtp_port": settings.get("smtp_port", 587),
            "smtp_username": settings.get("smtp_username"),
            "smtp_password": settings.get("smtp_password"),
            # Mailgun settings
            "api_key": settings.get("mailgun_api_key"),
            "domain": settings.get("mailgun_domain"),
            # Common
            "sender": settings.get("sender_email")
        }
    return None


async def send_email_smtp(to: str, subject: str, html_content: str, settings: dict):
    """Send email using SMTP (Google Workspace/Gmail)"""
    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"Suits India <{settings['sender']}>"
        msg['To'] = to
        msg['Subject'] = subject
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        server = smtplib.SMTP(settings['smtp_host'], settings['smtp_port'])
        server.starttls()
        server.login(settings['smtp_username'], settings['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        print(f"✅ Email sent successfully via SMTP to {to}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending email via SMTP: {e}")
        return False


async def send_email_mailgun(to: str, subject: str, html_content: str, settings: dict):
    """Send email using Mailgun API"""
    try:
        response = requests.post(
            f"https://api.mailgun.net/v3/{settings['domain']}/messages",
            auth=("api", settings['api_key']),
            data={
                "from": f"Suits India <{settings['sender']}>",
                "to": to,
                "subject": subject,
                "html": html_content
            },
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Email sent successfully via Mailgun to {to}")
            return True
        else:
            print(f"❌ Failed to send email via Mailgun: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email via Mailgun: {e}")
        return False


async def send_email(to: str, subject: str, html_content: str):
    """Send email using configured provider (SMTP or Mailgun)"""
    try:
        email_settings = await get_email_settings()
        
        if not email_settings:
            print(f"\n{'='*60}")
            print(f"⚠️  EMAIL NOT SENT - Email provider not configured")
            print(f"TO: {to}")
            print(f"SUBJECT: {subject}")
            print(f"{'='*60}\n")
            return False
        
        provider = email_settings.get("provider", "smtp")
        
        if provider == "smtp":
            if not email_settings.get("smtp_username") or not email_settings.get("smtp_password"):
                print(f"⚠️  EMAIL NOT SENT - SMTP credentials not configured")
                return False
            return await send_email_smtp(to, subject, html_content, email_settings)
        
        elif provider == "mailgun":
            if not email_settings.get("api_key"):
                print(f"⚠️  EMAIL NOT SENT - Mailgun not configured")
                return False
            return await send_email_mailgun(to, subject, html_content, email_settings)
        
        else:
            print(f"⚠️  EMAIL NOT SENT - Unknown provider: {provider}")
            return False
            
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return False


async def send_password_reset_email(email: str, token: str):
    """Send password reset link"""
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #1a1a1a; color: #c9a962; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .button {{ background-color: #c9a962; color: #1a1a1a; padding: 12px 30px; text-decoration: none; display: inline-block; border-radius: 5px; font-weight: bold; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Suits India</h1>
            </div>
            <div class="content">
                <h2>Reset Your Password</h2>
                <p>You requested to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Suits India. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, "Reset Your Password - Suits India", html_content)


async def send_order_confirmation_email(email: str, order_number: str, order_details: dict):
    """Send order confirmation email"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #1a1a1a; color: #c9a962; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 30px; }}
            .order-box {{ background-color: white; padding: 20px; margin: 20px 0; border: 2px solid #c9a962; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
                <h2>Thank You for Your Order</h2>
                <p>Your custom suit order has been received and is being processed.</p>
                <div class="order-box">
                    <h3>Order #{order_number}</h3>
                    <p><strong>Total:</strong> ${order_details.get('total_price', 0)}</p>
                    <p><strong>Estimated Delivery:</strong> 4-6 weeks</p>
                </div>
                <p>We'll send you another email once your suit ships.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 Suits India. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return await send_email(email, f"Order Confirmation #{order_number}", html_content)
