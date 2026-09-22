from typing import Literal

from pydantic import BaseModel


class WeatherResponse(BaseModel):
    city: str
    country: str
    latitude: float
    longitude: float
    temperature: float
    windspeed: float
    weathercode: int
    time: str
    provider: Literal["open-meteo", "openweathermap"]