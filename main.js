const { app, WebContentsView, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

// Disable hardware acceleration to fix VSync errors on Linux
app.disableHardwareAcceleration();

// Add Chrome command line switches to improve graphics performance
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

app.whenReady().then(() => {

  const toolbarHeight = 128;
  let cookiePanelWidth = 0;

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

  function fitViewToWin() {
    const contentBounds = win.getContentBounds();
    const width = Math.max(0, contentBounds.width - cookiePanelWidth);
    const height = Math.max(0, contentBounds.height - toolbarHeight);

    view.setBounds({
      x: 0,
      y: toolbarHeight,
      width,
      height
    });
  }

  // Register events handling from the toolbar
  ipcMain.on('toogle-dev-tool', () => {
    if (win.webContents.isDevToolsOpened()) {
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

  ipcMain.on('navigate-home', () => {
    view.webContents.loadURL('https://amiens.unilasalle.fr');
  });

  ipcMain.on('cookie-panel-state', (_event, state) => {
    const { open = false, width = 0 } = state || {};
    const panelWidth = open ? Math.max(0, width || 600) : 0;
    cookiePanelWidth = Math.min(panelWidth, win.getContentBounds().width);
    fitViewToWin();
  });

  // Cookie management handlers
  ipcMain.handle('get-cookies', async () => {
    try {
      const cookies = await view.webContents.session.cookies.get({});
      return cookies;
    } catch (error) {
      console.error('Error getting cookies:', error);
      return [];
    }
  });

  ipcMain.handle('get-cookies-for-domain', async (event, domain) => {
    try {
      const cookies = await view.webContents.session.cookies.get({ domain });
      return cookies;
    } catch (error) {
      console.error('Error getting cookies for domain:', error);
      return [];
    }
  });

  ipcMain.handle('clear-cookies', async () => {
    try {
      await view.webContents.session.clearStorageData({ storages: ['cookies'] });
      return true;
    } catch (error) {
      console.error('Error clearing cookies:', error);
      return false;
    }
  });

  //Register events handling from the main windows
  win.once('ready-to-show', () => {
    fitViewToWin();
    view.webContents.loadURL('https://amiens.unilasalle.fr');
  });

  win.on('resize', () => {
    fitViewToWin();
  });

  // Listen to navigation events to update the address bar
  view.webContents.on('did-navigate', () => {
    win.webContents.send('url-changed', view.webContents.getURL());
  });


})
