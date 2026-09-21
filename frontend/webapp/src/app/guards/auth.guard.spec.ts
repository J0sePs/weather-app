import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  it('allows /home when a token is present', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), AuthService],
    });
    const auth = TestBed.inject(AuthService);
    auth.setToken('jwt-token');

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeTrue();
  });

  it('redirects to /login when there is no token', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), AuthService],
    });
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    auth.clear();

    const result = TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
    expect(router.createUrlTree(['/login']).toString()).toBe('/login');
  });
});