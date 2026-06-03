"""
=============================================================================
EMAIL SERVICE UNIT TESTS
=============================================================================

Tests for optional SMTP/SendGrid handling and safe fallback behaviour.
"""

from __future__ import annotations

import asyncio

from app.services import email_service as email_service_module


def test_email_service_uses_stdlib_smtp_fallback_when_aiosmtplib_is_missing(monkeypatch):
    """The SMTP path should still work when aiosmtplib is unavailable."""
    monkeypatch.setattr(email_service_module, "aiosmtplib", None)

    service = email_service_module.EmailService()
    service.email_transport = "smtp"
    service.smtp_host = "smtp.example.com"
    service.smtp_port = 587
    service.smtp_user = "smtp-user"
    service.smtp_password = "smtp-pass"
    service.smtp_use_tls = False

    captured: dict[str, str] = {}

    monkeypatch.setattr(service, "_render_template", lambda *args, **kwargs: "<p>Hello</p>")

    def fake_sync_send(message):
        captured["subject"] = message["Subject"]
        captured["to"] = message["To"]

    monkeypatch.setattr(service, "_send_via_smtp_sync", fake_sync_send)

    result = asyncio.run(
        service.send_email(
            to_email="recipient@example.com",
            email_type=email_service_module.EmailType.WELCOME,
            context={"user_name": "Recipient"},
            language="uz",
            to_name="Recipient",
        )
    )

    assert result is True
    assert "IshTop" in captured["subject"]
    assert captured["to"] == "Recipient <recipient@example.com>"


def test_email_service_skips_delivery_when_unconfigured():
    """Auto mode should not attempt delivery if no provider is configured."""
    service = email_service_module.EmailService()
    service.email_transport = "auto"
    service.sendgrid_api_key = ""
    service.smtp_user = ""
    service.smtp_password = ""

    result = asyncio.run(
        service.send_email(
            to_email="recipient@example.com",
            email_type=email_service_module.EmailType.LOGIN_NOTIFICATION,
            context={
                "user_name": "Recipient",
                "ip_address": "127.0.0.1",
                "user_agent": "pytest",
            },
            language="uz",
            to_name="Recipient",
        )
    )

    assert result is False
