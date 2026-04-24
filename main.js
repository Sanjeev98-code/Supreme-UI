const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Store config in userData
const configPath = path.join(app.getPath('userData'), 'config.json');

function getConfig() {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return {};
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    backgroundColor: '#1B2A3D',
  });

  win.loadFile('index.html');

  win.once('ready-to-show', () => {
    win.show();
  });

  // Custom title bar controls
  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window-close', () => win.close());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: File Dialog ────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-file-dialog', async () => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    defaultPath: 'MasterData.xlsx',
  });
  if (!result.canceled && result.filePath) {
    // Create empty workbook with all required sheets
    const wb = XLSX.utils.book_new();
    const sheets = ['Employees', 'Zones', 'Branches', 'Brands', 'Reports', 'Distribution', 'Logs'];
    sheets.forEach(name => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([]), name);
    });
    XLSX.writeFile(wb, result.filePath);
    return result.filePath;
  }
  return null;
});

ipcMain.handle('get-data-path', () => {
  const config = getConfig();
  return config.dataPath || null;
});

ipcMain.handle('save-data-path', (_, dataPath) => {
  const config = getConfig();
  config.dataPath = dataPath;
  saveConfig(config);
  return true;
});

// ─── IPC: Read Excel ──────────────────────────────────────────────────────────
ipcMain.handle('read-excel', (_, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { error: 'File not found: ' + filePath };
    const workbook = XLSX.readFile(filePath);
    const result = {};
    workbook.SheetNames.forEach((name) => {
      result[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
    });
    return { data: result, sheets: workbook.SheetNames };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── IPC: Write Excel ─────────────────────────────────────────────────────────
ipcMain.handle('write-excel', (_, { filePath, sheetName, data }) => {
  try {
    let workbook;
    if (fs.existsSync(filePath)) {
      workbook = XLSX.readFile(filePath);
    } else {
      workbook = XLSX.utils.book_new();
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    if (workbook.SheetNames.includes(sheetName)) {
      workbook.Sheets[sheetName] = worksheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    XLSX.writeFile(workbook, filePath);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
});

// ─── IPC: Export Excel ────────────────────────────────────────────────────────
ipcMain.handle('export-excel', async (_, { defaultPath, sheetName, data }) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    defaultPath: defaultPath || 'Export.xlsx',
  });
  if (!result.canceled && result.filePath) {
    const wb = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, worksheet, sheetName || 'Data');
    XLSX.writeFile(wb, result.filePath);
    return result.filePath;
  }
  return null;
});

// ─── IPC: Run Python Report ───────────────────────────────────────────────────
ipcMain.handle('run-report', (event, { scriptPath, args }) => {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const pyArgs = args ? [scriptPath, ...args] : [scriptPath];
    const child = spawn('python', pyArgs, { shell: true });

    child.stdout.on('data', (data) => {
      event.sender.send('report-output', { type: 'stdout', text: data.toString() });
    });
    child.stderr.on('data', (data) => {
      event.sender.send('report-output', { type: 'stderr', text: data.toString() });
    });
    child.on('close', (code) => {
      event.sender.send('report-done', { code });
      resolve({ code });
    });
    child.on('error', (err) => {
      event.sender.send('report-output', { type: 'stderr', text: err.message });
      event.sender.send('report-done', { code: -1 });
      resolve({ code: -1 });
    });
  });
});

// ─── WhatsApp Service ─────────────────────────────────────────────────────────
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');

let waClient = null;
let waStatus = 'disconnected'; // 'disconnected' | 'qr' | 'ready' | 'initializing'
let mainWindow = null;

function getMainWindow() {
  if (!mainWindow) {
    mainWindow = BrowserWindow.getAllWindows()[0];
  }
  return mainWindow;
}

