"""
Interview Scorecard model.

Stores per-application structured evaluation with 5 standard criteria so HR
makes hire/no-hire decisions against the same yardstick across candidates.
This reduces subjectivity and bias in evaluation.
"""

from __future__ import annotations

from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin
from app.models.types import GUID


class InterviewScorecard(Base, UUIDMixin, TimestampMixin):
    """Structured 5-criteria evaluation tied to a single application."""

    __tablename__ = "interview_scorecards"

    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evaluator_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Each criterion is scored 1..5 (or null = not yet scored).
    technical_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    cultural_fit_score = Column(Integer, nullable=True)
    motivation_score = Column(Integer, nullable=True)
    problem_solving_score = Column(Integer, nullable=True)

    # Aggregate + decision
    overall_score = Column(Float, nullable=True)
    recommendation = Column(String(20), nullable=True)  # hire | maybe | pass
    notes = Column(Text, nullable=True)

    # Relationships
    application = relationship("Application", back_populates="scorecards", lazy="joined")
    evaluator = relationship("User", foreign_keys=[evaluator_id], lazy="joined")

    @staticmethod
    def average(*scores) -> float | None:
        """Average of provided non-null 1-5 scores."""
        vals = [s for s in scores if s is not None]
        return round(sum(vals) / len(vals), 2) if vals else None
