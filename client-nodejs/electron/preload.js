window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }
 
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    }

  })

const { contextBridge, ipcRenderer } = require('electron');
const path = require("path");
// contextBridge.exposeInMainWorld('io', {
//     openFolderDialog: () => ipcRenderer.invoke('openFolderDialog'),
//     newFile: (filePath, fileName) => ipcRenderer.invoke('newFile', filePath, fileName),
//     unzipFile: (filePath, fileName) => ipcRenderer.invoke('unzipFile', filePath, fileName),
//     deleteFile: (filePath) => ipcRenderer.invoke('deleteFile', filePath),
//     copyFolder: (sourcePath, destinationPath) => ipcRenderer.invoke('copyFolder', sourcePath, destinationPath),
// });

contextBridge.exposeInMainWorld('nodejs', {
  path: () => path,
  dirname: () => __dirname,
})

// contextBridge.exposeInMainWorld('net', {
//     downloadFile: (destination, fileUrl) => ipcRenderer.invoke('downloadFile', destination, fileUrl),
// });