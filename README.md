# node-highlight

A fork of [highlight.js](https://github.com/highlightjs/highlight.js), lighter and a bit faster.

**IMPORTANT**:
Support for highlight html DOM was remove. This is mean to be used as a faster solution to highlight code passed as string.

This fork was rewritten in TypeScript, if you are writing a new language you
can get help using types.

## Usage

The usage is the same as the core `highlight` function.

```javascript
  import { highlighter } from 'node-highlight';

  console.info(highlighter.highlight('code', 'lang', true));

  // See `Result` type for more information.
```

The package has support for ESM and CommonJS modules.

If you want a highlighter with custom options you can import the
main class called `NodeHighlight` and create a new instance.

```javascript
  import { NodeHighlight } from 'node-highlight';
  const nhl = new NodeHighlight({ classPrefix: 'custom-' });
```

**!NOTE**: The result is just a HTML string if you are using vanilla javascript you can inner to an element. Otherwise if you are using a framework like react you can use a parser.

## Core languages

The supported languages for now are:

- javascript

- typescript

- json

- xml | html | svg | xhtml | atom | plist | xsl | rss

- css

- perl

- python

Register custom languages isn't available for now. But I'm working on it.

## Styles

You can use styles from [highlight.js](https://github.com/highlightjs/highlight.js),
or create your owns. You can see the source of the target language definition to
get help developing your own styles.
