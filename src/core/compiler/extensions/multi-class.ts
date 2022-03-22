import { CompiledMode } from '../../../types';
import { countMatchGroups, _rewriteBackreferences } from '../../../utils/regex';

const MultiClassError = new Error();

/**
 * Renumbers labeled scope names to account for additional inner match
 * groups that otherwise would break everything.
 *
 * Lets say we 3 match scopes:
 *
 *   { 1 => ..., 2 => ..., 3 => ... }
 *
 * So what we need is a clean match like this:
 *
 *   (a)(b)(c) => [ "a", "b", "c" ]
 *
 * But this falls apart with inner match groups:
 *
 * (a)(((b)))(c) => ["a", "b", "b", "b", "c" ]
 *
 * Our scopes are now "out of alignment" and we're repeating `b` 3 times.
 * What needs to happen is the numbers are remapped:
 *
 *   { 1 => ..., 2 => ..., 5 => ... }
 *
 * We also need to know that the ONLY groups that should be output
 * are 1, 2, and 5.  This function handles this behavior.
 *
 * @param {CompiledMode} mode
 * @param {(string | RegExp)[]} regexes
 * @param {{ key: "beginScope" | "endScope" }} opts
 */
const remapScopeNames = (
  mode: CompiledMode,
  regexes: (string | RegExp)[],
  { key }: { key: 'beginScope' | 'endScope' },
) => {
  let offset = 0;
  const scopeNames = mode[key];
  const emit: Record<number, boolean> = {};
  const positions: Record<number, string> = {};

  for (let i = 1; i <= regexes.length; i++) {
    positions[i + offset] = scopeNames[i];
    emit[i + offset] = true;
    offset += countMatchGroups(regexes[i - 1]);
  }

  mode[key] = positions;
  mode[key]._emit = emit;
  mode[key]._multi = true;
};

const beginMultiClass = (mode: CompiledMode): void => {
  if (!Array.isArray(mode.begin)) return undefined;

  if (mode.skip || mode.excludeBegin || mode.returnBegin) {
    throw MultiClassError;
  }

  if (typeof mode.beginScope !== 'object' || mode.beginScope === null) {
    throw MultiClassError;
  }

  remapScopeNames(mode, mode.begin, { key: 'beginScope' });
  mode.begin = _rewriteBackreferences(mode.begin, { joinWith: '' });

  return undefined;
};

const endMultiClass = (mode: CompiledMode): void => {
  if (!Array.isArray(mode.end)) return undefined;

  if (mode.skip || mode.excludeEnd || mode.returnEnd) {
    throw MultiClassError;
  }

  if (typeof mode.endScope !== 'object' || mode.endScope === null) {
    throw MultiClassError;
  }

  remapScopeNames(mode, mode.end, { key: 'endScope' });
  mode.end = _rewriteBackreferences(mode.end, { joinWith: '' });

  return undefined;
};

/**
 * this exists only to allow `scope: {}` to be used beside `match:`
 * Otherwise `beginScope` would necessary and that would look weird

  {
    match: [ /def/, /\w+/ ]
    scope: { 1: "keyword" , 2: "title" }
  }

 * @param {CompiledMode} mode
 */
const scopeSugar = (mode: CompiledMode) => {
  if (mode.scope && typeof mode.scope === 'object' && mode.scope !== null) {
    mode.beginScope = mode.scope;
    delete mode.scope;
  }
};

const multiClass = (mode: CompiledMode) => {
  scopeSugar(mode);

  if (typeof mode.beginScope === 'string') {
    mode.beginScope = { _wrap: mode.beginScope };
  }

  if (typeof mode.endScope === 'string') {
    mode.endScope = { _wrap: mode.endScope };
  }

  beginMultiClass(mode);
  endMultiClass(mode);
};

export default multiClass;
