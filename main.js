
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 850,
    frame: false, // Removes standard OS window frame
    resizable: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // In a real local setup, you'd point this to your local dev server or index.html
    }
  });

  // For this environment, we assume the index.html is in the same directory
  win.loadFile('index.html');

  // Optional: Open DevTools if needed for debugging
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
