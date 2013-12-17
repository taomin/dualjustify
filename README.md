#Dual Justify Example

A javascript lib for implementing dual-justify for pure text paragraphs.

a demo url : http://newspeak.cc:3000/

The idea came from @octw
http://blog.readmoo.com/2013/12/03/why-not-use-justification-on-web/

## How to use it on your blog (or how to messed up your site)

WARNING: You better know basic HTML/CSS for your debugging

In your blog, insert below codes:

```
<link rel="stylesheet" type="text/css" href="http://newspeak.cc:3000/css/justify.css" />
<script type="text/javascript" src="http://newspeak.cc:3000/js/justify.js"></script>
<script>
    var YUtil;
    YUI().use('event-resize', 'dualjustify', function(Y){
        YUtil = Y;
        options = {
                // CSS selector for the article body's paragraph
                selector: '.item_content p',
                // you can customize how dual justify works. This is an avg of how much %width that an english char occupies
                engRatio: 0.51,
                // if you want to adjust your English text font size, specify the delta here
                sizeReduction: 0
        };
        Y.on('domready', Y.Justify.DualJustify, null, options);
        Y.on('resize', Y.Justify.DualJustify, null, options);
    });
</script>
```

## Documentation

Based on YUI 3 and Node JS.

Step:
* Clone this repo
* npm install
* node app
* load http://localhost:3000/ in your browser and see example
