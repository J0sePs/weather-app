from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import SearchHistory, User
from app.schemas.weather import WeatherResponse
from app.services.weather import (
    CityNotFoundError,
    ProviderClientError,
    WeatherProviderError,
    fetch_weather,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("", response_model=WeatherResponse)
def get_weather_by_city(
    city: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WeatherResponse:
    try:
        data = fetch_weather(city=city)
    except CityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la ciudad '{city}'",
        )
    except ProviderClientError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=f"Error del proveedor meteorológico ({exc.status_code})",
        ) from exc
    except WeatherProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All weather providers unavailable",
        ) from exc

    db.add(
        SearchHistory(
            user_id=current_user.id, city=data["city"], country=data["country"]
        )
    )
    db.commit()
    return WeatherResponse.model_validate(data)