const electron = require('electron')
const path = require('path')
const url = require('url')
const { app, BrowserWindow, Menu, dialog, ipcMain, globalShortcut } = electron;

let win;

const fileFilters = [
    { name: 'All Files', extensions: ['*'] },
    { name: 'C', extensions: ['c'] },
    { name: 'HTML', extensions: ['html', 'htm'] },
    { name: 'Text', extensions: ['txt'] }
]

const windowTemplate = {
    width: 1024,
    height: 768,
    webPreferences: {
        nodeIntegration: true
    }
}

const menuTemplate = [
    {
        label: '&File',
        submenu: [
            {
                label: 'New',
                click() {
                    win.webContents.reload();
                },
                accelerator: 'CommandOrControl + N'
            },
            {
                label: 'Open',
                click() {
                    openFile();
                },
                accelerator: 'CommandOrControl + O'
            },
            {
                label: 'Save',
                click() {
                    sendData('file', 'save', '');
                },
                accelerator: 'CommandOrControl + S'
            },
            {
                label: 'Save As',
                click() {
                    saveFileAs();
                },
                accelerator: 'CommandOrControl + Shift + S'
            },
            {
                label: 'Close',
                click() {
                    win.webContents.reload();
                }
            },
            { type: 'separator' },
            {
                label: 'Settings',
                submenu: [{
                    label: "Compiler Paths",
                    click() {
                        openNewTempWindow('compPath', ['Compiler Path Editor', 'compilerPaths.json']);
                    }
                }]
            },
            { type: 'separator' },
            {
                label: 'Exit',
                click() {
                    app.quit();
                },
                accelerator: 'CommandOrControl + Q'
            },
        ]
    },
    {
        label: '&Edit',
        submenu: [
            {
                label: 'Select All',
                click() {
                    sendData('edit', 'select-all');
                },
                accelerator: 'CommandOrControl + A'
            },
            {
                label: 'Cut',
                click() {
                    sendData('edit', 'cut');
                },
                accelerator: 'CommandOrControl + X'
            },
            {
                label: 'Copy',
                click() {
                    sendData('edit', 'copy');
                },
                accelerator: 'CommandOrControl + C'
            },
            {
                label: 'Paste',
                click() {
                    sendData('edit', 'paste');
                },
                accelerator: 'CommandOrControl + V'
            },
            {
                label: 'Undo',
                click() {
                    sendData('edit', 'undo');
                },
                accelerator: 'CommandOrControl + Z'
            },
            {
                label: 'Redo',
                click() {
                    sendData('edit', 'redo');
                },
                accelerator: 'CommandOrControl + R'
            },
        ]
    },
    {
        label: '&Action',
        submenu: [
            {
                label: 'Compile',
                click() {
                    sendData('file', 'compile')
                },
                accelerator: 'CommandOrControl + Alt + C'
            },
            {
                label: 'Compile & Run',
                click() {
                    sendData('file', 'run')
                },
                accelerator: 'CommandOrControl + Alt + R'
            }
        ]
    },
    {
        label: '&Windows',
        submenu: [
            {
                label: 'OpenDevTools',
                click() {
                    win.webContents.openDevTools();
                },
                accelerator: 'CommandOrControl + Shift + I'
            },
            {
                label: 'Reload',
                click() {
                    win.webContents.reload();
                },
                accelerator: 'CommandOrControl + Shift + R'
            }
        ]
    },
    {
        label: '&Help',
        submenu: [
            {
                label: 'About'
            },
            { type: 'separator' },
            {
                label: 'Force Exit',
                click() {
                    app.exit(0);
                },
                accelerator: 'CommandOrControl + Shift + Q'
            }
        ]
    }
]

function createWindow() {
    win = new BrowserWindow(windowTemplate);

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/editor/Qz_Custom_Editor.html'),
        protocol: 'file:',
        slashes: true
    }));

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    win.on('close', function () { win = null });
    win.show();
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    app.quit()
})

