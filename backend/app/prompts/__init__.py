"""
=============================================================================
Prompts Package
=============================================================================

This package contains all AI prompt templates used throughout the application.
Centralizing prompts makes them easier to:
- Maintain and update
- Test and optimize
- Version control
- Reuse across different parts of the app

FILES:
    resume_prompts.py  - Templates for resume generation and analysis
"""

from app.prompts.resume_prompts import ResumePromptTemplate

__all__ = ["ResumePromptTemplate"]
























