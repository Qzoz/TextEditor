const { webFrame, clipboard } = require('electron');

var coordCurX = 0;
var coordCurY = 0;
var sRow = 0;
var eRow = 0;

const charW = 9;
const charH = 21;

var rowCount = 1;
var currRow = 0, currCol = 0;

var readToggler = false;

var cursorDirection = false;

var shiftFlag = false;
var selectionObj = {
    flag: false,
    lon: 0,
    lat: 0,
    rs: -1,
    re: -1,
    cs: -1,
    ce: -1,
    getLen: () => {
        if (selectionObj.rs == selectionObj.re) {
            selectionObj.lat = 0;
            return selectionObj.ce - selectionObj.cs;
        }
        else {
            let len = editorContent[selectionObj.rs].length - selectionObj.cs;
            for (var i = selectionObj.rs + 1; i < selectionObj.re; i++) {
                len += editorContent[i].length;
            }
            len += selectionObj.ce;
            return len;
        }
    }
}

var undoStackSize = 5;
var redoStackSize = 2;


var editorContent = [""];
var undoStack = [];
var redoStack = [];
const testString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789!@#$%^&*()_-+={}[]\\|\'\";:,<.>/?~`";

window.onload = window.onresize = function () {
    webFrame.setZoomLevel(1);
    let w = document.getElementById('qze_line_number').offsetWidth;
    let wp = document.getElementById('qze_editor_container').offsetWidth;
    document.getElementById('qze_line_content').style.width = (wp - w - 24) + "px";
    document.getElementById('qze_line_content').style.left = (w + 4) + "px";
    coordCurX = Math.round(document.getElementById('qze_line_content').getBoundingClientRect().x);
    coordCurY = Math.round(document.getElementById('qze_line_content').getBoundingClientRect().y);
    adjustCoords();
}

document.getElementById('qze_editor_container').addEventListener('scroll', function (e) {
    adjustCoords();
})

function adjustCoords() {
    let parentLineCont = document.getElementById('qze_line_content').getBoundingClientRect();
    if (parentLineCont.y < 0) {
        sRow = Math.round((Math.abs(parentLineCont.y) + coordCurY) / charH);
    }
    else {
        sRow = Math.round((coordCurY - Math.abs(parentLineCont.y)) / charH);
    }
}

function focusCursor(axis, pxMove) {
    var parent = document.getElementById('qze_editor_container');
    var parentLineCont = document.getElementById('qze_line_content').getBoundingClientRect();
    var parentLnScrollWidth = document.getElementById('qze_line_content').scrollWidth;
    let currStr = editorContent[currRow];
    let tabCtr = countTabs(currStr, 0, currCol);
    if (axis == 'x') {
        var parentLnWidth = Math.round(parentLineCont.width);
        if (parentLnScrollWidth > parentLnWidth) {
            var cursor = document.getElementById('qze_cursor');
            if (cursorDirection) {
                if (cursor.offsetLeft > parent.scrollLeft + parent.offsetWidth - coordCurX - charW) {
                    if (pxMove == undefined) {
                        parent.scrollBy(charW + 1, 0);
                    }
                    else {
                        parent.scrollBy(pxMove, 0);
                    }
                }
            }
            else {
                if (pxMove == undefined) {
                    if (currCol == 0) {
                        parent.scrollBy(-1 * parent.scrollLeft, 0);
                    }
                    else if (parent.scrollLeft != 0) {
                        parent.scrollBy(parentLineCont.x + (currCol - tabCtr + tabCtr * tabLen) * charW - coordCurX, 0);
                    }
                }
                else {
                    if (pxMove == 0) {
                        parent.scrollBy(-1 * parent.scrollLeft, 0);
                    }
                }
            }
        }
    }
    else if (axis == 'y') {
        if (parentLineCont.y < 0) {
            sRow = Math.round((Math.abs(parentLineCont.y) + coordCurY) / charH);
        }
        else {
            sRow = Math.round((coordCurY - Math.abs(parentLineCont.y)) / charH);
        }
        sRow += 1;
        eRow = sRow + Math.round(parent.clientHeight / charH) - 2;
        if (currRow <= sRow) {
            parent.scrollBy(0, (currRow - sRow) * charH);
        }
        else if (currRow > eRow) {
            parent.scrollBy(0, (currRow - eRow) * charH);
        }
    }
}

