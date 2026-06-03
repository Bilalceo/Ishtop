"""
=============================================================================
GEMINI AI SERVICE - Google Gemini Integration (google-genai SDK)
=============================================================================

Bu service Google Gemini API bilan ishlaydi - BEPUL!
OpenAI'dan farqi - bu tekin va juda tez ishlaydi.

Gemini API kalitini olish:
1. https://ai.google.dev/ ga boring
2. "Get API key" bosing
3. Google hisobingiz bilan kiring
4. Yangi kalit yarating

.env fayliga qo'shing:
GEMINI_API_KEY=your-gemini-api-key

SDK: pip install google-genai>=1.0.0

AUTHOR: IshTop Team
VERSION: 2.0.0 (migrated from google-generativeai to google-genai)
"""

import json
import logging
import asyncio
import random
import re
from typing import Dict, Any, List, Optional

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False

from app.config import settings

# =============================================================================
# LOGGING
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# GEMINI SERVICE CLASS
# =============================================================================

class GeminiService:
    """
    Google Gemini AI Service - Tekin AI API!

    Bu service:
    - Resume generatsiya qiladi
    - Cover letter yozadi
    - Job matching tahlil qiladi
    - Motivatsion xat yozadi
    """

    def __init__(self):
        """Gemini client yaratish"""
        self.api_key = getattr(settings, 'GEMINI_API_KEY', None)
        model_setting = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
        self._model_name = self._normalize_model_name(model_setting)
        self._model_candidates = self._build_model_candidates(self._model_name)
        self._max_retries = max(1, int(getattr(settings, "GEMINI_MAX_RETRIES", 3) or 3))
        self._retry_base_delay_seconds = float(
            getattr(settings, "GEMINI_RETRY_BASE_DELAY_SECONDS", 1) or 1
        )
        self._retry_max_delay_seconds = float(
            getattr(settings, "GEMINI_RETRY_MAX_DELAY_SECONDS", 8) or 8
        )
        if self._retry_base_delay_seconds <= 0:
            self._retry_base_delay_seconds = 1.0
        if self._retry_max_delay_seconds < self._retry_base_delay_seconds:
            self._retry_max_delay_seconds = self._retry_base_delay_seconds
        self.client = None

        self._initialize()

    @staticmethod
    def _normalize_model_name(model_name: str) -> str:
        """Map common aliases to canonical Gemini model names."""
        model_mapping = {
            "gemini-2.5-flash": "gemini-2.5-flash",
            "gemini-2.5-pro": "gemini-2.5-pro",
            "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
            "gemini-2.0-flash": "gemini-2.0-flash",
            "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
            "gemini-flash": "gemini-2.5-flash",
            "gemini-pro": "gemini-2.5-pro",
        }
        return model_mapping.get((model_name or "").strip(), (model_name or "").strip())

    def _build_model_candidates(self, preferred_model: str) -> List[str]:
        """Build a robust fallback order so old model names don't break runtime."""
        ordered = [
            preferred_model,
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.5-pro",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
        ]
        deduped: List[str] = []
        for model in ordered:
            normalized = self._normalize_model_name(model)
            if normalized and normalized not in deduped:
                deduped.append(normalized)
        return deduped

    @staticmethod
    def _is_model_unavailable_error(error: Exception) -> bool:
        """Detect provider errors caused by invalid/deprecated model names."""
        message = str(error).lower()
        return (
            "not_found" in message
            or "is not found" in message
            or "not supported for generatecontent" in message
            or "unknown model" in message
            or "not found for api version" in message
        )

    @staticmethod
    def _is_transient_generation_error(error: Exception) -> bool:
        """Detect retryable provider/runtime errors (503/unavailable/rate limit style)."""
        message = str(error).lower()
        status_code = str(getattr(error, "status_code", "")).lower()
        code = str(getattr(error, "code", "")).lower()

        transient_markers = (
            "503",
            "service unavailable",
            "service_unavailable",
            "unavailable",
            "temporarily unavailable",
            "resource exhausted",
            "resource_exhausted",
            "rate limit",
            "rate_limit",
            "too many requests",
            "deadline exceeded",
            "timeout",
            "timed out",
            "connection reset",
            "connection aborted",
            "connection refused",
        )

        joined = f"{message} {status_code} {code}"
        return any(marker in joined for marker in transient_markers)

    def _retry_delay_seconds(self, attempt_number: int) -> float:
        """
        Calculate capped exponential backoff with jitter.
        attempt_number is 1-indexed.
        """
        exponential = self._retry_base_delay_seconds * (2 ** max(0, attempt_number - 1))
        capped = min(exponential, self._retry_max_delay_seconds)
        jitter = random.uniform(0, capped * 0.25) if capped > 0 else 0.0
        return capped + jitter

    @staticmethod
    def _collect_text_fragments(value: Any) -> List[str]:
        """Recursively collect textual values from nested structures."""
        if isinstance(value, str):
            cleaned = value.strip()
            return [cleaned] if cleaned else []
        if isinstance(value, dict):
            chunks: List[str] = []
            for item in value.values():
                chunks.extend(GeminiService._collect_text_fragments(item))
            return chunks
        if isinstance(value, list):
            chunks: List[str] = []
            for item in value:
                chunks.extend(GeminiService._collect_text_fragments(item))
            return chunks
        return []

    def _resolve_resume_language(self, user_data: Dict[str, Any]) -> str:
        """
        Resolve resume output language from explicit input or user-provided text.
        Priority:
        1) explicit language == uz/ru
        2) detect Cyrillic => ru
        3) detect common Uzbek-latin patterns/keywords => uz
        4) default => uz
        """
        explicit = str(user_data.get("language", "") or "").strip().lower()
        if explicit in {"uz", "ru"}:
            return explicit

        corpus = " ".join(self._collect_text_fragments(user_data))
        if not corpus:
            return "uz"

        if re.search(r"[\u0400-\u04FF]", corpus):
            return "ru"

        lowered = corpus.lower()
        uzbek_markers = (
            "o'",
            "g'",
            "sh",
            "ch",
            "yo'n",
            "ko'nik",
            "tajriba",
            "ta'lim",
            "hozirgi",
            "lavozim",
        )
        if any(marker in lowered for marker in uzbek_markers):
            return "uz"

        return "uz"

    async def _generate_with_fallback(self, prompt: str):
        """
        Call Gemini with automatic model fallback.

        Returns:
            tuple(response, used_model)
        """
        if not self.client:
            raise Exception("Gemini API not configured")

        last_error: Optional[Exception] = None
        saw_transient_error = False

        for model in self._model_candidates:
            for attempt in range(1, self._max_retries + 1):
                try:
                    response = await self.client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                    )

                    if model != self._model_name:
                        logger.warning(
                            "Gemini model switched from %s to %s due to compatibility.",
                            self._model_name,
                            model,
                        )
                        self._model_name = model

                    return response, model
                except Exception as e:
                    last_error = e
                    if self._is_model_unavailable_error(e):
                        logger.warning("Gemini model %s unavailable, trying fallback model.", model)
                        break

                    if not self._is_transient_generation_error(e):
                        raise
                    saw_transient_error = True

                    if attempt >= self._max_retries:
                        logger.warning(
                            "Gemini transient error persisted on model %s; trying next fallback model.",
                            model,
                        )
                        break

                    delay = self._retry_delay_seconds(attempt)
                    logger.warning(
                        "Gemini transient error on model %s (attempt %s/%s); retrying in %.2fs.",
                        model,
                        attempt,
                        self._max_retries,
                        delay,
                    )
                    await asyncio.sleep(delay)

        if saw_transient_error:
            raise Exception(
                "Gemini service is temporarily unavailable due to high demand. "
                "Please try again in 1-2 minutes."
            )

        raise Exception(
            f"No compatible Gemini model found. Tried: {', '.join(self._model_candidates)}. "
            f"Last error: {last_error}"
        )

    def _initialize(self):
        """Gemini client ni sozlash"""
        logger.info("=" * 60)
        logger.info("🌟 Initializing Gemini AI Service (google-genai SDK)")
        logger.info("=" * 60)

        if not _GENAI_AVAILABLE:
            logger.error("❌ google-genai package not installed. Run: pip install google-genai>=1.0.0")
            return

        if not self.api_key or self.api_key == "your-gemini-api-key-here":
            logger.warning("⚠️ GEMINI_API_KEY not set. Please add it to .env")
            logger.warning("   Get free key at: https://ai.google.dev/")
            return

        try:
            self.client = genai.Client(api_key=self.api_key)
            logger.info(f"✅ Gemini client initialized, model: {self._model_name}")
            logger.info("🎉 Gemini AI Service ready!")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini: {e}")
            self.client = None

    @property
    def is_available(self) -> bool:
        """Gemini ishga tayyormi?"""
        return self.client is not None

    async def generate(
        self,
        prompt: str,
        response_format: str = "text"
    ) -> str:
        """
        Generic AI generation method.

        Args:
            prompt: Text prompt
            response_format: "text" or "json"

        Returns:
            Generated text
        """
        if not self.is_available:
            raise Exception("Gemini API not configured")

        try:
            # Add JSON instruction if needed
            if response_format == "json":
                prompt = f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON, no other text."

            response, _ = await self._generate_with_fallback(prompt)

            # Extract text
            text = response.text.strip()

            # Clean up JSON response if needed
            if response_format == "json":
                if text.startswith("```json"):
                    text = text.replace("```json", "").replace("```", "").strip()
                elif text.startswith("```"):
                    text = text.replace("```", "").strip()

            return text

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise

    async def generate_resume(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        AI yordamida professional rezyume yaratish

        Args:
            user_data: Foydalanuvchi ma'lumotlari

        Returns:
            Yaratilgan rezyume JSON formatda
        """
        if not self.is_available:
            return {"error": "Gemini API not configured", "success": False}

        output_language = self._resolve_resume_language(user_data)
        language_instructions = {
            "uz": (
                "Write ALL narrative resume content in Uzbek (Latin script). "
                "Do not switch to English or Russian."
            ),
            "ru": (
                "Write ALL narrative resume content in Russian (Cyrillic). "
                "Do not switch to English or Uzbek."
            ),
        }
        language_instruction = language_instructions.get(output_language, language_instructions["uz"])

        prompt = f"""
You are a professional resume writer. Create a comprehensive, ATS-optimized resume based on the following information.

USER DATA:
{json.dumps(user_data, indent=2, ensure_ascii=False)}

Generate a professional resume in JSON format with the following structure:
{{
    "personal_info": {{
        "full_name": "...",
        "title": "...",
        "email": "...",
        "phone": "...",
        "location": "...",
        "linkedin": "...",
        "website": "..."
    }},
    "summary": "A compelling 2-3 sentence professional summary highlighting key achievements and expertise",
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "location": "City, Country",
            "start_date": "MM/YYYY",
            "end_date": "MM/YYYY or Present",
            "achievements": [
                "Achievement 1 with metrics",
                "Achievement 2 with metrics",
                "Achievement 3 with metrics"
            ]
        }}
    ],
    "education": [
        {{
            "degree": "Degree Name",
            "institution": "University Name",
            "location": "City, Country",
            "graduation_date": "YYYY",
            "gpa": "X.X (if notable)",
            "highlights": ["Honor", "Achievement"]
        }}
    ],
    "skills": {{
        "technical": ["Skill 1", "Skill 2"],
        "soft": ["Skill 1", "Skill 2"],
        "languages": ["Language 1 (Level)", "Language 2 (Level)"]
    }},
    "certifications": [
        {{
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "date": "YYYY"
        }}
    ],
    "ats_score": 95,
    "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"]
}}

