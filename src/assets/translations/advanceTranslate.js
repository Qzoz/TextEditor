const tabLen = 4;

const alphaNumericUnder = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const operators = '!@#$%^&*+-=|</>.';
const othersChar = ',;:?()[]{} \t';

const keywords_C = [
    "auto", "double", "int", "struct",
    "break", "else", "long", "switch",
    "case", "enum", "register", "typedef",
    "char", "extern", "return", "union",
    "continue", "for", "signed", "void",
    "do", "if", "static", "while",
    "default", "goto", "sizeof", "volatile",
    "const", "float", "short", "unsigned"];

const operator_C = ["=", "+=", "-=", "*=", "/=", "%=", "&=",
    "^=", "|=", "<<=", ">>=", "?", ":",
    "!", "~", ".", "->", "++", "--", "+",
    "-", "*", "/", "%", ">>", "<<", "<", "<=",
    ">", ">=", "==", "!=", "&", "^", "|", "&&",
    "||", "?:"];

var colorsClassName_C_CSS = {
    "main": "qze_c_main",
    "preprocess": "qze_c_preprocess",
    "keywords": "qze_c_keywords",
    "functions": "qze_c_functions",
    "strings": "qze_c_strings",
    "constants": "qze_c_constants",
    "identifiers": "qze_c_identifiers",
    "operators": "qze_c_operators",
    "others": "qze_c_others",
    "comments": "qze_c_comments"
}

/**
 * 0 -> alphanumeric Flag
 * 1 -> operators Flag
 * 2 -> othersChar Flag
 * 3 -> change Flag
 */
var flags = [0, 0, 0, 0];

/**
 * 0 -> str start
 * 1 -> quote type ['\0' -> empty]
 */
var strFlags = [false, '\0'];

/**
 * 0 -> singleLine ( // )
 * 1 -> doubleLine ( /* )
 */
var commentsMeta = [false, false];

var commRC = [];
var cRow = -1, cCol = -1;


function getUpdatedField(lineStr, r) {
    var currStrHold = "";
    var generatedRow = [];
    strFlags = [false, '\0'];
    var i = 0;
    cRow = r;
    if (lineStr == undefined) {
        return "";
    }
    for (i = 0; i < lineStr.length; i++) {
        var ch = lineStr.charAt(i)
        cCol = i;
        if (ch == '\'' || ch == '\"') {
            if (strFlags[0] == false) {
                strFlags[0] = true;
                strFlags[1] = ch;
                generatedRow.push(getClassifiedTokenDispString(currStrHold, ch));
                currStrHold = ch;
                continue;
            }
            else if (strFlags[0] == true && ch == strFlags[1]) {
                strFlags[1] = '\0';
                strFlags[0] = false;
                currStrHold += ch;
                generatedRow.push(getClassifiedTokenDispString(currStrHold, ch));
                currStrHold = "";
                continue;
            }
        }
        if (strFlags[0] == true) {
            currStrHold += getAndCheckWhiteSpace(ch);
            continue;
        }
        if (ch == '<' || ch == '>') {
            if (currStrHold.length != 0) {
                generatedRow.push(getClassifiedTokenDispString(currStrHold, ch))
            }
            currStrHold = ""
            if (i + 1 < lineStr.length && lineStr.charAt(i + 1) == '/') {
                generatedRow.push(getClassifiedTokenDispString('&lt;/'));
                i += 1;
            }
            else if (ch == '<') {
                generatedRow.push(getClassifiedTokenDispString('&lt;'));
            }
            else {
                generatedRow.push(getClassifiedTokenDispString('&gt;'));
            }
            continue;
        }

        if (alphaNumericUnder.includes(ch)) {
            if (flags[0] == true) {
                flags[3] = false;
            }
            else {
                updateFlags([true, false, false, true]);
            }
        }
        else if (operators.includes(ch)) {
            if (flags[1] == true) {
                flags[3] = false;
            }
            else {
                updateFlags([false, true, false, true]);
            }
        }
        else {
            if (flags[2] == true) {
                flags[3] = false;
            }
            else {
                updateFlags([false, false, true, true]);
            }
        }
        if (flags[3] == true) {
            if (currStrHold.length != 0) {
                generatedRow.push(getClassifiedTokenDispString(currStrHold, ch));
            }
            currStrHold = getAndCheckWhiteSpace(ch);
        }
        else {
            currStrHold += getAndCheckWhiteSpace(ch);
        }
    }
    if (currStrHold.length != 0) {
        generatedRow.push(getClassifiedTokenDispString(currStrHold, ch))
    }
    commentsMeta[0] = false
    return generatedRow.join('');
}

function updateFlags(listFlags) {
    flags[0] = listFlags[0];
    flags[1] = listFlags[1];
    flags[2] = listFlags[2];
    flags[3] = listFlags[3];
}


function getAndCheckWhiteSpace(ch) {
    if (ch == ' ') {
        return '&nbsp;';
    }
    else if (ch == '\t') {
        return "".padEnd(tabLen * 6, '&nbsp;');
    }
    else {
        return ch;
    }
}


