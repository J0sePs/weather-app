import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly tokenSignal = signal<string | null>(localStorage.getItem('token'));

  readonly token = this.tokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  login(email: string, password: string) {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  register(email: string, password: string) {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/auth/register`, { email, password })
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.tokenSignal.set(token);
  }

  logout(): void {
    localStorage.removeItem('token');
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  clear(): void {
    localStorage.removeItem('token');
    this.tokenSignal.set(null);
  }
}