"""add performance indexes

Revision ID: 005
Revises: 004
Create Date: 2026-01-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '005_performance_indexes'
down_revision = '004_notifications_and_saved_searches'
branch_labels = None
depends_on = None


def _table_exists(inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _columns_exist(inspector, table_name: str, columns: list[str]) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    return all(column in existing_columns for column in columns)


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    inspector = inspect(op.get_bind())
    if not _columns_exist(inspector, table_name, columns):
        return
    if _index_exists(inspector, table_name, index_name):
        return
    op.create_index(index_name, table_name, columns, unique=False)


def _drop_index_if_exists(table_name: str, index_name: str) -> None:
    inspector = inspect(op.get_bind())
    if not _index_exists(inspector, table_name, index_name):
        return
    op.drop_index(index_name, table_name=table_name)


def upgrade() -> None:
    """Add performance indexes to improve query speed"""
    # Only create indexes that are missing; this keeps the migration idempotent
    # when it is replayed against databases that already have some of them.
    _create_index_if_missing('users', 'ix_perf_users_subscription', ['subscription_tier', 'subscription_expires_at'])
    _create_index_if_missing('jobs', 'ix_perf_jobs_title', ['title'])
    _create_index_if_missing('jobs', 'ix_perf_jobs_location_type', ['location', 'job_type'])
    _create_index_if_missing('jobs', 'ix_perf_jobs_salary', ['salary_min', 'salary_max'])
    _create_index_if_missing('resumes', 'ix_perf_resumes_created', ['created_at'])
    _create_index_if_missing('applications', 'ix_perf_applications_user_status', ['user_id', 'status'])
    _create_index_if_missing('universities', 'ix_perf_universities_country_ranking', ['country', 'world_ranking'])
    _create_index_if_missing('universities', 'ix_perf_universities_tuition', ['tuition_min', 'tuition_max'])
    _create_index_if_missing('scholarships', 'ix_perf_scholarships_deadline', ['application_deadline'])
    _create_index_if_missing('university_applications', 'ix_perf_univ_apps_user_status', ['user_id', 'status'])
    _create_index_if_missing('university_applications', 'ix_perf_univ_apps_deadline', ['deadline'])
    _create_index_if_missing('notifications', 'ix_perf_notifications_user_read', ['user_id', 'is_read'])
    _create_index_if_missing('saved_searches', 'ix_perf_saved_searches_user_created', ['user_id', 'created_at'])


def downgrade() -> None:
    """Remove performance indexes"""
    _drop_index_if_exists('saved_searches', 'ix_perf_saved_searches_user_created')
    _drop_index_if_exists('notifications', 'ix_perf_notifications_user_read')
    _drop_index_if_exists('university_applications', 'ix_perf_univ_apps_deadline')
    _drop_index_if_exists('university_applications', 'ix_perf_univ_apps_user_status')
    _drop_index_if_exists('scholarships', 'ix_perf_scholarships_deadline')
    _drop_index_if_exists('universities', 'ix_perf_universities_tuition')
    _drop_index_if_exists('universities', 'ix_perf_universities_country_ranking')
    _drop_index_if_exists('applications', 'ix_perf_applications_user_status')
    _drop_index_if_exists('resumes', 'ix_perf_resumes_created')
    _drop_index_if_exists('jobs', 'ix_perf_jobs_salary')
    _drop_index_if_exists('jobs', 'ix_perf_jobs_location_type')
    _drop_index_if_exists('jobs', 'ix_perf_jobs_title')
    _drop_index_if_exists('users', 'ix_perf_users_subscription')
