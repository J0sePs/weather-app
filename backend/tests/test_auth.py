def test_register_ok(client):
    response = client.post(
        "/api/auth/register", json={"email": "new@example.com", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "password": "secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 200
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


def test_login_ok(client):
    client.post(
        "/api/auth/register", json={"email": "login@example.com", "password": "secret123"}
    )
    response = client.post(
        "/api/auth/login", json={"email": "login@example.com", "password": "secret123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register", json={"email": "badpass@example.com", "password": "secret123"}
    )
    response = client.post(
        "/api/auth/login", json={"email": "badpass@example.com", "password": "wrong123"}
    )
    assert response.status_code == 401