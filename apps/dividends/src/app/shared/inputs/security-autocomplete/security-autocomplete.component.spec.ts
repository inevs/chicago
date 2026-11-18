import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Security } from '@dividends/shared';
import { SecurityAutocompleteComponent } from './security-autocomplete.component';
import { SecurityService } from '../../../services/security.service';

describe('SecurityAutocompleteComponent (zoneless)', () => {
  let fixture: ComponentFixture<SecurityAutocompleteComponent>;
  let component: SecurityAutocompleteComponent;
  let searchResults: Subject<Security[]>;
  let searchSecurities: ReturnType<typeof vi.fn>;

  const apple = {
    id: 'sec-1',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    currency: 'USD',
    type: 'STOCK',
  } as Security;

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const suggestionItems = () =>
    fixture.nativeElement.querySelectorAll('[role="button"]') as NodeListOf<HTMLElement>;

  beforeEach(async () => {
    vi.useFakeTimers();
    searchResults = new Subject<Security[]>();
    searchSecurities = vi.fn(() => searchResults.asObservable());

    await TestBed.configureTestingModule({
      imports: [SecurityAutocompleteComponent],
      providers: [{ provide: SecurityService, useValue: { searchSecurities } }],
    }).compileComponents();

    fixture = TestBed.createComponent(SecurityAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The zoneless scheduler runs change detection from a (faked) timer, so the
  // timers have to be flushed before the fixture becomes stable.
  async function settle() {
    await vi.advanceTimersByTimeAsync(50);
    await fixture.whenStable();
  }

  async function typeQuery(value: string) {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(300);
    searchResults.next([apple]);
    await settle();
  }

  it('renders debounced search results without manual change detection', async () => {
    await typeQuery('App');

    expect(searchSecurities).toHaveBeenCalledWith('App');
    expect(suggestionItems()).toHaveLength(1);
    expect(suggestionItems()[0].textContent).toContain('Apple Inc.');
  });

  it('hides the suggestions after the blur delay', async () => {
    await typeQuery('App');
    expect(suggestionItems()).toHaveLength(1);

    input().dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(200);
    await settle();

    expect(component.showSuggestions()).toBe(false);
    expect(suggestionItems()).toHaveLength(0);
  });

  it('emits the selected security and closes the list', async () => {
    const selected: Security[] = [];
    component.securitySelected.subscribe((s) => selected.push(s));
    await typeQuery('App');

    suggestionItems()[0].click();
    await settle();

    expect(selected).toEqual([apple]);
    expect(input().value).toBe('Apple Inc.');
    expect(suggestionItems()).toHaveLength(0);
  });
});
