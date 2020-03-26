
const tabLen = 2;

function getUpdatedField(lineStr) {
    var currStrRow = lineStr;
    var generatedRow = ""
    for (i = 0; i < currStrRow.length; i++) {
        if (currStrRow.charAt(i) == ' ') {
            generatedRow += "&nbsp;";
        }
        else if (currStrRow.charAt(i) == '\n') {
            generatedRow += "</br>";
        }
        else if (currStrRow.charAt(i) == '\t') {
            generatedRow += "<span>" + "".padEnd(tabLen * 6, "&nbsp;") + "</span>";
        }
        else if (currStrRow.charAt(i) == '<') {
            if (i + 1 < currStrRow.length && currStrRow.charAt(i+1) == '/') {
                generatedRow += "<span>&lt;/</span>";
            }
            else {
                generatedRow += "<span>&lt;</span>";
            }
        }
        else if (currStrRow.charAt(i) == '/') {
            if (!(i - 1 >= 0 && currStrRow.charAt(i-1) == '<')) {
                generatedRow += "<span>/</span>";
            }
        }
        else if (currStrRow.charAt(i) == '>') {
            generatedRow += "<span>&gt;</span>";
        }
        else {
            generatedRow += currStrRow.charAt(i);
        }
    }
    generatedRow = "<span>" + generatedRow + "</span>";
    return generatedRow;
}