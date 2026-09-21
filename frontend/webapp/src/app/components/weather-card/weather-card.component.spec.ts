import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherCard } from './weather-card';
import { WeatherResponse } from '../../services/weather.service';

describe('WeatherCard', () => {
  const data: WeatherResponse = {
    city: 'Lima',
    country: 'Perú',
    latitude: -12.0,
    longitude: -77.0,
    temperature: 18.5,
    windspeed: 9.3,
    weathercode: 0,
    time: '2026-09-21T12:00',
  };

  let fixture: ComponentFixture<WeatherCard>;
  let component: WeatherCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WeatherCard] }).compileComponents();
    fixture = TestBed.createComponent(WeatherCard);
    component = fixture.componentInstance;
  });

  it('renders temperature, wind and conditions from the input', () => {
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lima');
    expect(text).toContain('Perú');
    expect(text).toContain('18.5');
    expect(text).toContain('9.3');
    expect(text).toContain('Cielo despejado');
  });

  it('renders nothing when data is null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
  });

  it('maps a known weather code to its condition label', () => {
    expect(component.conditions(95)).toBe('Tormenta');
  });

  it('maps an unknown weather code to an unknown condition', () => {
    expect(component.conditions(999)).toBe('Condición desconocida');
    fixture.componentRef.setInput('data', { ...data, weathercode: 999 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Condición desconocida');
  });
});