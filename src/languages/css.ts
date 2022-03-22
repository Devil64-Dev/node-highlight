import { APOS_STRING_MODE, C_BLOCK_COMMENT_MODE, QUOTE_STRING_MODE } from '../core/modes';
import { LanguageDFn } from '../types';
import { lookahead } from '../utils/regex';
import {
  ATTRIBUTES,
  CSS_MODES,
  MEDIA_FEATURES,
  PSEUDO_CLASSES,
  PSEUDO_ELEMENTS,
  TAGS,
} from './core/css-shared';

const cssLanguage: LanguageDFn = () => {
  const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
  const AT_MODIFIERS = 'and or not only';
  const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/; // @-webkit-keyframes
  const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  const STRINGS = [APOS_STRING_MODE, QUOTE_STRING_MODE];

  return {
    name: 'css',
    caseInsensitive: true,
    illegal: /[=|'$]/,
    keywords: { keyframePosition: 'from to' },
    classNameAliases: { keyframePosition: 'selector-tag' },
    contains: [
      C_BLOCK_COMMENT_MODE,
      VENDOR_PREFIX,
      CSS_MODES.NUMBER,
      { className: 'selector-id', begin: /#[A-Za-z0-9_-]+/, relevance: 0 },
      { className: 'selector-class', begin: `\\.${IDENT_RE}`, relevance: 0 },
      CSS_MODES.ATTRIBUTE_SELECTOR,
      {
        className: 'selector-pseudo',
        variants: [
          { begin: `:(${PSEUDO_CLASSES.join('|')})` },
          { begin: `:(:)?(${PSEUDO_ELEMENTS.join('|')})` },
        ],
      },
      CSS_MODES.VARIABLE,
      { className: 'attribute', begin: `\\b(${ATTRIBUTES.join('|')})\\b` },
      {
        begin: /:/,
        end: /[;}{]/,
        contains: [
          C_BLOCK_COMMENT_MODE,
          CSS_MODES.HEX_COLOR,
          CSS_MODES.IMPORTANT,
          CSS_MODES.NUMBER,
          ...STRINGS,
          {
            begin: /(url|data-uri)\(/,
            end: /\)/,
            relevance: 0, // from keywords
            keywords: { built_in: 'url data-uri' },
            contains: [{
              className: 'string',
              begin: /[^)]/,
              endsWithParent: true,
              excludeEnd: true,
            }],
          },
          CSS_MODES.FUNCTION_DISPATCH,
        ],
      },
      {
        begin: lookahead(/@/),
        end: '[{;]',
        relevance: 0,
        illegal: /:/, // break on Less variables @var: ...
        contains: [
          { className: 'keyword', begin: AT_PROPERTY_RE },
          {
            begin: /\s/,
            endsWithParent: true,
            excludeEnd: true,
            relevance: 0,
            keywords: {
              $pattern: /[a-z-]+/,
              keyword: AT_MODIFIERS,
              attribute: MEDIA_FEATURES.join(' '),
            },
            contains: [
              { begin: /[a-z-]+(?=:)/, className: 'attribute' },
              ...STRINGS,
              CSS_MODES.NUMBER,
            ],
          },
        ],
      },
      { className: 'selector-tag', begin: `\\b(${TAGS.join('|')})\\b` },
    ],
  };
};

export default cssLanguage;
