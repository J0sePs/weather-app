import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

export interface WeatherResponse {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private http = inject(HttpClient);

  getWeather(city: string) {
    return this.http.get<WeatherResponse>(`${environment.apiBaseUrl}/weather`, {
      params: { city }
    });
  }
}