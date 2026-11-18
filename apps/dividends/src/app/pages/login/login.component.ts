import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { email, form, FormField, FormRoot, minLength, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

export const PASSWORD_MIN_LENGTH = 8;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormField, FormRoot],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  readonly credentials = signal<LoginRequest>({ email: '', password: '' });

  readonly loginForm = form(
    this.credentials,
    (path) => {
      required(path.email, { message: 'E-Mail ist erforderlich' });
      email(path.email, { message: 'Bitte gültige E-Mail eingeben' });
      required(path.password, { message: 'Passwort ist erforderlich' });
      minLength(path.password, PASSWORD_MIN_LENGTH, {
        message: `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`,
      });
    },
    {
      submission: {
        action: () => this.login(),
      },
    },
  );

  readonly isLoading = computed(() => this.loginForm().submitting());
  readonly error = signal<string | null>(null);

  onSubmit(): Promise<boolean> {
    return submit(this.loginForm);
  }

  private async login(): Promise<undefined> {
    this.error.set(null);

    try {
      await firstValueFrom(this.authService.login(this.loginForm().value()));
      this.toastService.success('Login successful!');
      this.router.navigate(['/']);
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = (err as { error?: { message?: string } })?.error?.message || 'Invalid credentials';
      this.error.set(errorMessage);
      this.toastService.error(errorMessage);
    }

    return undefined;
  }
}