IMPORTANT:
- Use strong action verbs (Led, Developed, Implemented, Achieved)
- Include quantifiable achievements with numbers and percentages
- Make it ATS-friendly with relevant keywords
- Keep it professional and concise
- {language_instruction}
- Keep JSON keys in English, but values/content must be in the target language.
- Keep emails, URLs, and proper nouns exactly as provided by user.
- Return ONLY valid JSON, no markdown or extra text
"""

        try:
            response, used_model = await self._generate_with_fallback(prompt)

            # Parse JSON from response
            text = response.text.strip()

            # Remove markdown code blocks if present
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            resume_data = json.loads(text.strip())

            logger.info("✅ Resume generated successfully with Gemini!")

            return {
                "success": True,
                "resume": resume_data,
                "model": used_model,
                "provider": "gemini"
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            return {
                "success": False,
                "error": "Failed to parse AI response",
                "raw_response": response.text if response else None
            }
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def generate_cover_letter(
        self,
        resume_data: Dict[str, Any],
        job_description: str,
        company_name: str
    ) -> Dict[str, Any]:
        """
        Job uchun cover letter yaratish
        """
        if not self.is_available:
            return {"error": "Gemini API not configured", "success": False}

        prompt = f"""
You are a professional career coach. Write a compelling cover letter.

