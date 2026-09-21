import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

_client: httpx.Client | None = None


class WeatherProviderError(Exception):
    pass


class CityNotFoundError(Exception):
    pass


def _get_client() -> httpx.Client:
    global _client
    if _client is None:
        _client = httpx.Client(timeout=10.0)
    return _client


def get_weather(city: str) -> dict:
    client = _get_client()
    try:
        geo = client.get(
            GEOCODING_URL, params={"name": city, "count": 1}
        ).raise_for_status().json()
    except httpx.HTTPError as exc:
        raise WeatherProviderError("Servicio de geocoding no disponible") from exc

    results = geo.get("results") or []
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
        ).raise_for_status().json()
    except httpx.HTTPError as exc:
        raise WeatherProviderError("Servicio de pronóstico no disponible") from exc

    current = forecast["current_weather"]
    return {
        "city": location.get("name", city),
        "country": location.get("country", ""),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "temperature": current["temperature"],
        "windspeed": current["windspeed"],
        "weathercode": current["weathercode"],
        "time": current["time"],
    }