setInterval(function () {
    var vis = document.getElementById('qze_cursor').style.visibility;
    if (vis == 'hidden') {
        document.getElementById('qze_cursor').style.visibility = 'inherit';
    }
    else {
        document.getElementById('qze_cursor').style.visibility = 'hidden';
    }
}, 500);

function keyListenerForEditor(e) {
    if (e.altKey || e.ctrlKey) {
        return;
    }
    e.preventDefault();
    if (e.code == 'ArrowUp') {
        moveCursorUpOS();
    }
    else if (e.code == 'ArrowDown') {
        moveCursorDownOS();
    }
    else if (e.code == 'ArrowLeft') {
        moveCursorLeftOS();
    }
    else if (e.code == 'ArrowRight') {
        moveCursorRightOS();
    }
    else if (e.code == 'PageUp') {
        goToStartOfPage();
        moveSelectionCursor('p-up');
    }
    else if (e.code == 'PageDown') {
        goToEndOfPage();
        moveSelectionCursor('p-down');
    }
    else if (e.code == 'Delete') {
        updateUndoStack();
        if (selectionObj.flag) {
            deleteSelectedText();
        }
        else {
            deleteCharacter();
        }
    }
    else if (e.code == 'Backspace') {
        updateUndoStack();
        if (selectionObj.flag) {
            deleteSelectedText();
        }
        else {
            backspacedCharacter();
        }
    }
    else if (e.code == 'Enter') {
        updateUndoStack();
        newLineEntered();
        moveSelectionCursor();
    }
    else if (e.code == 'End') {
        goToEndOfLine();
        moveSelectionCursor('right');
    }
    else if (e.code == 'Home') {
        goToStartOfLine();
        moveSelectionCursor('left');
    }
    else if (e.code == 'Tab') {
        updateUndoStack();
        addCharacter('\t', tabLen);
        moveSelectionCursor();
    }
    else if (e.code == 'Space') {
        updateUndoStack();
        addCharacter(e.key, 1);
        moveSelectionCursor();
    }
    else if (e.key == 'Shift') {
        shiftFlag = true;
        detectSelections();
    }
    else if (testString.includes(e.key)) {
        updateUndoStack();
        addCharacter(e.key, 1);
        moveSelectionCursor();
    }
    else {
        console.log('no use');
    }
}

function keyListenerForKeyUp(e) {
    if (e.altKey || e.ctrlKey) {
        return;
    }
    e.preventDefault();
    if (e.key == 'Shift') {
        shiftFlag = false;
        detectSelections();
    }
}

window.addEventListener('click', function (e) {
    cX = e.clientX;
    cY = e.clientY;
    var editor = document.getElementById('qze_editor_container').getBoundingClientRect();
    if ((cX < editor.right && cX > editor.left) && (cY < editor.bottom && cY > editor.top)) {
        if (!readToggler) {
            startReadingForEditor();
            if (document.getElementById('qze_editor_row').children.length == 0) {
                createLineNode();
            }
        }
        readToggler = true;
    }
    else {
        if (readToggler) {
            stopReadingForEditor();
        }
        readToggler = false;
    }
    if (readToggler) {
        moveTextCursorToXYByClick(cX, cY);
    }
})

function startReadingForEditor() {
    document.addEventListener('keydown', keyListenerForEditor);
    document.addEventListener('keyup', keyListenerForKeyUp);
}

function stopReadingForEditor() {
    document.removeEventListener('keydown', keyListenerForEditor);
    document.removeEventListener('keyup', keyListenerForKeyUp);
}


function goToEndOfLine() {
    let currStr = editorContent[currRow];
    if (currCol < currStr.length) {
        let tabCtr = countTabs(currStr, 0, currStr.length);
        let fromLeftPx = (currStr.length - tabCtr + tabCtr * tabLen) * charW;
        currCol = currStr.length;
        cursorDirection = true;
        moveCursorToX(fromLeftPx, false);
    }
}

function goToStartOfLine() {
    if (currCol > 0) {
        currCol = 0;
        cursorDirection = false;
        moveCursorToX(0, false);
    }
}