function sendToRenderer(channel, data) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function createWAClient() {
  if (waClient) {
    try { waClient.destroy(); } catch(e) {}
  }

  waClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(app.getPath('userData'), 'wa_session')
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    }
  });

  waClient.on('qr', async (qr) => {
    waStatus = 'qr';
    try {
      const qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
      sendToRenderer('wa-qr', qrDataUrl);
    } catch(e) {
      sendToRenderer('wa-qr', null);
    }
  });

  waClient.on('ready', () => {
    waStatus = 'ready';
    sendToRenderer('wa-ready', { status: 'ready' });
  });

  waClient.on('authenticated', () => {
    sendToRenderer('wa-status-update', { status: 'authenticated', message: 'Session authenticated' });
  });

  waClient.on('auth_failure', (msg) => {
    waStatus = 'disconnected';
    sendToRenderer('wa-disconnected', { reason: 'Auth failed: ' + msg });
  });

  waClient.on('disconnected', (reason) => {
    waStatus = 'disconnected';
    sendToRenderer('wa-disconnected', { reason: reason || 'Connection lost' });
  });

  return waClient;
}

// IPC: Initialize WhatsApp
ipcMain.handle('wa-init', async () => {
  try {
    waStatus = 'initializing';
    sendToRenderer('wa-status-update', { status: 'initializing', message: 'Starting WhatsApp...' });
    const client = createWAClient();
    await client.initialize();
    return { success: true };
  } catch(e) {
    waStatus = 'disconnected';
    return { error: e.message };
  }
});

// IPC: Get status
ipcMain.handle('wa-get-status', () => {
  return { status: waStatus };
});

// IPC: Send file to a phone number or group
ipcMain.handle('wa-send-file', async (event, { target, targetType, filePath }) => {
  if (!waClient || waStatus !== 'ready') {
    return { error: 'WhatsApp is not connected' };
  }
  try {
    const media = MessageMedia.fromFilePath(filePath);

    if (targetType === 'phone') {
      // target = phone number like +919876543210 → convert to 919876543210@c.us
      const chatId = target.replace('+', '') + '@c.us';
      await waClient.sendMessage(chatId, media);
      return { success: true, sentTo: target };
    } else if (targetType === 'group') {
      // target = group name — search chats
      const chats = await waClient.getChats();
      const groupChat = chats.find(c => c.isGroup && c.name === target);
      if (!groupChat) {
        return { error: 'Group not found: ' + target };
      }
      await groupChat.sendMessage(media);
      return { success: true, sentTo: target };
    }
    return { error: 'Invalid target type' };
  } catch(e) {
    return { error: e.message };
  }
});

// IPC: Send text message
ipcMain.handle('wa-send-message', async (event, { target, targetType, message }) => {
  if (!waClient || waStatus !== 'ready') {
    return { error: 'WhatsApp is not connected' };
  }
  try {
    if (targetType === 'phone') {
      const chatId = target.replace('+', '') + '@c.us';
      await waClient.sendMessage(chatId, message);
      return { success: true };
    } else if (targetType === 'group') {
      const chats = await waClient.getChats();
      const groupChat = chats.find(c => c.isGroup && c.name === target);
      if (!groupChat) return { error: 'Group not found: ' + target };
      await groupChat.sendMessage(message);
      return { success: true };
    }
    return { error: 'Invalid target type' };
  } catch(e) {
    return { error: e.message };
  }
});

// IPC: Logout / disconnect
ipcMain.handle('wa-logout', async () => {
  try {
    if (waClient) {
      await waClient.logout();
      await waClient.destroy();
    }
    waClient = null;
    waStatus = 'disconnected';
    return { success: true };
  } catch(e) {
    waClient = null;
    waStatus = 'disconnected';
    return { error: e.message };
  }
});

// IPC: Pick file to send
ipcMain.handle('wa-pick-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Documents', extensions: ['pdf', 'xlsx', 'xls', 'csv', 'doc', 'docx'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// ─── Email Service (Nodemailer) ───────────────────────────────────────────────
const nodemailer = require('nodemailer');

const EMAIL_USER = 'automations@supremeparadise.in';
const EMAIL_PASS = 'tvugojpknddwxgmi';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

ipcMain.handle('email-send-file', async (event, { to, subject, body, filePath, fileName }) => {
  try {
    const mailOptions = {
      from: EMAIL_USER,
      to: to,
      subject: subject || 'Automated Report',
      text: body || 'Please find the attached report.',
      attachments: [
        {
          filename: fileName || path.basename(filePath),
          path: filePath
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { error: error.message };
  }
});
