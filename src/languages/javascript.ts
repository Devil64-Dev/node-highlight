import { inherit } from '../utils';
import * as ECMAScript from './core/ecmascript';
import { CallbackResponse, LanguageDFn, Mode } from '../types';
import {
  APOS_STRING_MODE,
  BACKSLASH_ESCAPE,
  COMMENT,
  C_BLOCK_COMMENT_MODE,
  C_LINE_COMMENT_MODE,
  QUOTE_STRING_MODE,
  REGEXP_MODE,
  RE_STARTERS_RE,
  SHEBANG,
  TITLE_MODE,
  UNDERSCORE_IDENT_RE,
} from '../core/modes';
import { concat, either, lookahead } from '../utils/regex';

const javascriptLanguage: LanguageDFn = () => {
  const hasClosingTag = (match: RegExpMatchArray, { after }: { after: number }) => (
    match.input?.indexOf(`</${match[0].slice(1)}`, after) !== -1
  );

  const FRAGMENT: Mode = {
    begin: '<>',
    end: '</>',
  };

  // to avoid some special cases inside isTrulyOpeningTag
  const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;

  const XML_TAG = {
    begin: /<[A-Za-z0-9\\._:-]+/,
    end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
    isTrulyOpeningTag: (match: RegExpMatchArray, response: CallbackResponse) => {
      const afterMatchIndex = match[0].length + (match.index || 0);
      const nextChar = match.input && match.input[afterMatchIndex];

      // HTML should not include another raw `<` inside a tag
      // nested type?
      // `<Array<Array<number>>`, etc.

      // the , gives away that this is not HTML
      // `<T, A extends keyof T, V>`
      if (nextChar === '<' || nextChar === ',') return response.ignoreMatch();

      // `<something>`
      // Quite possibly a tag, lets look for a matching closing tag...
      if (nextChar === '>') {
        if (!hasClosingTag(match, { after: afterMatchIndex })) {
          response.ignoreMatch();
        }

        // `<blah />` (self-closing)
        // handled by simpleSelfClosing rule

        // `<From extends string>`
        // technically this could be HTML, but it smells like a type
        const afterMatch = match.input?.substring(afterMatchIndex);
        const m = afterMatch?.match(/^\s+extends\s+/);
        // NOTE: This is ugh, but added specifically for https://github.com/highlightjs/highlight.js/issues/3276
        if (m && m.index === 0) {
          return response.ignoreMatch();
        }
      }

      return undefined;
    },
  };

  const KEYWORDS = {
    $pattern: ECMAScript.IDENT_RE,
    keyword: ECMAScript.KEYWORDS,
    literal: ECMAScript.LITERALS,
    built_in: ECMAScript.BUILT_INS,
    'variable.language': ECMAScript.BUILT_IN_VARIABLES,
  };

  const decimalDigits = '[0-9](_?[0-9])*';
  const frac = `\\.(${decimalDigits})`;
  const decimalInteger = '0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*';

  const NUMBER: Mode = {
    className: 'number',
    variants: [
      {
        begin: [
          `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))`,
          `[eE][+-]?(${decimalDigits})\\b`,
        ].join(''),
      },
      { begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
      { begin: '\\b(0|[1-9](_?[0-9])*)n\\b' },
      { begin: '\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b' },
      { begin: '\\b0[bB][0-1](_?[0-1])*n?\\b' },
      { begin: '\\b0[oO][0-7](_?[0-7])*n?\\b' },
      { begin: '\\b0[0-7]+n?\\b' },
    ],
    relevance: 0,
  };
  const SUBST: Mode = {
    className: 'subst',
    begin: '\\$\\{',
    end: '\\}',
    keywords: KEYWORDS,
    contains: [], // defined later
  };

  const HTML_TEMPLATE: Mode = {
    begin: 'html`',
    end: '',
    starts: {
      end: '`',
      returnEnd: false,
      contains: [BACKSLASH_ESCAPE, SUBST],
      subLanguage: 'xml',
    },
  };

  const CSS_TEMPLATE: Mode = {
    begin: 'css`',
    end: '',
    starts: {
      end: '`',
      returnEnd: false,
      contains: [BACKSLASH_ESCAPE, SUBST],
      subLanguage: 'css',
    },
  };

  const TEMPLATE_STRING: Mode = {
    className: 'string',
    begin: '`',
    end: '`',
    contains: [BACKSLASH_ESCAPE, SUBST],
  };

  const JSDOC_COMMENT = COMMENT(
    /\/\*\*(?!\/)/,
    '\\*/',
    {
      relevance: 0,
      contains: [
        {
          begin: '(?=@[A-Za-z]+)',
          relevance: 0,
          contains: [
            { className: 'doctag', begin: '@[A-Za-z]+' },
            {
              className: 'type',
              begin: '\\{',
              end: '\\}',
              excludeEnd: true,
              excludeBegin: true,
              relevance: 0,
            },
            {
              className: 'variable',
              begin: `${ECMAScript.IDENT_RE}(?=\\s*(-)|$)`,
              endsParent: true,
              relevance: 0,
            },
            { begin: /(?=[^\n])\s/, relevance: 0 },
          ],
        },
      ],
    },
  );

  const JS_COMMENT: Mode = {
    className: 'comment',
    variants: [
      JSDOC_COMMENT,
      C_BLOCK_COMMENT_MODE,
      C_LINE_COMMENT_MODE,
    ],
  };

  const SUBST_INTERNALS: Mode[] = [
    APOS_STRING_MODE,
    QUOTE_STRING_MODE,
    HTML_TEMPLATE,
    CSS_TEMPLATE,
    TEMPLATE_STRING,
    NUMBER,
  ];

  SUBST.contains = SUBST_INTERNALS.concat({
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS,
    contains: ['self', ...SUBST_INTERNALS],
  });
  const SUBST_AND_COMMENTS: Mode[] = [{}].filter((i) => Object.keys(i).length)
    .concat(JS_COMMENT, SUBST.contains);
  const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([{
    begin: /\(/,
    end: /\)/,
    keywords: KEYWORDS,
    contains: ['self', ...SUBST_AND_COMMENTS],
  }]);
  const PARAMS = {
    className: 'params',
    begin: /\(/,
    end: /\)/,
    excludeBegin: true,
    excludeEnd: true,
    keywords: KEYWORDS,
    contains: PARAMS_CONTAINS,
  };

  // ES6 classes
  const CLASS_OR_EXTENDS: Mode = {
    variants: [
      // class Car extends vehicle
      {
        match: [
          /class/,
          /\s+/,
          ECMAScript.IDENT_RE,
          /\s+/,
          /extends/,
          /\s+/,
          concat(ECMAScript.IDENT_RE, '(', concat(/\./, ECMAScript.IDENT_RE), ')*'),
        ],
        scope: {
          1: 'keyword',
          3: 'title.class',
          5: 'keyword',
          7: 'title.class.inherited',
        },
      },
      // class Car
      {
        match: [
          /class/,
          /\s+/,
          ECMAScript.IDENT_RE,
        ],
        scope: { 1: 'keyword', 3: 'title.class' },
      },
    ],
  };

  const CLASS_REFERENCE: Mode = {
    relevance: 0,
    match: either(
      /\bJSON/,
      /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,
      /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,
      /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/,
    ),
    className: 'title.class',
    keywords: {
      _: [
        ...ECMAScript.TYPES,
        ...ECMAScript.ERROR_TYPES,
      ],
    },
  };

  const USE_STRICT: Mode = {
    label: 'use_strict',
    className: 'meta',
    relevance: 10,
    begin: /^\s*['"]use (strict|asm)['"]/,
  };

  const FUNCTION_DEFINITION: Mode = {
    variants: [
      {
        match: [
          /function/,
          /\s+/,
          ECMAScript.IDENT_RE,
          /(?=\s*\()/,
        ],
      },
      // anonymous function
      {
        match: [
          /function/,
          /\s*(?=\()/,
        ],
      },
    ],
    scope: {
      1: 'keyword',
      3: 'title.function',
    },
    label: 'func.def',
    contains: [PARAMS],
    illegal: /%/,
  };

  const UPPER_CASE_CONSTANT: Mode = {
    relevance: 0,
    match: /\b[A-Z][A-Z_0-9]+\b/,
    className: 'variable.constant',
  };

  const FUNCTION_CALL: Mode = {
    match: concat(
      /\b/,
      concat('(?!', [...ECMAScript.BUILT_IN_GLOBALS, 'super'].join('|'), ')'),
      ECMAScript.IDENT_RE,
      lookahead(/\(/),
    ),
    className: 'title.function',
    relevance: 0,
  };

  const PROPERTY_ACCESS: Mode = {
    begin: concat(
      /\./,
      lookahead((concat(ECMAScript.IDENT_RE, /(?![0-9A-Za-z$_(])/))),
    ),
    end: ECMAScript.IDENT_RE,
    excludeBegin: true,
    keywords: 'prototype',
    className: 'property',
    relevance: 0,
  };

  const GETTER_OR_SETTER: Mode = {
    match: [
      /get|set/,
      /\s+/,
      ECMAScript.IDENT_RE,
      /(?=\()/,
    ],
    scope: {
      1: 'keyword',
      3: 'title.function',
    },

    contains: [{ begin: /\(\)/ }, PARAMS],
  };

  const FUNC_LEAD_IN_RE = [
    '(\\(',
    '[^()]*(\\(',
    '[^()]*(\\(',
    '[^()]*',
    '\\)[^()]*)*',
    '\\)[^()]*)*',
    `\\)|${UNDERSCORE_IDENT_RE})\\s*=>`,
  ].join('');

  const FUNCTION_VARIABLE: Mode = {
    match: [
      /const|var|let/, /\s+/,
      ECMAScript.IDENT_RE,
      /\s*/,
      /=\s*/,
      /(async\s*)?/, // async is optional
      lookahead(FUNC_LEAD_IN_RE),
    ],
    keywords: 'async',
    scope: {
      1: 'keyword',
      3: 'title.function',
    },
    contains: [PARAMS],
  };

  return {
    name: 'Javascript',
    aliases: ['js', 'jsx', 'mjs', 'cjs'],
    keywords: KEYWORDS,
    // this will be extended by TypeScript
    exports: { PARAMS_CONTAINS, CLASS_REFERENCE },
    illegal: /#(?![$_A-z])/,
    contains: [
      SHEBANG({
        label: 'shebang',
        binary: 'node',
        relevance: 5,
      }),
      USE_STRICT,
      APOS_STRING_MODE,
      QUOTE_STRING_MODE,
      HTML_TEMPLATE,
      CSS_TEMPLATE,
      TEMPLATE_STRING,
      JS_COMMENT,
      NUMBER,
      CLASS_REFERENCE,
      {
        className: 'attr',
        begin: ECMAScript.IDENT_RE + lookahead(':'),
        relevance: 0,
      },
      FUNCTION_VARIABLE,
      { // "value" container
        begin: `(${RE_STARTERS_RE}|\\b(case|return|throw)\\b)\\s*`,
        keywords: 'return throw case',
        relevance: 0,
        contains: [
          JS_COMMENT,
          REGEXP_MODE,
          {
            className: 'function',
            // we have to count the parens to make sure we actually have the
            // correct bounding ( ) before the =>.  There could be any number of
            // sub-expressions inside also surrounded by parens.
            begin: FUNC_LEAD_IN_RE,
            returnBegin: true,
            end: '\\s*=>',
            contains: [{
              className: 'params',
              variants: [
                { begin: UNDERSCORE_IDENT_RE, relevance: 0 },
                { begin: /\(\s*\)/, skip: true },
                {
                  begin: /\(/,
                  end: /\)/,
                  excludeBegin: true,
                  excludeEnd: true,
                  keywords: KEYWORDS,
                  contains: PARAMS_CONTAINS,
                },
              ],
            }],
          },
          // could be a comma delimited list of params to a function call
          { begin: /,/, relevance: 0 },
          { match: /\s+/, relevance: 0 },
          { // JSX
            variants: [
              FRAGMENT,
              { match: XML_SELF_CLOSING },
              {
                begin: XML_TAG.begin,
                'on:begin': XML_TAG.isTrulyOpeningTag,
                end: XML_TAG.end,
              },
            ],
            subLanguage: 'xml',
            contains: [{
              begin: XML_TAG.begin,
              end: XML_TAG.end,
              skip: true,
              contains: ['self'],
            }],
          },
        ],
      },
      FUNCTION_DEFINITION,

      // prevent this from getting swallowed up by function
      // since they appear "function like"
      { beginKeywords: 'while if switch catch for' },
      {
        // we have to count the parens to make sure we actually have the correct
        // bounding ( ).  There could be any number of sub-expressions inside
        // also surrounded by parens.
        begin: [
          '\\b(?!function)',
          UNDERSCORE_IDENT_RE,
          '\\(', // first parens
          '[^()]*(\\(',
          '[^()]*(\\(',
          '[^()]*',
          '\\)[^()]*)*',
          '\\)[^()]*)*',
          '\\)\\s*\\{', // end parens
        ].join(''),
        returnBegin: true,
        label: 'func.def',
        contains: [
          PARAMS,
          inherit(TITLE_MODE, { being: ECMAScript.IDENT_RE, className: 'title.function' }),
        ],
      },
      // catch ... so it won't trigger the property rule below
      { match: /\.\.\./, relevance: 0 },
      PROPERTY_ACCESS,
      // hack: prevents detection of keywords in some circumstances
      // .keyword()
      // $keyword = x
      { match: `\\$${ECMAScript.IDENT_RE}`, relevance: 0 },
      { match: [/\bconstructor(?=\s*\()/], scope: { 1: 'title.function' }, contains: [PARAMS] },
      FUNCTION_CALL,
      UPPER_CASE_CONSTANT,
      CLASS_OR_EXTENDS,
      GETTER_OR_SETTER,
      // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      { match: /\$[(.]/ },
    ],
  };
};

export default javascriptLanguage;
