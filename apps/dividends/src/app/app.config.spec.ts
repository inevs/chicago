import { NgZone, ɵNoopNgZone as NoopNgZone, ɵZONELESS_ENABLED as ZONELESS_ENABLED } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
  });

  it('uses zoneless change detection', () => {
    expect(TestBed.inject(ZONELESS_ENABLED)).toBe(true);
    expect(TestBed.inject(NgZone)).toBeInstanceOf(NoopNgZone);
  });

  it('does not load Zone.js', () => {
    expect((globalThis as { Zone?: unknown }).Zone).toBeUndefined();
  });
});
