const path = require('path');
const { app, BrowserWindow } = require('electron');
// const IOHandler = require('./libs/io');
// const NetHandler = require('./libs/net');
 
const isDev = process.env.IS_DEV == "true" ? true : false;
 
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 650,
    autoHideMenuBar: true,
    resizable: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    },
  });
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });
 
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    //mainWindow.webContents.openDevTools();
  }
 
}
 
 
app.whenReady().then(() => {
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
});
 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/////////////////////// EXPRESS SERVER ///////////////////////////
// const express = require('express');
// const expressWs = require('express-ws');

// const app = express();
// expressWs(app);

// const { proxy, scriptUrl } = require('rtsp-relay')(app);

// const RTSP_URL = 'rtsp://192.168.1.18:554/1/h264';

// function createProxy(mode) {
//     return proxy({
//         url: RTSP_URL+mode,
//         transport: 'tcp',
//         verbose: true,      
//     })
// }

// app.ws('/major', createProxy("major"));
// app.ws('/minor', createProxy("minor"));

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));