const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
  // Excel operations
  readExcel: (filePath) => ipcRenderer.invoke('read-excel', filePath),
  writeExcel: (filePath, sheetName, data) => ipcRenderer.invoke('write-excel', { filePath, sheetName, data }),

  // Report trigger
  runReport: (scriptPath, args) => ipcRenderer.invoke('run-report', { scriptPath, args }),
  onReportOutput: (callback) => ipcRenderer.on('report-output', (_, data) => callback(data)),
  onReportDone: (callback) => ipcRenderer.on('report-done', (_, data) => callback(data)),
  removeReportListeners: () => {
    ipcRenderer.removeAllListeners('report-output');
    ipcRenderer.removeAllListeners('report-done');
  },

  // File dialog
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: () => ipcRenderer.invoke('save-file-dialog'),
  exportExcel: (options) => ipcRenderer.invoke('export-excel', options),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  saveDataPath: (path) => ipcRenderer.invoke('save-data-path', path),

  // WhatsApp
  waInit: () => ipcRenderer.invoke('wa-init'),
  waGetStatus: () => ipcRenderer.invoke('wa-get-status'),
  waSendFile: (opts) => ipcRenderer.invoke('wa-send-file', opts),
  waSendMessage: (opts) => ipcRenderer.invoke('wa-send-message', opts),
  waLogout: () => ipcRenderer.invoke('wa-logout'),
  waPickFile: () => ipcRenderer.invoke('wa-pick-file'),
  onWaQR: (cb) => ipcRenderer.on('wa-qr', (_, data) => cb(data)),
  onWaReady: (cb) => ipcRenderer.on('wa-ready', (_, data) => cb(data)),
  onWaDisconnected: (cb) => ipcRenderer.on('wa-disconnected', (_, data) => cb(data)),
  onWaStatusUpdate: (cb) => ipcRenderer.on('wa-status-update', (_, data) => cb(data)),
  removeWaListeners: () => {
    ipcRenderer.removeAllListeners('wa-qr');
    ipcRenderer.removeAllListeners('wa-ready');
    ipcRenderer.removeAllListeners('wa-disconnected');
    ipcRenderer.removeAllListeners('wa-status-update');
  },

  // Email
  sendEmail: (opts) => ipcRenderer.invoke('email-send-file', opts),
});
