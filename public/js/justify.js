/*global YUI */
YUI.add('dualjustify', function(Y, NAME){

        var DOUBLE_BYTE = 'd',
            SINGLE_BYTE = 's',
            DUALJUSTIFY_SELECTOR = '.dualjustify',
            DEFAULT_SINGLE_BYTE_SIZE_REDUCTION = 1,
            AVG_SINGLE_BYTE_RATIO = 0.51,
            DOUBLE_BYTE_START_INDEX = 10000;

        function dualjustify (options) {

            var sizeReduction = options && options.hasOwnProperty('sizeReduction') ? options.sizeReduction : DEFAULT_SINGLE_BYTE_SIZE_REDUCTION,
                engRatio = options && options.hasOwnProperty('engRatio') ? options.engRatio : AVG_SINGLE_BYTE_RATIO,
                selector = options && options.selector ? options.selector : DUALJUSTIFY_SELECTOR,
                blocks = Y.all(selector);

            blocks.each(function(node){
                if (node.one('iframe,object,img,i,embed')) {
                    return;
                }

                var text = node.get('text').trim().replace(/（/g, '(').replace(/）/g, ')'),
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
                    currentInDoubleByte = text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX ? true : false;

                    while (i < text.length) {
                        if ((text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX && currentInDoubleByte) || (text.charCodeAt(i) < DOUBLE_BYTE_START_INDEX && !currentInDoubleByte)) {
                            currentStr += text.charAt(i);
                        } else {
                            textArray.push({
                                type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                                text: currentStr
                            });
                            currentStr = text.charAt(i);
                            currentInDoubleByte = text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX ? true : false;
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
                            textWidth = Math.ceil(content.text.length * engRatio);
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

                            outputHtml += '<span class="' + classes + '" style="text-align:' + textAlign + ';font-size:' + (fontsize + sizeReduction) + 'px;width:' + (fontsize * units) + 'px">' + content.text.slice(0, cutpos) + '</span>';
                            content.text = content.text.substring(cutpos);
                            currentLineChars = (currentLineChars + units) % charPerLine;
                            textAlign = content.text.length > 0 ? 'left' : 'center';
                        }

                    }

                });

                node.setHTML(outputHtml);
            });
        };

        Y.namespace('Justify').DualJustify = dualjustify;


}, "0.0.1", { requires: [ 'node' ]});
