import {
  APOS_STRING_MODE,
  BACKSLASH_ESCAPE,
  HASH_COMMENT_MODE,
  QUOTE_STRING_MODE,
} from '../core/modes';
import { LanguageDFn, Mode } from '../types';
import { lookahead } from '../utils/regex';

const pythonLanguage: LanguageDFn = () => {
  const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;

  const RESERVED_WORDS = [
    'and',
    'as',
    'assert',
    'async',
    'await',
    'break',
    'class',
    'continue',
    'def',
    'del',
    'elif',
    'else',
    'except',
    'finally',
    'for',
    'from',
    'global',
    'if',
    'import',
    'in',
    'is',
    'lambda',
    'nonlocal|10',
    'not',
    'or',
    'pass',
    'raise',
    'return',
    'try',
    'while',
    'with',
    'yield',
  ];

  const BUILT_INS = [
    '__import__',
    'abs',
    'all',
    'any',
    'ascii',
    'bin',
    'bool',
    'breakpoint',
    'bytearray',
    'bytes',
    'callable',
    'chr',
    'classmethod',
    'compile',
    'complex',
    'delattr',
    'dict',
    'dir',
    'divmod',
    'enumerate',
    'eval',
    'exec',
    'filter',
    'float',
    'format',
    'frozenset',
    'getattr',
    'globals',
    'hasattr',
    'hash',
    'help',
    'hex',
    'id',
    'input',
    'int',
    'isinstance',
    'issubclass',
    'iter',
    'len',
    'list',
    'locals',
    'map',
    'max',
    'memoryview',
    'min',
    'next',
    'object',
    'oct',
    'open',
    'ord',
    'pow',
    'print',
    'property',
    'range',
    'repr',
    'reversed',
    'round',
    'set',
    'setattr',
    'slice',
    'sorted',
    'staticmethod',
    'str',
    'sum',
    'super',
    'tuple',
    'type',
    'vars',
    'zip',
  ];

  const LITERALS = [
    '__debug__',
    'Ellipsis',
    'False',
    'None',
    'NotImplemented',
    'True',
  ];

  // https://docs.python.org/3/library/typing.html
  // TODO: Could these be supplemented by a CamelCase matcher in certain
  // contexts, leaving these remaining only for relevance hinting?
  const TYPES = [
    'Any',
    'Callable',
    'Coroutine',
    'Dict',
    'List',
    'Literal',
    'Generic',
    'Optional',
    'Sequence',
    'Set',
    'Tuple',
    'Type',
    'Union',
  ];

  const KEYWORDS = {
    $pattern: /[A-Za-z]\w+|__\w+__/,
    keyword: RESERVED_WORDS,
    built_in: BUILT_INS,
    literal: LITERALS,
    type: TYPES,
  };

  const PROMPT: Mode = {
    className: 'meta',
    begin: /^(>>>|\.\.\.) /,
  };

  const SUBST: Mode = {
    className: 'subst',
    begin: /\{/,
    end: /\}/,
    keywords: KEYWORDS,
    illegal: /#/,
  };

  const LITERAL_BRACKET: Mode = {
    begin: /\{\{/,
    relevance: 0,
  };

  const STRING: Mode = {
    className: 'string',
    contains: [BACKSLASH_ESCAPE],
    variants: [
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
        end: /'''/,
        contains: [BACKSLASH_ESCAPE, PROMPT],
        relevance: 10,
      },
      {
        begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
        end: /"""/,
        contains: [BACKSLASH_ESCAPE, PROMPT],
        relevance: 10,
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])'''/,
        end: /'''/,
        contains: [BACKSLASH_ESCAPE, PROMPT, LITERAL_BRACKET, SUBST],
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])"""/,
        end: /"""/,
        contains: [BACKSLASH_ESCAPE, PROMPT, LITERAL_BRACKET, SUBST],
      },
      {
        begin: /([uU]|[rR])'/,
        end: /'/,
        relevance: 10,
      },
      {
        begin: /([uU]|[rR])"/,
        end: /"/,
        relevance: 10,
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])'/,
        end: /'/,
      },
      {
        begin: /([bB]|[bB][rR]|[rR][bB])"/,
        end: /"/,
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])'/,
        end: /'/,
        contains: [BACKSLASH_ESCAPE, LITERAL_BRACKET, SUBST],
      },
      {
        begin: /([fF][rR]|[rR][fF]|[fF])"/,
        end: /"/,
        contains: [BACKSLASH_ESCAPE, LITERAL_BRACKET, SUBST],
      },
      APOS_STRING_MODE,
      QUOTE_STRING_MODE,
    ],
  };

  const digitPart = '[0-9](_?[0-9])*';
  const pointFloat = `(\\b(${digitPart}))?\\.(${digitPart})|\\b(${digitPart})\\.`;
  const _lookahead = `\\b|${RESERVED_WORDS.join('|')}`;

  const NUMBER: Mode = {
    className: 'number',
    relevance: 0,
    variants: [
      { begin: `(\\b(${digitPart})|(${pointFloat}))[eE][+-]?(${digitPart})[jJ]?(?=${_lookahead})` },
      { begin: `(${pointFloat})[jJ]?` },
      { begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${_lookahead})` },
      { begin: `\\b0[bB](_?[01])+[lL]?(?=${_lookahead})` },
      { begin: `\\b0[oO](_?[0-7])+[lL]?(?=${_lookahead})` },
      { begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${_lookahead})` },
      { begin: `\\b(${digitPart})[jJ](?=${_lookahead})` },
    ],
  };

  const COMMENT_TYPE: Mode = {
    className: 'comment',
    begin: lookahead(/# type:/),
    end: /$/,
    keywords: KEYWORDS,
    contains: [
      { begin: /# type:/ },
      { begin: /#/, end: /\b\B/, endsWithParent: true },
    ],
  };

  const PARAMS: Mode = {
    className: 'params',
    variants: [
      { className: '', begin: /\(\s*\)/, skip: true },
      {
        begin: /\(/,
        end: /\)/,
        excludeBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS,
        contains: ['self', PROMPT, NUMBER, STRING, HASH_COMMENT_MODE],
      },
    ],
  };

  SUBST.contains = [STRING, NUMBER, PROMPT];

  return {
    name: 'Python',
    aliases: ['py', 'gyp', 'ipython'],
    unicodeRegex: true,
    keywords: KEYWORDS,
    illegal: /(<\/|->|\?)|=>/,
    contains: [
      PROMPT,
      NUMBER,
      { begin: /\bself\b/ },
      { beginKeywords: 'if', relevance: 0 },
      STRING,
      COMMENT_TYPE,
      HASH_COMMENT_MODE,
      {
        match: [/\bdef/, /\s+/, IDENT_RE],
        scope: { 1: 'keyword', 3: 'title.function' },
        contains: [PARAMS],
      },
      {
        variants: [
          { match: [/\bclass/, /\s+/, IDENT_RE, /\s*/, /\(\s*/, IDENT_RE, /\s*\)/] },
          { match: [/\bclass/, /\s+/, IDENT_RE] },
        ],
        scope: {
          1: 'keyword',
          3: 'title.class',
          6: 'title.class.inherited',
        },
      },
      {
        className: 'meta',
        begin: /^[\t ]*@/,
        end: /(?=#)|$/,
        contains: [NUMBER, STRING, PARAMS],
      },
    ],
  };
};

export default pythonLanguage;
