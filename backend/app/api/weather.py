from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models import SearchHistory, User
from app.services.weather import CityNotFoundError, WeatherProviderError, get_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("")
def get_weather_by_city(
    city: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    try:
        data = get_weather(city=city)
    except CityNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró la ciudad '{city}'",
        )
    except WeatherProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error consultando el servicio meteorológico",
        ) from exc

    db.add(
        SearchHistory(
            user_id=current_user.id, city=data["city"], country=data["country"]
        )
    )
    db.commit()
    return data