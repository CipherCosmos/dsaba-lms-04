"""
Password Reset Service
Handles password reset operations
"""

from typing import Optional
from datetime import datetime, timedelta
import secrets

from src.domain.repositories.user_repository import IUserRepository
from src.domain.repositories.password_reset_token_repository import IPasswordResetTokenRepository
from src.domain.entities.user import User
from src.domain.entities.password_reset_token import PasswordResetToken
from src.domain.exceptions import (
    EntityNotFoundError,
    ValidationError,
    BusinessRuleViolationError
)
from src.infrastructure.security.password_hasher import password_hasher
from src.infrastructure.queue.tasks.email_tasks import send_email
from src.config import settings


class PasswordResetService:
    """
    Password reset service
    
    Coordinates password reset operations
    """
    
    def __init__(
        self,
        user_repository: IUserRepository,
        token_repository: IPasswordResetTokenRepository
    ):
        self.user_repository = user_repository
        self.token_repository = token_repository
    
    async def request_password_reset(
        self,
        email_or_username: str,
        reset_url_template: Optional[str] = None
    ) -> bool:
        """
        Request password reset
        
        Creates a reset token and sends email/SMS
        
        Args:
            email_or_username: User's email or username
            reset_url_template: URL template for reset link (e.g., "https://example.com/reset?token={token}")
        
        Returns:
            True if request was processed (always returns True for security)
        """
        # Find user by email or username
        user = await self.user_repository.get_by_email(email_or_username)
        if not user:
            user = await self.user_repository.get_by_username(email_or_username)
        
        # Always return True (don't reveal if user exists)
        if not user or not user.is_active:
            return True
        
        # Invalidate existing tokens for this user
        await self.token_repository.invalidate_user_tokens(user.id)
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        
        # Create reset token
        reset_token = PasswordResetToken.create(
            user_id=user.id,
            token=token,
            expiration_hours=24  # 24 hours validity
        )
        
        # Save token
        await self.token_repository.create(reset_token)
        
        # Send reset email
        if settings.FEATURE_EMAIL_ENABLED and user.email:
            await self._send_reset_email(user, token, reset_url_template)
        
        # Send SMS if enabled and phone number exists
        if settings.FEATURE_SMS_ENABLED and user.phone_number:
            await self._send_reset_sms(user, token)
        
        return True
    
    async def reset_password(
        self,
        token: str,
        new_password: str
    ) -> User:
        """
        Reset password using token
        
        Args:
            token: Reset token
            new_password: New password
        
        Returns:
            Updated User entity
        
        Raises:
            ValidationError: If token is invalid or expired
            EntityNotFoundError: If user not found
        """
        # Get token
        reset_token = await self.token_repository.get_by_token(token)
        
        if not reset_token:
            raise ValidationError(
                "Invalid or expired reset token",
                field="token"
            )
        
        if not reset_token.is_valid:
            raise ValidationError(
                "Token has expired or already been used",
                field="token"
            )
        
        # Get user
        user = await self.user_repository.get_by_id(reset_token.user_id)
        if not user:
            raise EntityNotFoundError("User", reset_token.user_id)
        
        # Validate and hash new password
        from src.domain.value_objects.password import Password as PasswordVO
        password_vo = PasswordVO(plain_password=new_password)
        
        # Update password
        user.update_password(password_hasher.hash(password_vo.value))
        await self.user_repository.update(user)
        
        # Mark token as used
        reset_token.mark_as_used()
        await self.token_repository.update(reset_token)
        
        return user
    
    async def _send_reset_email(
        self,
        user: User,
        token: str,
        reset_url_template: Optional[str] = None
    ) -> None:
        """Send password reset email"""
        if not settings.SMTP_HOST:
            return
        
        # Build reset URL
        if reset_url_template:
            reset_url = reset_url_template.format(token=token)
        else:
            # Default URL format
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        subject = "Password Reset Request - DSABA LMS"
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Hello {user.full_name},</p>
                <p>You have requested to reset your password for your DSABA LMS account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">{reset_url}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        Hello {user.full_name},
        
        You have requested to reset your password for your DSABA LMS account.
        
        Click this link to reset your password:
        {reset_url}
        
        This link will expire in 24 hours.
        
        If you did not request this password reset, please ignore this email.
        """
        
        # Send email asynchronously
        send_email.delay(
            to_email=user.email.email,
            subject=subject,
            body=text_body,
            html_body=html_body
        )
    
    async def _send_reset_sms(self, user: User, token: str) -> None:
        """
        Send password reset SMS
        
        Note: SMS functionality is not currently implemented.
        To enable SMS notifications, integrate with an SMS service provider such as:
        - Twilio (https://www.twilio.com/)
        - AWS SNS (https://aws.amazon.com/sns/)
        - MessageBird (https://www.messagebird.com/)
        
        Implementation would involve:
        1. Configuring SMS service credentials in settings
        2. Creating SMS client instance
        3. Sending SMS with reset link/token
        4. Handling delivery status and errors
        """
        # SMS functionality disabled - email is the primary reset method
        pass