RESUME DATA:
{json.dumps(resume_data, indent=2, ensure_ascii=False)}

JOB DESCRIPTION:
{job_description}

COMPANY NAME: {company_name}

Write a professional cover letter that:
1. Opens with a strong hook
2. Highlights relevant experience and skills
3. Shows enthusiasm for the role and company
4. Ends with a clear call to action

Return JSON format:
{{
    "cover_letter": "Full cover letter text...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "match_score": 85
}}

Return ONLY valid JSON.
"""

        try:
            response, used_model = await self._generate_with_fallback(prompt)
            text = response.text.strip()

            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            result = json.loads(text.strip())

            return {
                "success": True,
                **result,
                "model": used_model,
                "provider": "gemini"
            }

        except Exception as e:
            logger.error(f"Cover letter generation error: {e}")
            return {"success": False, "error": str(e)}

    async def analyze_job_match(
        self,
        resume_data: Dict[str, Any],
        job_description: str
    ) -> Dict[str, Any]:
        """
        Resume va job o'rtasidagi moslikni tahlil qilish
        """
        if not self.is_available:
            return {"error": "Gemini API not configured", "success": False}

        prompt = f"""
Analyze the match between this resume and job description.

RESUME:
{json.dumps(resume_data, indent=2, ensure_ascii=False)}

JOB DESCRIPTION:
{job_description}

Provide analysis in JSON format:
{{
    "match_score": 85,
    "matching_skills": ["skill1", "skill2"],
    "missing_skills": ["skill1", "skill2"],
    "experience_match": "Strong/Moderate/Weak",
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "interview_tips": ["Tip 1", "Tip 2"]
}}

Return ONLY valid JSON.
"""

        try:
            response, used_model = await self._generate_with_fallback(prompt)
            text = response.text.strip()

            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]

            result = json.loads(text.strip())

            return {
                "success": True,
                **result,
                "model": used_model,
                "provider": "gemini"
            }

        except Exception as e:
            logger.error(f"Job match analysis error: {e}")
            return {"success": False, "error": str(e)}


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

gemini_service = GeminiService()
