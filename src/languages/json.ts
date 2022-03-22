import {
  C_BLOCK_COMMENT_MODE,
  C_LINE_COMMENT_MODE,
  C_NUMBER_MODE, QUOTE_STRING_MODE,
} from '../core/modes';
import { LanguageDFn, Mode } from '../types';

const jsonLanguage: LanguageDFn = () => {
  const ATTRIBUTE: Mode = {
    className: 'attr',
    begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
    relevance: 1.01,
  };

  const PUNCTUATION: Mode = {
    match: /[{}[\],:]/,
    className: 'punctuation',
    relevance: 0,
  };

  const LITERALS: Mode = { beginKeywords: 'true false null' };

  return {
    name: 'JSON',
    contains: [
      ATTRIBUTE,
      PUNCTUATION,
      QUOTE_STRING_MODE,
      LITERALS,
      C_NUMBER_MODE,
      C_LINE_COMMENT_MODE,
      C_BLOCK_COMMENT_MODE,
    ],
    illegal: '\\S',
  };
};

export default jsonLanguage;
