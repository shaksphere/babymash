// Minimal preload. The renderer (the web app) needs nothing from Node, so we
// keep the bridge empty for security (contextIsolation on, nodeIntegration off).
// A flag is exposed so the web UI could tailor copy for the desktop build.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('babymash', {
  isElectron: true,
});
