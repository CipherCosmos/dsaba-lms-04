"""
Email Background Tasks
Celery tasks for async email sending
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from src.infrastructure.queue.celery_app import celery_app
from src.config import settings


@celery_app.task(name="send_email")
def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send email asynchronously
    
    Args:
        to_email: Recipient email
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    
    Returns:
        Email sending result
    """
    try:
        # Email sending implementation using SMTP
        if not settings.SMTP_HOST:
            return {
                "status": "skipped",
                "reason": "SMTP not configured"
            }
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg['To'] = to_email
            
            # Add plain text part
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                
                server.send_message(msg)
            
            return {
                "status": "sent",
                "to": to_email,
                "subject": subject,
                "sent_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                "status": "failed",
                "to": to_email,
                "error": str(e),
                "sent_at": datetime.utcnow().isoformat()
            }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }


@celery_app.task(name="send_bulk_email")
def send_bulk_email(
    recipients: List[str],
    subject: str,
    body: str,
    html_body: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send bulk emails asynchronously
    
    Args:
        recipients: List of recipient emails
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
    
    Returns:
        Bulk email sending result
    """
    try:
        results = []
        for email in recipients:
            result = send_email.delay(email, subject, body, html_body)
            results.append({
                "email": email,
                "task_id": result.id
            })
        
        return {
            "status": "queued",
            "recipients_count": len(recipients),
            "tasks": results
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e)
        }

