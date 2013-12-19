/*global YUI */
YUI.add('dualjustify', function(Y, NAME){

        var DOUBLE_BYTE = 'd',
            SINGLE_BYTE = 's',
            TAG = 't',
            DUALJUSTIFY_SELECTOR = '.dualjustify',
            JUSTIFY_SPAN = 'justify-span',
            JUSTIFY_HYPHEN = 'justify-hyphen',
            NOJUSTIFY = 'justify-noadjust',
            refBlock,  // last node that needs dualjustify. We will store this node because we use it for testing char width
            widthNode,
            widthMap = {};


        function isDoubleByte (character) {
            // A temporary hack for determing if this is double-byte chars
            // it looks like not a trivial as it may seen. double byte chars are spread all over the UTF encoding space
            return character.charCodeAt(0) > 10000;
        }

        /**
         * A function that calculates the char width, and store the value in widthMap.
         * @param character {String} The character that we want to get width
         * @void
         */
        function _getCharWidth(character) {

            if (!widthNode) {
                refBlock.append('<span style="visibility:hidden;display:inline;margin:0;padding:0;border:0"></span>');
                widthNode = refBlock.get('lastChild');
            }

            if (widthMap[character] === undefined) {
                widthNode.set('text', character);
                widthMap[character] = widthNode.get('offsetWidth') || 5;  // empty space's offsetWidth is 0, change that to 5
            }

        }

        /**
         * Parse a Node's innerHTML and parse into an array. The array would be look like
         *  [
         *       { type: TAG, text: '<a href="blah">'},
         *       { type: SINGLE_BYTE, text: 'abc' },
         *       { type: DOUBLE_BYTE, text: '中文'},
         *       { type: TAG, text: '</a>'}
         *  ]
         * @param node {Y.Node} a node which we want to parse its innerHTML
         * @return {Array} parsed result
         */
        function _parseInnerHtml (node) {
            var output = [], hasOuterHtml, wrapper, text, currentInDoubleByte, i, character, isDouble,
                currentStr = '', nodeName = node.get('nodeName');

            if (nodeName === 'BR') {
                // if the tag is BR, include it directly
                return [{ type: TAG, text: node.get('outerHTML')}];
            } else if (node.get('childNodes').size() === 0 || node.test('.' + JUSTIFY_SPAN)) {
                // base case: this node contains pure text, parse string into array
                text = node.get('text').trim().replace(/（/g, '(').replace(/）/g, ')');
                if (text.length > 0) {
                    // initial value
                    currentInDoubleByte = isDoubleByte(text.charAt(0));

                    for (i=0; i < text.length; i++) {
                        character = text.charAt(i);
                        isDouble = isDoubleByte(character);

                        if (!isDouble) {
                            _getCharWidth(character);
                        }

                        // if new char uses the same lang w/ current string
                        if (isDouble === currentInDoubleByte) {
                            // append it to current string
                            currentStr += character;
                        } else {
                        // if not, save the previous string into text array
                            output.push({
                                type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                                text: currentStr
                            });
                            currentStr = character;
                            currentInDoubleByte = isDouble;
                        }

                    }
                    // last one
                    output.push({
                        type: currentInDoubleByte ? DOUBLE_BYTE : SINGLE_BYTE,
                        text: currentStr
                    });
                }

                return output;  //return result
            }

            if (node.test('.' + NOJUSTIFY)) {
                // this is a tag and we can by pass it
                return [];
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

        }


        function _generateJustifyHtml (textArray, node) {

            if (!node || !textArray || !Array.isArray(textArray)) {
                return;
            }


            var containerWidth = parseInt(node.getComputedStyle('width').replace('px', ''), 10),
                currentLineChars = 0,
                outputHtml = '',
                fontsize = parseInt(node.getComputedStyle('fontSize').replace('px', ''), 10),
                charPerLine = Math.floor(containerWidth / fontsize);

            // generating output html
            Y.Array.each(textArray, function (content, index){

                if ((index === 0 || index === textArray.length - 1) && content.type === TAG) {
                    //skip the outer wrapper
                    return;
                }

                var textWidth, units, cutpos, classes, textAlign, index, spaceleft;
                currentLineChars = currentLineChars % charPerLine;
                if (content.type === TAG) {
                    // if the tag is br, it will go to next line, so reset the currentLineChars
                    if (content.text === '<br>' || content.text === '<br/>') {
                        currentLineChars = 0;
                    }
                    // otherwise, just assume it is harmless and include it
                    outputHtml += content.text;
                } else if (content.type === DOUBLE_BYTE) {
                    outputHtml += content.text;
                    currentLineChars += content.text.length;
                } else {

                    // single byte
                    content.text = content.text.trim();
                    if (content.text.length >= 3) {
                        content.text = ' ' + content.text + ' ';
                    }
                    textAlign = 'center';
                    while (content.text.length > 0) {
                        textWidth = 0;
                        units = 0;
                        // new string width
                        classes = JUSTIFY_SPAN;
                        spaceleft = (charPerLine - currentLineChars) * fontsize;  //left space in current row; in pixels
                        for (index = 0; index < content.text.length; index++ ) {
                            textWidth += widthMap[content.text.charAt(index)];
                            if (spaceleft < textWidth) {
                                // we need to cut string here
                                units = charPerLine - currentLineChars;
                                if (/[a-zA-Z]/.test(content.text.charAt(index - 1))) {
                                    classes += ' ' + JUSTIFY_HYPHEN;
                                    textAlign = 'right';
                                }
                                break;
                            }
                        }
                        cutpos = index;
                        units = units || Math.ceil(textWidth / fontsize);
                        outputHtml += '<span class="' + classes + '" style="text-align:' + textAlign + ';width:' + (fontsize * units) + 'px;font-size:' + fontsize +'px">' + content.text.slice(0, cutpos) + '</span>';
                        content.text = content.text.substring(cutpos);
                        currentLineChars = (currentLineChars + units) % charPerLine;
                        textAlign = content.text.length > 0 ? 'left' : 'center';
                    }

                }

            });

            return outputHtml;

        }


        Y.namespace('Justify').DualJustify = function (options) {

            var timestart = Date.now(), timeend,
                selector = options && options.selector ? options.selector : DUALJUSTIFY_SELECTOR,
                blocks = Y.all(selector);

            refBlock = blocks.size() > 0 ? blocks.item(blocks.size() - 1) : null;

            blocks.each(function(node){
                if (node.test('.' + NOJUSTIFY)) {
                    return;
                }

                var text = node.get('text').trim(),
                    textArray,
                    justifySpans = node.all('.' + JUSTIFY_SPAN);

                if (text.length * 0.5 > text.replace(/[0-9a-zA-Z]/g, '').length || node.one('iframe,object,img,i,embed,table,ol,ul,li,.' + NOJUSTIFY)) {
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
                node.setHTML(_generateJustifyHtml(textArray, node)).setStyle('word-break', 'break-all');

            });
            if (widthNode) {
                widthNode.remove(true);
            }
            timeend = Date.now();
            console.log('total execution: ', timeend - timestart);
        };


}, "0.0.1", { requires: [ 'node' ]});