var commDets = []
//{"r" : -1, "c" : -1}
function initComments(strArr) {
    commDets = []
    commRC = []
    var isSingle = false, isDouble = false;
    var commCtr = 0;
    for (var row = 0; row < strArr.length; row++) {
        var cStr = strArr[row];
        for (var col = 0; col < cStr.length; col++) {
            var tempObj = { "rs": 0, "re": 0, "cs": -1, "ce": -1 };
            if (col + 1 < cStr.length && cStr.charAt(col) == '/' && cStr.charAt(col + 1) == '/'
                && !isDouble && !isSingle) {
                isSingle = true;
                tempObj.rs = row;
                tempObj.re = row;
                tempObj.cs = col;
                tempObj.ce = cStr.length;
                commRC.push(tempObj);
                var tmp = row+"-"+col;
                if (!commDets.includes(tmp)) {
                    commDets.unshift(tmp);
                }
                commCtr ++;
                break;
            }
            if (col + 1 < cStr.length && cStr.charAt(col) == '/' && cStr.charAt(col + 1) == '*'
                && !isDouble && !isSingle) {
                isDouble = true;
                tempObj.rs = row;
                tempObj.re = -1;
                tempObj.cs = col;
                tempObj.ce = -1;
                commRC.push(tempObj);
                var tmp = row+"-"+col;
                if (!commDets.includes(tmp)) {
                    commDets.unshift(tmp);
                }
                commCtr ++;
            }
            if (col - 1 >= 0 && cStr.charAt(col) == '/' && cStr.charAt(col - 1) == '*'
                && isDouble && !isSingle) {
                isDouble = false;
                commRC[commCtr - 1]["re"] = row;
                commRC[commCtr - 1]["ce"] = col;
            }
        }
        isSingle = false;
    }
    optimizeCommRC();
}

function optimizeCommRC(){
    var tmpCommRC = []
    for (var i = 0; i < commDets.length; i++) {
        let tmp = commDets[i].split("-")
        let tR = parseInt(tmp[0])
        let tC = parseInt(tmp[1])
        for (var j = 0; j < commRC.length; j++) {
            if (commRC[j]["rs"] == tR && commRC[j]["cs"] == tC) {
                tmpCommRC.unshift(commRC[j]);
                break;
            }
        }
    }
    commRC = tmpCommRC;
}

function isInCommentRange(str) {
    for (var i = 0; i < commRC.length; i++) {
        if (cRow > commRC[i]["rs"] && cRow < commRC[i]["re"]) {
            return true;
        }
        else if (cRow == commRC[i]["rs"] && cRow == commRC[i]["re"]) {
            if (cCol - str.length >= commRC[i]["cs"] && cCol - str.length <= commRC[i]["ce"]) {
                return true;
            }
        }
        else if (cRow == commRC[i]["rs"] && cRow < commRC[i]["re"]) {
            if (cCol - str.length >= commRC[i]["cs"]) {
                return true;
            }
        }
        else if (cRow > commRC[i]["rs"] && cRow == commRC[i]["re"]) {
            if (cCol - str.length <= commRC[i]["ce"]) {
                return true;
            }
        }
        else if (cRow >= commRC[i]["rs"] && commRC[i]["re"] == -1) {
            if (cRow > commRC[i]["rs"] && commRC[i]["re"] == -1) {
                return true;
            }
            else if (cCol - str.length >= commRC[i]["cs"] && commRC[i]["ce"] == -1) {
                return true;
            }
        }
        else {
        }
    }
    return false;
}


/**
 * 
 * classify tokens applying different scheme
 * 
 */

function getClassifiedTokenDispString(str, terminator) {
    if (isInCommentRange(str) || str == '/*' || str == '*/' || str == '//' || str == '/**/') {
        return "<span class=\"" + colorsClassName_C_CSS["comments"] + "\">" + str + "</span>";
    }
    if (str.length > 0 && (str.charAt(0) == '\'' || str.charAt(0) == '\"')) {
        return "<span class=\"" + colorsClassName_C_CSS["strings"] + "\">" + str + "</span>";
    }
    if (str.length > 0 && str.charAt(0) == '#') {
        return "<span class=\"" + colorsClassName_C_CSS["preprocess"] + "\">" + str + "</span>";
    }
    if (keywords_C.includes(str)) {
        return "<span class=\"" + colorsClassName_C_CSS["keywords"] + "\">" + str + "</span>";
    }
    if (isValidIdentifier(str)) {
        if (str == 'main') {
            return "<span class=\"" + colorsClassName_C_CSS["main"] + "\">" + str + "</span>";
        }
        else if (terminator == '(') {
            return "<span class=\"" + colorsClassName_C_CSS["functions"] + "\">" + str + "</span>";
        }
        else {
            return "<span class=\"" + colorsClassName_C_CSS["identifiers"] + "\">" + str + "</span>";
        }
    }
    if (operator_C.includes(str)) {
        return "<span class=\"" + colorsClassName_C_CSS["operators"] + "\">" + str + "</span>";
    }
    return "<span class=\"" + colorsClassName_C_CSS["others"] + "\">" + str + "</span>";
}

function isValidIdentifier(str) {
    if (str.length <= 0) {
        return false;
    }
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        if (str.length == 1 && ("0123456789_".includes(ch) || operators.includes(ch)
            || othersChar.includes(ch))) {
            return false;
        }
        if (i == 0 && "0123456789".includes(ch)) {
            return false;
        }
        if (operators.includes(ch) || othersChar.includes(ch) || "\'\"".includes(ch)) {
            return false;
        }
    }
    return true;
}
