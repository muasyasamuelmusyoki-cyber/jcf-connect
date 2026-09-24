const { app, BrowserWindow } = require('electron');
const path = require('path');

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
            nodeIntegration: false
        }
    });

    win.loadURL('https://jcf-connect.onrender.com/pages/login.html');
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