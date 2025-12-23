import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dividends_page_size';
const DEFAULT_PAGE_SIZE = 5;
const ALLOWED_PAGE_SIZES = [5, 10, 20] as const;

export type PageSize = typeof ALLOWED_PAGE_SIZES[number];

@Injectable({
  providedIn: 'root',
})
export class PaginationStateService {
  private readonly pageSize = signal<PageSize>(this.loadPageSize());
  private readonly currentPage = signal(1);

  getPageSize() {
    return this.pageSize.asReadonly();
  }

  getCurrentPage() {
    return this.currentPage.asReadonly();
  }

  setPageSize(size: PageSize) {
    this.pageSize.set(size);
    this.currentPage.set(1); // Reset to first page when changing page size
    this.savePageSize(size);
  }

  setCurrentPage(page: number) {
    this.currentPage.set(page);
  }

  resetPagination() {
    this.currentPage.set(1);
  }

  private loadPageSize(): PageSize {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (ALLOWED_PAGE_SIZES.includes(parsed as PageSize)) {
          return parsed as PageSize;
        }
      }
    } catch (error) {
      console.warn('Failed to load page size from localStorage:', error);
    }
    return DEFAULT_PAGE_SIZE;
  }

  private savePageSize(size: PageSize) {
    try {
      localStorage.setItem(STORAGE_KEY, size.toString());
    } catch (error) {
      console.warn('Failed to save page size to localStorage:', error);
    }
  }
}
