const { app, WebContentsView, BrowserWindow, ipcMain, session } = require('electron');
const path = require('node:path');

app.whenReady().then(() => {

  // BrowserWindow initiate the rendering of the angular toolbar
  const win = new BrowserWindow({
    width: 800,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (app.isPackaged){
    win.loadFile('dist/browser-template/browser/index.html');
  }else{
    win.loadURL('http://localhost:4200')
  }


  // WebContentsView initiate the rendering of a second view to browser the web
  const view = new WebContentsView();
  win.contentView.addChildView(view);

  // Always fit the web rendering with the electron windows
  function fitViewToWin() {
    const winSize = win.webContents.getOwnerBrowserWindow().getBounds();
    view.setBounds({ x: 0, y: 55, width: winSize.width, height: winSize.height });
  }

    //win.webContents.openDevTools({ mode: 'detach' });

  // Register events handling from the toolbar
  ipcMain.on('toogle-dev-tool', () => {
    if (winContent.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  ipcMain.on('go-back', () => {
    view.webContents.navigationHistory.goBack();
  });

  ipcMain.handle('can-go-back', () => {
    return view.webContents.navigationHistory.canGoBack();
  });

  ipcMain.on('go-forward', () => {
    view.webContents.navigationHistory.goForward();
  });

  ipcMain.handle('can-go-forward', () => {
    return view.webContents.navigationHistory.canGoForward();
  });

  ipcMain.on('refresh', () => {
    view.webContents.reload();
  });

  ipcMain.handle('go-to-page', (event, url) => {
    return view.webContents.loadURL(url);
  });


  ipcMain.handle('current-url', () => {
    return view.webContents.getURL();
  });

  // View visibility management
  ipcMain.on('hide-web-view', () => {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  });

  ipcMain.on('show-web-view', () => {
    fitViewToWin();
  });

  // Cookie management handlers
  ipcMain.handle('get-cookies', async () => {
    try {
      const cookies = await session.defaultSession.cookies.get({});
      return cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        sameSite: cookie.sameSite
      }));
    } catch (error) {
      console.error('Error fetching cookies:', error);
      return [];
    }
  });

  ipcMain.handle('get-cookies-for-url', async (event, url) => {
    try {
      const cookies = await session.defaultSession.cookies.get({ url });
      return cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        sameSite: cookie.sameSite
      }));
    } catch (error) {
      console.error('Error fetching cookies for URL:', error);
      return [];
    }
  });

  // Listen to cookie changes and notify the renderer
  session.defaultSession.cookies.on('changed', (event, cookie, cause, removed) => {
    win.webContents.send('cookie-changed', {
      cookie: {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: cookie.expirationDate,
        sameSite: cookie.sameSite
      },
      cause,
      removed
    });
  });

  // Delete cookies
  ipcMain.handle('clear-all-cookies', async () => {
    try {
      await session.defaultSession.clearStorageData({ storages: ['cookies'] });
      return { success: true };
    } catch (error) {
      console.error('Error clearing cookies:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-cookies-by-domain', async (event, domain) => {
    try {
      const cookies = await session.defaultSession.cookies.get({ domain });
      for (const cookie of cookies) {
        const url = `${cookie.secure ? 'https' : 'http'}://${cookie.domain}${cookie.path}`;
        await session.defaultSession.cookies.remove(url, cookie.name);
      }
      return { success: true, count: cookies.length };
    } catch (error) {
      console.error('Error deleting cookies:', error);
      return { success: false, error: error.message };
    }
  });

  //Register events handling from the main windows
  win.once('ready-to-show', () => {
    fitViewToWin();
    view.webContents.loadURL('https://amiens.unilasalle.fr');
  });

  win.on('resized', () => {
    fitViewToWin();
  });

  // Listen to navigation events to update the address bar
  view.webContents.on('did-navigate', (event, url) => {
    win.webContents.send('navigation-updated', url);
  });

  view.webContents.on('did-navigate-in-page', (event, url) => {
    win.webContents.send('navigation-updated', url);
  });

  //resize the view when the window is resized
  win.on('resize', () => {
    fitViewToWin();
  });
});
