import { Injectable, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrowserService {

  url = 'https://amiens.unilasalle.fr';
  canGoBack = false;
  canGoForward = false;

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
}
