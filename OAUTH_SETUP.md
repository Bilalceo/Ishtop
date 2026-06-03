# 🔐 OAuth2 Setup Guide - Google & LinkedIn

## ✅ OAuth2 Qo'shildi!

Backend tayyor, endi credentials kerak.

---

## 🔴 1. GOOGLE OAUTH SOZLASH

### Qadam 1: Google Cloud Console
1. https://console.cloud.google.com ga boring
2. Yangi project yarating: "IshTop"
3. "APIs & Services" → "Credentials"

### Qadam 2: OAuth 2.0 Client ID
1. "Create Credentials" → "OAuth client ID"
2. Application type: **Web application**
3. Name: `IshTop Web`
4. Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:8000
   https://your-production-domain.com (keyinroq)
   ```
5. Authorized redirect URIs:
   ```
   http://localhost:8000/api/v1/auth/callback/google
   https://your-production-domain.com/api/v1/auth/callback/google
   ```
6. **Create** bosing

### Qadam 3: Credentials Download
- **Client ID** ni nusxalang
- **Client Secret** ni nusxalang

### Qadam 4: Backend .env ga qo'shing
```env
# backend/.env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback/google
OAUTH_ENABLED=true
```

### Qadam 5: OAuth Consent Screen
1. "OAuth consent screen" ga boring
2. User type: **External**
3. App information:
   - App name: `IshTop`
   - User support email: your@email.com
   - Developer contact: your@email.com
4. Scopes: `email`, `profile`, `openid`
5. Test users: O'zingizni qo'shing

---

## 🔵 2. LINKEDIN OAUTH SOZLASH

### Qadam 1: LinkedIn Developers
1. https://www.linkedin.com/developers ga boring
2. "Create app" bosing

### Qadam 2: App Settings
- **App name**: IshTop
- **LinkedIn Page**: Kompaniya page (yoki skip)
- **App logo**: Logo yuklang (optional)
- **Privacy policy URL**: https://your-domain.com/privacy
- **Terms of use URL**: https://your-domain.com/terms

### Qadam 3: Products
1. "Products" tabga boring
2. **"Sign In with LinkedIn using OpenID Connect"** ni select qiling
3. **Request access** bosing (approval kerak)

### Qadam 4: Auth Settings
1. "Auth" tabga boring
2. **Redirect URLs** qo'shing:
   ```
   http://localhost:8000/api/v1/auth/callback/linkedin
   https://your-production-domain.com/api/v1/auth/callback/linkedin
   ```

### Qadam 5: Credentials
- **Client ID** ni ko'rsatadi (copy qiling)
- **Client Secret** ni generate qiling va copy qiling

### Qadam 6: Backend .env ga qo'shing
```env
# backend/.env
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback/linkedin
OAUTH_ENABLED=true
```

---

## 🚀 3. ISHGA TUSHIRISH

### Backend Restart
```bash
# Eski processni to'xtating va qayta ishga tushiring
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### Test OAuth
1. Browser: http://localhost:3000/login
2. "Google" yoki "LinkedIn" tugmasini bosing
3. Ruxsat bering
4. Avtomatik dashboard ga kirasiz

---

## 🧪 4. TEST QILISH

### Test Google OAuth:
```bash
# Authorization URL olish
curl http://localhost:8000/api/v1/auth/oauth/google

# Response:
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "csrf-token"
}
```

Browser'da `auth_url` ni oching va ruxsat bering.

### Test LinkedIn OAuth:
```bash
curl http://localhost:8000/api/v1/auth/oauth/linkedin
```

---

## 📊 5. FRONTEND BUTTONS

Login sahifasida Google/LinkedIn tugmalari **avtomatik ishlaydi**:

```tsx
// app/(auth)/login/page.tsx
<Button onClick={handleGoogleLogin}>
  <GoogleIcon /> Google
</Button>

<Button onClick={handleLinkedInLogin}>
  <LinkedInIcon /> LinkedIn
</Button>

// Funksiyalar:
const handleGoogleLogin = async () => {
  const response = await fetch('http://localhost:8000/api/v1/auth/oauth/google');
  const { auth_url } = await response.json();
  window.location.href = auth_url;  // Google ga redirect
}
```

Callback'dan keyin avtomatik:
- User yaratiladi (agar yangi bo'lsa)
- Token beriladi
- Dashboard ga yo'naltiriladi

---

## ⚙️ 6. PRODUCTION SOZLAMALAR

Production uchun:

```env
# backend/.env (production)
GOOGLE_REDIRECT_URI=https://api.your-domain.com/api/v1/auth/callback/google
LINKEDIN_REDIRECT_URI=https://api.your-domain.com/api/v1/auth/callback/linkedin
FRONTEND_URL=https://your-domain.com
```

Google Cloud Console va LinkedIn App Settings'da ham production URLlarini qo'shing!

---

## 📝 7. XULOSA

✅ Backend OAuth endpoints:
- `GET /api/v1/auth/oauth/google` - Google auth URL
- `GET /api/v1/auth/callback/google` - Google callback
- `GET /api/v1/auth/oauth/linkedin` - LinkedIn auth URL
- `GET /api/v1/auth/callback/linkedin` - LinkedIn callback

✅ Xususiyatlar:
- Yangi user avtomatik yaratiladi
- Email verified by default
- Avatar Google/LinkedIn dan olinadi
- Welcome email yuboriladi

🔧 **Keying qadam:**
1. Google Cloud Console'da credentials yarating
2. LinkedIn Developers'da app yarating
3. Credentials'ni `.env` ga qo'shing
4. Backend restart qiling
5. Test qiling: http://localhost:3000/login

---

**Credentials'ni yaratishda yordam kerakmi?** 🤔








