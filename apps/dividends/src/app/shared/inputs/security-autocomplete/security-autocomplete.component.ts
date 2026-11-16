import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService } from '../../../services/security.service';
import { Security } from '@dividends/shared';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-security-autocomplete',
  imports: [CommonModule, FormsModule],
  templateUrl: './security-autocomplete.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./security-autocomplete.component.scss'],
})
export class SecurityAutocompleteComponent {
  private readonly securityService = inject(SecurityService);

  value = input<string>('');
  placeholder = input<string>('z.B. Apple Inc. oder AAPL');
  securitySelected = output<Security>();

  searchTerm = signal<string>('');
  suggestions = signal<Security[]>([]);
  showSuggestions = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  private searchSubject = new Subject<string>();

  constructor() {
    // Sync input value with search term
    effect(() => {
      this.searchTerm.set(this.value());
    });

    // Setup debounced search
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(query => {
        this.performSearch(query);
      });
  }

  onInputChange(value: string) {
    this.searchTerm.set(value);
    this.showSuggestions.set(true);

    if (value.trim().length === 0) {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    this.isLoading.set(true);
    this.searchSubject.next(value);
  }

  private performSearch(query: string) {
    if (query.trim().length === 0) {
      this.suggestions.set([]);
      this.isLoading.set(false);
      return;
    }

    this.securityService.searchSecurities(query).subscribe({
      next: (securities) => {
        this.suggestions.set(securities);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error searching securities:', error);
        this.suggestions.set([]);
        this.isLoading.set(false);
      }
    });
  }

  selectSecurity(security: Security) {
    this.searchTerm.set(security.name);
    this.showSuggestions.set(false);
    this.suggestions.set([]);
    this.securitySelected.emit(security);
  }

  onBlur() {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.showSuggestions.set(false);
    }, 200);
  }

  onFocus() {
    if (this.searchTerm().trim().length > 0 && this.suggestions().length > 0) {
      this.showSuggestions.set(true);
    }
  }
}
