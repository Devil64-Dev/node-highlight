import { CallbackResponse, Extension } from '../../../types';
import { either } from '../../../utils/regex';

/**
 * Skip a match if it has a preceding dot
 *
 * This is used for `beginKeywords` to prevent matching expressions such as
 * `bob.keyword.do()`. The mode compiler automatically wires this up as a
 * special _internal_ 'on:begin' callback for modes with `beginKeywords`
 * @param {RegExpMatchArray} match
 * @param {CallbackResponse} response
 */
const skipIfHasPrecedingDot = (match: RegExpMatchArray, response: CallbackResponse) => {
  const before = match.input[match.index - 1];
  if (before === '.') {
    response.ignoreMatch();
  }
};

export const scopeClassName: Extension = (mode) => {
  if (mode.className !== undefined) {
    mode.scope = mode.className;
    delete mode.className;
  }
};

export const beginKeywords: Extension = (mode, parent) => {
  if (!parent) return undefined;
  if (!mode.beginKeywords) return undefined;

  mode.begin = `\\b(${mode.beginKeywords.split(' ').join('|')})(?!\\.)(?=\\b|\\s)`;
  mode.__beforeBegin = skipIfHasPrecedingDot;
  mode.keywords = mode.keywords || mode.beginKeywords;
  delete mode.beginKeywords;

  if (mode.relevance === undefined) {
    mode.relevance = 0;
  }

  return undefined;
};

/**
 * Allow `illegal` to contain an array of illegal values.
 */
export const compileIllegal: Extension = (mode) => {
  if (!Array.isArray(mode.illegal)) return undefined;

  mode.illegal = either(...mode.illegal);

  return undefined;
};

/**
 * `match` to match a single expression for readability.
 */
export const compileMatch: Extension = (mode) => {
  if (!mode.match) return undefined;
  if (mode.begin || mode.end) {
    throw new Error('begin & end are not supported with match');
  }

  mode.begin = mode.match;
  delete mode.match;

  return undefined;
};

/**
 * Provides the default 1 relevance to all modes.
 */
export const compileRelevance: Extension = (mode) => {
  if (mode.relevance === undefined) {
    mode.relevance = 1;
  }
};
