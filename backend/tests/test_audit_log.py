def test_list_audit_logs_empty(client, super_admin_token):
    response = client.get(
        "/api/v1/admin/audit-logs",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "logs" in data
    assert "total" in data
    assert isinstance(data["logs"], list)


def test_audit_entry_written_on_user_status_change(client, super_admin_token, test_db):
    """Verify that updating a user's status writes an audit log entry."""
    import uuid
    from app.models import User, UserRole

    # Create a test user
    user = User(
        id=uuid.uuid4(),
        email=f"audit_test_{uuid.uuid4().hex[:6]}@example.com",
        full_name="Audit Test User",
        role=UserRole.STUDENT,
        is_active_account=True,
        password_hash="x" * 60,
    )
    test_db.add(user)
    test_db.commit()

    # Deactivate the user via admin endpoint
    response = client.patch(
        f"/api/v1/admin/users/{user.id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert response.status_code == 200

    # Verify audit entry was created
    audit_response = client.get(
        "/api/v1/admin/audit-logs?limit=1",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert audit_response.status_code == 200
    data = audit_response.json()
    assert data["total"] >= 1
    latest = data["logs"][0]
    assert latest["action"] == "user_deactivate"
    assert latest["target_type"] == "user"
    assert latest["target_id"] == str(user.id)
