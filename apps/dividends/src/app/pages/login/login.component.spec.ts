import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { LoginComponent, PASSWORD_MIN_LENGTH } from './login.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let router: Router;
  let toastService: ToastService;

  const mockAuthService = {
    login: vi.fn(),
  };

  const mockRouter = {
    navigate: vi.fn(),
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const fillForm = (email: string, password: string) => {
    component.loginForm.email().value.set(email);
    component.loginForm.password().value.set(password);
  };

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  beforeEach(async () => {
    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress console errors during tests
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize login form with empty values', () => {
    expect(component.loginForm.email().value()).toBe('');
    expect(component.loginForm.password().value()).toBe('');
  });

  it('should mark form as invalid when fields are empty', () => {
    expect(component.loginForm().valid()).toBe(false);
    expect(component.loginForm.email().errors().map((e) => e.kind)).toContain('required');
    expect(component.loginForm.password().errors().map((e) => e.kind)).toContain('required');
  });

  it('should mark form as valid when fields are filled correctly', () => {
    fillForm('test@example.com', 'password123');

    expect(component.loginForm().valid()).toBe(true);
  });

  it('should keep the model signal in sync with the form', () => {
    fillForm('test@example.com', 'password123');

    expect(component.credentials()).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should validate email format', () => {
    const emailField = component.loginForm.email;

    emailField().value.set('invalid-email');
    expect(emailField().errors().map((e) => e.kind)).toContain('email');

    emailField().value.set('valid@example.com');
    expect(emailField().errors()).toEqual([]);
  });

  it('should validate password minimum length', () => {
    const passwordField = component.loginForm.password;

    passwordField().value.set('x'.repeat(PASSWORD_MIN_LENGTH - 1));
    expect(passwordField().errors().map((e) => e.kind)).toContain('minLength');

    passwordField().value.set('x'.repeat(PASSWORD_MIN_LENGTH));
    expect(passwordField().errors()).toEqual([]);
  });

  describe('template', () => {
    it('should bind input values to the form model', () => {
      const emailInput = query('#email') as HTMLInputElement;
      emailInput.value = 'typed@example.com';
      emailInput.dispatchEvent(new Event('input'));

      expect(component.loginForm.email().value()).toBe('typed@example.com');
    });

    it('should disable the submit button while the form is invalid', () => {
      const button = query('button[type="submit"]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);

      fillForm('test@example.com', 'password123');
      fixture.detectChanges();

      expect(button.disabled).toBe(false);
    });

    it('should show validation messages only after the field was touched', () => {
      expect(query('.error-message')).toBeNull();

      component.loginForm.password().value.set('short');
      component.loginForm.password().markAsTouched();
      fixture.detectChanges();

      expect(query('.error-message')?.textContent).toContain(
        `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein`
      );
    });
  });

  describe('onSubmit', () => {
    it('should not submit when form is invalid', async () => {
      fillForm('', '');

      const result = await component.onSubmit();

      expect(result).toBe(false);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when submitting an invalid form', async () => {
      await component.onSubmit();

      expect(component.loginForm.email().touched()).toBe(true);
      expect(component.loginForm.password().touched()).toBe(true);
    });

    it('should login successfully and navigate to home', async () => {
      const mockResponse = {
        access_token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockAuthService.login.mockReturnValue(of(mockResponse));
      fillForm('test@example.com', 'password123');

      await component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toastService.success).toHaveBeenCalledWith('Login successful!');
      expect(router.navigate).toHaveBeenCalledWith(['/']);
      expect(component.isLoading()).toBe(false);
    });

    it('should handle login error', async () => {
      const errorResponse = {
        error: { message: 'Invalid credentials' },
      };

      mockAuthService.login.mockReturnValue(throwError(() => errorResponse));
      fillForm('test@example.com', 'wrongpassword');

      await component.onSubmit();

      expect(component.error()).toBe('Invalid credentials');
      expect(toastService.error).toHaveBeenCalledWith('Invalid credentials');
      expect(component.isLoading()).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should use default error message when error message is not provided', async () => {
      mockAuthService.login.mockReturnValue(throwError(() => ({})));
      fillForm('test@example.com', 'password123');

      await component.onSubmit();

      expect(component.error()).toBe('Invalid credentials');
      expect(toastService.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it('should set isLoading to true during login', async () => {
      const subject = new Subject();
      mockAuthService.login.mockReturnValue(subject.asObservable());
      fillForm('test@example.com', 'password123');

      const submission = component.onSubmit();
      await vi.waitFor(() => expect(authService.login).toHaveBeenCalled());

      expect(component.isLoading()).toBe(true);

      subject.next({
        access_token: 'mock-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });
      subject.complete();
      await submission;

      expect(component.isLoading()).toBe(false);
    });

    it('should submit when the form element is submitted', async () => {
      mockAuthService.login.mockReturnValue(of({ access_token: 't', user: {} }));
      fillForm('test@example.com', 'password123');
      fixture.detectChanges();

      (query('form') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true }));

      await vi.waitFor(() => expect(authService.login).toHaveBeenCalled());
    });
  });
});