function goToStartOfPage() {
    if (currRow > 0) {
        currRow = 0;
        moveCursorToY(0);
        goToStartOfLine();
    }
}

function goToEndOfPage() {
    if (currRow < rowCount - 1) {
        currRow = rowCount - 1;
        moveCursorToY(currRow * charH);
        goToEndOfLine();
    }
}

function newLineEntered() {
    createNewLine();
    addLineNumber();
    updateListOnNewLine();
}

function backspacedCharacter() {
    let currStr = editorContent[currRow];
    if (currCol == 0) {
        backSpacedDeleteAtStart();
    }
    else {
        moveCursorLeftOS();
        currStr = currStr.substr(0, currCol) + currStr.substr(currCol + 1, currStr.length);
        editorContent[currRow] = currStr;
        updateField(currRow);
    }
}

function deleteCharacter() {
    let currStr = editorContent[currRow];
    if (currCol == currStr.length) {
        simpleDeleteAtLast();
    }
    else {
        currStr = currStr.substr(0, currCol) + currStr.substr(currCol + 1, currStr.length);
        editorContent[currRow] = currStr;
        updateField(currRow);
    }
}

function moveTextCursorToXYByClick(x, y) {
    let prevRow = currRow;
    let parentLineCont = document.getElementById('qze_line_content');
    let yCoord = y - coordCurY;
    yCoord -= (yCoord % charH);
    yCoord /= charH;
    if (parentLineCont.parentNode.clientHeight == parentLineCont.parentNode.scrollHeight) {
        sRow = 0;
    }
    if (sRow + yCoord < rowCount) {
        currRow = sRow + yCoord;
    }
    else {
        currRow = rowCount - 1;
    }
    moveCursorToY(currRow * charH, true);
    if (prevRow != currRow) {
        changeLineNumberBoldness(prevRow, currRow);
    }
    let lineContX = Math.round(Math.abs(parentLineCont.getBoundingClientRect().x));
    if (parentLineCont.getBoundingClientRect().x < 0) {
        x += lineContX;
    }
    else {
        x = x - lineContX;
    }
    x -= (x % charW);
    adjustCursorHorizontallyByMouse(x);
}

// one step back
function moveCursorLeftOS() {
    let currStr = editorContent[currRow];
    if (currCol > 0) {
        currCol -= 1;
        let tabCtr = countTabs(currStr, 0, currCol);
        let fromLeftPx = (currCol - tabCtr + tabCtr * tabLen) * charW;
        cursorDirection = false;
        moveCursorToX(fromLeftPx);
        moveSelectionCursor('left');
    }
    else {
        if (currRow > 0) {
            cursorDirection = true;
            moveCursorUpOS();
            goToEndOfLine();
        }
    }
}
// one step ahead
function moveCursorRightOS() {
    let currStr = editorContent[currRow];
    if (currCol < currStr.length) {
        currCol += 1;
        let tabCtr = countTabs(currStr, 0, currCol);
        let fromLeftPx = (currCol - tabCtr + tabCtr * tabLen) * charW;
        cursorDirection = true;
        moveCursorToX(fromLeftPx);
        moveSelectionCursor('right');
    }
    else {
        if (currRow < rowCount - 1) {
            cursorDirection = false;
            moveCursorDownOS();
            goToStartOfLine();
        }
    }
}
// one step up
function moveCursorUpOS() {
    if (currRow - 1 >= 0) {
        currRow -= 1;
        moveCursorToY(currRow * charH);
        adjustCursorHorizontallyByButton();
        changeLineNumberBoldness(currRow + 1, currRow);
        moveSelectionCursor('up');
    }
}
// one step down
function moveCursorDownOS() {
    if (currRow + 1 < rowCount) {
        currRow += 1;
        moveCursorToY(currRow * charH);
        adjustCursorHorizontallyByButton();
        changeLineNumberBoldness(currRow - 1, currRow);
        moveSelectionCursor('down');
    }
}

