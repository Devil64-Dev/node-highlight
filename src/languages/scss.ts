import {
  APOS_STRING_MODE,
  C_BLOCK_COMMENT_MODE,
  C_LINE_COMMENT_MODE,
  QUOTE_STRING_MODE,
} from '../core/modes';
import { LanguageDFn, Mode } from '../types';
import {
  ATTRIBUTES,
  CSS_MODES,
  MEDIA_FEATURES,
  PSEUDO_CLASSES,
  PSEUDO_ELEMENTS,
  TAGS,
} from './core/css-shared';

const scssLanguage: LanguageDFn = () => {
  const AT_IDENTIFIER = '@[a-z-]+'; // @font-face
  const AT_MODIFIERS = 'and or not only';
  const IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';

  const VARIABLE: Mode = {
    className: 'variable',
    begin: `(\\$${IDENT_RE})\\b`,
    relevance: 0,
  };

  return {
    name: 'SCSS',
    caseInsensitive: true,
    illegal: '[=/|\']',
    contains: [
      C_LINE_COMMENT_MODE,
      C_BLOCK_COMMENT_MODE,
      CSS_MODES.NUMBER,
      { className: 'selector-id', begin: '#[A-Za-z0-9_-]+', relevance: 0 },
      { className: 'selector-class', begin: '\\.[A-Za-z0-9_-]+', relevance: 0 },
      CSS_MODES.ATTRIBUTE_SELECTOR,
      { className: 'selector-tag', begin: `\\b(${TAGS.join('|')})\\b`, relevance: 0 },
      { className: 'selector-pseudo', begin: `:(${PSEUDO_CLASSES.join('|')})` },
      { className: 'selector-pseudo', begin: `:(:)?(${PSEUDO_ELEMENTS.join('|')})` },
      VARIABLE,
      { begin: /\(/, end: /\)/, contains: [CSS_MODES.NUMBER] },
      CSS_MODES.VARIABLE,
      { className: 'attribute', begin: `\\b(${ATTRIBUTES.join('|')})\\b` },
      { begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b' },
      {
        begin: /:/,
        end: /[;}{]/,
        contains: [
          C_BLOCK_COMMENT_MODE,
          VARIABLE,
          CSS_MODES.HEX_COLOR,
          QUOTE_STRING_MODE,
          APOS_STRING_MODE,
          CSS_MODES.IMPORTANT,
        ],
      },
      {
        begin: '@(page|font-face)',
        keywords: { $pattern: AT_IDENTIFIER, keyword: '@page @font-face' },
      },
      {
        begin: '@',
        end: '[{;]',
        returnBegin: true,
        keywords: {
          $pattern: /[a-z-]+/,
          keyword: AT_MODIFIERS,
          attribute: MEDIA_FEATURES.join(' '),
        },
        contains: [
          { begin: AT_IDENTIFIER, className: 'keyword' },
          { begin: /[a-z-]+(?=:)/, className: 'attribute' },
          VARIABLE,
          QUOTE_STRING_MODE,
          APOS_STRING_MODE,
          CSS_MODES.HEX_COLOR,
          CSS_MODES.NUMBER,
        ],
      },
      CSS_MODES.FUNCTION_DISPATCH,
    ],
  };
};

export default scssLanguage;
