
const { ipcRenderer } = require('electron');

function showInfoMessage(msg) {
    ipcRenderer.send('show-message', msg);
}

function showErrorMessage(from, err) {
    ipcRenderer.send('show-error', ['Renderer ' + from, err.toString()]);
}
