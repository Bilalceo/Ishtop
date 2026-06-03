"""
=============================================================================
PAYMENT MODEL
=============================================================================

Purpose:
  Persist payment attempts + webhook updates in the database so we can:
  - prevent double payments (unique idempotency key)
  - build audit trail (who paid, how much, when)
  - safely grant premium only after VERIFIED webhook success
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class PaymentProvider(str, Enum):
    STRIPE = "stripe"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"

    # Provider details
    provider = Column(String(20), nullable=False)
    provider_payment_id = Column(String(255), nullable=True, index=True)  # e.g. Stripe payment_intent id

    # Status
    status = Column(String(20), nullable=False, index=True)

    # User
    user_id = Column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user = relationship("User", back_populates="payments")

    # Amount
    amount = Column(Integer, nullable=False)  # cents
    currency = Column(String(10), nullable=False, default="USD")

    # Subscription
    subscription_tier = Column(String(20), nullable=False, default=SubscriptionTier.FREE.value, index=True)
    subscription_months = Column(Integer, nullable=False, default=1)

    # Idempotency (double-payment protection)
    idempotency_key = Column(String(255), nullable=False, unique=True, index=True)

    # Diagnostics / audit
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Error info
    error_message = Column(String(1000), nullable=True)
    error_code = Column(String(255), nullable=True)

    __table_args__ = (
        Index("idx_payments_user_created", "user_id", "created_at"),
    )


