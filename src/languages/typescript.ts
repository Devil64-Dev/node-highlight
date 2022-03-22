/*
  Language: TypeScript
  Author: Panu Horsmalahti <panu.horsmalahti@iki.fi>
  Contributors: Ike Ku <dempfi@yahoo.com>
  Description: TypeScript is a strict superset of JavaScript
  Website: https://www.typescriptlang.org
  Category: common, scripting
*/

import { SHEBANG } from '../core/modes';
import { Language, LanguageDFn, Mode } from '../types';
import * as ECMAScript from './core/ecmascript';
import javascriptLang from './javascript';

const typescriptLanguage: LanguageDFn = () => {
  const tsLanguage = javascriptLang();

  const TYPES = [
    'any',
    'void',
    'number',
    'boolean',
    'string',
    'object',
    'never',
    'symbol',
    'bigint',
    'unknown',
  ];

  const NAMESPACE: Mode = {
    beginKeywords: 'namespace',
    end: /\{/,
    excludeEnd: true,
    contains: [tsLanguage.exports?.CLASS_REFERENCE as Mode],
  };

  const INTERFACE: Mode = {
    beginKeywords: 'interface',
    end: /\{/,
    excludeEnd: true,
    keywords: {
      keyword: 'interface extends',
      built_in: TYPES,
    },
    contains: [tsLanguage.exports?.CLASS_REFERENCE as Mode],
  };

  const USE_STRICT: Mode = {
    relevance: 10,
    className: 'meta',
    begin: /^\s*['"]use strict['"]/,
  };

  const TS_SPECIFIC_KEYWORDS = [
    'type',
    'namespace',
    'interface',
    'public',
    'private',
    'protected',
    'implements',
    'declare',
    'abstract',
    'readonly',
    'enum',
    'override',
  ];

  const KEYWORDS = {
    $pattern: ECMAScript.IDENT_RE,
    keyword: ECMAScript.KEYWORDS.concat(TS_SPECIFIC_KEYWORDS),
    literal: ECMAScript.LITERALS,
    built_in: ECMAScript.BUILT_INS.concat(TYPES),
    'variable.language': ECMAScript.BUILT_IN_VARIABLES,
  };

  const DECORATOR: Mode = { className: 'meta', begin: `@${ECMAScript.IDENT_RE}` };

  const swapMode = (
    mode: Language,
    label: string,
    replacement: Mode,
  ) => {
    const index = mode.contains.findIndex((m) => m.label === label);
    if (index === -1) throw new Error('Can not find mode to replace');
    mode.contains.splice(index, 1, replacement);
  };

  Object.assign(tsLanguage.keywords, KEYWORDS);
  if (tsLanguage.exports?.PARAMS_CONTAINS && Array.isArray(tsLanguage.exports.PARAMS_CONTAINS)) {
    tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
  }
  tsLanguage.contains = tsLanguage.contains.concat([DECORATOR, NAMESPACE, INTERFACE]);

  // TS gets a simpler shebang rule than JS
  swapMode(tsLanguage, 'shebang', SHEBANG());
  // JS use strict rule purposely excludes `asm` which makes no sense
  swapMode(tsLanguage, 'use_strict', USE_STRICT);

  const FUNCTION_DECLARATION = tsLanguage.contains.find((m) => m.label === 'func.def');
  FUNCTION_DECLARATION.relevance = 0; // () => {} is more typical in TypeScript

  Object.assign(tsLanguage, { name: 'TypeScript', aliases: ['ts', 'tsx'] });

  return tsLanguage;
};

export default typescriptLanguage;
