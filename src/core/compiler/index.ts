import {
  CompiledLanguage,
  CompiledMode,
  Language,
  Mode,
} from '../../types';
import { inherit, langRe } from '../../utils';
import { source } from '../../utils/regex';
import {
  beginKeywords,
  compileIllegal,
  compileMatch,
  compileRelevance,
  scopeClassName,
} from './extensions';
import beforeMatchExt from './extensions/before-match';
import multiClass from './extensions/multi-class';
import compileKeywords from './keywords';
import ResumableMultiRegex from './regex/resumable';

/**
 * Determines if a mode has a dependency on it's parent or not.
 *
 * If a mode does have a parent dependency then often we need to clone it if
 * it's used in multiple places so that each copy points to the correct parent,
 * where-as modes without a parent can often safely be re-used at the bottom of
 * a mode chain.
 *
 * @param {Mode | null} mode
 * @returns {boolean} - is there a dependency on the parent?
 * */
const dependencyOnParent = (mode: Mode | null): boolean => {
  if (!mode) return false;

  return mode.endsWithParent || dependencyOnParent(mode.starts);
};

/**
 * Expands a mode or clones it if necessary
 *
 * This is necessary for modes with parental dependenceis (see notes on
 * `dependencyOnParent`) and for nodes that have `variants` - which must then be
 * exploded into their own individual modes at compile time.
 *
 * @param {Mode} mode
 * @returns {Mode | Mode[]}
 * */
const expandOrCloneMode = (mode: Mode): Mode | Mode[] => {
  if (mode.variants && !mode.cachedVariants) {
    mode.cachedVariants = mode.variants.map(
      (variant) => inherit(mode, { variants: null }, variant),
    );
  }

  if (mode.cachedVariants) {
    return mode.cachedVariants;
  }

  if (dependencyOnParent(mode)) {
    return inherit(mode, { starts: mode.starts ? inherit(mode.starts) : null });
  }

  if (Object.isFrozen(mode)) {
    return inherit(mode);
  }

  // no special dependency issues, just return ourselves
  return mode;
};

/**
 * Compiles a language definition result.
 *
 * Given the raw result of a language definition (Language), compiles this so
 * that it is ready for highlighting code.
 *
 * @param {Language} language
 * @returns {CompiledLanguage}
 */
const compileLanguage = (language: Language): CompiledLanguage => {
  /**
   * Given a mode, builds a huge ResumableMultiRegex that can be used to walk
   * the content and find matches.
   *
   * @param {CompiledMode} mode
   * @returns {ResumableMultiRegex}
   */
  const buildModeRegex = (mode: CompiledMode): ResumableMultiRegex => {
    const mm = new ResumableMultiRegex(language);
    mode.contains.forEach((term) => mm.addRule(term.begin, { rule: term, type: 'begin' }));

    if (mode.terminatorEnd) {
      mm.addRule(mode.terminatorEnd, { type: 'end' });
    }

    if (mode.illegal) {
      mm.addRule(mode.illegal as string | RegExp, { type: 'illegal' });
    }

    return mm;
  };

  /**
   * Compiles an individual mode
   *
   * This can raise an error if the mode contains certain detectable known logic
   * issues.
   * @param {Mode} mode
   * @param {CompiledMode | null} parent
   * @returns {CompiledMode | never}
   */
  const compileMode = (mode: Mode, parent?: CompiledMode | null): CompiledMode | never => {
    const cMode: CompiledMode = mode as CompiledMode;

    if (mode.isCompiled) return cMode;

    [
      scopeClassName,
      compileMatch,
      multiClass,
      beforeMatchExt,
    ].forEach((ext) => ext(mode as Mode & CompiledMode, parent));

    language.compilerExtensions.forEach((ext) => ext(mode, parent));
    mode.__beforeBegin = null;

    [
      beginKeywords,
      compileIllegal,
      compileRelevance,
    ].forEach((ext) => ext(mode, parent));

    mode.isCompiled = true;

    let keywordPattern = null;
    if (typeof mode.keywords === 'object' && mode.keywords.$pattern) {
      mode.keywords = { ...mode.keywords };
      keywordPattern = mode.keywords.$pattern;
      delete mode.keywords.$pattern;
    }

    keywordPattern = keywordPattern || /\w+/;
    if (mode.keywords) {
      mode.keywords = compileKeywords(mode.keywords, language.caseInsensitive);
    }

    cMode.keywordPatternRe = langRe(keywordPattern, true, language);
    if (parent) {
      if (!mode.begin) {
        mode.begin = /\B|\b/;
      }

      cMode.beginRe = langRe(cMode.begin, false, language);

      if (!mode.end && !mode.endsWithParent) {
        mode.end = /\B|\b/;
      }

      if (mode.end) {
        cMode.endRe = langRe(cMode.end, false, language);
      }

      cMode.terminatorEnd = source(cMode.end) || '';
      if (mode.endsWithParent && parent.terminatorEnd) {
        cMode.terminatorEnd += (mode.end ? '|' : '') + parent.terminatorEnd;
      }
    }

    if (mode.illegal) {
      cMode.illegalRe = langRe(mode.illegal as string | RegExp, false, language);
    }

    if (!mode.contains) {
      mode.contains = [];
    }

    mode.contains = [].concat(...mode.contains.map((c) => expandOrCloneMode(c === 'self' ? mode : c)));
    mode.contains.forEach((c) => { compileMode(c as Mode, cMode); });

    if (mode.starts) {
      compileMode(mode.starts, parent);
    }

    cMode.matcher = buildModeRegex(cMode);
    return cMode;
  };

  if (!language.compilerExtensions) {
    language.compilerExtensions = [];
  }

  if (language.contains && language.contains.includes('self')) {
    throw new Error('ERR: contains `self` is not supported at the top-level of a language.  See documentation.');
  }

  language.classNameAliases = inherit(language.classNameAliases || {});

  return compileMode(language as Mode) as CompiledLanguage;
};

export default compileLanguage;
