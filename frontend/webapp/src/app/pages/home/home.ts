import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { WeatherCard } from '../../components/weather-card/weather-card';
import { AuthService } from '../../services/auth.service';
import { WeatherResponse, WeatherService } from '../../services/weather.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule, WeatherCard],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomePage {
  private auth = inject(AuthService);
  private weatherService = inject(WeatherService);

  readonly city = signal('');
  readonly weather = signal<WeatherResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  logout(): void {
    this.auth.logout();
  }

  search(): void {
    const city = this.city().trim();
    if (!city) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.weather.set(null);

    this.weatherService
      .getWeather(city)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.weather.set(data),
        error: (err) => {
          if (err.status === 404) {
            this.error.set(`No se encontró la ciudad "${city}".`);
          } else {
            this.error.set('Ocurrió un error al consultar el clima. Intenta de nuevo.');
          }
        }
      });
  }
}