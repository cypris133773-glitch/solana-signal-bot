// Electron shell for the Steam build. The game itself is the single
// self-contained index.html — this only gives it a window.
// `npm run copy` pulls the current index.html in from the parent directory.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("node:path");

const GAME = path.join(__dirname, "index.html");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 720,
    backgroundColor: "#0C0704",
    title: "HEXQUEST: The Sacrifice Phase",
    show: false,
    webPreferences: {
      // The page is trusted local content, but it needs no Node access at all.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.once("ready-to-show", () => win.show());
  win.loadFile(GAME);

  // Nothing in the game links out; if that ever changes, open it in the
  // real browser rather than inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

Menu.setApplicationMenu(
  Menu.buildFromTemplate([
    {
      label: "Game",
      submenu: [
        { role: "reload", label: "Restart" },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "quit" }
      ]
    }
  ])
);

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