function adjustCursorHorizontallyByMouse(fromLeftPx) {
    let currStr = editorContent[currRow];
    let tabCtr = countTabs(currStr, 0, currStr.length);
    let leftPx = (currStr.length - tabCtr + tabCtr * tabLen) * charW;
    if (leftPx >= fromLeftPx) {
        leftPx = currCol = 0;
        for (var i = 0; i < currStr.length - 1; i++) {
            let isTab = countTabs(currStr, i, i + 1);
            let tmpPx = (1 - isTab + isTab * tabLen) * charW;
            if (leftPx + tmpPx == fromLeftPx) {
                leftPx += tmpPx;
                currCol += 1;
                break;
            }
            else if (leftPx + tmpPx > fromLeftPx) {
                break;
            }
            else {
                leftPx += tmpPx;
                currCol += 1;
            }
        }
    }
    else {
        currCol = currStr.length;
    }
    moveCursorToX(leftPx, true);
    moveSelectionCursor();
}

function adjustCursorHorizontallyByButton() {
    let currStr = editorContent[currRow];
    let tabCtr = 0, fromLeftPx = 0;
    if (currCol <= currStr.length) {
        tabCtr = countTabs(currStr, 0, currCol);
        fromLeftPx = (currCol - tabCtr + tabCtr * tabLen) * charW;
    }
    else {
        tabCtr = countTabs(currStr, 0, currStr.length);
        fromLeftPx = (currStr.length - tabCtr + tabCtr * tabLen) * charW;
        currCol = currStr.length;
        cursorDirection = false;
    }
    moveCursorToX(fromLeftPx);
}

function moveCursorToX(fromLeft, isMovedByClick) {
    document.getElementById('qze_cursor').style.left = fromLeft + "px";
    if (isMovedByClick) {
        return;
    }
    if (isMovedByClick == false) {
        focusCursor('x', fromLeft);
    }
    else {
        focusCursor('x');
    }
}

function moveCursorToY(fromTop, isMovedByClick) {
    document.getElementById('qze_cursor').style.top = fromTop + "px";
    if (isMovedByClick) {
        return;
    }
    focusCursor('y');
}


/**
 * 
 * Taking Input and Representing it in html
 * 
 */

function countTabs(str, si, ei) {
    if (ei >= str.length) {
        ei = str.length;
    }
    var ctr = 0;
    for (var i = si; i < ei; i++) {
        if (str.charAt(i) == '\t') {
            ctr++;
        }
    }
    return ctr;
}

function addCharacter(ch) {
    var currStr = editorContent[currRow];
    currStr = currStr.substr(0, currCol) + ch + currStr.substr(currCol, currStr.length);
    editorContent[currRow] = currStr;
    updateField(currRow);
    moveCursorRightOS();
}

function backSpacedDeleteAtStart() {
    if (currRow - 1 >= 0) {
        moveCursorUpOS();
        goToEndOfLine();
        mergeTwoRowsOfIndexI(currRow);
        updateField(currRow);
        getCurrentRowDiv(rowCount - 1).remove();
        remLineNumber();
    }
}

function simpleDeleteAtLast() {
    if (currRow + 1 < editorContent.length) {
        mergeTwoRowsOfIndexI(currRow);
        updateField(currRow);
        getCurrentRowDiv(rowCount - 1).remove();
        remLineNumber();
    }
}

/**
 * 
 * @param {int} index 
 * merges two rows [index, index + 1] at index
 * 
 */
function mergeTwoRowsOfIndexI(index) {
    var tmpStack = []
    for (i = 0; i < index; i++) {
        tmpStack.push(editorContent.shift());
    }
    var concStr = editorContent.shift() + editorContent.shift();
    editorContent.unshift(concStr);
    concStr = null;
    while (tmpStack.length > 0) {
        editorContent.unshift(tmpStack.pop());
    }
}

function updateListOnNewLine() {
    breakLineAtCol(currCol);
    moveCursorDownOS();
    goToStartOfLine();
    updateField(currRow);
}

function breakLineAtCol(col) {
    var tmpStack = []
    for (i = 0; i < currRow; i++) {
        tmpStack.push(editorContent.shift());
    }
    var currStr = editorContent.shift()
    var currStr1 = currStr.substr(0, col);
    var currStr2 = currStr.substr(col, currStr.length);
    editorContent.unshift(currStr2);
    editorContent.unshift(currStr1);
    currStr = currStr1 = currStr2 = null;
    while (tmpStack.length > 0) {
        editorContent.unshift(tmpStack.pop());
    }
}

