import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService, TokenResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('login posts the credentials to /api/auth/login and stores the token', () => {
    const tokenResponse: TokenResponse = { access_token: 'jwt-token', token_type: 'bearer' };
    let result: TokenResponse | undefined;

    service.login('a@b.com', 'secret123').subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne({ method: 'POST', url: '/api/auth/login' });
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'secret123' });
    req.flush(tokenResponse);

    expect(result).toEqual(tokenResponse);
    expect(service.token()).toBe('jwt-token');
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('register posts to /api/auth/register and stores the token', () => {
    service.register('new@a.com', 'secret123').subscribe();

    const req = httpTesting.expectOne({ method: 'POST', url: '/api/auth/register' });
    expect(req.request.body).toEqual({ email: 'new@a.com', password: 'secret123' });
    req.flush({ access_token: 'register-token', token_type: 'bearer' });

    expect(service.token()).toBe('register-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('getToken reflects a token stored with setToken', () => {
    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();

    service.setToken('stored-token');

    expect(service.token()).toBe('stored-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('logout clears the token and navigates to /login', () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.stub();
    service.setToken('some-token');

    service.logout();

    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('propagates HTTP errors from login', () => {
    let error: { status: number } | undefined;

    service.login('a@b.com', 'wrong-password').subscribe({
      error: (err) => {
        error = err;
      },
    });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(error?.status).toBe(401);
  });
});