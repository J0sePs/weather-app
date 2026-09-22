import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WeatherService, WeatherResponse } from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WeatherService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('getWeather returns the mapped result', () => {
    const weatherResponse: WeatherResponse = {
      city: 'Madrid',
      country: 'Spain',
      latitude: 40.4168,
      longitude: -3.7038,
      temperature: 14.2,
      windspeed: 12.1,
      weathercode: 2,
      time: '2026-09-21T12:00',
      provider: 'open-meteo',
    };
    let result: WeatherResponse | undefined;

    service.getWeather('Madrid').subscribe((r) => {
      result = r;
    });

    const req = httpTesting.expectOne({ method: 'GET', url: '/api/weather?city=Madrid' });
    expect(req.request.params.get('city')).toBe('Madrid');
    req.flush(weatherResponse);

    expect(result).toEqual(weatherResponse);
  });

  it('propagates HTTP errors from getWeather', () => {
    let error: { status: number } | undefined;

    service.getWeather('Atlantis').subscribe({
      error: (err) => {
        error = err;
      },
    });

    const req = httpTesting.expectOne('/api/weather?city=Atlantis');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(error?.status).toBe(404);
  });
});