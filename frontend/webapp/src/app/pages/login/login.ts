import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  toggleMode(): void {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.error.set(
        'Ingresa un email válido y una contraseña de al menos 6 caracteres.'
      );
      return;
    }
    const { email, password } = this.form.value as { email: string; password: string };
    this.loading.set(true);
    this.error.set(null);

    const request =
      this.mode() === 'login' ? this.auth.login(email, password) : this.auth.register(email, password);

    request.subscribe({
      next: () => this.router.navigate(['/home']),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.error.set('Ese email ya está registrado. Inicia sesión.');
        } else if (err.status === 422) {
          this.error.set('Revisa los datos ingresados.');
        } else if (err.status === 401) {
          this.error.set('Email o contraseña incorrectos.');
        } else {
          this.error.set('No se pudo conectar con el servidor. Intenta de nuevo.');
        }
      }
    });
  }
}