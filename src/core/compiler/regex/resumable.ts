import { Language } from '../../../types';
import MultiRegex, { MultiRegexOptions } from './multi';

/*
  Created to solve the key deficiently with MultiRegex - there is no way to
  test for multiple matches at a single location.  Why would we need to do
  that?  In the future a more dynamic engine will allow certain matches to be
  ignored.  An example: if we matched say the 3rd regex in a large group but
  decided to ignore it - we'd need to started testing again at the 4th
  regex... but MultiRegex itself gives us no real way to do that.

  So what this class creates MultiRegexs on the fly for whatever search
  position they are needed.

  NOTE: These additional MultiRegex objects are created dynamically.  For most
  grammars most of the time we will never actually need anything more than the
  first MultiRegex - so this shouldn't have too much overhead.

  Say this is our search group, and we match regex3, but wish to ignore it.

    regex1 | regex2 | regex3 | regex4 | regex5    ' ie, startAt = 0

  What we need is a new MultiRegex that only includes the remaining
  possibilities:

    regex4 | regex5                               ' ie, startAt = 3

  This class wraps all that complexity up in a simple API... `startAt` decides
  where in the array of expressions to start doing the matching. It
  auto-increments, so if a match is found at position 2, then startAt will be
  set to 3.  If the end is reached startAt will return to 0.

  MOST of the time the parser will be setting startAt manually to 0.
*/
export default class ResumableMultiRegex {
  private _language: Language;

  rules: [(string | RegExp), MultiRegexOptions][];

  multiRegexes: MultiRegex[];

  count: number;

  lastIndex: number;

  regexIndex: number;

  constructor(language: Language) {
    this._language = language;
    this.rules = [];
    this.multiRegexes = [];
    this.count = 0;
    this.lastIndex = 0;
    this.regexIndex = 0;
  }

  getMatcher = (index: number) => {
    if (this.multiRegexes[index]) return this.multiRegexes[index];

    const matcher = new MultiRegex(this._language);
    this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
    matcher.compile();
    this.multiRegexes[index] = matcher;

    return matcher;
  };

  resumingScanAtSamePosition = () => this.regexIndex !== 0;

  considerAll = () => {
    this.regexIndex = 0;
  };

  addRule = (re: string | RegExp, opts: MultiRegexOptions) => {
    this.rules.push([re, opts]);
    if (opts.type === 'begin') {
      this.count += 1;
    }
  };

  exec = (str: string) => {
    const match = this.getMatcher(this.regexIndex);
    match.lastIndex = this.lastIndex;

    let result = match.exec(str);

    if (this.resumingScanAtSamePosition()) {
      if (result && result.index === this.lastIndex) {
        // result is position +0 and therefore a valid
        // "resume" match so result stays result
      } else {
        const match2 = this.getMatcher(0);
        match2.lastIndex = this.lastIndex + 1;
        result = match2.exec(str);
      }
    }

    if (result) {
      this.regexIndex += result.position + 1;
      if (this.regexIndex === this.count) {
        this.considerAll();
      }
    }

    return result;
  };
}