function updateField(row, lineWiseFlag) {
    try {
        initComments(editorContent);
    } catch (err) {
    }
    if (row < rowCount) {
        if (lineWiseFlag) {
            getCurrentRowDiv(row).children[0].innerHTML = getUpdatedField(editorContent[row], row);
        }
        else {
            updateAll();
        }
    }
}

function updateAll() {
    for (let r = 0; r < rowCount; r++) {
        getCurrentRowDiv(r).children[0].innerHTML = getUpdatedField(editorContent[r], r);
    }
}

function getCurrentRowDiv(row) {
    if (row == undefined) {
        return document.getElementById('qze_editor_row').children[currRow];
    }
    return document.getElementById('qze_editor_row').children[row];
}

function createNewLine() {
    getCurrentRowDiv().insertAdjacentHTML('afterend', "<div class=\"qze_line_cont_fld qze_font_lg\">" +
        "<span></span></div>");
}

function createLineNode() {
    var elem = document.createElement('div');
    elem.className = "qze_line_cont_fld qze_font_lg"
    elem.innerHTML = "<span></span>"
    document.getElementById('qze_editor_row').append(elem);
}

function clearTextArea() {
    goToStartOfLine();
    goToStartOfPage();
    document.getElementById('qze_editor_row').innerHTML = "";
    document.getElementById('qze_row_count').innerHTML = "";
    rowCount = 0;
    editorContent = [""]
    addLineNumber();
    createLineNode();
    updateField();
}

/**
 * 
 * Functions of Line Numbers
 * 
 */

function addLineNumber() {
    rowCount += 1;
    var newLineDiv = document.createElement("div");
    newLineDiv.className = "qze_line_num_caps qze_font_md"
    var newLineSpan = document.createElement("span");
    newLineSpan.innerText = rowCount;
    newLineDiv.appendChild(newLineSpan);
    document.getElementById('qze_row_count').appendChild(newLineDiv);
}

function remLineNumber() {
    document.getElementById('qze_row_count').lastChild.remove();
    rowCount -= 1;
}

function changeLineNumberBoldness(regRow, boldRow) {
    try {
        document.getElementById('qze_row_count').children[boldRow].classList.add('qze_font_white');
    } catch (err) {
        console.log(err);
    }
    try {
        document.getElementById('qze_row_count').children[regRow].classList.remove('qze_font_white');
    } catch (err) {
        console.log(err);
    }
}

/**
 * 
 * Function performed on text written in Editor
 *  
 */

function displayReadData(data) {
    clearTextArea();
    editorContent = data.split('\n');
    for (let i = 0; i < editorContent.length; i++) {
        currRow = i;
        tempStr = editorContent[i];
        if (tempStr == undefined) {
            continue;
        }
        if (tempStr.charAt(tempStr.length - 1) == '\r') {
            editorContent[i] = tempStr.substring(0, tempStr.length - 1);
        }
        updateField(currRow, true);
        if (i < editorContent.length - 1) {
            createNewLine();
            addLineNumber();
            moveCursorDownOS();
        }
    }
    goToEndOfLine();
}

/**
 * UNDO & REDO STACK Operations
 */

function updateUndoStack() {
    if (undoStack.length >= undoStackSize) {
        undoStack.shift();
    }
    undoStack.push(editorContent.slice(0));
}

/**
 * SELECTION ACTIONS
 */

function detectSelections() {
    if (shiftFlag) {
        selectionObj.flag = true;
        if (selectionObj.rs == -1) {
            selectionObj.rs = currRow;
            selectionObj.cs = currCol;
            selectionObj.re = currRow;
            selectionObj.ce = currCol;
        }
    }
    else {
        if (selectionObj.rs == selectionObj.re) {
            if (selectionObj.cs == selectionObj.ce) {
                resetSelections();
            }
        }
    }
}

function resetSelections() {
    selectionObj.flag = false;
    selectionObj.lon = 0;
    selectionObj.lat = 0;
    selectionObj.rs = -1;
    selectionObj.re = -1;
    selectionObj.cs = -1;
    selectionObj.ce = -1;
}

