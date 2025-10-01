const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
  toogleDevTool: () => ipcRenderer.send('toogle-dev-tool'),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  refresh: () => ipcRenderer.send('refresh'),

  canGoForward: () => ipcRenderer.invoke('can-go-forward'),
  canGoBack: () => ipcRenderer.invoke('can-go-back'),
  goToPage: (url) => ipcRenderer.invoke('go-to-page', url),
  currentUrl: () => ipcRenderer.invoke('current-url'),
  
  onNavigationUpdated: (callback) => {
    ipcRenderer.on('navigation-updated', (event, url) => callback(url));
  },

  // View visibility control
  hideWebView: () => ipcRenderer.send('hide-web-view'),
  showWebView: () => ipcRenderer.send('show-web-view'),

  // Cookie management API
  getCookies: () => ipcRenderer.invoke('get-cookies'),
  getCookiesForUrl: (url) => ipcRenderer.invoke('get-cookies-for-url', url),
  onCookieChanged: (callback) => {
    ipcRenderer.on('cookie-changed', (event, data) => callback(data));
  },
  clearAllCookies: () => ipcRenderer.invoke('clear-all-cookies'),
  deleteCookiesByDomain: (domain) => ipcRenderer.invoke('delete-cookies-by-domain', domain)
})