app.on('browser-window-focus', () => {
    globalShortcut.register('CommandOrControl + A', () => {
        sendData('edit', 'select-all');
    })
    globalShortcut.register('CommandOrControl + X', () => {
        sendData('edit', 'cut');
    })
    globalShortcut.register('CommandOrControl + C', () => {
        sendData('edit', 'copy');
    })
    globalShortcut.register('CommandOrControl + V', () => {
        sendData('edit', 'paste');
    })
    globalShortcut.register('CommandOrControl + Z', () => {
        sendData('edit', 'undo');
    })
    globalShortcut.register('CommandOrControl + R', () => {
        sendData('edit', 'redo');
    })
})

app.on('browser-window-blur', () => {
    globalShortcut.unregister('CommandOrControl + A', () => {
        sendData('edit', 'select-all');
    })
    globalShortcut.unregister('CommandOrControl + X', () => {
        sendData('edit', 'cut');
    })
    globalShortcut.unregister('CommandOrControl + C', () => {
        sendData('edit', 'copy');
    })
    globalShortcut.unregister('CommandOrControl + V', () => {
        sendData('edit', 'paste');
    })
    globalShortcut.unregister('CommandOrControl + Z', () => {
        sendData('edit', 'undo');
    })
    globalShortcut.unregister('CommandOrControl + R', () => {
        sendData('edit', 'redo');
    })
});

function openFile() {
    dialog.showOpenDialog(win, {
        filters: fileFilters,
        properties: ['openFile']
    }).then(result => {
        if (!result.canceled) {
            sendData('file', 'read', result.filePaths[0]);
        }
    }).catch(err => {
        showErrorMessage('Open a File', err);
    })
}

function saveFileAs() {
    dialog.showSaveDialog(win, {
        filters: fileFilters,
        properties: ['showOverwriteConfirmation']
    }).then(result => {
        if (!result.canceled) {
            sendData('file', 'saveAs', result.filePath);
        }
    }).catch(err => {
        showErrorMessage('Save As', err);
    });
}

function sendData(tag, type, msg) {
    try {
        win.webContents.send(tag, [type, msg]);
    } catch (error) {
        showErrorMessage('send-data', error);
    }
}

ipcMain.on('show-message', (e, msg) => {
    showInfoMessage(msg);
});

ipcMain.on('show-error', (e, msg) => {
    try {
        showErrorMessage(msg[0], msg[1]);
    } catch (error) {
        showErrorMessage("Error in -> show-error", error.toString());
    }
});

ipcMain.on('file', (e, msg) => {
    if (msg[0] == 'saveAs') {
        saveFileAs();
    }
    if (msg[0] == 'compPath') {
        openNewTempWindow(msg[0], msg[1]);
    }
});

function openNewTempWindow(type, messages) {
    if (type == 'compPath') {
        let winTemp = new BrowserWindow({
            height: 400,
            width: 600,
            center: true,
            webPreferences: {
                nodeIntegration: true
            }
        });
        winTemp.on('close', () => { winTemp = null; });
        winTemp.loadURL(url.format({
            pathname: 'src/editor/Qz_Custom_Editor.html',
            protocol: 'file:',
            slashes: true
        }))
        winTemp.setMenu(Menu.buildFromTemplate([{
            label: "Save",
            click() {
                winTemp.webContents.executeJavaScript('saveFileWithSave();');
            }
        },{
            label: "Paste",
            click() {
                winTemp.webContents.executeJavaScript('pasteTheClipBoardText();');
            }
        }]));
        winTemp.setTitle("Compiler Paths");
        winTemp.webContents.executeJavaScript('readAndDisplayFile(\"' + messages[1] + '\");');
        winTemp.show();
    }
}

function showInfoMessage(infoMessage) {
    dialog.showMessageBox(win, { type: "info", buttons: [], message: infoMessage.toString() });
}

function showErrorMessage(fromFunc, errMessage) {
    dialog.showErrorBox('Error in -> ' + fromFunc, errMessage.toString());
}
