import { CompiledMode, Language } from '../../../types';
import { langRe } from '../../../utils';
import { countMatchGroups, _rewriteBackreferences } from '../../../utils/regex';

export interface MultiRegexOptions {
  [key: number]: MultiRegexOptions;
  rule?: CompiledMode;
  position?: number;
  type?: 'begin' | 'end' | 'illegal';
}

/**
 Stores multiple regular expressions and allows you to quickly search for
 them all in a string simultaneously - returning the first match.  It does
 this by creating a huge (a|b|c) regex - each individual item wrapped with ()
 and joined by `|` - using match groups to track position.  When a match is
 found checking which position in the array has content allows us to figure
 out which of the original regexes / match groups triggered the match.

 The match object itself (the result of `Regex.exec`) is returned but also
 enhanced by merging in any meta-data that was registered with the regex.
 This is how we keep track of which mode matched, and what type of rule
 (`illegal`, `begin`, end, etc).
*/
export default class MultiRegex {
  private _language: Language;

  matchIndexes: MultiRegexOptions;

  regexes: [MultiRegexOptions, (string | RegExp)][];

  matchAt: number;

  position: number;

  matcherRe: RegExp;

  lastIndex: number;

  constructor(langauge: Language) {
    this._language = langauge;
    this.matchIndexes = {};
    this.regexes = [];
    this.matchAt = 1;
    this.position = 0;
  }

  addRule = (re: string | RegExp, opts: MultiRegexOptions) => {
    opts.position = this.position;
    this.position += 1;
    this.matchIndexes[this.matchAt] = opts;
    this.regexes.push([opts, re]);
    this.matchAt += countMatchGroups(re) + 1;
  };

  compile = () => {
    if (this.regexes.length === 0) {
      this.exec = () => null;
    }

    const terminators = this.regexes.map((el) => el[1]);
    this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: '|' }), true, this._language);
    this.lastIndex = 0;
  };

  exec = (str: string) => {
    this.matcherRe.lastIndex = this.lastIndex;
    const match = this.matcherRe.exec(str);
    if (!match) return null;

    const index = match.findIndex((el, i) => i > 0 && el !== undefined);
    const matchData = this.matchIndexes[index];

    match.splice(0, index);

    return Object.assign(match, matchData);
  };
}
