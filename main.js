
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Xử lý sự kiện cài đặt/gỡ cài đặt trên Windows
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

function createWindow() {
  // Tạo cửa sổ trình duyệt.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SQTT Smart Broadcast",
    icon: path.join(__dirname, 'public/icon.png'), // Đảm bảo bạn có file icon
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Cho phép sử dụng Node.js trong render nếu cần (lưu ý bảo mật)
      webSecurity: false // Tạm tắt để load local file dễ dàng hơn trong môi trường offline
    },
    autoHideMenuBar: true, // Ẩn thanh menu mặc định
  });

  // Trong môi trường development, load từ localhost
  // Trong production (đã đóng gói), load file index.html từ thư mục dist
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
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
