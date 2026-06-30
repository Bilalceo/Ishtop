"""
=============================================================================
EMAIL SERVICE - SMTP & SendGrid Integration
=============================================================================

Bu service email yuborish uchun ishlatiladi:
- SMTP (Gmail, Outlook, etc.)
- SendGrid (Production uchun tavsiya)

Xususiyatlari:
- Async email yuborish
- HTML templates
- Queue orqali yuborish (Background Tasks)
- Retry mechanism
- Email logging

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import asyncio
import json

# For async email
try:
    import aiosmtplib  # type: ignore
except ModuleNotFoundError as exc:
    if exc.name != "aiosmtplib":
        raise
    aiosmtplib = None

# For templates
from jinja2 import Environment, PackageLoader, select_autoescape, FileSystemLoader
from pathlib import Path

from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# EMAIL TYPES
# =============================================================================

class EmailType(str, Enum):
    """Email turlari."""
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGED = "password_changed"
    LOGIN_NOTIFICATION = "login_notification"
    REGISTRATION_SUCCESS = "registration_success"
    EMAIL_VERIFICATION = "email_verification"
    PREMIUM_UPGRADE = "premium_upgrade"
    PREMIUM_EXPIRED = "premium_expired"
    APPLICATION_STATUS = "application_status"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    JOB_MATCH = "job_match"
    WEEKLY_DIGEST = "weekly_digest"


# =============================================================================
# EMAIL TEMPLATES
# =============================================================================

EMAIL_TEMPLATES = {
    EmailType.WELCOME: {
        "subject": "🎉 IshTop ga xush kelibsiz!",
        "subject_ru": "🎉 Добро пожаловать в IshTop!",
    },
    EmailType.PASSWORD_RESET: {
        "subject": "🔐 Parolni tiklash - IshTop",
        "subject_ru": "🔐 Сброс пароля - IshTop",
    },
    EmailType.PASSWORD_CHANGED: {
        "subject": "✅ Parol muvaffaqiyatli o'zgartirildi",
        "subject_ru": "✅ Пароль успешно изменен",
    },
    EmailType.LOGIN_NOTIFICATION: {
        "subject": "🔔 Yangi kirish aniqlandi - IshTop",
        "subject_ru": "🔔 Обнаружен новый вход - IshTop",
    },
    EmailType.REGISTRATION_SUCCESS: {
        "subject": "✅ Ro'yxatdan o'tish muvaffaqiyatli!",
        "subject_ru": "✅ Регистрация успешна!",
    },
    EmailType.EMAIL_VERIFICATION: {
        "subject": "📧 Email manzilingizni tasdiqlang",
        "subject_ru": "📧 Подтвердите ваш email",
    },
    EmailType.PREMIUM_UPGRADE: {
        "subject": "⭐ Premium ga o'tdingiz! - IshTop",
        "subject_ru": "⭐ Вы перешли на Premium! - IshTop",
    },
    EmailType.APPLICATION_STATUS: {
        "subject": "📋 Ariza holati yangilandi - IshTop",
        "subject_ru": "📋 Статус заявки обновлен - IshTop",
    },
    EmailType.INTERVIEW_SCHEDULED: {
        "subject": "📅 Suhbat belgilandi! - IshTop",
        "subject_ru": "📅 Собеседование назначено! - IshTop",
    },
}


# =============================================================================
# EMAIL SERVICE CLASS
# =============================================================================

class EmailService:
    """
    Email yuborish xizmati.
    
    SMTP va SendGrid ni qo'llab-quvvatlaydi.
    """
    
    def __init__(self):
        """Initialize email service."""
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from_email = settings.SMTP_FROM_EMAIL
        self.smtp_from_name = settings.SMTP_FROM_NAME
        self.smtp_use_tls = settings.SMTP_USE_TLS
        
        # SendGrid
        self.sendgrid_api_key = settings.SENDGRID_API_KEY
        self.use_sendgrid = bool(self.sendgrid_api_key)
        self.email_transport = settings.EMAIL_TRANSPORT.strip().lower()
        
        # Template engine
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        if template_dir.exists():
            self.jinja_env = Environment(
                loader=FileSystemLoader(str(template_dir)),
                autoescape=select_autoescape(['html', 'xml'])
            )
        else:
            self.jinja_env = None
            logger.warning(f"Email templates directory not found: {template_dir}")
        
        logger.info(
            "EmailService initialized. transport=%s sendgrid=%s smtp=%s",
            self.email_transport,
            self.use_sendgrid,
            bool(self.smtp_user and self.smtp_password),
        )
    
    # =========================================================================
    # PUBLIC METHODS
    # =========================================================================
    
    async def send_email(
        self,
        to_email: str,
        email_type: EmailType,
        context: Dict[str, Any],
        language: str = "uz",
        to_name: Optional[str] = None,
    ) -> bool:
        """
        Email yuborish.
        
        Args:
            to_email: Qabul qiluvchi email
            email_type: Email turi
            context: Template uchun ma'lumotlar
            language: Til (uz, ru, en)
            to_name: Qabul qiluvchi ismi
            
        Returns:
            True agar muvaffaqiyatli, False aks holda
        """
        try:
            providers = self._get_delivery_providers()
            if not providers:
                logger.warning(
                    "Email delivery disabled or not configured; skipping %s to %s***",
                    email_type.value,
                    to_email[:3],
                )
                return False

            # Get subject
            template_config = EMAIL_TEMPLATES.get(email_type, {})
            subject = template_config.get(
                f"subject_{language}" if language != "uz" else "subject",
                template_config.get("subject", "IshTop")
            )
            
            # Render HTML body
            html_body = self._render_template(email_type, context, language)
            
            # Try providers in priority order.
            success = False
            for provider in providers:
                if provider == "sendgrid":
                    success = await self._send_via_sendgrid(
                        to_email, to_name, subject, html_body
                    )
                elif provider == "smtp":
                    success = await self._send_via_smtp(
                        to_email, to_name, subject, html_body
                    )
                else:
                    continue

                if success:
                    break
            
            # Log result
            if success:
                logger.info(f"Email sent successfully: {email_type.value} to {to_email[:3]}***")
            else:
                logger.error(f"Email failed: {email_type.value} to {to_email[:3]}***")
            
            return success
            
        except Exception as e:
            logger.exception(f"Email error: {e}")
            return False
    
    async def send_raw_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        to_name: Optional[str] = None,
        html: bool = False,
    ) -> bool:
        """Send a raw email with an arbitrary subject + body (no templates).

        Used by AI-drafted recruiter emails where the body is already prepared.
        Plain-text bodies are wrapped in a minimal HTML container so SMTP
        clients render line breaks correctly.
        """
        providers = self._get_delivery_providers()
        if not providers:
            logger.warning("Email delivery disabled; skipping raw send to %s***", to_email[:3])
            return False

        html_body = body if html else (
            "<!doctype html><html><body style=\"font-family: -apple-system,Segoe UI,Roboto,Arial,sans-serif;"
            "max-width:600px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.55\">"
            + body.replace("\n", "<br>")
            + "</body></html>"
        )

        for provider in providers:
            try:
                if provider == "smtp":
                    ok = await self._send_via_smtp(to_email, to_name, subject, html_body)
                elif provider == "sendgrid":
                    ok = await self._send_via_sendgrid(to_email, to_name, subject, html_body)
                else:
                    ok = False
                if ok:
                    logger.info(f"Raw email sent via {provider} to {to_email[:3]}***")
                    return True
            except Exception as e:
                logger.warning(f"Raw email provider {provider} failed: {e}")

        logger.error(f"Raw email failed for all providers to {to_email[:3]}***")
        return False

    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str,
        language: str = "uz"
    ) -> bool:
        """Send welcome email after registration."""
        context = {
            "user_name": user_name,
            "login_url": f"{settings.FRONTEND_URL}/login",
            "dashboard_url": f"{settings.FRONTEND_URL}/student",
        }
        return await self.send_email(
            to_email, EmailType.WELCOME, context, language, user_name
        )
    
    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str,
        language: str = "uz"
    ) -> bool:
        """Send password reset email."""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        context = {
            "user_name": user_name,
            "reset_url": reset_url,
            "expires_in": "1 soat" if language == "uz" else "1 час",
        }
        return await self.send_email(
            to_email, EmailType.PASSWORD_RESET, context, language, user_name
        )
    
    async def send_password_changed_email(
        self,
        to_email: str,
        user_name: str,
        language: str = "uz"
    ) -> bool:
        """Send password changed notification."""
        context = {
            "user_name": user_name,
            "changed_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "support_email": settings.SUPPORT_EMAIL,
        }
        return await self.send_email(
            to_email, EmailType.PASSWORD_CHANGED, context, language, user_name
        )
    
    async def send_login_notification(
        self,
        to_email: str,
        user_name: str,
        ip_address: str,
        user_agent: str,
        language: str = "uz"
    ) -> bool:
        """Send login notification email."""
        context = {
            "user_name": user_name,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "login_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "security_url": f"{settings.FRONTEND_URL}/settings/security",
        }
        return await self.send_email(
            to_email, EmailType.LOGIN_NOTIFICATION, context, language, user_name
        )
    
    async def send_registration_success_email(
        self,
        to_email: str,
        user_name: str,
        role: str,
        language: str = "uz"
    ) -> bool:
        """Send registration success email."""
        dashboard_url = (
            f"{settings.FRONTEND_URL}/company" 
            if role == "company" 
            else f"{settings.FRONTEND_URL}/student"
        )
        context = {
            "user_name": user_name,
            "role": role,
            "dashboard_url": dashboard_url,
            "features": self._get_role_features(role, language),
        }
        return await self.send_email(
            to_email, EmailType.REGISTRATION_SUCCESS, context, language, user_name
        )
    
    async def send_email_verification(
        self,
        to_email: str,
        user_name: str,
        verification_token: str,
        language: str = "uz"
    ) -> bool:
        """Send email verification link."""
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
        context = {
            "user_name": user_name,
            "verify_url": verify_url,
            "expires_in": "24 soat" if language == "uz" else "24 часа",
        }
        return await self.send_email(
            to_email, EmailType.EMAIL_VERIFICATION, context, language, user_name
        )
    
    async def send_application_status_email(
        self,
        to_email: str,
        user_name: str,
        job_title: str,
        company_name: str,
        new_status: str,
        language: str = "uz"
    ) -> bool:
        """Send application status update email."""
        context = {
            "user_name": user_name,
            "job_title": job_title,
            "company_name": company_name,
            "new_status": new_status,
            "applications_url": f"{settings.FRONTEND_URL}/student/applications",
        }
        return await self.send_email(
            to_email, EmailType.APPLICATION_STATUS, context, language, user_name
        )
    
    async def send_interview_scheduled_email(
        self,
        to_email: str,
        user_name: str,
        job_title: str,
        company_name: str,
        interview_date: str,
        interview_time: str,
        interview_type: str,  # video, phone, in-person
        meeting_link: Optional[str] = None,
        language: str = "uz"
    ) -> bool:
        """Send interview scheduled notification."""
        context = {
            "user_name": user_name,
            "job_title": job_title,
            "company_name": company_name,
            "interview_date": interview_date,
            "interview_time": interview_time,
            "interview_type": interview_type,
            "meeting_link": meeting_link,
        }
        return await self.send_email(
            to_email, EmailType.INTERVIEW_SCHEDULED, context, language, user_name
        )
    
    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================

    def _smtp_is_configured(self) -> bool:
        """Determine whether SMTP credentials are present."""
        return bool(self.smtp_user and self.smtp_password)

    def _send_via_smtp_sync(self, message: MIMEMultipart) -> None:
        """Blocking SMTP send used when aiosmtplib is unavailable."""
        timeout = settings.EMAIL_SMTP_TIMEOUT_SECONDS
        tls_context = ssl.create_default_context()

        smtp_cls = smtplib.SMTP_SSL if self.smtp_port == 465 else smtplib.SMTP
        with smtp_cls(self.smtp_host, self.smtp_port, timeout=timeout) as server:
            if self.smtp_use_tls and smtp_cls is smtplib.SMTP:
                server.starttls(context=tls_context)
            if self._smtp_is_configured():
                server.login(self.smtp_user, self.smtp_password)
            server.send_message(message)

    def _get_delivery_providers(self) -> List[str]:
        """
        Return delivery backends in priority order.

        auto:
            SendGrid first, then SMTP.
        smtp:
            SMTP only.
        sendgrid:
            SendGrid only.
        disabled:
            No delivery.
        """
        mode = (self.email_transport or "auto").strip().lower()

        if mode == "disabled":
            return []

        if mode == "sendgrid":
            return ["sendgrid"] if self.sendgrid_api_key else []

        if mode == "smtp":
            return ["smtp"] if self._smtp_is_configured() else []

        providers: List[str] = []
        if self.sendgrid_api_key:
            providers.append("sendgrid")
        if self._smtp_is_configured():
            providers.append("smtp")
        return providers

    def _render_template(
        self,
        email_type: EmailType,
        context: Dict[str, Any],
        language: str
    ) -> str:
        """Render email template."""
        # Add common context
        context.update({
            "app_name": "IshTop",
            "app_url": settings.FRONTEND_URL,
            "support_email": settings.SUPPORT_EMAIL,
            "current_year": datetime.now().year,
            "language": language,
        })
        
        # Try to load template file
        if self.jinja_env:
            try:
                template_name = f"{email_type.value}_{language}.html"
                template = self.jinja_env.get_template(template_name)
                return template.render(**context)
            except Exception as e:
                logger.warning(f"Template not found: {template_name}, using default")
        
        # Fallback to inline template
        return self._get_default_template(email_type, context, language)
    
    def _get_default_template(
        self,
        email_type: EmailType,
        context: Dict[str, Any],
        language: str
    ) -> str:
        """Get default inline HTML template."""
        user_name = context.get("user_name", "Foydalanuvchi")
        
        # Base HTML structure
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>IshTop</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1f2328; margin: 0; padding: 0; background-color: #eef0f3; }}
                .container {{ max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e6e8ec; box-shadow: 0 8px 30px rgba(16,24,40,0.06); }}
                .header {{ background: #0a0a0b; padding: 38px 30px; text-align: center; }}
                .logo {{ font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; text-decoration: none; }}
                .logo .accent {{ color: #34d399; }}
                .bar {{ height: 3px; background: #10b981; line-height: 3px; font-size: 0; }}
                .content {{ padding: 36px 32px; }}
                .content h2 {{ color: #0a0a0b; font-size: 22px; font-weight: 700; margin: 0 0 12px; }}
                .content p {{ color: #475467; font-size: 15px; margin: 0 0 14px; }}
                .content ul {{ color: #475467; font-size: 15px; padding-left: 20px; margin: 0 0 14px; }}
                .content li {{ margin: 6px 0; }}
                .button {{ display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 34px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; margin: 18px 0; }}
                .footer {{ background: #f7f8fa; padding: 24px; text-align: center; color: #98a2b3; font-size: 12px; border-top: 1px solid #eceef1; }}
                .footer a {{ color: #059669; text-decoration: none; }}
                .info-box {{ background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px 16px; margin: 18px 0; border-radius: 8px; color: #065f46; font-size: 14px; }}
                .warning-box {{ background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 18px 0; border-radius: 8px; color: #92400e; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <span class="logo">Ish<span class="accent">Top</span></span>
                </div>
                <div class="bar"></div>
                <div class="content">
        """
        
        # Add content based on email type
        if email_type == EmailType.WELCOME:
            if language == "ru":
                html += f"""
                    <h2>Добро пожаловать, {user_name}! 🎉</h2>
                    <p>Спасибо за регистрацию в IshTop - платформе для карьеры нового поколения.</p>
                    <p>Теперь вы можете:</p>
                    <ul>
                        <li>✨ Создавать профессиональные резюме с помощью AI</li>
                        <li>🔍 Искать подходящие вакансии</li>
                        <li>📝 Подавать заявки одним кликом</li>
                        <li>📊 Отслеживать статус заявок</li>
                    </ul>
                    <a href="{context.get('dashboard_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Перейти в личный кабинет</a>
                """
            else:
                html += f"""
                    <h2>Xush kelibsiz, {user_name}! 🎉</h2>
                    <p>IshTop ga ro'yxatdan o'tganingiz uchun rahmat - yangi avlod karyera platformasi.</p>
                    <p>Endi siz quyidagilarni qilishingiz mumkin:</p>
                    <ul>
                        <li>✨ AI yordamida professional rezyume yaratish</li>
                        <li>🔍 O'zingizga mos ishlarni qidirish</li>
                        <li>📝 Bir marta bosish bilan ariza berish</li>
                        <li>📊 Arizalar holatini kuzatish</li>
                    </ul>
                    <a href="{context.get('dashboard_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Boshqaruv paneliga o'tish</a>
                """
        
        elif email_type == EmailType.PASSWORD_RESET:
            if language == "ru":
                html += f"""
                    <h2>Сброс пароля</h2>
                    <p>Здравствуйте, {user_name}!</p>
                    <p>Мы получили запрос на сброс пароля для вашего аккаунта.</p>
                    <a href="{context.get('reset_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Сбросить пароль</a>
                    <div class="warning-box">
                        <strong>⚠️ Важно:</strong> Ссылка действительна в течение {context.get('expires_in', '1 час')}.
                        Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
                    </div>
                """
            else:
                html += f"""
                    <h2>Parolni tiklash</h2>
                    <p>Salom, {user_name}!</p>
                    <p>Hisobingiz uchun parolni tiklash so'rovi qabul qilindi.</p>
                    <a href="{context.get('reset_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Parolni tiklash</a>
                    <div class="warning-box">
                        <strong>⚠️ Muhim:</strong> Havola {context.get('expires_in', '1 soat')} davomida amal qiladi.
                        Agar siz parolni tiklashni so'ramagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.
                    </div>
                """
        
        elif email_type == EmailType.PASSWORD_CHANGED:
            if language == "ru":
                html += f"""
                    <h2>Пароль изменен ✅</h2>
                    <p>Здравствуйте, {user_name}!</p>
                    <p>Пароль вашего аккаунта был успешно изменен.</p>
                    <div class="info-box">
                        <strong>🕐 Время изменения:</strong> {context.get('changed_at', 'Только что')}
                    </div>
                    <div class="warning-box">
                        <strong>⚠️ Не вы?</strong> Если вы не меняли пароль, немедленно свяжитесь с нами: {context.get('support_email', 'support@ishtop.uz')}
                    </div>
                """
            else:
                html += f"""
                    <h2>Parol o'zgartirildi ✅</h2>
                    <p>Salom, {user_name}!</p>
                    <p>Hisobingiz paroli muvaffaqiyatli o'zgartirildi.</p>
                    <div class="info-box">
                        <strong>🕐 O'zgartirilgan vaqt:</strong> {context.get('changed_at', 'Hozirgina')}
                    </div>
                    <div class="warning-box">
                        <strong>⚠️ Bu siz emasmidingiz?</strong> Agar parolni o'zgartirmagan bo'lsangiz, darhol biz bilan bog'laning: {context.get('support_email', 'support@ishtop.uz')}
                    </div>
                """
        
        elif email_type == EmailType.LOGIN_NOTIFICATION:
            if language == "ru":
                html += f"""
                    <h2>Новый вход в аккаунт 🔔</h2>
                    <p>Здравствуйте, {user_name}!</p>
                    <p>Обнаружен новый вход в ваш аккаунт:</p>
                    <div class="info-box">
                        <p><strong>🕐 Время:</strong> {context.get('login_time', 'Только что')}</p>
                        <p><strong>🌐 IP-адрес:</strong> {context.get('ip_address', 'Неизвестно')}</p>
                        <p><strong>💻 Устройство:</strong> {context.get('user_agent', 'Неизвестно')[:50]}...</p>
                    </div>
                    <div class="warning-box">
                        <strong>⚠️ Не вы?</strong> <a href="{context.get('security_url', '#')}">Проверьте настройки безопасности</a>
                    </div>
                """
            else:
                html += f"""
                    <h2>Hisobga yangi kirish 🔔</h2>
                    <p>Salom, {user_name}!</p>
                    <p>Hisobingizga yangi kirish aniqlandi:</p>
                    <div class="info-box">
                        <p><strong>🕐 Vaqt:</strong> {context.get('login_time', 'Hozirgina')}</p>
                        <p><strong>🌐 IP manzil:</strong> {context.get("ip_address", "Noma'lum")}</p>
                        <p><strong>💻 Qurilma:</strong> {context.get("user_agent", "Noma'lum")[:50]}...</p>
                    </div>
                    <div class="warning-box">
                        <strong>⚠️ Bu siz emasmidingiz?</strong> <a href="{context.get('security_url', '#')}">Xavfsizlik sozlamalarini tekshiring</a>
                    </div>
                """
        
        elif email_type == EmailType.APPLICATION_STATUS:
            status_colors = {
                "pending": "#f59e0b",
                "reviewing": "#3b82f6",
                "interview": "#8b5cf6",
                "accepted": "#10b981",
                "rejected": "#ef4444",
            }
            status_color = status_colors.get(context.get('new_status', '').lower(), '#666')
            
            if language == "ru":
                html += f"""
                    <h2>Статус заявки обновлен 📋</h2>
                    <p>Здравствуйте, {user_name}!</p>
                    <p>Статус вашей заявки на позицию <strong>{context.get('job_title', 'Вакансия')}</strong> в компании <strong>{context.get('company_name', 'Компания')}</strong> был обновлен:</p>
                    <div style="background: {status_color}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <strong style="font-size: 18px;">{context.get('new_status', 'Обновлено').upper()}</strong>
                    </div>
                    <a href="{context.get('applications_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Посмотреть заявки</a>
                """
            else:
                html += f"""
                    <h2>Ariza holati yangilandi 📋</h2>
                    <p>Salom, {user_name}!</p>
                    <p><strong>{context.get('company_name', 'Kompaniya')}</strong> kompaniyasidagi <strong>{context.get('job_title', 'Vakansiya')}</strong> lavozimiga arizangiz holati yangilandi:</p>
                    <div style="background: {status_color}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <strong style="font-size: 18px;">{context.get('new_status', 'Yangilandi').upper()}</strong>
                    </div>
                    <a href="{context.get('applications_url', '#')}" class="button" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 34px;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0">Arizalarni ko'rish</a>
                """
        
        elif email_type == EmailType.INTERVIEW_SCHEDULED:
            if language == "ru":
                html += f"""
                    <h2>Собеседование назначено! 📅</h2>
                    <p>Поздравляем, {user_name}! 🎉</p>
                    <p>Вы приглашены на собеседование на позицию <strong>{context.get('job_title', 'Вакансия')}</strong> в компании <strong>{context.get('company_name', 'Компания')}</strong>!</p>
                    <div class="info-box">
                        <p><strong>📅 Дата:</strong> {context.get('interview_date', 'TBD')}</p>
                        <p><strong>🕐 Время:</strong> {context.get('interview_time', 'TBD')}</p>
                        <p><strong>📍 Формат:</strong> {context.get('interview_type', 'Online')}</p>
                        {f'<p><strong>🔗 Ссылка:</strong> <a href="{context.get("meeting_link")}">{context.get("meeting_link")}</a></p>' if context.get('meeting_link') else ''}
                    </div>
                    <p>Удачи! 🍀</p>
                """
            else:
                html += f"""
                    <h2>Suhbat belgilandi! 📅</h2>
                    <p>Tabriklaymiz, {user_name}! 🎉</p>
                    <p>Siz <strong>{context.get('company_name', 'Kompaniya')}</strong> kompaniyasidagi <strong>{context.get('job_title', 'Vakansiya')}</strong> lavozimiga suhbatga taklif qilindingiz!</p>
                    <div class="info-box">
                        <p><strong>📅 Sana:</strong> {context.get('interview_date', 'Belgilanmagan')}</p>
                        <p><strong>🕐 Vaqt:</strong> {context.get('interview_time', 'Belgilanmagan')}</p>
                        <p><strong>📍 Format:</strong> {context.get('interview_type', 'Online')}</p>
                        {f'<p><strong>🔗 Havola:</strong> <a href="{context.get("meeting_link")}">{context.get("meeting_link")}</a></p>' if context.get('meeting_link') else ''}
                    </div>
                    <p>Omad tilaymiz! 🍀</p>
                """
        
        else:
            # Generic template
            html += f"""
                <h2>IshTop Bildirishnomasi</h2>
                <p>Salom, {user_name}!</p>
                <p>Sizga IshTop dan bildirishnoma keldi.</p>
            """
        
        # Close HTML
        html += f"""
                </div>
                <div class="footer">
                    <p>© {datetime.now().year} IshTop. Barcha huquqlar himoyalangan.</p>
                    <p>
                        <a href="{settings.FRONTEND_URL}" style="color: #059669;">Veb-sayt</a> |
                        <a href="{settings.FRONTEND_URL}/settings" style="color: #059669;">Sozlamalar</a> |
                        <a href="mailto:{settings.SUPPORT_EMAIL}" style="color: #059669;">Yordam</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _get_role_features(self, role: str, language: str) -> List[str]:
        """Get features list based on role."""
        if role == "company":
            if language == "ru":
                return [
                    "Публикация вакансий",
                    "AI-фильтрация кандидатов",
                    "Управление заявками",
                    "Планирование собеседований",
                ]
            return [
                "Vakansiyalar e'lon qilish",
                "AI yordamida nomzodlarni saralash",
                "Arizalarni boshqarish",
                "Suhbatlarni rejalashtirish",
            ]
        else:
            if language == "ru":
                return [
                    "AI-генерация резюме",
                    "Поиск вакансий",
                    "Автоматическая подача заявок",
                    "Отслеживание статуса",
                ]
            return [
                "AI bilan rezyume yaratish",
                "Ish qidirish",
                "Avtomatik ariza berish",
                "Holat kuzatish",
            ]
    
    async def _send_via_smtp(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_body: str
    ) -> bool:
        """Send email via SMTP."""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
            message["To"] = f"{to_name} <{to_email}>" if to_name else to_email
            
            # Attach HTML
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)
            
            # Send async when the optional dependency is installed.
            if aiosmtplib is not None:
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    username=self.smtp_user,
                    password=self.smtp_password,
                    use_tls=self.smtp_use_tls,
                )
            else:
                await asyncio.to_thread(self._send_via_smtp_sync, message)
            
            return True
            
        except Exception as e:
            logger.exception(f"SMTP error: {e}")
            return False
    
    async def _send_via_sendgrid(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_body: str
    ) -> bool:
        """Send email via SendGrid API."""
        try:
            import httpx
            
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json",
            }
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email, "name": to_name or ""}],
                    "subject": subject,
                }],
                "from": {
                    "email": self.smtp_from_email,
                    "name": self.smtp_from_name,
                },
                "content": [{
                    "type": "text/html",
                    "value": html_body,
                }],
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload)
                return response.status_code in (200, 202)
                
        except Exception as e:
            logger.exception(f"SendGrid error: {e}")
            return False


# =============================================================================
# EMAIL QUEUE (Background Tasks)
# =============================================================================

class EmailQueue:
    """
    Email queue for background sending.
    
    In production, use Celery + Redis.
    For development, uses asyncio.
    """
    
    def __init__(self):
        self.email_service = EmailService()
        self._queue: List[Dict[str, Any]] = []
        self._is_processing = False
    
    async def enqueue(
        self,
        to_email: str,
        email_type: EmailType,
        context: Dict[str, Any],
        language: str = "uz",
        to_name: Optional[str] = None,
        priority: int = 5,  # 1 = highest, 10 = lowest
    ) -> str:
        """
        Add email to queue.
        
        Returns:
            Queue item ID
        """
        import uuid
        
        item_id = str(uuid.uuid4())
        
        self._queue.append({
            "id": item_id,
            "to_email": to_email,
            "email_type": email_type,
            "context": context,
            "language": language,
            "to_name": to_name,
            "priority": priority,
            "created_at": datetime.now(timezone.utc),
            "status": "pending",
            "attempts": 0,
        })
        
        # Sort by priority
        self._queue.sort(key=lambda x: x["priority"])
        
        logger.info(f"Email queued: {item_id} ({email_type.value})")
        
        # Start processing if not already
        if not self._is_processing:
            asyncio.create_task(self._process_queue())
        
        return item_id
    
    async def _process_queue(self):
        """Process queued emails."""
        self._is_processing = True
        
        while self._queue:
            item = self._queue.pop(0)
            
            try:
                success = await self.email_service.send_email(
                    to_email=item["to_email"],
                    email_type=item["email_type"],
                    context=item["context"],
                    language=item["language"],
                    to_name=item["to_name"],
                )
                
                if not success and item["attempts"] < 3:
                    # Retry
                    item["attempts"] += 1
                    item["priority"] += 1  # Lower priority on retry
                    self._queue.append(item)
                    
            except Exception as e:
                logger.exception(f"Queue processing error: {e}")
                
                if item["attempts"] < 3:
                    item["attempts"] += 1
                    self._queue.append(item)
            
            # Small delay between emails
            await asyncio.sleep(0.5)
        
        self._is_processing = False


# =============================================================================
# GLOBAL INSTANCES
# =============================================================================

email_service = EmailService()
email_queue = EmailQueue()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def send_email_background(
    to_email: str,
    email_type: EmailType,
    context: Dict[str, Any],
    language: str = "uz",
    to_name: Optional[str] = None,
) -> str:
    """Send email via background queue."""
    return await email_queue.enqueue(
        to_email=to_email,
        email_type=email_type,
        context=context,
        language=language,
        to_name=to_name,
    )







