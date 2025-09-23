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

  constructor(private zone: NgZone) {
    if (this.electronAPI?.onUrlChanged) {
      this.electronAPI.onUrlChanged((url: string) => {
        this.zone.run(() => {
        this.url = url;
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

  goToPage(url: string) {
    this.electronAPI.goToPage(url)
      .then(() => this.updateHistory());
  }

  goHome() {
    this.url = 'https://amiens.unilasalle.fr';
    this.goToPage(this.url);
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
