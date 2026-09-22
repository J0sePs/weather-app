import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPENWEATHERMAP_URL = "https://api.openweathermap.org/data/2.5/weather"

logger = logging.getLogger(__name__)

_client: httpx.Client | None = None


class WeatherProviderError(Exception):
    pass


class CityNotFoundError(Exception):
    pass


class ProviderClientError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class ProviderUnavailableError(Exception):
    pass


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=5.0)
    return _client


def _raise_for_provider(status_code: int, message: str) -> None:
    if status_code == 429 or status_code >= 500:
        raise ProviderUnavailableError(message)
    raise ProviderClientError(message, status_code=status_code)


def fetch_from_open_meteo(city: str) -> dict:
    client = _get_client()
    try:
        geo = client.get(GEOCODING_URL, params={"name": city, "count": 1})
    except httpx.TimeoutException as exc:
        raise ProviderUnavailableError("Geocoding request timed out") from exc
    except httpx.NetworkError as exc:
        raise ProviderUnavailableError("Geocoding network error") from exc
    if geo.status_code != 200:
        _raise_for_provider(geo.status_code, f"Geocoding failed with {geo.status_code}")

    results = geo.json().get("results") or []
    if not results:
        raise CityNotFoundError(city)
    location = results[0]

    try:
        forecast = client.get(
            FORECAST_URL,
            params={
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "current_weather": True,
            },
        )
    except httpx.TimeoutException as exc:
        raise ProviderUnavailableError("Forecast request timed out") from exc
    except httpx.NetworkError as exc:
        raise ProviderUnavailableError("Forecast network error") from exc
    if forecast.status_code != 200:
        _raise_for_provider(forecast.status_code, f"Forecast failed with {forecast.status_code}")

    current = forecast.json()["current_weather"]
    return {
        "provider": "open-meteo",
        "city": location.get("name", city),
        "country": location.get("country", ""),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "temperature": current["temperature"],
        "windspeed": current["windspeed"],
        "weathercode": current["weathercode"],
        "time": current["time"],
    }


def fetch_from_openweathermap(city: str) -> dict:
    client = _get_client()
    try:
        response = client.get(
            OPENWEATHERMAP_URL,
            params={"q": city, "appid": settings.openweathermap_api_key, "units": "metric"},
        )
        if response.status_code != 200:
            raise ProviderUnavailableError(
                f"OpenWeatherMap failed with {response.status_code}"
            )
        data = response.json()
    except ProviderUnavailableError:
        raise
    except httpx.TimeoutException as exc:
        raise ProviderUnavailableError("OpenWeatherMap request timed out") from exc
    except httpx.NetworkError as exc:
        raise ProviderUnavailableError("OpenWeatherMap network error") from exc

    weather = data["weather"][0]
    return {
        "provider": "openweathermap",
        "city": data.get("name", city),
        "country": data.get("sys", {}).get("country", ""),
        "latitude": data["coord"]["lat"],
        "longitude": data["coord"]["lon"],
        "temperature": data["main"]["temp"],
        "windspeed": data["wind"]["speed"] * 3.6,
        "weathercode": weather["id"],
        "time": datetime.fromtimestamp(data["dt"], tz=timezone.utc).isoformat(),
    }


def fetch_weather(city: str) -> dict:
    try:
        return fetch_from_open_meteo(city)
    except (CityNotFoundError, ProviderClientError):
        raise
    except ProviderUnavailableError as exc:
        logger.warning(
            "primary failed with %s, falling back to openweathermap", exc
        )
        try:
            return fetch_from_openweathermap(city)
        except ProviderUnavailableError as exc_secondary:
            logger.error(
                "both weather providers failed for city %s", city, exc_info=exc_secondary
            )
            raise WeatherProviderError("All weather providers unavailable") from exc_secondary