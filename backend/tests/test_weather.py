import httpx
import pytest
import respx

from app.services import weather as weather_service

MADRID_LOCATION = {
    "name": "Madrid",
    "country": "Spain",
    "latitude": 40.4168,
    "longitude": -3.7038,
}

OPENWEATHERMAP_PAYLOAD = {
    "weather": [{"id": 800, "description": "clear sky"}],
    "main": {"temp": 15.9},
    "wind": {"speed": 3.5},
    "dt": 1726905600,
    "name": "Madrid",
    "sys": {"country": "ES"},
    "coord": {"lat": 40.4168, "lon": -3.7038},
}


@pytest.fixture
def mock_open_meteo():
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(200, json={"results": [MADRID_LOCATION]})
        )
        respx.get(weather_service.FORECAST_URL).mock(
            return_value=httpx.Response(
                200,
                json={
                    "current_weather": {
                        "temperature": 14.2,
                        "windspeed": 12.1,
                        "weathercode": 2,
                        "time": "2026-09-21T12:00",
                    }
                },
            )
        )
        yield


def test_weather_ok(client, authenticated_client, mock_open_meteo):
    response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Madrid"
    assert data["country"] == "Spain"
    assert data["temperature"] == 14.2
    assert data["windspeed"] == 12.1
    assert data["weathercode"] == 2
    assert data["provider"] == "open-meteo"


def test_weather_city_not_found(client, authenticated_client):
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(200, json={"results": []})
        )
        response = client.get("/api/weather", params={"city": "Atlantida"})
    assert response.status_code == 404


def test_weather_requires_auth(client, mock_open_meteo):
    response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 401


def test_weather_uses_primary_when_ok(client, authenticated_client, mock_open_meteo):
    response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 200
    assert response.json()["provider"] == "open-meteo"


def test_weather_fallbacks_on_primary_timeout(client, authenticated_client):
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(200, json={"results": [MADRID_LOCATION]})
        )
        respx.get(weather_service.FORECAST_URL).mock(
            side_effect=httpx.TimeoutException("timeout")
        )
        respx.get(weather_service.OPENWEATHERMAP_URL).mock(
            return_value=httpx.Response(200, json=OPENWEATHERMAP_PAYLOAD)
        )
        response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "openweathermap"
    assert data["windspeed"] == 3.5 * 3.6
    assert data["weathercode"] == 800


def test_weather_fallbacks_on_primary_5xx(client, authenticated_client):
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(200, json={"results": [MADRID_LOCATION]})
        )
        respx.get(weather_service.FORECAST_URL).mock(return_value=httpx.Response(503))
        respx.get(weather_service.OPENWEATHERMAP_URL).mock(
            return_value=httpx.Response(200, json=OPENWEATHERMAP_PAYLOAD)
        )
        response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 200
    assert response.json()["provider"] == "openweathermap"


def test_weather_returns_503_when_both_fail(client, authenticated_client):
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(200, json={"results": [MADRID_LOCATION]})
        )
        respx.get(weather_service.FORECAST_URL).mock(return_value=httpx.Response(503))
        respx.get(weather_service.OPENWEATHERMAP_URL).mock(
            return_value=httpx.Response(503)
        )
        response = client.get("/api/weather", params={"city": "Madrid"})
    assert response.status_code == 503
    assert response.json()["detail"] == "All weather providers unavailable"


def test_weather_does_not_fallback_on_404(client, authenticated_client):
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(404, json={"error": "not found"})
        )
        owm_route = respx.get(weather_service.OPENWEATHERMAP_URL).mock(
            return_value=httpx.Response(200, json=OPENWEATHERMAP_PAYLOAD)
        )
        response = client.get("/api/weather", params={"city": "Atlantida"})
    assert response.status_code == 404
    assert owm_route.call_count == 0