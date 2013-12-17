/*global YUI */
YUI.add('dualjustify', function(Y, NAME){

        var DOUBLE_BYTE = 'd',
            SINGLE_BYTE = 's',
            TAG = 't',
            DUALJUSTIFY_SELECTOR = '.dualjustify',
            JUSTIFY_SPAN = 'justify-span',
            JUSTIFY_HYPHEN = 'justify-hyphen',
            NOJUSTIFY = 'justify-noadjust',
            DEFAULT_SINGLE_BYTE_SIZE_REDUCTION = -1, // optional if you want to reduce the size of single byte char
            AVG_SINGLE_BYTE_RATIO = 0.55, // an avg number of a single byte char actual width (comparing to font size)
            DOUBLE_BYTE_START_INDEX = 10000; // we assume all the char which UTF-8 index is greater than 10000 is double byte char.


        function _parseInnerHtml (node) {
            var output = [], hasOuterHtml, wrapper, text, currentInDoubleByte, i = 0, currentStr = '';
            if (node.get('childNodes').size() === 0 || node.test('.' + JUSTIFY_SPAN)) {
                // base case: this node contains pure text, parse string into array
                text = node.get('text').trim().replace(/（/g, '(').replace(/）/g, ')');
                if (text.length > 0) {
                    // initial value
                    currentInDoubleByte = text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX ? true : false;

                    while (i < text.length) {
                        if ((text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX && currentInDoubleByte) || (text.charCodeAt(i) < DOUBLE_BYTE_START_INDEX && !currentInDoubleByte)) {
                            currentStr += text.charAt(i);
                        } else {
                            output.push({
                                type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                                text: currentStr
                            });
                            currentStr = text.charAt(i);
                            currentInDoubleByte = text.charCodeAt(i) > DOUBLE_BYTE_START_INDEX ? true : false;
                        }

                        i++;
                    }
                    // last one
                    output.push({
                        type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                        text: currentStr
                    });
                }

                return output;  //return result
            }

            // concat all childnodes results
            node.get('childNodes').each(function(child) {
                output = output.concat(_parseInnerHtml(child));
            });

            // if we have childnodes
            hasOuterHtml = node.get('outerHTML').length > node.get('innerHTML').length;
            if (hasOuterHtml) {
                wrapper = node.get('outerHTML').split(node.get('innerHTML'));
                if (wrapper[0]) {
                    output.unshift({ type: TAG, text: wrapper[0]});
                }
                if (wrapper[1]) {
                    output.push({type: TAG, text: wrapper[1]});
                }
            }
            return output;

        };


        function _generateJustifyHtml (textArray, options) {

            if (!options || !options.node || !textArray || !Array.isArray(textArray)) {
                return;
            }

            var node = options.node,
                fontsize = parseInt(node.getComputedStyle('fontSize').replace('px', ''), 10),
                containerWidth = parseInt(node.getComputedStyle('width').replace('px', ''), 10),
                charPerLine = Math.floor(containerWidth / fontsize),
                currentLineChars = 0,
                outputHtml = '';

            // generating output html
            Y.Array.each(textArray, function (content, index){

                if ((index === 0 || index === textArray.length - 1) && content.type === TAG) {
                    //skip the outer wrapper
                    return;
                }

                var textWidth, units, cutpos, classes, textAlign;
                currentLineChars = currentLineChars % charPerLine;
                if (content.type === TAG) {
                    outputHtml += content.text;
                } else if (content.type === DOUBLE_BYTE) {
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
                        classes = JUSTIFY_SPAN;
                        textWidth = Math.ceil(content.text.length * options.engRatio);
                        if (charPerLine - currentLineChars > textWidth) {
                            units = textWidth;
                            cutpos = content.text.length;
                        } else {
                            units = charPerLine - currentLineChars;
                            cutpos = units * 2 - 1;
                            if (/[a-zA-Z]/.test(content.text.charAt(cutpos - 1))) {
                                classes += ' ' + JUSTIFY_HYPHEN;
                            }
                        }

                        outputHtml += '<span class="' + classes + '" style="text-align:' + textAlign + ';font-size:' + (fontsize + options.sizeReduction) + 'px;width:' + (fontsize * units) + 'px">' + content.text.slice(0, cutpos) + '</span>';
                        content.text = content.text.substring(cutpos);
                        currentLineChars = (currentLineChars + units) % charPerLine;
                        textAlign = content.text.length > 0 ? 'left' : 'center';
                    }

                }

            });

            return outputHtml;

        }


        Y.namespace('Justify').DualJustify = function (options) {

            var sizeReduction = options && options.hasOwnProperty('sizeReduction') ? options.sizeReduction : DEFAULT_SINGLE_BYTE_SIZE_REDUCTION,
                engRatio = options && options.hasOwnProperty('engRatio') ? options.engRatio : AVG_SINGLE_BYTE_RATIO,
                selector = options && options.selector ? options.selector : DUALJUSTIFY_SELECTOR,
                blocks = Y.all(selector);

            blocks.each(function(node){
                if (node.test(NOJUSTIFY)) {
                    return;
                }

                var text = node.get('text').trim(),
                    textArray,
                    justifySpans = node.all('.' + JUSTIFY_SPAN);

                if (text.length * 0.5 > text.replace(/[0-9a-zA-Z]/g, '').length || node.one('iframe,object,img,i,embed,br')) {
                    // 1. over half of the text is english, bypass this
                    // 2. if there are any iframe/object... which is not inline text, we will skip
                    node.addClass(NOJUSTIFY);
                    return;
                }

                // an expensive way to cleanup existing justify-spans : mostly from window resize
                if (justifySpans.size() > 0) {
                    // a dirty way to remove all the justify spans in the dom
                    justifySpans.each(function (child){
                        child.replace(Y.Node.create(child.get('innerHTML')));
                    });
                    // have to reset html to kill yui node
                    node.setHTML(node.get('innerHTML'));
                }

                textArray = _parseInnerHtml(node);
                node.setHTML(_generateJustifyHtml(textArray, {node: node, engRatio: engRatio, sizeReduction: sizeReduction}));

            });
        };


}, "0.0.1", { requires: [ 'node' ]});
