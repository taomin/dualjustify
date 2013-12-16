/*global YUI */
YUI.add('dualjustify', function(Y, NAME){

        var DOUBLE_BYTE = 'd',
            SINGLE_BYTE = 's',
            DUALJUSTIFY_SELECTOR = '.dualjustify';

        function dualjustify () {
            blocks = Y.all(DUALJUSTIFY_SELECTOR);
            blocks.each(function(node){

                var text = node.get('text').trim(),
                    i = 0,
                    currentStr = '',
                    currentInDoubleByte,
                    textArray = [],
                    fontsize = parseInt(node.getComputedStyle('fontSize').replace('px', ''), 10),
                    containerWidth = parseInt(node.getComputedStyle('width').replace('px', ''), 10),
                    charPerLine = Math.floor(containerWidth / fontsize),
                    currentLineChars = 0,
                    outputHtml = '';

                // split string into arrays
                if (text.length > 0) {
                    // initial value
                    currentInDoubleByte = text.charCodeAt(i) > 255 ? true : false;

                    while (i < text.length) {
                        if ((text.charCodeAt(i) > 255 && currentInDoubleByte) || (text.charCodeAt(i) < 255 && !currentInDoubleByte)) {
                            currentStr += text.charAt(i);
                        } else {
                            textArray.push({
                                type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                                text: currentStr
                            });
                            currentStr = text.charAt(i);
                            currentInDoubleByte = text.charCodeAt(i) > 255 ? true : false;
                        }

                        i++;
                    }
                    // last one
                    textArray.push({
                        type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                        text: currentStr
                    });
                }

                // generating output html
                Y.Array.each(textArray, function (content){
                    var textWidth, units, cutpos, classes, textAlign;
                    currentLineChars = currentLineChars % charPerLine;
                    if (content.type === DOUBLE_BYTE) {
                        outputHtml += content.text;
                        currentLineChars += content.text.length;
                    } else {
                        // single byte: check if we need to split string before inserting
                        // I also assume each single byte char is 42% width of double byte char
                        content.text = content.text.trim();
                        if (content.length > 0) {
                            content.text = ' ' + content.legnth + ' ';
                        }
                        textAlign = 'center';
                        while (content.text.length > 0) {
                            // new string width
                            classes = 'single';
                            textWidth = Math.ceil(content.text.length * 0.47);
                            if (charPerLine - currentLineChars > textWidth) {
                                units = textWidth;
                                cutpos = content.text.length;
                            } else {
                                units = charPerLine - currentLineChars;
                                cutpos = units * 2 - 1;
                                if (/[a-zA-Z]/.test(content.text.charAt(cutpos - 1))) {
                                    classes += ' hyphen';
                                }
                            }

                            outputHtml += '<span class="' + classes + '" style="text-align:' + textAlign + ';font-size:' + (fontsize - 2) + 'px;width:' + (fontsize * units) + 'px">' + content.text.slice(0, cutpos) + '</span>';
                            content.text = content.text.substring(cutpos);
                            currentLineChars = (currentLineChars + units) % charPerLine;
                            textAlign = content.text.length > 0 ? 'left' : 'center';
                        }

                    }

                });

                node.setHTML(outputHtml);
            });
        };

        Y.namespace('Util').DualJustify = dualjustify;


}, "0.0.1", { requires: [ 'node', 'event-resize' ]});
