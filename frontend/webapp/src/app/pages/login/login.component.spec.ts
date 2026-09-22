import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { LoginPage } from './login';
import { AuthService } from '../../services/auth.service';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['login', 'register']);
    auth.login.and.returnValue(of({ access_token: 'token', token_type: 'bearer' }));
    auth.register.and.returnValue(of({ access_token: 'token', token_type: 'bearer' }));

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows "Iniciar sesión" on the submit button in login mode', () => {
    const button = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.textContent).toContain('Iniciar sesión');
  });

  it('submits a login and navigates to /home', () => {
    spyOn(router, 'navigate').and.stub();
    component.form.setValue({ email: 'a@b.com', password: 'secret123' });

    component.submit();

    expect(auth.login).toHaveBeenCalledWith('a@b.com', 'secret123');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('submits a register when in register mode', () => {
    component.toggleMode();
    component.form.setValue({ email: 'b@c.com', password: 'secret123' });

    component.submit();

    expect(auth.register).toHaveBeenCalledWith('b@c.com', 'secret123');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('shows an error when the form is invalid', () => {
    component.form.setValue({ email: 'not-an-email', password: '123' });

    component.submit();
    fixture.detectChanges();

    expect(auth.login).not.toHaveBeenCalled();
    expect(component.error()).toContain('email válido');
    expect(fixture.nativeElement.textContent).toContain('email válido');
  });

  it('shows a server error returned by the auth service', () => {
    auth.login.and.returnValue(throwError(() => ({ status: 401 })));
    component.form.setValue({ email: 'a@b.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.error()).toContain('Email o contraseña incorrectos');
  });

  it('shows a duplicate email error on register', () => {
    component.toggleMode();
    auth.register.and.returnValue(throwError(() => ({ status: 409 })));
    component.form.setValue({ email: 'a@b.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.error()).toContain('ya está registrado');
  });

  it('shows a generic connection error for unexpected failures', () => {
    auth.login.and.returnValue(throwError(() => ({ status: 500 })));
    component.form.setValue({ email: 'a@b.com', password: 'secret123' });

    component.submit();
    fixture.detectChanges();

    expect(component.error()).toContain('No se pudo conectar');
  });

  it('toggles between login and register mode', () => {
    expect(component.mode()).toBe('login');

    component.toggleMode();
    expect(component.mode()).toBe('register');

    component.toggleMode();
    expect(component.mode()).toBe('login');
  });
});