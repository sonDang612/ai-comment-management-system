from fastapi.testclient import TestClient


def test_app_error_envelope(client: TestClient) -> None:
    response = client.get("/_test/not-found", headers={"X-Request-ID": "abc-123"})
    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "abc-123"
    assert response.json() == {
        "error": {
            "code": "not_found",
            "message": "Thing not found",
            "details": {"id": 1},
            "request_id": "abc-123",
        }
    }


def test_unknown_route_uses_envelope(client: TestClient) -> None:
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


def test_validation_error_envelope(client: TestClient) -> None:
    response = client.get("/_test/items/not-an-int")
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "validation_error"
    assert body["details"][0]["loc"] == ["path", "item_id"]


def test_unhandled_error_hides_internals(client: TestClient) -> None:
    response = client.get("/_test/boom")
    assert response.status_code == 500
    body = response.json()["error"]
    assert body["code"] == "internal_error"
    assert "secret" not in body["message"]
    assert body["request_id"] == response.headers["X-Request-ID"]


def test_invalid_incoming_request_id_is_replaced(client: TestClient) -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "bad id with spaces"})
    assert response.headers["X-Request-ID"] != "bad id with spaces"


def test_internal_routes_require_token(client: TestClient, internal_token: str) -> None:
    assert client.get("/_test/internal").status_code == 401
    wrong = client.get("/_test/internal", headers={"X-Internal-Token": "nope"})
    assert wrong.json()["error"]["code"] == "unauthorized"
    ok = client.get("/_test/internal", headers={"X-Internal-Token": internal_token})
    assert ok.status_code == 200
