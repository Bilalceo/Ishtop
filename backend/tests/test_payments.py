"""
=============================================================================
Payment Tests
=============================================================================

Tests for payment system:
- Payment intent creation
- Webhook handling
- Double payment prevention
- Security

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import pytest
import hmac
import hashlib
import json
from datetime import datetime, timezone, timedelta
from fastapi import status
from fastapi.testclient import TestClient

from app.config import settings
from app.models import User
from app.models.payment import Payment as PaymentModel
from app.services.payment_service import payment_service, SubscriptionTier


# =============================================================================
# PAYMENT INTENT TESTS
# =============================================================================

@pytest.mark.payment
def test_create_payment_intent_success(client: TestClient, student_headers: dict):
    """Test successful payment intent creation."""
    response = client.post(
        "/api/v1/payments/create-payment-intent",
        headers=student_headers,
        json={
            "subscription_tier": "premium",
            "subscription_months": 1,
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert "client_secret" in data
    assert data["amount"] == 200  # $2.00 in cents (25 000 so'm/oy)
    assert data["subscription_tier"] == "premium"


@pytest.mark.payment
def test_create_payment_intent_quarterly(client: TestClient, student_headers: dict):
    """Test quarterly subscription payment."""
    response = client.post(
        "/api/v1/payments/create-payment-intent",
        headers=student_headers,
        json={
            "subscription_tier": "premium",
            "subscription_months": 3,
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["amount"] == 600  # 3 months * $2.00


@pytest.mark.payment
def test_create_payment_intent_yearly(client: TestClient, student_headers: dict):
    """Test yearly subscription payment."""
    response = client.post(
        "/api/v1/payments/create-payment-intent",
        headers=student_headers,
        json={
            "subscription_tier": "premium",
            "subscription_months": 12,
        }
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["amount"] == 2000  # yearly plan (~$20)


@pytest.mark.payment
def test_create_payment_intent_invalid_tier(client: TestClient, student_headers: dict):
    """Test payment intent with invalid tier."""
    response = client.post(
        "/api/v1/payments/create-payment-intent",
        headers=student_headers,
        json={
            "subscription_tier": "invalid_tier",
            "subscription_months": 1,
        }
    )
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.payment
def test_create_payment_intent_without_auth(client: TestClient):
    """Test payment intent without authentication."""
    response = client.post(
        "/api/v1/payments/create-payment-intent",
        json={
            "subscription_tier": "premium",
            "subscription_months": 1,
        }
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# IDEMPOTENCY TESTS (DOUBLE PAYMENT PREVENTION)
# =============================================================================

@pytest.mark.payment
@pytest.mark.unit
@pytest.mark.asyncio
async def test_double_payment_prevention():
    """Test that duplicate payment is prevented."""
    from app.services.payment_service import PaymentService
    
    service = PaymentService()
    
    # Create first payment
    payment1 = await service.create_stripe_payment_intent(
        db=None,
        user_id="test-user-1",
        user_email="test@example.com",
        amount=999,
        currency="USD",
        subscription_tier=SubscriptionTier.PREMIUM,
        subscription_months=1,
        idempotency_key="unique-key-123",
    )
    
    # Try to create duplicate payment with same idempotency key
    with pytest.raises(ValueError, match="Payment already processed"):
        await service.create_stripe_payment_intent(
            db=None,
            user_id="test-user-1",
            user_email="test@example.com",
            amount=999,
            currency="USD",
            subscription_tier=SubscriptionTier.PREMIUM,
            subscription_months=1,
            idempotency_key="unique-key-123",  # Same key!
        )


# =============================================================================
# WEBHOOK TESTS
# =============================================================================

def _build_stripe_signature(payload: bytes, secret: str, timestamp: int | None = None) -> str:
    if timestamp is None:
        timestamp = int(datetime.now(timezone.utc).timestamp())
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    digest = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={digest}"


@pytest.mark.payment
@pytest.mark.slow
def test_webhook_payment_succeeded_updates_subscription(
    client: TestClient,
    test_db,
    monkeypatch: pytest.MonkeyPatch,
    test_student: User,
):
    """Test Stripe webhook success updates payment + user subscription."""
    secret = "whsec_test_secret_123"
    payment_service.stripe_webhook_secret = secret
    monkeypatch.setattr(settings, "DEBUG", False, raising=False)
    monkeypatch.setattr(settings, "PAYMENTS_REQUIRE_WEBHOOK_SECRET", True, raising=False)

    payment = PaymentModel(
        provider="stripe",
        provider_payment_id="pi_test_123",
        status="processing",
        user_id=test_student.id,
        amount=1200,
        currency="USD",
        subscription_tier="premium",
        subscription_months=3,
        idempotency_key="stripe-webhook-test-key",
    )
    test_db.add(payment)
    test_db.commit()
    test_db.refresh(payment)

    previous_expiry = test_student.subscription_expires_at

    event = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_123",
                "amount": 1200,
                "metadata": {
                    "user_id": str(test_student.id),
                    "payment_id": str(payment.id),
                    "subscription_tier": "premium",
                    "subscription_months": "3",
                },
            }
        },
    }

    payload = json.dumps(event).encode("utf-8")
    signature = _build_stripe_signature(payload, secret)

    response = client.post(
        "/api/v1/payments/webhook/stripe",
        content=payload,
        headers={"stripe-signature": signature},
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["result"]["status"] == "success"

    test_db.refresh(payment)
    test_db.refresh(test_student)
    assert payment.status == "completed"
    assert payment.provider_payment_id == "pi_test_123"
    assert test_student.subscription_tier == "premium"
    assert test_student.subscription_expires_at is not None
    if previous_expiry is not None:
        assert test_student.subscription_expires_at > previous_expiry
    assert test_student.subscription_expires_at > datetime.now(timezone.utc)


@pytest.mark.payment
def test_webhook_invalid_signature_rejected(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """Test webhook with invalid signature fails."""
    payment_service.stripe_webhook_secret = "whsec_test_secret_123"
    monkeypatch.setattr(settings, "DEBUG", False, raising=False)
    monkeypatch.setattr(settings, "PAYMENTS_REQUIRE_WEBHOOK_SECRET", True, raising=False)

    event = {"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_test_123"}}}
    payload = json.dumps(event).encode("utf-8")

    response = client.post(
        "/api/v1/payments/webhook/stripe",
        content=payload,
        headers={"stripe-signature": "t=1234567890,v1=invalid"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# PAYMENT HISTORY TESTS
# =============================================================================

@pytest.mark.payment
def test_get_my_payments(client: TestClient, student_headers: dict):
    """Test getting payment history."""
    response = client.get(
        "/api/v1/payments/my-payments",
        headers=student_headers
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "payments" in data
    assert "total" in data


@pytest.mark.payment
def test_get_my_payments_without_auth(client: TestClient):
    """Test getting payment history without auth."""
    response = client.get("/api/v1/payments/my-payments")
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# =============================================================================
# PRICING TESTS
# =============================================================================

@pytest.mark.payment
@pytest.mark.unit
def test_get_pricing(client: TestClient):
    """Test getting subscription pricing."""
    response = client.get("/api/v1/payments/pricing")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "pricing" in data
    assert "premium" in data["pricing"]
    assert "enterprise" in data["pricing"]
    
    # Verify premium pricing
    premium = data["pricing"]["premium"]
    assert premium["monthly"] == 200
    assert "features" in premium


# =============================================================================
# PAYMENT LOGGING TESTS
# =============================================================================

@pytest.mark.payment
@pytest.mark.unit
@pytest.mark.asyncio
async def test_payment_log_created():
    """Test that payment attempts are logged."""
    from app.services.payment_service import PaymentService
    
    service = PaymentService()
    
    # Create payment
    payment = await service.create_stripe_payment_intent(
        db=None,
        user_id="test-user-1",
        user_email="test@example.com",
        amount=999,
        currency="USD",
        subscription_tier=SubscriptionTier.PREMIUM,
        subscription_months=1,
        idempotency_key="log-test-key",
        ip_address="192.168.1.1",
    )
    
    # Verify payment was logged
    payment_log = service.get_payment_by_id(payment["payment_id"])
    assert payment_log is not None
    assert payment_log.user_email == "test@example.com"
    assert payment_log.amount == 999
    assert payment_log.ip_address == "192.168.1.1"


@pytest.mark.payment
@pytest.mark.unit
def test_payment_logs_query():
    """Test querying payment logs."""
    from app.services.payment_service import PaymentService, PaymentStatus
    
    service = PaymentService()
    
    # Get all logs
    all_logs = service.get_payment_logs()
    assert isinstance(all_logs, list)
    
    # Filter by user
    user_logs = service.get_payment_logs(user_id="test-user-1")
    assert all(log.user_id == "test-user-1" for log in user_logs)
    
    # Filter by status
    pending_logs = service.get_payment_logs(status=PaymentStatus.PENDING)
    assert all(log.status == PaymentStatus.PENDING for log in pending_logs)




