import { Mode } from '../types';
import { inherit } from '../utils';
import deepFreeze from '../utils/deep-freeze';
import { concat, either } from '../utils/regex';

export const MATCH_NOTHING_RE = /\b\B/;
export const IDENT_RE = '[a-zA-Z]\\w*';
export const UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
export const NUMBER_RE = '\\b\\d+(\\.\\d+)?';
export const C_NUMBER_RE = '(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)';
export const BINARY_NUMBER_RE = '\\b(0b[01]+)';
export const RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

/**
 *
 */

type SHEBANGOptions = Partial<Mode> & { binary?: string | RegExp };
export const SHEBANG = (opts: SHEBANGOptions = {}) => {
  const beginShebang = /^#![ ]*\//;
  if (opts.binary) {
    opts.begin = concat(
      beginShebang,
      /.*\b/,
      opts.binary,
      /\b.*/,
    );
  }

  return inherit<Mode>({
    scope: 'meta',
    begin: beginShebang,
    end: /$/,
    relevance: 0,
    'on:begin': (match, response) => match.index !== 0 && response.ignoreMatch(),
  }, opts);
};

// Common modes
const _BACKSLASH_ESCAPE: Mode = { scope: 'backslash-scape', begin: '\\\\[\\s\\S]', relevance: 0 };
export const BACKSLASH_ESCAPE = deepFreeze(_BACKSLASH_ESCAPE);

const _APOS_STRING_MODE: Mode = {
  scope: 'string',
  begin: '\'',
  end: '\'',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE],
};
export const APOS_STRING_MODE = deepFreeze(_APOS_STRING_MODE);

const _QUOTE_STRING_MODE: Mode = {
  scope: 'string',
  begin: '"',
  end: '"',
  illegal: '\\n',
  contains: [BACKSLASH_ESCAPE],
};
export const QUOTE_STRING_MODE = deepFreeze(_QUOTE_STRING_MODE);

export const PHRASAL_WORDS_MODE: Mode = {
  begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/,
};

/**
 * Creates a comment mode.
 *
 * @param {string | RegExp} begin
 * @param {string | RegExp} end
 * @param {string | RegExp} modeOptions
 */
export const COMMENT = (
  begin: string | RegExp,
  end: string | RegExp,
  modeOptions: Mode | { [key: string]: unknown } = {},
): Partial<Mode> => {
  const mode = inherit<Mode>({
    scope: 'comment',
    begin,
    end,
    contains: [],
  }, modeOptions);

  mode.contains?.push({
    scope: 'doctag',
    // hack to avoid the space from being included. the space is necessary to
    // match here to prevent the plain text rule below from gobbling up doctags
    begin: '[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)',
    end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
    excludeBegin: true,
    relevance: 0,
  });

  const ENGLISH_WORD = either(
    // list of common 1 and 2 letter words in English
    'I',
    'a',
    'is',
    'so',
    'us',
    'to',
    'at',
    'if',
    'in',
    'it',
    'on',
    // note: this is not an exhaustive list of contractions, just popular ones
    /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, // contractions - can't we'd they're let's, etc
    /[A-Za-z]+[-][a-z]+/, // `no-way`, etc.
    /[A-Za-z][a-z]{2,}/, // allow capitalized words at beginning of sentences
  );

  // looking like plain text, more likely to be a comment
  mode.contains?.push({
    begin: concat(
      /[ ]+/, // necessary to prevent us gobbling up doctags like /* @author Bob Mcgill */
      '(',
      ENGLISH_WORD,
      /[.]?[:]?([.][ ]|[ ])/,
      '){3}', // look for 3 words in a row
    ),
  });

  return mode;
};

export const C_LINE_COMMENT_MODE = COMMENT('//', '$');

export const C_BLOCK_COMMENT_MODE = COMMENT('/\\*', '\\*/');

export const HASH_COMMENT_MODE = COMMENT('#', '$');

export const NUMBER_MODE: Mode = {
  scope: 'number',
  begin: NUMBER_RE,
  relevance: 0,
};

export const C_NUMBER_MODE: Mode = {
  scope: 'number',
  begin: C_NUMBER_RE,
  relevance: 0,
};

export const BINARY_NUMBER_MODE: Mode = {
  scope: 'number',
  begin: BINARY_NUMBER_RE,
  relevance: 0,
};

const _REGEXP_MODE: Mode = {
  begin: /(?=\/[^/\n]*\/)/,
  contains: [{
    scope: 'regexp',
    begin: /\//,
    end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      BACKSLASH_ESCAPE,
      {
        scope: 'group',
        begin: /\[/,
        beginScope: 'open',
        end: /\]/,
        endScope: 'close',
        relevance: 0,
        contains: [
          BACKSLASH_ESCAPE,
          {
            scope: 'negate-char',
            begin: /\^/,
            relevance: 1,
          },
        ],
      },
      {
        scope: 'operator',
        begin: /(\*\?|\*)|(\+\?|\+)|\.\?/,
      },
      {
        scope: 'meta',
        begin: /\$|\^/,
        relevance: 0,
      },
    ],
  }],
};

export const REGEXP_MODE = deepFreeze(_REGEXP_MODE);

export const TITLE_MODE: Mode = {
  scope: 'title',
  begin: IDENT_RE,
  relevance: 0,
};

export const UNDERSCORE_TITLE_MODE: Mode = {
  scope: 'title',
  begin: UNDERSCORE_IDENT_RE,
  relevance: 0,
};

export const METHOD_GUARD: Mode = {
  begin: `\\.\\s*${UNDERSCORE_IDENT_RE}`,
  relevance: 0,
};

export const END_SAME_AS_BEGIN = (mode: Partial<Mode>) => (
  Object.assign<Mode, Mode>(mode, {
    'on:begin': (m, resp) => { [resp.data._beginMatch] = m; },
    'on:end': (m, resp) => { if (resp.data._beginMatch !== m[1]) resp.ignoreMatch(); },
  })
);
