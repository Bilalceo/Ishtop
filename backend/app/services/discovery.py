"""Discovery taxonomy helpers (slug generation and normalization)."""

from __future__ import annotations

import re
from typing import Optional


_CYRILLIC_TO_LATIN = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "yo",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "x",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "sh",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
        "қ": "q",
        "ғ": "g",
        "ҳ": "h",
        "ў": "o",
    }
)

_CITY_ALIASES = {
    "toshkent": "tashkent",
    "tashkent": "tashkent",
    "ташкент": "tashkent",
    "тошкент": "tashkent",
    "samarqand": "samarkand",
    "samarkand": "samarkand",
    "самарканд": "samarkand",
    "самарқанд": "samarkand",
    "buxoro": "bukhara",
    "bukhara": "bukhara",
    "бухара": "bukhara",
    "бухоро": "bukhara",
}

_PROFESSION_TOKEN_ALIASES = {
    "dasturchi": "developer",
    "programmist": "developer",
    "razrabotchik": "developer",
    "разработчик": "developer",
    "программист": "developer",
    "muhandis": "engineer",
    "инженер": "engineer",
    "bekend": "backend",
    "бэкенд": "backend",
    "бекенд": "backend",
    "frontendchi": "frontend",
}


def _localized_key(value: str) -> str:
    return re.sub(r"[-\s]+", "-", str(value).strip().lower()).strip("-")


def slugify_text(value: Optional[str]) -> str:
    """Create a URL-safe slug from localized UZ/RU/EN display text."""
    if not value:
        return ""

    normalized = str(value).strip().lower()
    normalized = re.sub(r"['’`]+", "", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = normalized.replace("/", " ").replace("|", " ").replace("_", " ")
    normalized = normalized.translate(_CYRILLIC_TO_LATIN)
    normalized = re.sub(r"[^a-z0-9\-\s]", "", normalized)
    normalized = re.sub(r"[-\s]+", "-", normalized)
    normalized = normalized.strip("-")
    return normalized


def normalize_discovery_slug(value: Optional[str], *, kind: Optional[str] = None) -> str:
    """Normalize inbound localized discovery slugs to the canonical stored slug."""
    if not value:
        return ""

    raw_key = _localized_key(str(value))
    slug = slugify_text(value)

    if kind == "city":
        return _CITY_ALIASES.get(raw_key) or _CITY_ALIASES.get(slug) or slug

    if kind == "profession":
        tokens = [
            _PROFESSION_TOKEN_ALIASES.get(token, token)
            for token in slug.split("-")
            if token
        ]
        return "-".join(tokens)

    return slug


def city_from_location(location: Optional[str]) -> str:
    """Extract city-like token from a free-text location string."""
    if not location:
        return ""
    raw = str(location).strip()
    # Prefer the first segment in formats like "Tashkent, Uzbekistan".
    city = raw.split(",", 1)[0].strip() or raw
    return city


def city_slug_from_location(location: Optional[str]) -> str:
    return normalize_discovery_slug(city_from_location(location), kind="city")


def profession_slug_from_title(title: Optional[str]) -> str:
    return normalize_discovery_slug(title, kind="profession")


def company_slug_from_name(company_name: Optional[str], fallback_full_name: Optional[str] = None) -> str:
    return normalize_discovery_slug(company_name or fallback_full_name, kind="company")


def normalize_discovery_labels(
    *,
    city_slug: str,
    profession_slug: str,
    company_slug: str,
) -> dict:
    """Return multi-locale slug labels for UZ/RU/EN surfaces (v1: shared slug)."""
    return {
        "city": {"uz": city_slug, "ru": city_slug, "en": city_slug},
        "profession": {"uz": profession_slug, "ru": profession_slug, "en": profession_slug},
        "company": {"uz": company_slug, "ru": company_slug, "en": company_slug},
    }