function moveSelectionCursor(dirCur) {
    if (!selectionObj.flag) {
        return;
    }
    if (!shiftFlag) {
        removeAllSelections();
        resetSelections();
        return;
    }
    if (dirCur == 'up' || dirCur == 'p-up') {
        if (selectionObj.getLen() > 0 && selectionObj.lat == -1) {
            selectionObj.re = currRow;
            selectionObj.ce = currCol;
        }
        else {
            selectionObj.rs = currRow;
            selectionObj.cs = currCol;
            selectionObj.lat = 1;
        }
    }
    else if (dirCur == 'down' || dirCur == 'p-down') {
        if (selectionObj.getLen() > 0 && selectionObj.lat == 1) {
            selectionObj.rs = currRow;
            selectionObj.cs = currCol;
        }
        else {
            selectionObj.re = currRow;
            selectionObj.ce = currCol;
            selectionObj.lat = -1;
        }
    }
    else if (dirCur == 'right') {
        if (selectionObj.getLen() > 0 && selectionObj.lon == -1) {
            if (selectionObj.lat == -1) {
                selectionObj.ce = currCol;
            }
            else {
                selectionObj.cs = currCol;
            }
        }
        else {
            if (selectionObj.lat == 1) {
                selectionObj.cs = currCol;
            }
            else {
                selectionObj.ce = currCol;
            }
            selectionObj.lon = 1;
        }
    }
    else if (dirCur == 'left') {
        if (selectionObj.getLen() > 0 && selectionObj.lon == 1) {
            if (selectionObj.lat == 1) {
                selectionObj.cs = currCol;
            }
            else {
                selectionObj.ce = currCol;
            }
        }
        else {
            if (selectionObj.lat == -1) {
                selectionObj.ce = currCol;
            }
            else {
                selectionObj.cs = currCol;
            }
            selectionObj.lon = -1;
        }
    }
    addSelections();
}

function addSelections() {
    removeAllSelections();
    if (selectionObj.rs == selectionObj.re) {
        appendSelectionsElement(selectionObj.ce - selectionObj.cs, selectionObj.cs, selectionObj.rs);
    }
    else {
        appendSelectionsElement(editorContent[selectionObj.rs].length - selectionObj.cs,
            selectionObj.cs, selectionObj.rs);
        for (var i = selectionObj.rs + 1; i < selectionObj.re; i++) {
            appendSelectionsElement(editorContent[i].length, 0, i);
        }
        appendSelectionsElement(selectionObj.ce, 0, selectionObj.re);
    }
}

function appendSelectionsElement(w, l, index) {
    var elem = document.createElement('div');
    let selStr = editorContent[index];
    let lefty_Tabs = countTabs(selStr, 0, l);
    let width_Tabs = countTabs(selStr, l, w + l);
    elem.setAttribute("class", "qze_sel_txt_bl");
    elem.style.width = charW * (w - width_Tabs + width_Tabs * tabLen) + "px";
    elem.style.left = charW * (l - lefty_Tabs + lefty_Tabs * tabLen) + "px";
    getCurrentRowDiv(index).appendChild(elem);
}

function removeAllSelections() {
    for (var i = 0; i < rowCount; i++) {
        removeSelections(i);
    }
}

function removeSelections(index) {
    var rowDiv = getCurrentRowDiv(index);
    if (rowDiv.children.length > 1) {
        rowDiv.children[1].remove();
    }
}

/**
 * 
 * ACTIONS ON SELECTED TEXT
 * 
 */

