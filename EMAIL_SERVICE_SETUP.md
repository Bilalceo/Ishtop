# 📧 EMAIL SERVICE SETUP GUIDE

**For Production Deployment**  
**Auto-generated:** 2026-01-19

---

## 🎯 WHY EMAIL SERVICE?

**Required for:**
- ✅ Email verification
- ✅ Password reset
- ✅ Welcome emails
- ✅ Application notifications
- ✅ Payment confirmations
- ✅ Marketing (optional)

**Without email:** Platform won't work properly! ⚠️

---

## 🏆 RECOMMENDED: SendGrid

**Why SendGrid:**
- Free tier: 100 emails/day
- Easy setup: 15 minutes
- Reliable delivery
- Good dashboard
- Professional templates

### SendGrid Setup (Step-by-Step):

#### 1. Create Account
```
1. Go to: https://sendgrid.com
2. Sign up (Free plan)
3. Verify your email
4. Complete profile
```

#### 2. Verify Domain (Optional but recommended)
```
1. Dashboard → Settings → Sender Authentication
2. Click "Authenticate Your Domain"
3. Add DNS records to your domain
4. Wait for verification (5-10 min)
```

#### 3. Create API Key
```
1. Settings → API Keys
2. Click "Create API Key"
3. Name: "IshTop Production"
4. Permissions: "Full Access"
5. Click "Create & View"
6. COPY THE KEY (you won't see it again!)
```

#### 4. Add to Environment
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=IshTop
```

#### 5. Test Email
```python
# Test script
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

message = Mail(
    from_email='noreply@yourdomain.com',
    to_emails='your-email@example.com',
    subject='Test Email from IshTop',
    html_content='<strong>Success!</strong> Email service is working!'
)

sg = SendGridAPIClient(api_key='YOUR_SENDGRID_API_KEY')
response = sg.send(message)
print(f"Status: {response.status_code}")
```

---

## 🔄 ALTERNATIVE 1: Mailgun

**Good for:** Higher volume, better international delivery

### Setup:
```
1. Go to: https://mailgun.com
2. Sign up (Free: 5,000 emails/month for 3 months)
3. Add domain
4. Get API key from: Settings → API Keys
5. Add to .env:
   MAILGUN_API_KEY=your-key
   MAILGUN_DOMAIN=mg.yourdomain.com
```

---

## 🔄 ALTERNATIVE 2: Gmail SMTP

**Good for:** Development, small scale  
**Bad for:** Production (limited, can be blocked)

### Setup:
```
1. Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password:
   - Security → App passwords
   - Select app: Mail
   - Select device: Other
   - Name: IshTop
   - Generate

4. Add to .env:
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_USERNAME=your-email@gmail.com
   EMAIL_PASSWORD=generated-app-password
```

**Limits:** 500 emails/day

---

## 📝 EMAIL TEMPLATES

### Create Templates (SendGrid):

#### 1. Verification Email
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        .button {
            background-color: #8b5cf6;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
        }
    </style>
</head>
<body>
    <h2>Welcome to IshTop!</h2>
    <p>Please verify your email address:</p>
    <a href="{{verification_link}}" class="button">Verify Email</a>
    <p>Or copy this link: {{verification_link}}</p>
</body>
</html>
```

#### 2. Password Reset
```html
<!DOCTYPE html>
<html>
<body>
    <h2>Password Reset Request</h2>
    <p>Click the button below to reset your password:</p>
    <a href="{{reset_link}}" class="button">Reset Password</a>
    <p>Link expires in 1 hour.</p>
    <p>Didn't request this? Ignore this email.</p>
</body>
</html>
```

#### 3. Welcome Email
```html
<!DOCTYPE html>
<html>
<body>
    <h2>Welcome to IshTop, {{user_name}}!</h2>
    <p>Your account is ready!</p>
    <h3>Get Started:</h3>
    <ul>
        <li>Create your AI resume</li>
        <li>Search for jobs</li>
        <li>Apply with one click</li>
    </ul>
    <a href="{{dashboard_link}}" class="button">Go to Dashboard</a>
</body>
</html>
```

---

## 💻 CODE INTEGRATION

### Update `backend/app/services/email_service.py`:

