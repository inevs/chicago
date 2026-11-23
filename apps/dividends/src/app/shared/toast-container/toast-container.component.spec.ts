import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { ToastService } from '../../services/toast.service';

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
    });
    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastContainerComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    toastService.clear();
  });

  function toastElements(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="alert"]'));
  }

  it('shows no toast initially', () => {
    expect(toastElements()).toHaveLength(0);
  });

  it('shows each toast with its message and type', async () => {
    toastService.success('Gespeichert');
    toastService.error('Fehlgeschlagen');
    await fixture.whenStable();

    const toasts = toastElements();
    expect(toasts).toHaveLength(2);
    expect(toasts[0].textContent).toContain('Gespeichert');
    expect(toasts[0].classList).toContain('toast-success');
    expect(toasts[1].textContent).toContain('Fehlgeschlagen');
    expect(toasts[1].classList).toContain('toast-error');
  });

  it('removes a toast when its close button is clicked', async () => {
    toastService.info('Erster Hinweis');
    toastService.warning('Zweiter Hinweis');
    await fixture.whenStable();

    const closeButton = toastElements()[0].querySelector<HTMLButtonElement>(
      'button[aria-label="Schließen"]'
    );
    closeButton?.click();
    await fixture.whenStable();

    const toasts = toastElements();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toContain('Zweiter Hinweis');
  });
});