function deleteSelectedText() {
    if (selectionObj.rs == selectionObj.re) {
        var tempStr = editorContent[selectionObj.rs];
        editorContent[selectionObj.rs] = tempStr.substring(0, selectionObj.cs) + 
            tempStr.substring(selectionObj.ce, tempStr.length);
    }
    else {
        var contentStack = []
        for (var i = editorContent.length - 1; i >= selectionObj.re; i--) {
            contentStack.push(editorContent.pop());
        }
        for (var i = selectionObj.rs + 1; i < selectionObj.re; i++) {
            editorContent.pop();
            getCurrentRowDiv(rowCount - 1).remove();
            remLineNumber();
        }
        var tempStr = editorContent[selectionObj.rs];
        editorContent[selectionObj.rs] = tempStr.substring(0, selectionObj.cs);
        // Upper Line Above
        
        // Bottom Line Below
        tempStr = contentStack.pop();
        editorContent[selectionObj.rs] += tempStr.substring(selectionObj.ce, tempStr.length);
        while (contentStack.length > 0) {
            editorContent.push(contentStack.pop());
        }
        getCurrentRowDiv(rowCount - 1).remove();
        remLineNumber();
    }

    // Move Cursor;
    var tabs = countTabs(editorContent[selectionObj.rs], 0, selectionObj.cs);
    moveCursorToY(charH * selectionObj.rs, true);
    moveCursorToX(charW * (selectionObj.cs - tabs + tabs * tabLen), true);
    currRow = selectionObj.rs;
    currCol = selectionObj.cs;

    removeAllSelections();
    resetSelections();
    updateAll();
}

function selectAllText() {
    selectionObj.flag = true;
    selectionObj.rs = 0;
    selectionObj.re = rowCount-1;
    selectionObj.cs = 0;
    selectionObj.ce = editorContent[rowCount-1].length;
    addSelections();
    shiftFlag = false;
}

function cutTheSelectedText(){
    if (selectionObj.flag) {
        copyTheSelectedText();
        deleteSelectedText();
    }
}

function copyTheSelectedText() {
    if (selectionObj.flag) {
        if (selectionObj.rs == selectionObj.re) {
            var tempStr = editorContent[selectionObj.rs];
            clipboard.writeText(tempStr.substring(selectionObj.cs, selectionObj.ce));
        }
        else {
            var tempStr = editorContent[selectionObj.rs];
            var copiedStr = tempStr.substring(selectionObj.cs, tempStr.length) + '\n';
            var slicedCnt = editorContent.slice(selectionObj.rs + 1, selectionObj.re);
            if (slicedCnt.length > 0) {
                copiedStr += slicedCnt.join('\n') + '\n';
            }
            tempStr = editorContent[selectionObj.re];
            copiedStr += tempStr.substring(0, selectionObj.ce);
            clipboard.writeText(copiedStr);
        }
    }
}

function pasteTheClipBoardText() {
    var loadedStr = clipboard.readText();
    if (loadedStr.length <= 0) {
        return;
    }
    if (selectionObj.flag) {
        deleteSelectedText();
    }
    loadedStr = loadedStr.split('\n');
    if (loadedStr.length == 1) {
        var tempStr = editorContent[currRow];
        editorContent[currRow] = tempStr.substring(0, currCol) + loadedStr + 
            tempStr.substring(currCol, tempStr.length);
    }
    else {
        var tempCol = currCol;
        var tempRow = currRow;
        newLineEntered();
        editorContent[currRow-1] += loadedStr[0];
        editorContent[currRow] = loadedStr[loadedStr.length - 1] + editorContent[currRow];
        var tempStack = []
        for (var i = currRow; i < rowCount; i++) {
            tempStack.push(editorContent.pop());
        }
        for (var i = 1; i < loadedStr.length - 1; i++) {
            createNewLine();
            addLineNumber();
            editorContent.push(loadedStr[i]);
        }
        while (tempStack.length > 0) {
            editorContent.push(tempStack.pop());
        }
        var tabs = countTabs(editorContent[tempRow], 0, tempCol);
        moveCursorToY(charH * tempRow, true);
        moveCursorToX(charW * (tempCol - tabs + tabs * tabLen), true);
        currRow = tempRow;
        currCol = tempCol;
    }
    updateAll();
}

function undoTheText() {
    if (undoStack.length <= 0) {
        return;
    }
    if (redoStack.length >= redoStackSize) {
        redoStack.shift();
    }
    redoStack.push(editorContent.slice(0));
    editorContent = undoStack.pop();
    displayReadData(editorContent.join('\n'));
    adjustCursorHorizontallyByButton();
}

function redoTheText() {
    if (redoStack.length <= 0) {
        return;
    }
    editorContent = redoStack.pop();
    updateAll();
    displayReadData(editorContent.join('\n'));
    adjustCursorHorizontallyByButton();
}
