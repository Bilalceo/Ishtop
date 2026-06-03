# 🔐 Google OAuth Setup - Qadam-baqadam Ko'rsatma

## ❗ Muammo
```
{"detail":"Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"}
```

## ✅ Yechim: Google OAuth Credentials Olish

### Qadam 1: Google Cloud Console'ga Kirish
1. https://console.cloud.google.com ga boring
2. Google hisobingiz bilan kiring

### Qadam 2: Yangi Project Yaratish (yoki mavjudni tanlash)
1. Yuqoridagi "Select a project" tugmasini bosing
2. "New Project" ni tanlang
3. Project name: `IshTop` (yoki istalgan nom)
4. "Create" bosing

### Qadam 3: OAuth Consent Screen Sozlash
1. Chap menudan **"APIs & Services"** → **"OAuth consent screen"** ga boring
2. User type: **External** ni tanlang → **Create**
3. App information:
   - **App name**: `IshTop`
   - **User support email**: O'zingizning emailingiz
   - **Developer contact**: O'zingizning emailingiz
4. **Save and Continue**
5. Scopes: **Save and Continue** (default scopes yetarli)
6. Test users: O'zingizni qo'shing (agar test rejimida bo'lsa)
7. **Save and Continue** → **Back to Dashboard**

### Qadam 4: OAuth 2.0 Client ID Yaratish
1. **"APIs & Services"** → **"Credentials"** ga boring
2. Yuqorida **"+ CREATE CREDENTIALS"** → **"OAuth client ID"** ni tanlang
3. Application type: **Web application**
4. Name: `IshTop Web`
5. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://localhost:8000
   ```
6. **Authorized redirect URIs**:
   ```
   http://localhost:8000/api/v1/auth/callback/google
   ```
7. **Create** bosing

### Qadam 5: Credentials Nusxalash
Yangi oyna ochiladi:
- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

**⚠️ IMPORTANT:** Client Secret faqat bir marta ko'rsatiladi! Nusxalab oling!

### Qadam 6: Backend .env Fayliga Qo'shish
`backend/.env` faylini oching va quyidagilarni to'ldiring:

```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/callback/google
OAUTH_ENABLED=true
```

### Qadam 7: Backend Restart
```powershell
# Backend processni to'xtating (Ctrl+C)
# Keyin qayta ishga tushiring:
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Qadam 8: Test Qilish
1. Browser: http://localhost:3000/login
2. "Google" tugmasini bosing
3. Google hisobingiz bilan kiring
4. Ruxsat bering
5. Avtomatik dashboard ga kirasiz! ✅

---

## 🚨 Xatoliklar

### "redirect_uri_mismatch"
- Google Cloud Console'da **Authorized redirect URIs** ga quyidagini qo'shing:
  ```
  http://localhost:8000/api/v1/auth/callback/google
  ```

### "access_denied"
- OAuth Consent Screen'da test user sifatida o'zingizni qo'shing

### "invalid_client"
- Client ID yoki Client Secret noto'g'ri
- `.env` faylini tekshiring

---

## 📝 Production uchun

Production'ga chiqganda:
1. Google Cloud Console'da production URL'larini qo'shing:
   ```
   https://api.your-domain.com/api/v1/auth/callback/google
   ```
2. `.env` faylida:
   ```env
   GOOGLE_REDIRECT_URI=https://api.your-domain.com/api/v1/auth/callback/google
   FRONTEND_URL=https://your-domain.com
   ```

---

**Yordam kerakmi?** OAUTH_SETUP.md faylini ham ko'rib chiqing!

