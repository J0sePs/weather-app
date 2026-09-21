import { Component, input } from '@angular/core';

import { WeatherResponse } from '../../services/weather.service';

const WEATHERCODES: Record<number, string> = {
  0: 'Cielo despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta con granizo intenso'
};

@Component({
  selector: 'app-weather-card',
  imports: [],
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.css'
})
export class WeatherCard {
  readonly data = input<WeatherResponse | null>(null);

  conditions(weathercode: number): string {
    return WEATHERCODES[weathercode] ?? 'Condición desconocida';
  }
}