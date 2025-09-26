import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { CookiesComponent } from './cookies.component';
import { CookieService } from '../cookie.service';

class CookieServiceStub {
  getAllCookies = jasmine.createSpy('getAllCookies').and.callFake(() => Promise.resolve([]));
  getCookieStats = jasmine.createSpy('getCookieStats').and.callFake(() => Promise.resolve({
    totalCookies: 0,
    uniqueDomains: 0,
    secureCookies: 0,
    httpOnlyCookies: 0,
    domainStats: []
  }));
  getCookieGraphData = jasmine.createSpy('getCookieGraphData').and.callFake(() => Promise.resolve({
    nodes: [],
    links: []
  }));
  setCookiePanelState = jasmine.createSpy('setCookiePanelState');
}

describe('CookiesComponent', () => {
  let component: CookiesComponent;
  let fixture: ComponentFixture<CookiesComponent>;
  let cookieService: CookieServiceStub;

  beforeAll(() => {
    if (!(globalThis as any).ResizeObserver) {
      (globalThis as any).ResizeObserver = class {
        observe(): void { /* noop */ }
        unobserve(): void { /* noop */ }
        disconnect(): void { /* noop */ }
      };
    }

    if (!(globalThis as any).requestAnimationFrame) {
      (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
        return setTimeout(() => callback(Date.now()), 0);
      };
      (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
    }
  });

  beforeEach(async () => {
    cookieService = new CookieServiceStub();

    await TestBed.configureTestingModule({
      imports: [CookiesComponent, NoopAnimationsModule],
      providers: [
        { provide: CookieService, useValue: cookieService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CookiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should notify electron when opening and closing the cookie panel', fakeAsync(() => {
    component.toggleCookiePanel();
    flushMicrotasks();
    tick();
    fixture.detectChanges();
    tick();

    expect(cookieService.setCookiePanelState).toHaveBeenCalledWith(jasmine.objectContaining({ open: true }));

    cookieService.setCookiePanelState.calls.reset();

    component.toggleCookiePanel();
    flushMicrotasks();
    tick();
    fixture.detectChanges();
    tick();

    expect(cookieService.setCookiePanelState).toHaveBeenCalledWith({ open: false, width: 0 });
  }));
});