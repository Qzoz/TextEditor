const { webFrame } = require('electron');


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

var editorContent = [""];
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
                        parent.scrollBy(-1*parent.scrollLeft, 0);
                    }
                    else if (parent.scrollLeft != 0) {
                        parent.scrollBy(parentLineCont.x + (currCol - tabCtr + tabCtr * tabLen) * charW - coordCurX, 0);
                    }
                }
                else {
                    if (pxMove == 0) {
                        parent.scrollBy(-1*parent.scrollLeft, 0);
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
    }
    else if (e.code == 'PageDown') {
        goToEndOfPage();
    }
    else if (e.code == 'Delete') {
        deleteCharacter();
    }
    else if (e.code == 'Backspace') {
        backspacedCharacter();
    }
    else if (e.code == 'Enter') {
        newLineEntered();
    }
    else if (e.code == 'End') {
        goToEndOfLine()
    }
    else if (e.code == 'Home') {
        goToStartOfLine()
    }
    else if (e.code == 'Tab') {
        addCharacter('\t', tabLen);
    }
    else if (e.code == 'Space') {
        addCharacter(e.key, 1);
    }
    else if (testString.includes(e.key)) {
        addCharacter(e.key, 1);
    }
    else {
        console.log('no use');
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
}

function stopReadingForEditor() {
    document.removeEventListener('keydown', keyListenerForEditor);
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
    }
}
// one step down
function moveCursorDownOS() {
    if (currRow + 1 < rowCount) {
        currRow += 1;
        moveCursorToY(currRow * charH);
        adjustCursorHorizontallyByButton();
        changeLineNumberBoldness(currRow - 1, currRow);
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
