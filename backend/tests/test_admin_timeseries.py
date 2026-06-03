# backend/tests/test_admin_timeseries.py
def test_timeseries_users(client, super_admin_token):
    response = client.get(
        "/api/v1/admin/stats/timeseries?metric=users&days=7",
        headers={"Authorization": f"Bearer {super_admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    if data["data"]:
        assert "date" in data["data"][0]
        assert "value" in data["data"][0]
