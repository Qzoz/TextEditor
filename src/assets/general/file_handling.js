
var fs = require('fs');
var {execSync} = require('child_process');
var {shell} = require('electron');

var filePath = null;

/**
 * 
 * @param {string} pathOfFile 
 * opens the file at path @param pathOfFile
 * and display it on editor
 * 
 */
function readAndDisplayFile(pathOfFile) {
    fs.readFile(pathOfFile, 'utf-8', (err, data) => {
        if (err) {
            showErrorMessage('read-file', err);
            return;
        }
        displayReadData(data);
        filePath = pathOfFile;
    })
}

/**
 * collects the @param editorContent, joins and
 * writes to @param filepath variable
 */
function saveFileWithSave() {
    saveFile(filePath, editorContent.join('\n'));
}

/**
 * 
 * @param {string} filePathNew 
 * saveAs Name or NewPath
 * 
 */
function saveFileWithSaveAs(filePathNew) {
    filePath = filePathNew;
    saveFileWithSave();
}

/**
 * 
 * @param {string} filepath 
 * @param {string} content 
 * to be saved in the file with path
 * 
 */
function saveFile(filepath, content) {
    fs.writeFile(filepath, content, (err) => {
        if (err) {
            showErrorMessage('save-file', err);
            return;
        }
        showInfoMessage('Saved Successfully');
    });
}

function compileTheCode(runFlag){
    var extFile = filePath.substring(filePath.lastIndexOf('.')+1, filePath.length);
    var compilerPaths = fs.readFileSync("compilerPaths.json", {encoding:'utf-8'});
    compilerPaths = JSON.parse(compilerPaths);
    if (extFile == 'c' || extFile == 'C') {
        if (compilerPaths[extFile] == undefined) {
            sendData('file', 'compPath', 'Edit Compiler Paths', 'compilerPaths.json');
            return;
        }
        compileThe_C_Code(compilerPaths[extFile]);
        if (runFlag) {
            runTheCompiled_C_Code(filePath.substring(0, filePath.lastIndexOf('.')))
        }
    }
    if (extFile == 'html' || extFile == 'htm') {
        shell.openExternal('file:///'+filePath);
    }
}

function compileThe_C_Code(compilerPath){
    var destPath = filePath.substring(0, filePath.lastIndexOf('.'));
    var cmdString = "\"" + compilerPath + "\" \""+filePath+"\" -o \""+destPath+"\"";
    var error = execSync(cmdString);
    if (error != '') {
        showInfoMessage(error);
    }
}

function runTheCompiled_C_Code(destPath){
    execSync("start \"cmd /K \" "+destPath+".exe \" \"");
}
