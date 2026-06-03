def test_list_admin_notifications(client, super_admin_token):
    response = client.get(
        "/api/v1/admin/admin-notifications",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "notifications" in data
    assert "unread_count" in data


def test_mark_all_read(client, super_admin_token):
    response = client.post(
        "/api/v1/admin/admin-notifications/read-all",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
