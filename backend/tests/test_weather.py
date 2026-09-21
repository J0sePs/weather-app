import httpx
import pytest
import respx

from app.services import weather as weather_service


@pytest.fixture
def mock_open_meteo():
    with respx.mock:
        respx.get(weather_service.GEOCODING_URL).mock(
            return_value=httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "name": "Madrid",
                            "country": "Spain",
                            "latitude": 40.4168,
                            "longitude": -3.7038,
                        }
                    ]
                },
            )
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