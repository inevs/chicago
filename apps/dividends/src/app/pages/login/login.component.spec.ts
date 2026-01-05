import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;
  let router: Router;
  let toastService: ToastService;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockRouter = {
    navigate: jest.fn(),
  };

  const mockToastService = {
    success: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress console errors during tests
    });

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
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
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize login form with empty values', () => {
    expect(component.loginForm.get('email')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should mark form as invalid when fields are empty', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should mark form as valid when fields are filled correctly', () => {
    component.loginForm.patchValue({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(component.loginForm.valid).toBe(true);
  });

  it('should validate email format', () => {
    const emailControl = component.loginForm.get('email');

    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBe(true);

    emailControl?.setValue('valid@example.com');
    expect(emailControl?.hasError('email')).toBe(false);
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.loginForm.get('password');

    passwordControl?.setValue('1234567');
    expect(passwordControl?.hasError('minlength')).toBe(true);

    passwordControl?.setValue('12345678');
    expect(passwordControl?.hasError('minlength')).toBe(false);
  });

  describe('onSubmit', () => {
    it('should not submit when form is invalid', () => {
      component.loginForm.patchValue({
        email: '',
        password: '',
      });

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should login successfully and navigate to home', (done) => {
      const mockResponse = {
        access_token: 'mock-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      mockAuthService.login.mockReturnValue(of(mockResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      setTimeout(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(toastService.success).toHaveBeenCalledWith('Login successful!');
        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(component.isLoading()).toBe(false);
        done();
      }, 0);
    });

    it('should handle login error', (done) => {
      const errorResponse = {
        error: { message: 'Invalid credentials' },
      };

      mockAuthService.login.mockReturnValue(throwError(() => errorResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      component.onSubmit();

      setTimeout(() => {
        expect(component.error()).toBe('Invalid credentials');
        expect(toastService.error).toHaveBeenCalledWith('Invalid credentials');
        expect(component.isLoading()).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should use default error message when error message is not provided', (done) => {
      const errorResponse = {};

      mockAuthService.login.mockReturnValue(throwError(() => errorResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      setTimeout(() => {
        expect(component.error()).toBe('Invalid credentials');
        expect(toastService.error).toHaveBeenCalledWith('Invalid credentials');
        done();
      }, 0);
    });

    it('should set isLoading to true during login', () => {
      const subject = new Subject();
      mockAuthService.login.mockReturnValue(subject.asObservable());

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(component.isLoading()).toBe(true);

      // Complete the observable
      subject.next({
        access_token: 'mock-token',
        user: { id: '1', email: 'test@example.com', name: 'Test' },
      });
      subject.complete();
    });
  });
});
