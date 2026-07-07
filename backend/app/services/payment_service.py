"""
=============================================================================
PAYMENT SERVICE - Stripe Integration
=============================================================================

Bu service to'lovlarni boshqaradi:
- Stripe payment integratsiya
- Premium subscription
- Webhook handling
- Payment logging va security

Xususiyatlari:
- Idempotency (double payment prevention)
- Webhook signature verification
- Payment status tracking
- Refund support

AUTHOR: IshTop Team
VERSION: 1.0.0
=============================================================================
"""

import logging
import hmac
import hashlib
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from enum import Enum

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.models.payment import Payment as PaymentModel
from app.models.user import User

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# ENUMS
# =============================================================================

class PaymentProvider(str, Enum):
    """Payment providers."""
    STRIPE = "stripe"
    PAYME = "payme"
    CLICK = "click"


class PaymentStatus(str, Enum):
    """Payment status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class SubscriptionTier(str, Enum):
    """Subscription tiers."""
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


# =============================================================================
# MODELS
# =============================================================================

class PaymentLog(BaseModel):
    """Payment log entry."""
    
    id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Payment info
    provider: PaymentProvider
    provider_payment_id: Optional[str] = None  # Stripe payment_intent_id, etc.
    status: PaymentStatus
    
    # User info
    user_id: str
    user_email: str
    
    # Amount
    amount: int  # in cents
    currency: str = "USD"
    
    # Subscription
    subscription_tier: SubscriptionTier
    subscription_months: int = 1
    
    # Idempotency
    idempotency_key: str
    
    # Metadata
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    
    # Error tracking
    error_message: Optional[str] = None
    error_code: Optional[str] = None


# =============================================================================
# PAYMENT SERVICE
# =============================================================================

class PaymentService:
    """
    Payment processing service.
    
    Supports multiple payment providers with secure handling.
    """
    
    def __init__(self):
        """Initialize payment service."""
        # Stripe
        self.stripe_secret_key = getattr(settings, "STRIPE_SECRET_KEY", "") or ""
        self.stripe_webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "") or ""
        
        # Payme
        self.payme_merchant_id = getattr(settings, "PAYME_MERCHANT_ID", "") or ""
        self.payme_secret_key = getattr(settings, "PAYME_SECRET_KEY", "") or ""
        self.payme_endpoint = getattr(settings, "PAYME_ENDPOINT", "https://checkout.paycom.uz")
        
        # In-memory payment logs (production: database)
        self._payment_logs: Dict[str, PaymentLog] = {}
        
        # Idempotency tracking (production: Redis)
        self._processed_payments: Dict[str, str] = {}  # {idempotency_key: payment_id}
        
        logger.info("PaymentService initialized")
        logger.info(f"Stripe configured: {bool(self.stripe_secret_key)}")
        logger.info(f"Payme configured: {bool(self.payme_merchant_id)}")
    
    # =========================================================================
    # STRIPE INTEGRATION
    # =========================================================================
    
    async def create_stripe_payment_intent(
        self,
        db: Optional[Session],
        user_id: str,
        user_email: str,
        amount: int,
        currency: str,
        subscription_tier: SubscriptionTier,
        subscription_months: int,
        idempotency_key: str,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create Stripe payment intent.
        
        Args:
            user_id: User ID
            user_email: User email
            amount: Amount in cents
            currency: Currency code
            subscription_tier: Subscription tier
            subscription_months: Number of months
            idempotency_key: Unique key to prevent double payment
            ip_address: Client IP
            metadata: Additional metadata
            
        Returns:
            Payment intent data with client_secret
        """
        # Check idempotency (DB preferred)
        if db:
            existing = db.query(PaymentModel).filter(PaymentModel.idempotency_key == idempotency_key).first()
            if existing:
                raise ValueError("Duplicate payment attempt (idempotency_key already used)")
        else:
            if idempotency_key in self._processed_payments:
                existing_payment_id = self._processed_payments[idempotency_key]
                logger.warning(f"Duplicate payment attempt blocked: {idempotency_key}")
                raise ValueError(f"Payment already processed: {existing_payment_id}")
        
        try:
            # Create DB record first (audit trail)
            payment_db_id: Optional[str] = None
            if db:
                payment = PaymentModel(
                    provider=PaymentProvider.STRIPE.value,
                    provider_payment_id=None,
                    status=PaymentStatus.PENDING.value,
                    user_id=UUID(user_id),
                    amount=amount,
                    currency=currency,
                    subscription_tier=subscription_tier.value,
                    subscription_months=subscription_months,
                    idempotency_key=idempotency_key,
                    ip_address=ip_address,
                    user_agent=(metadata or {}).get("user_agent") if metadata else None,
                )
                db.add(payment)
                db.commit()
                db.refresh(payment)
                payment_db_id = str(payment.id)
            
            # Mock implementation for development
            if not self.stripe_secret_key:
                logger.warning("Stripe not configured, using mock payment")
                
                payment_intent_id = f"pi_mock_{uuid4().hex[:16]}"
                client_secret = f"{payment_intent_id}_secret_{uuid4().hex[:16]}"
                
                # Create payment log
                payment_log = PaymentLog(
                    provider=PaymentProvider.STRIPE,
                    provider_payment_id=payment_intent_id,
                    status=PaymentStatus.PENDING,
                    user_id=user_id,
                    user_email=user_email,
                    amount=amount,
                    currency=currency,
                    subscription_tier=subscription_tier,
                    subscription_months=subscription_months,
                    idempotency_key=idempotency_key,
                    ip_address=ip_address,
                    metadata=metadata,
                )
                
                self._payment_logs[payment_log.id] = payment_log
                self._processed_payments[idempotency_key] = payment_log.id

                # Also store in DB if available
                if db and payment_db_id:
                    payment = db.query(PaymentModel).filter(PaymentModel.id == UUID(payment_db_id)).first()
                    if payment:
                        payment.provider_payment_id = payment_intent_id
                        payment.status = PaymentStatus.PENDING.value
                        db.commit()
                
                logger.info(f"Mock payment intent created: {payment_intent_id} for user {user_id}")
                
                return {
                    "payment_id": payment_db_id or payment_log.id,
                    "payment_intent_id": payment_intent_id,
                    "client_secret": client_secret,
                    "status": "requires_payment_method",
                    "amount": amount,
                    "currency": currency,
                }

            # Real Stripe implementation
            import stripe  # type: ignore
            stripe.api_key = self.stripe_secret_key

            stripe_metadata = {
                "user_id": user_id,
                "subscription_tier": subscription_tier.value,
                "subscription_months": str(subscription_months),
            }
            if payment_db_id:
                stripe_metadata["payment_id"] = payment_db_id
            if metadata:
                # Keep it small; Stripe metadata values must be strings
                for k, v in metadata.items():
                    if v is None:
                        continue
                    stripe_metadata[f"meta_{k}"] = str(v)[:200]

            payment_intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency.lower(),
                automatic_payment_methods={"enabled": True},
                metadata=stripe_metadata,
                idempotency_key=idempotency_key,
            )

            payment_intent_id = payment_intent["id"]
            client_secret = payment_intent["client_secret"]

            if db and payment_db_id:
                payment = db.query(PaymentModel).filter(PaymentModel.id == UUID(payment_db_id)).first()
                if payment:
                    payment.provider_payment_id = payment_intent_id
                    payment.status = PaymentStatus.PROCESSING.value
                    db.commit()

            return {
                "payment_id": payment_db_id or (payment_intent_id),
                "payment_intent_id": payment_intent_id,
                "client_secret": client_secret,
                "status": payment_intent.get("status", "requires_payment_method"),
                "amount": amount,
                "currency": currency,
            }
            
        except Exception as e:
            logger.error(f"Failed to create payment intent: {e}")
            
            # Log error
            error_log = PaymentLog(
                provider=PaymentProvider.STRIPE,
                status=PaymentStatus.FAILED,
                user_id=user_id,
                user_email=user_email,
                amount=amount,
                currency=currency,
                subscription_tier=subscription_tier,
                subscription_months=subscription_months,
                idempotency_key=idempotency_key,
                error_message=str(e),
                error_code="PAYMENT_INTENT_CREATION_FAILED",
            )
            self._payment_logs[error_log.id] = error_log
            
            raise
    
    # =========================================================================
    # PAYME INTEGRATION
    # =========================================================================
    
    async def create_payme_payment(
        self,
        db: Optional[Session],
        user_id: str,
        user_email: str,
        amount: int,
        subscription_tier: SubscriptionTier,
        subscription_months: int,
        idempotency_key: str,
        return_url: str,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create Payme payment.
        
        Args:
            user_id: User ID
            user_email: User email
            amount: Amount in tiyin (UZS cents)
            subscription_tier: Subscription tier
            subscription_months: Number of months
            idempotency_key: Unique key
            return_url: URL to return after payment
            ip_address: Client IP
            metadata: Additional metadata
            
        Returns:
            Payment URL and payment ID
        """
        # Check idempotency
        if db:
            existing = db.query(PaymentModel).filter(PaymentModel.idempotency_key == idempotency_key).first()
            if existing:
                raise ValueError("Duplicate payment attempt (idempotency_key already used)")
        else:
            if idempotency_key in self._processed_payments:
                raise ValueError("Payment already processed")
        
        try:
            # Create DB record
            payment_db_id: Optional[str] = None
            if db:
                payment = PaymentModel(
                    provider=PaymentProvider.PAYME.value,
                    provider_payment_id=None,
                    status=PaymentStatus.PENDING.value,
                    user_id=UUID(user_id),
                    amount=amount,
                    currency="UZS",
                    subscription_tier=subscription_tier.value,
                    subscription_months=subscription_months,
                    idempotency_key=idempotency_key,
                    ip_address=ip_address,
                    user_agent=(metadata or {}).get("user_agent") if metadata else None,
                )
                db.add(payment)
                db.commit()
                db.refresh(payment)
                payment_db_id = str(payment.id)
            
            # Mock implementation for development
            if not self.payme_merchant_id:
                logger.warning("Payme not configured, using mock payment")
                
                payment_id = f"payme_mock_{uuid4().hex[:16]}"
                payment_url = f"{return_url}?payment_id={payment_id}&status=success"
                
                payment_log = PaymentLog(
                    provider=PaymentProvider.PAYME,
                    provider_payment_id=payment_id,
                    status=PaymentStatus.PENDING,
                    user_id=user_id,
                    user_email=user_email,
                    amount=amount,
                    currency="UZS",
                    subscription_tier=subscription_tier,
                    subscription_months=subscription_months,
                    idempotency_key=idempotency_key,
                    ip_address=ip_address,
                    metadata=metadata,
                )
                
                self._payment_logs[payment_log.id] = payment_log
                self._processed_payments[idempotency_key] = payment_log.id
                
                if db and payment_db_id:
                    payment = db.query(PaymentModel).filter(PaymentModel.id == UUID(payment_db_id)).first()
                    if payment:
                        payment.provider_payment_id = payment_id
                        db.commit()
                
                logger.info(f"Mock Payme payment created: {payment_id}")
                
                return {
                    "payment_id": payment_db_id or payment_log.id,
                    "payment_url": payment_url,
                    "provider": "payme",
                    "amount": amount,
                    "currency": "UZS",
                }
            
            # Real Payme implementation
            import base64
            
            # Payme uses base64-encoded merchant ID and account in URL
            # Format: m={merchant_id};ac.{account_key}={account_value};a={amount};c={return_url}
            account_data = {
                "user_id": user_id,
                "payment_id": payment_db_id or idempotency_key,
                "subscription_tier": subscription_tier.value,
                "subscription_months": str(subscription_months),
            }
            
            # Encode account data
            account_str = ";".join([f"ac.{k}={v}" for k, v in account_data.items()])
            
            # Build Payme URL
            payme_url = (
                f"{self.payme_endpoint}/"
                f"?m={self.payme_merchant_id}"
                f";{account_str}"
                f";a={amount}"
                f";c={return_url}"
            )
            
            if db and payment_db_id:
                payment = db.query(PaymentModel).filter(PaymentModel.id == UUID(payment_db_id)).first()
                if payment:
                    payment.provider_payment_id = payment_db_id  # Use our ID for Payme
                    payment.status = PaymentStatus.PENDING.value
                    db.commit()
            
            logger.info(f"Payme payment created: {payment_db_id}")
            
            return {
                "payment_id": payment_db_id or idempotency_key,
                "payment_url": payme_url,
                "provider": "payme",
                "amount": amount,
                "currency": "UZS",
            }
            
        except Exception as e:
            logger.error(f"Failed to create Payme payment: {e}")
            
            error_log = PaymentLog(
                provider=PaymentProvider.PAYME,
                status=PaymentStatus.FAILED,
                user_id=user_id,
                user_email=user_email,
                amount=amount,
                currency="UZS",
                subscription_tier=subscription_tier,
                subscription_months=subscription_months,
                idempotency_key=idempotency_key,
                error_message=str(e),
                error_code="PAYME_PAYMENT_CREATION_FAILED",
            )
            self._payment_logs[error_log.id] = error_log
            
            raise
    
    async def handle_payme_webhook(
        self,
        db: Optional[Session],
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Handle Payme webhook callback.
        
        Payme uses JSON-RPC 2.0 protocol.
        
        Methods:
        - CheckPerformTransaction: Check if transaction can be performed
        - CreateTransaction: Create transaction
        - PerformTransaction: Perform transaction (complete payment)
        - CancelTransaction: Cancel transaction
        - CheckTransaction: Check transaction status
        
        Args:
            payload: Webhook payload (JSON-RPC request)
            
        Returns:
            JSON-RPC response
        """
        try:
            method = payload.get("method")
            params = payload.get("params", {})
            
            logger.info(f"Payme webhook received: {method}")
            
            # Authenticate request (check password from Authorization header)
            # This should be done in the endpoint, not here
            
            # Handle different methods
            if method == "CheckPerformTransaction":
                return await self._payme_check_perform_transaction(db, params)
            
            elif method == "CreateTransaction":
                return await self._payme_create_transaction(db, params)
            
            elif method == "PerformTransaction":
                return await self._payme_perform_transaction(db, params)
            
            elif method == "CancelTransaction":
                return await self._payme_cancel_transaction(db, params)
            
            elif method == "CheckTransaction":
                return await self._payme_check_transaction(db, params)
            
            else:
                logger.warning(f"Unknown Payme method: {method}")
                return {
                    "error": {
                        "code": -32601,
                        "message": "Method not found",
                    }
                }
                
        except Exception as e:
            logger.exception(f"Payme webhook error: {e}")
            return {
                "error": {
                    "code": -32400,
                    "message": str(e),
                }
            }
    
    async def _payme_check_perform_transaction(self, db: Optional[Session], params: Dict[str, Any]) -> Dict[str, Any]:
        """Check if transaction can be performed."""
        account = params.get("account", {})
        amount = params.get("amount", 0)
        
        user_id = account.get("user_id")
        payment_id = account.get("payment_id")
        
        # Validate amount and user
        if not user_id:
            return {"error": {"code": -31050, "message": "User not found"}}
        
        # Check user exists
        if db:
            user = db.query(User).filter(User.id == UUID(user_id), User.is_deleted == False).first()
            if not user:
                return {"error": {"code": -31050, "message": "User not found"}}
        
        # Success - allow transaction
        return {"result": {"allow": True}}
    
    async def _payme_create_transaction(self, db: Optional[Session], params: Dict[str, Any]) -> Dict[str, Any]:
        """Create transaction."""
        transaction_id = params.get("id")
        account = params.get("account", {})
        amount = params.get("amount", 0)
        time = params.get("time")
        
        payment_id = account.get("payment_id")
        
        # Update payment status to PROCESSING
        if db and payment_id:
            payment = db.query(PaymentModel).filter(PaymentModel.id == UUID(payment_id)).first()
            if payment:
                payment.status = PaymentStatus.PROCESSING.value
                payment.provider_payment_id = str(transaction_id)
                db.commit()
        
        # Return transaction details
        return {
            "result": {
                "create_time": time,
                "transaction": str(transaction_id),
                "state": 1,  # 1 = created
            }
        }
    
    async def _payme_perform_transaction(self, db: Optional[Session], params: Dict[str, Any]) -> Dict[str, Any]:
        """Perform transaction (complete payment)."""
        transaction_id = params.get("id")
        
        # Find payment by provider_payment_id
        if db:
            payment = db.query(PaymentModel).filter(
                PaymentModel.provider_payment_id == str(transaction_id)
            ).first()
            
            if payment:
                # Update payment status
                payment.status = PaymentStatus.COMPLETED.value
                db.add(payment)
                
                # Update user subscription
                user = db.query(User).filter(User.id == payment.user_id, User.is_deleted == False).first()
                if user:
                    now = datetime.now(timezone.utc)
                    base = getattr(user, "subscription_expires_at", None)
                    if base and base > now:
                        user.subscription_expires_at = base + timedelta(days=30 * payment.subscription_months)
                    else:
                        user.subscription_expires_at = now + timedelta(days=30 * payment.subscription_months)
                    user.subscription_tier = payment.subscription_tier
                    db.add(user)
                
                db.commit()
                
                logger.info(f"Payme payment completed: {transaction_id} for user {payment.user_id}")
        
        # Return success
        return {
            "result": {
                "transaction": str(transaction_id),
                "perform_time": int(datetime.now(timezone.utc).timestamp() * 1000),
                "state": 2,  # 2 = completed
            }
        }
    
    async def _payme_cancel_transaction(self, db: Optional[Session], params: Dict[str, Any]) -> Dict[str, Any]:
        """Cancel transaction."""
        transaction_id = params.get("id")
        reason = params.get("reason")
        
        if db:
            payment = db.query(PaymentModel).filter(
                PaymentModel.provider_payment_id == str(transaction_id)
            ).first()
            
            if payment:
                payment.status = PaymentStatus.CANCELLED.value
                payment.error_message = f"Cancelled by Payme. Reason: {reason}"
                db.commit()
                
                logger.info(f"Payme payment cancelled: {transaction_id}")
        
        return {
            "result": {
                "transaction": str(transaction_id),
                "cancel_time": int(datetime.now(timezone.utc).timestamp() * 1000),
                "state": -1,  # -1 = cancelled
            }
        }
    
    async def _payme_check_transaction(self, db: Optional[Session], params: Dict[str, Any]) -> Dict[str, Any]:
        """Check transaction status."""
        transaction_id = params.get("id")
        
        if db:
            payment = db.query(PaymentModel).filter(
                PaymentModel.provider_payment_id == str(transaction_id)
            ).first()
            
            if payment:
                # Map payment status to Payme state
                state_map = {
                    PaymentStatus.PENDING.value: 0,
                    PaymentStatus.PROCESSING.value: 1,
                    PaymentStatus.COMPLETED.value: 2,
                    PaymentStatus.CANCELLED.value: -1,
                    PaymentStatus.FAILED.value: -2,
                }
                
                state = state_map.get(payment.status, 0)
                
                return {
                    "result": {
                        "create_time": int(payment.created_at.timestamp() * 1000) if payment.created_at else 0,
                        "perform_time": 0 if state != 2 else int(payment.updated_at.timestamp() * 1000) if payment.updated_at else 0,
                        "cancel_time": 0,
                        "transaction": str(transaction_id),
                        "state": state,
                        "reason": None,
                    }
                }
        
        # Transaction not found
        return {
            "error": {
                "code": -31003,
                "message": "Transaction not found",
            }
        }
    
    async def handle_stripe_webhook(
        self,
        db: Optional[Session],
        payload: bytes,
        signature: str,
    ) -> Dict[str, Any]:
        """
        Handle Stripe webhook event.
        
        Verifies signature and processes event.
        
        Args:
            payload: Webhook payload (raw bytes)
            signature: Stripe signature header
            
        Returns:
            Processing result
        """
        try:
            event = self._parse_stripe_event(payload, signature)

            event_type = event.get("type")
            event_data = event.get("data", {}).get("object", {})

            logger.info(f"Stripe webhook received: {event_type}")

            # Handle different event types
            if event_type == 'payment_intent.succeeded':
                return await self._handle_payment_success(db, event_data)

            elif event_type == 'checkout.session.completed':
                if event_data.get("payment_status") not in {"paid", "no_payment_required"}:
                    logger.info(
                        "Checkout session completed but not paid yet: %s",
                        event_data.get("id"),
                    )
                    return {
                        "status": "ignored",
                        "event_type": event_type,
                        "reason": "session_not_paid",
                    }
                normalized_payment = self._normalize_checkout_session(event_data)
                return await self._handle_payment_success(db, normalized_payment)

            elif event_type == 'payment_intent.payment_failed':
                return await self._handle_payment_failure(db, event_data)

            elif event_type == 'charge.refunded':
                return await self._handle_refund(db, event_data)
            
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return {"status": "ignored", "event_type": event_type}
            
        except Exception as e:
            logger.exception(f"Webhook processing error: {e}")
            raise

    def _parse_stripe_event(self, payload: bytes, signature: str) -> Dict[str, Any]:
        """
        Parse and verify a Stripe webhook payload.

        Uses Stripe SDK verification when the package and secret are available.
        Falls back to the local HMAC verifier for development and tests.
        """
        if not self.stripe_webhook_secret:
            if settings.PAYMENTS_REQUIRE_WEBHOOK_SECRET and not settings.DEBUG:
                raise ValueError("Stripe webhook secret not configured")

            if not self._verify_stripe_signature(payload, signature):
                raise ValueError("Invalid signature")
            return json.loads(payload.decode("utf-8"))

        try:
            import stripe  # type: ignore
            return stripe.Webhook.construct_event(payload, signature, self.stripe_webhook_secret)
        except Exception as exc:
            logger.warning(
                "Stripe SDK webhook verification failed, using local verifier fallback: %s",
                exc,
            )
            if not self._verify_stripe_signature(payload, signature):
                logger.error("Invalid Stripe webhook signature")
                raise ValueError("Invalid signature")
            return json.loads(payload.decode("utf-8"))

    def _normalize_checkout_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert a checkout.session.completed payload into a payment_intent-like object.

        This lets the same activation logic work for both Stripe PaymentIntent and
        Checkout Session flows.
        """
        metadata = session_data.get("metadata") or {}
        payment_intent_id = session_data.get("payment_intent") or session_data.get("id")
        amount = session_data.get("amount_total") or session_data.get("amount_subtotal") or 0

        return {
            "id": payment_intent_id,
            "amount": amount,
            "metadata": metadata,
            "checkout_session_id": session_data.get("id"),
        }
    
    def _verify_stripe_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Stripe webhook signature.
        
        Critical security measure to prevent fake webhooks.
        """
        if not self.stripe_webhook_secret:
            logger.error("Stripe webhook secret not configured — rejecting webhook")
            return False
        
        try:
            # Extract timestamp and signature
            parts = signature.split(',')
            timestamp = None
            signatures = []
            
            for part in parts:
                if part.startswith('t='):
                    timestamp = part[2:]
                elif part.startswith('v1='):
                    signatures.append(part[3:])
            
            if not timestamp or not signatures:
                return False
            
            # Create signed payload
            signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
            
            # Compute expected signature
            expected_signature = hmac.new(
                self.stripe_webhook_secret.encode('utf-8'),
                signed_payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Compare
            return any(
                hmac.compare_digest(expected_signature, sig)
                for sig in signatures
            )
            
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False
    
    async def _handle_payment_success(self, db: Optional[Session], payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle successful payment."""
        payment_intent_id = payment_data.get('id')
        amount = payment_data.get('amount')
        metadata = payment_data.get('metadata', {})
        
        payment_record = None
        payment_id = metadata.get("payment_id") or payment_data.get("payment_id")
        if db:
            if payment_id:
                try:
                    payment_record = db.query(PaymentModel).filter(PaymentModel.id == UUID(str(payment_id))).first()
                except Exception:
                    payment_record = None
            if not payment_record and payment_intent_id:
                payment_record = db.query(PaymentModel).filter(
                    PaymentModel.provider_payment_id == str(payment_intent_id)
                ).first()

        user_id = metadata.get('user_id')
        if not user_id and payment_record:
            user_id = str(payment_record.user_id)

        subscription_tier = metadata.get('subscription_tier')
        if not subscription_tier and payment_record:
            subscription_tier = payment_record.subscription_tier
        subscription_tier = subscription_tier or 'premium'

        subscription_months = metadata.get("subscription_months")
        if subscription_months is None and payment_record:
            subscription_months = payment_record.subscription_months
        subscription_months = int(subscription_months or 1)
        
        logger.info(f"Payment succeeded: {payment_intent_id} for user {user_id}")
        
        # Update payment log
        for payment_log in self._payment_logs.values():
            if payment_log.provider_payment_id == payment_intent_id:
                payment_log.status = PaymentStatus.COMPLETED
                break

        # Update DB payment + user subscription (production)
        if db and user_id:
            payment = payment_record
            if payment:
                payment.status = PaymentStatus.COMPLETED.value
                if payment_intent_id:
                    payment.provider_payment_id = str(payment_intent_id)
                db.add(payment)
            user = db.query(User).filter(User.id == UUID(str(user_id)), User.is_deleted == False).first()
            if user:
                now = datetime.now(timezone.utc)
                base = user.subscription_expires_at if getattr(user, "subscription_expires_at", None) and user.subscription_expires_at > now else now
                user.subscription_tier = subscription_tier
                user.subscription_expires_at = base + timedelta(days=30 * subscription_months)
                db.add(user)
            db.commit()
        
        # Here you would:
        # 1. Update user's subscription status in database
        # 2. Send confirmation email
        # 3. Log to analytics
        
        return {
            "status": "success",
            "payment_intent_id": payment_intent_id,
            "user_id": user_id,
        }
    
    async def _handle_payment_failure(self, db: Optional[Session], payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle failed payment."""
        payment_intent_id = payment_data.get('id')
        error = payment_data.get('last_payment_error', {})
        
        logger.error(f"Payment failed: {payment_intent_id} - {error}")
        
        # Update payment log
        for payment_log in self._payment_logs.values():
            if payment_log.provider_payment_id == payment_intent_id:
                payment_log.status = PaymentStatus.FAILED
                payment_log.error_message = error.get('message')
                payment_log.error_code = error.get('code')
                break

        if db:
            payment = db.query(PaymentModel).filter(PaymentModel.provider_payment_id == payment_intent_id).first()
            if payment:
                payment.status = PaymentStatus.FAILED.value
                payment.error_message = error.get("message")
                payment.error_code = error.get("code")
                db.commit()
        
        return {
            "status": "failed",
            "payment_intent_id": payment_intent_id,
            "error": error,
        }
    
    async def _handle_refund(self, db: Optional[Session], charge_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle refund."""
        charge_id = charge_data.get('id')
        amount_refunded = charge_data.get('amount_refunded')
        
        logger.info(f"Refund processed: {charge_id} - ${amount_refunded/100:.2f}")
        
        # Update payment log
        for payment_log in self._payment_logs.values():
            if payment_log.provider_payment_id == charge_id:
                payment_log.status = PaymentStatus.REFUNDED
                break

        if db:
            payment = db.query(PaymentModel).filter(PaymentModel.provider_payment_id == charge_id).first()
            if payment:
                payment.status = PaymentStatus.REFUNDED.value
                db.commit()
        
        return {
            "status": "refunded",
            "charge_id": charge_id,
            "amount_refunded": amount_refunded,
        }
    
    # =========================================================================
    # QUERY METHODS
    # =========================================================================
    
    def get_payment_logs(
        self,
        user_id: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        limit: int = 100,
    ) -> list[PaymentLog]:
        """Get payment logs with filters."""
        logs = list(self._payment_logs.values())
        
        if user_id:
            logs = [log for log in logs if log.user_id == user_id]
        
        if status:
            logs = [log for log in logs if log.status == status]
        
        # Sort by created_at (newest first)
        logs.sort(key=lambda x: x.created_at, reverse=True)
        
        return logs[:limit]
    
    def get_payment_by_id(self, payment_id: str) -> Optional[PaymentLog]:
        """Get payment log by ID."""
        return self._payment_logs.get(payment_id)


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

payment_service = PaymentService()


# =============================================================================
# SUBSCRIPTION PRICING
# =============================================================================

SUBSCRIPTION_PRICING = {
    SubscriptionTier.PREMIUM: {
        # Public price is 25 000 so'm/oy (250 000 so'm/yil). UZS is the primary
        # currency; USD kept only as a rough fallback for card rails.
        "monthly": 200,  # ~$2.00 in cents
        "yearly": 2000,  # ~$20.00
        "monthly_uzs": 25000,  # 25 000 so'm
        "yearly_uzs": 250000,  # 250 000 so'm (2 oy tejab)
        "features": [
            "Unlimited AI resume generation",
            "Auto-apply to 50 jobs/month",
            "Priority job matching",
            "Advanced analytics dashboard",
            "Premium templates",
            "Email & chat support",
        ],
    },
    SubscriptionTier.ENTERPRISE: {
        "price": "custom",  # Kelishuv asosida
        "contact": "enterprise@ishtop.uz",
        "features": [
            "Everything in Premium",
            "Unlimited auto-apply",
            "Team management (up to 50 users)",
            "Custom branding",
            "API access",
            "Dedicated account manager",
            "Priority support (24/7)",
            "SLA guarantee",
            "Custom integrations",
        ],
    },
}


def get_subscription_price(tier: SubscriptionTier, months: int = 1, currency: str = "USD") -> int:
    """
    Get subscription price in cents (USD) or tiyin (UZS).
    
    Args:
        tier: Subscription tier
        months: Number of months (1 or 12)
        currency: "USD" or "UZS"
        
    Returns:
        Price in cents (USD) or tiyin (UZS)
    """
    pricing = SUBSCRIPTION_PRICING.get(tier, {})
    
    # Enterprise is custom pricing
    if tier == SubscriptionTier.ENTERPRISE:
        return 0
    
    # USD pricing
    if currency == "USD":
        if months == 1:
            return pricing.get("monthly", 0)
        elif months == 12:
            return pricing.get("yearly", pricing.get("monthly", 0) * 12)
        else:
            # Custom duration (multiply monthly)
            return pricing.get("monthly", 0) * months
    
    # UZS pricing (for Payme/Click)
    elif currency == "UZS":
        if months == 1:
            return pricing.get("monthly_uzs", 0)
        elif months == 12:
            return pricing.get("yearly_uzs", pricing.get("monthly_uzs", 0) * 12)
        else:
            # Custom duration
            return pricing.get("monthly_uzs", 0) * months
    
    return 0







