import { KeywordDict, RawKeywords } from '../../types';

// keywords that should have no default relevance value
const COMMON_KEYWORDS = [
  'of',
  'and',
  'for',
  'in',
  'not',
  'or',
  'if',
  'then',
  'parent', // common variable name
  'list', // common variable name
  'value', // common variable name
];

const DEFAULT_KEYWORD_SCOPE = 'keyword';

/**
 * Determines if a given keyword is common or not.
 *
 * @param {string} keyword
 */
const commonKeyword = (keyword: string) => COMMON_KEYWORDS.includes(keyword.toLowerCase());

/**
 * Return the proper score for a given keyword.
 *
 * Also takes into account comment keywords, which will be scored 0 UNLESS
 * another score has been manually assigned.
 *
 * @param {string} keyword
 * @param {string} providedScore
 */
const scoreForKeyword = (keyword: string, providedScore: string) => {
  if (providedScore) {
    return Number(providedScore);
  }

  return commonKeyword(keyword) ? 0 : 1;
};

/**
 * Given raw keywords from a language definition, compile them.
 *
 * @param {RawKeywords} rawKeywords
 * @param {boolean} caseInsensitive
 * @param {string} scopeName
 *
 * @returns {KeywordDict} compiled keywords.
 */
const compileKeywords = (
  rawKeywords: RawKeywords,
  caseInsensitive: boolean,
  scopeName = DEFAULT_KEYWORD_SCOPE,
): KeywordDict => {
  const compiledKeywords: KeywordDict = Object.create(null);

  // utility functions
  /**
   * Compiles an individual list of keywords
   *
   * Ex: "for if when while|5"
   *
   * @param {string} _scopeName
   * @param {string[]} keywordList
   */
  const compileList = (_scopeName: string, keywordList: string[]) => {
    let _keywordList = keywordList;
    if (caseInsensitive) {
      _keywordList = keywordList.map((x) => x.toLowerCase());
    }

    _keywordList.forEach((keyword) => {
      const pair = keyword.split('|');
      compiledKeywords[pair[0]] = [_scopeName, scoreForKeyword(pair[0], pair[1])];
    });
  };

  if (typeof rawKeywords === 'string') {
    compileList(scopeName, rawKeywords.split(' '));
  } else if (Array.isArray(rawKeywords)) {
    compileList(scopeName, rawKeywords);
  } else {
    Object.keys(rawKeywords).forEach((_scopeName) => {
      // collapse all our objects back into the parent object
      Object.assign(
        compiledKeywords,
        compileKeywords(rawKeywords[_scopeName], caseInsensitive, _scopeName),
      );
    });
  }

  return compiledKeywords;
};

export default compileKeywords;