```python
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("EMAIL_FROM", "noreply@ishtop.uz")
        self.from_name = os.getenv("EMAIL_FROM_NAME", "IshTop")
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None
    
    async def send_verification_email(
        self,
        to_email: str,
        verification_link: str,
        user_name: str
    ) -> bool:
        """Send email verification email"""
        try:
            message = Mail(
                from_email=(self.from_email, self.from_name),
                to_emails=to_email,
                subject="Verify your IshTop account",
                html_content=f"""
                <h2>Welcome {user_name}!</h2>
                <p>Please verify your email:</p>
                <a href="{verification_link}">Verify Email</a>
                """
            )
            
            if self.client:
                response = self.client.send(message)
                logger.info(f"Verification email sent to {to_email}")
                return response.status_code == 202
            else:
                logger.warning("SendGrid not configured")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
            return False
    
    async def send_password_reset_email(
        self,
        to_email: str,
        reset_link: str
    ) -> bool:
        """Send password reset email"""
        try:
            message = Mail(
                from_email=(self.from_email, self.from_name),
                to_emails=to_email,
                subject="Reset your password - IshTop",
                html_content=f"""
                <h2>Password Reset</h2>
                <p>Click to reset your password:</p>
                <a href="{reset_link}">Reset Password</a>
                <p>Link expires in 1 hour.</p>
                """
            )
            
            if self.client:
                response = self.client.send(message)
                return response.status_code == 202
            return False
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False

# Singleton
email_service = EmailService()
```

---

## ✅ TESTING CHECKLIST

### Before Production:

- [ ] API key valid
- [ ] Domain verified (if using domain authentication)
- [ ] From email whitelisted
- [ ] Verification email works
- [ ] Password reset email works
- [ ] Welcome email works
- [ ] Links in emails work
- [ ] Unsubscribe link (if marketing)
- [ ] Test with different email providers
  - [ ] Gmail
  - [ ] Outlook
  - [ ] Yahoo
  - [ ] Other
- [ ] Spam score check
- [ ] Mobile rendering test

---

## 📊 MONITORING

### Check Regularly:

1. **Delivery Rate** (should be >95%)
2. **Bounce Rate** (should be <5%)
3. **Spam Reports** (should be <0.1%)
4. **Open Rate** (informational)
5. **Click Rate** (informational)

### SendGrid Dashboard:
```
Dashboard → Stats → Overview
```

---

## 🚨 TROUBLESHOOTING

### Email Not Sending:

**Check:**
1. API key correct?
2. From email verified?
3. Sufficient credit/quota?
4. Check logs for errors
5. Test API key manually

### Emails Going to Spam:

**Fix:**
1. Verify domain (SPF, DKIM)
2. Use verified from address
3. Good subject lines
4. Proper HTML formatting
5. Include unsubscribe link
6. Low spam score content

### Rate Limiting:

**Solutions:**
1. Upgrade plan
2. Add delay between emails
3. Use queue system
4. Contact support for limit increase

---

## 💰 PRICING COMPARISON

### Free Tiers:

| Service | Free Tier | Best For |
|---------|-----------|----------|
| SendGrid | 100/day | Getting started |
| Mailgun | 5000/month (3mo) | Medium volume |
| Gmail SMTP | 500/day | Development |
| AWS SES | $0.10/1000 | High volume |

### Paid Plans:

| Service | Price | Emails |
|---------|-------|--------|
| SendGrid | $15/mo | 40,000/mo |
| Mailgun | $35/mo | 50,000/mo |
| AWS SES | Pay-as-go | $0.10/1000 |

---

## 🎯 RECOMMENDATION

**For IshTop:**

**Stage 1 (Launch):** SendGrid Free (100/day)
- Enough for early users
- Easy setup
- Reliable

**Stage 2 (Growth):** SendGrid Essentials ($15/mo)
- 40,000 emails/month
- ~1,300/day
- Professional

**Stage 3 (Scale):** AWS SES
- Pay per use
- Cheaper at scale
- More setup required

---

## ✅ COMPLETION CHECKLIST

Day 2 Email Setup:
- [ ] Choose email service
- [ ] Create account
- [ ] Get API key
- [ ] Add to .env
- [ ] Test sending
- [ ] Create templates
- [ ] Integrate code
- [ ] Test all email types
- [ ] Monitor delivery

---

**Status:** 📧 Ready to Configure  
**Time:** 30-45 minutes  
**Priority:** 🔴 CRITICAL for production

**TAYYOR!** 🚀
