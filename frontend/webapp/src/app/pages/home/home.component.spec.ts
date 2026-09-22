import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { HomePage } from './home';
import { AuthService } from '../../services/auth.service';
import { WeatherResponse, WeatherService } from '../../services/weather.service';

describe('HomePage', () => {
  const weatherData: WeatherResponse = {
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

  let fixture: ComponentFixture<HomePage>;
  let component: HomePage;
  let auth: jasmine.SpyObj<AuthService>;
  let weatherService: jasmine.SpyObj<WeatherService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['logout']);
    weatherService = jasmine.createSpyObj('WeatherService', ['getWeather']);

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: WeatherService, useValue: weatherService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('searches a city and renders the weather in the card', () => {
    weatherService.getWeather.and.returnValue(of(weatherData));
    component.city.set('Madrid');

    component.search();
    fixture.detectChanges();

    expect(weatherService.getWeather).toHaveBeenCalledWith('Madrid');
    expect(component.weather()).toEqual(weatherData);
    expect(fixture.nativeElement.textContent).toContain('Madrid');
    expect(fixture.nativeElement.textContent).toContain('14.2');
  });

  it('shows an error when the city is not found', () => {
    weatherService.getWeather.and.returnValue(throwError(() => ({ status: 404 })));
    component.city.set('Atlantis');

    component.search();
    fixture.detectChanges();

    expect(component.error()).toContain('Atlantis');
    expect(fixture.nativeElement.textContent).toContain('No se encontró');
  });

  it('does nothing when the search box is empty', () => {
    component.city.set('   ');

    component.search();

    expect(weatherService.getWeather).not.toHaveBeenCalled();
  });

  it('shows a generic error for unexpected failures', () => {
    weatherService.getWeather.and.returnValue(throwError(() => ({ status: 500 })));
    component.city.set('Madrid');

    component.search();
    fixture.detectChanges();

    expect(component.error()).toContain('Ocurrió un error');
  });

  it('logout delegates to the auth service', () => {
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
  });
});