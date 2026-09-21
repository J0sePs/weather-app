import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('adds the Authorization header when a token is present', () => {
    auth.setToken('jwt-token');

    http.get('/api/weather').subscribe();

    const req = httpTesting.expectOne('/api/weather');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush({});
  });

  it('does not add the Authorization header when there is no token', () => {
    auth.clear();

    http.get('/api/weather').subscribe();

    const req = httpTesting.expectOne('/api/weather');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not intercept non-API calls', () => {
    auth.setToken('jwt-token');

    http.get('/assets/logo.png').subscribe();

    const req = httpTesting.expectOne('/assets/logo.png');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does not clear the token on a non-401 error from an API call', () => {
    auth.setToken('valid-token');
    spyOn(router, 'navigate').and.stub();

    http.get('/api/weather').subscribe({ error: () => undefined });

    const req = httpTesting.expectOne('/api/weather');
    req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });

    expect(auth.token()).toBe('valid-token');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears the token and navigates to /login on a 401 from an API call', () => {
    auth.setToken('expired-token');
    spyOn(router, 'navigate').and.stub();

    http.get('/api/weather').subscribe({ error: () => undefined });

    const req = httpTesting.expectOne('/api/weather');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(auth.token()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});