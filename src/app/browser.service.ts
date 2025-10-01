import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
  sameSite?: string;
}

export interface CookieChangeEvent {
  cookie: Cookie;
  cause: string;
  removed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BrowserService {

  url = 'https://amiens.unilasalle.fr';
  canGoBack = false;
  canGoForward = false;

  private cookiesSubject = new BehaviorSubject<Cookie[]>([]);
  public cookies$: Observable<Cookie[]> = this.cookiesSubject.asObservable();

// @ts-ignore
  electronAPI = window.electronAPI;

  constructor(private ngZone: NgZone) {
    // Listen to navigation updates from Electron
    if (this.electronAPI && this.electronAPI.onNavigationUpdated) {
      this.electronAPI.onNavigationUpdated((newUrl: string) => {
        // Run inside Angular's zone to trigger change detection
        this.ngZone.run(() => {
          this.url = newUrl;
          this.updateHistory();
          this.refreshCookies(); // Refresh cookies on navigation
        });
      });
    }

    // Listen to cookie changes
    if (this.electronAPI && this.electronAPI.onCookieChanged) {
      this.electronAPI.onCookieChanged((data: CookieChangeEvent) => {
        this.ngZone.run(() => {
          this.refreshCookies();
        });
      });
    }
  }

  toogleDevTool() {
    this.electronAPI.toogleDevTool();
  }

  goBack() {
    this.electronAPI.goBack();
    this.updateHistory();
  }

  goForward() {
    this.electronAPI.goForward();
    this.updateHistory();
  }

  refresh() {
    this.electronAPI.refresh();
  }

  goHome() {
    this.goToPage('https://amiens.unilasalle.fr');
  }

  goToPage(url: string) {
    this.electronAPI.goToPage(url)
      .then(() => this.updateHistory());
  }

  setToCurrentUrl() {
    this.electronAPI.currentUrl()
      .then((url :string) => {
        this.url = url;
      });
  }

  updateHistory() {
    this.setToCurrentUrl();

    this.electronAPI.canGoBack()
      .then((canGoBack : boolean) => this.canGoBack = canGoBack);

    this.electronAPI.canGoForward()
      .then((canGoForward : boolean) => this.canGoForward = canGoForward);
  }

  // Cookie management methods
  async getCookies(): Promise<Cookie[]> {
    if (this.electronAPI && this.electronAPI.getCookies) {
      const cookies = await this.electronAPI.getCookies();
      this.cookiesSubject.next(cookies);
      return cookies;
    }
    return [];
  }

  async getCookiesForUrl(url: string): Promise<Cookie[]> {
    if (this.electronAPI && this.electronAPI.getCookiesForUrl) {
      return await this.electronAPI.getCookiesForUrl(url);
    }
    return [];
  }

  refreshCookies(): void {
    this.getCookies();
  }

  getCurrentCookies(): Cookie[] {
    return this.cookiesSubject.value;
  }

  // View visibility control
  hideWebView(): void {
    if (this.electronAPI && this.electronAPI.hideWebView) {
      this.electronAPI.hideWebView();
    }
  }

  showWebView(): void {
    if (this.electronAPI && this.electronAPI.showWebView) {
      this.electronAPI.showWebView();
    }
  }

  // Cookie deletion methods
  async clearAllCookies(): Promise<any> {
    if (this.electronAPI && this.electronAPI.clearAllCookies) {
      const result = await this.electronAPI.clearAllCookies();
      this.refreshCookies();
      return result;
    }
    return { success: false };
  }

  async deleteCookiesByDomain(domain: string): Promise<any> {
    if (this.electronAPI && this.electronAPI.deleteCookiesByDomain) {
      const result = await this.electronAPI.deleteCookiesByDomain(domain);
      this.refreshCookies();
      return result;
    }
    return { success: false };
  }
}
