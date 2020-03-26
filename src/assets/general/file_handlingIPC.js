/**
 * 
 * All the IPC { Inter Process Communication }
 * is taking below
 * 
 */

function sendData(key, val, ...extra) {
    ipcRenderer.send(key, [val, extra]);
}

ipcRenderer.on('file', (e, args) => {
    try {
        if (args[0] == 'read') {
            readAndDisplayFile(args[1]);
        }
        if (args[0] == 'save') {
            if (filePath == null) {
                sendData('file', 'saveAs');
            }
            else {
                saveFileWithSave();
            }
        }
        if (args[0] == 'saveAs') {
            saveFileWithSaveAs(args[1]);
        }
        if (args[0] == 'compile') {
            if (filePath == null) {
                sendData('file', 'saveAs');
            }
            else{
                compileTheCode();
            }
        }
        if (args[0] == 'run') {
            if (filePath == null) {
                sendData('file', 'saveAs');
            }
            else{
                compileTheCode(true);
            }
        }
    } catch (error) {
        showErrorMessage('file-open', error);
    }
});