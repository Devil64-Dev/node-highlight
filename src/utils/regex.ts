type StripOptionsFromArgsParam = (string | RegExp | Record<string, unknown>)[];
const stripOptionsFromArgs = <T = Record<string, unknown>>(args: StripOptionsFromArgsParam): T => {
  const opts = args[args.length - 1];

  if (typeof opts === 'object' && opts.constructor === Object) {
    args.splice(args.length - 1, 1);
    return opts as T;
  }

  return {} as T;
};

export const source = (re: string | RegExp) => {
  if (!re) return null;
  if (typeof re === 'string') return re;

  return re.source;
};

export const concat = (...args: (string | RegExp)[]) => args.map((x) => source(x)).join('');

export const scape = (value: string) => (
  new RegExp(value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'm')
);

export const lookahead = (re: string | RegExp) => concat('(?=', re, ')');

export const anyNumberOfTimes = (re: string | RegExp) => concat('(?:', re, ')*');

export const optional = (re: string | RegExp) => concat('(?:', re, ')?');

type RegexEitherOptions = { capture?: boolean };
type EitherParam = (string | RegExp)[] | [...(string | RegExp)[], RegexEitherOptions]
export const either = (...args: EitherParam) => {
  const opts = stripOptionsFromArgs<RegexEitherOptions>(args);
  return ([
    '(',
    opts.capture ? '' : '?:',
    args.map((x) => source(x as string | RegExp)).join('|'),
    ')',
  ].join(''));
};

export const countMatchGroups = (re: string | RegExp) => (
  new RegExp(`${re.toString()}|`).exec('').length - 1
);

/**
 * Does lexeme start with a regular expression match at the beginning.
 *
 * @param {RegExp} re
 * @param {string} lexeme
 */
export const startsWith = (re: RegExp, lexeme: string) => {
  const match = re && re.exec(lexeme);

  return match && match.index === 0;
};

const BACKREF_RE = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;

type RewriteBackreferencesOptions = { joinWith: string };
export const _rewriteBackreferences = (
  regexps: (string | RegExp)[],
  { joinWith }: RewriteBackreferencesOptions,
) => {
  let numCaptures = 0;

  return regexps.map((regex) => {
    numCaptures += 1;
    const offset = numCaptures;
    let re = source(regex);
    let out = '';

    while (re.length > 0) {
      const match = BACKREF_RE.exec(re);
      if (!match) {
        out += re;
        break;
      }

      out += re.substring(0, match.index);
      re = re.substring(match.index + match[0].length);

      if (match[0][0] === '\\' && match[1]) {
        // Adjust the backreference.
        out += `\\${String(Number(match[1]) + offset)}`;
      } else {
        out += match[0];

        if (match[0] === '(') {
          numCaptures += 1;
        }
      }
    }

    return out;
  }).map((re) => `(${re})`).join(joinWith);
};
