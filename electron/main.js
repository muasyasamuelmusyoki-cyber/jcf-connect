const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const ALLOWED_URL = 'https://jcf-connect.onrender.com';

function isAllowedURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' &&
               parsed.hostname === 'jcf-connect.onrender.com';
    } catch {
        return false;
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: 'JCF Connect',

        icon: path.join(__dirname, 'icons', 'icon.ico'),

        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        }
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
        if (isAllowedURL(url)) {
            return { action: 'allow' };
        }

        shell.openExternal(url);
        return { action: 'deny' };
    });

    win.webContents.on('will-navigate', (event, url) => {
        if (!isAllowedURL(url)) {
            event.preventDefault();
            shell.openExternal(url);
        }
    });

    

    win.loadURL(`${ALLOWED_URL}/pages/login.html`);
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