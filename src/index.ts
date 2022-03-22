/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-param-reassign */
import compileLanguage from './core/compiler';
import TokenTreeEmitter from './core/emitter';
import Response from './core/response';
import nativeLanguages from './languages';
import {
  AnnotatedError,
  BHContext,
  EnhancedMatch,
  MatchType,
  Options,
  Plugin,
  Result,
  CompiledScope,
  CompiledMode,
  Language,
  LanguageDFn,
  Mode,
  Logger,
  NativeLanguages,
} from './types';
import { escapeHTML } from './utils';
import logger from './utils/logger';
import { startsWith } from './utils/regex';

const PLAINTEXT_LANGUAGE: Language = { disableAutodetect: true, name: 'Plain Text', contains: [] };

const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";

const MAX_KEYWORD_HITS = 7;

const NO_MATCH = Symbol('nomatch');

export default class NodeHighlight {
  private _options: Options;

  private _languages: Record<string, Language>;

  private _safeMode: boolean;

  private _aliases: Record<string, string>;

  private _plugins: Plugin[];

  private _logger: Logger;

  constructor(options?: Options, _logger: Logger = logger) {
    this._options = options || {
      ignoreUnescapedHTML: false,
      throwUnescapedHTML: false,
      noHighlightRe: /^(no-?highlight)$/i,
      languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
      classPrefix: 'hljs-',
      languages: null,
      __emitter: TokenTreeEmitter,
    };
    this._languages = Object.create(null);
    this._aliases = Object.create(null);
    this.safeMode = true;
    this._logger = _logger;
    this._plugins = [];
    Object.keys(nativeLanguages).forEach((lang) => {
      this.registerLanguage(lang, nativeLanguages[lang]);
    });
  }

  get safeMode() {
    return this._safeMode;
  }

  set safeMode(state: boolean) {
    this._safeMode = state;
  }

  highlight = (code: string, languageName: NativeLanguages, ignoreIllegals = true) => {
    const fire = (event: keyof Plugin, args: BHContext | Result) => {
      this._plugins.forEach((plugin) => {
        if (event === 'before:highlight') {
          plugin['before:highlight'](args as BHContext);
        } else {
          plugin['after:highlight'](args as Result);
        }
      });
    };

    const context: BHContext = {
      code,
      language: languageName,
    };

    fire('before:highlight', context);

    const result = context.result
      ? context.result
      : this._highlight(context.code, context.language, ignoreIllegals);

    result.code = context.code;
    fire('after:highlight', result);

    return result;
  };

  private _highlight = (
    code: string,
    languageName: string,
    ignoreIllegals?: boolean,
    continuation?: CompiledMode,
  ): Result => {
    // constants
    const keywordHits = Object.create(null);
    const language = this.getLanguage(languageName);
    if (!language) {
      logger.error(LANGUAGE_NOT_FOUND.replace('{}', languageName));
      throw new Error(`Unknown language: "${languageName}"`);
    }
    const md = compileLanguage(language);
    const continuations: Record<string, CompiledMode> = {};
    const emitter = new this._options.__emitter(this._options);

    // variables
    let top = continuation || md;
    let modeBuffer = '';
    let relevance = 0;
    let resumeScanAtSamePosition = false;
    let iterations = 0;

    /**
     * Return keyword data if a match is a keyword
     * @param {CompiledMode} mode - current mode
     * @param {string} matchText - the textual match
     */
    const keywordData = (mode: CompiledMode, matchText: string) => mode.keywords[matchText];

    const processKeywords = (): void => {
      if (!top.keywords) {
        emitter.addText(modeBuffer);
        return undefined;
      }

      let _lastIndex = 0;
      top.keywordPatternRe.lastIndex = 0;
      let match = top.keywordPatternRe.exec(modeBuffer);
      let buf = '';

      while (match) {
        buf += modeBuffer.substring(_lastIndex, match.index);
        const word = language.caseInsensitive ? match[0].toLowerCase() : match[0];
        const data = keywordData(top, word);
        if (data) {
          const [kind, keywordRelevance] = data;
          emitter.addText(buf);
          buf = '';

          keywordHits[word] = (keywordHits[word] || 0) + 1;
          if (keywordHits[word] <= MAX_KEYWORD_HITS) {
            relevance += keywordRelevance;
          }
          if (kind.startsWith('_')) {
            buf += match[0];
          } else {
            const cssClass = language.classNameAliases[kind] || kind;
            emitter.addKeyword(match[0], cssClass);
          }
        } else {
          buf += match[0];
        }
        _lastIndex = top.keywordPatternRe.lastIndex;
        match = top.keywordPatternRe.exec(modeBuffer);
      }
      buf += modeBuffer.substring(_lastIndex);
      emitter.addText(buf);

      return undefined;
    };

    const processSubLanguage = (): void => {
      if (modeBuffer === '') return undefined;
      let _result = null;

      if (typeof top.subLanguage === 'string') {
        if (!this._languages[top.subLanguage]) {
          emitter.addText(modeBuffer);
          return undefined;
        }
        _result = this._highlight(
          modeBuffer,
          top.subLanguage,
          true,
          continuations[top.subLanguage],
        );
        continuations[top.subLanguage] = _result._top as CompiledMode;
      } else {
        _result = this.highlightAuto(modeBuffer, top.subLanguage?.length ? top.subLanguage : null);
      }
      if (top.relevance > 0) {
        relevance += top.relevance;
      }

      emitter.addSubLanguage(_result._emitter, _result.language);
      return undefined;
    };

    const processBuffer = () => {
      if (top.subLanguage !== null && top.subLanguage !== undefined) {
        processSubLanguage();
      } else {
        processKeywords();
      }

      modeBuffer = '';
    };

    const emitMultiClass = (scope: CompiledScope, match: RegExpMatchArray) => {
      let i = 1;
      const max = match.length - 1;
      while (i <= max) {
        if (scope._emit[i]) {
          const klass = language.classNameAliases[scope[i]] || scope[i];
          const text = match[i];
          if (klass) {
            emitter.addKeyword(text, klass);
          } else {
            modeBuffer = text;
            processKeywords();
            modeBuffer = '';
          }
        }
        i += 1;
      }
    };

    const startNewMode = (mode: CompiledMode, match: RegExpMatchArray) => {
      if (mode.scope && typeof mode.scope === 'string') {
        emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
      }

      if (mode.beginScope) {
        if (mode.beginScope._wrap) {
          emitter.addKeyword(
            modeBuffer,
            language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap,
          );
          modeBuffer = '';
        } else if (mode.beginScope._multi) {
          emitMultiClass(mode.beginScope, match);
          modeBuffer = '';
        }
      }

      top = Object.create(mode, { parent: { value: top } });
      return top;
    };

    const endOfMode = (
      mode: CompiledMode,
      match: RegExpMatchArray,
      matchPlusRemainder: string,
    ): CompiledMode | void => {
      let matched = startsWith(mode.endRe, matchPlusRemainder);
      if (matched) {
        if (mode['on:end']) {
          const resp = new Response(mode);
          mode['on:end'](match, resp);
          if (resp.isMatchIgnored) {
            matched = false;
          }
        }

        if (matched) {
          while (mode.endsParent && mode.parent) {
            mode = mode.parent;
          }
          return mode;
        }
      }

      if (mode.endsWithParent) {
        return endOfMode(mode.parent, match, matchPlusRemainder);
      }

      return undefined;
    };

    const doIgnore = (lexeme: string) => {
      if (top.matcher.regexIndex === 0) {
        // no more regexes to potentially match here, so we move the cursor forward one
        // space
        modeBuffer += lexeme[0];
        return 1;
      }
      // no need to move the cursor, we still have additional regexes to try and
      // match at this very spot
      resumeScanAtSamePosition = true;
      return 0;
    };

    const doBeginMatch = (match: EnhancedMatch): number => {
      const lexeme = match[0];
      const newMode = match.rule;

      const resp = new Response(newMode);
      const beforeCallbacks = [newMode.__beforeBegin, newMode['on:begin']];
      let _state = false;
      beforeCallbacks.forEach((cb) => {
        if (cb && !_state) {
          cb(match, resp);
          if (resp.isMatchIgnored) {
            _state = true;
          }
        }
      });

      if (_state) {
        return doIgnore(lexeme);
      }

      if (newMode.skip) {
        modeBuffer += lexeme;
      } else {
        if (newMode.excludeBegin) {
          modeBuffer += lexeme;
        }

        processBuffer();
        if (!newMode.returnBegin && !newMode.excludeBegin) {
          modeBuffer = lexeme;
        }
      }

      startNewMode(newMode, match);
      return newMode.returnBegin ? 0 : lexeme.length;
    };

    const doEndMatch = (match: RegExpMatchArray) => {
      const lexeme = match[0];
      const matchPlusRemainder = code.substring(match.index);
      const endMode = endOfMode(top, match, matchPlusRemainder);
      if (!endMode) {
        return NO_MATCH;
      }

      const origin = top;
      if (top.endScope && top.endScope._wrap) {
        processBuffer();
        emitter.addKeyword(lexeme, top.endScope._wrap);
      } else if (top.endScope && top.endScope._multi) {
        processBuffer();
        emitMultiClass(top.endScope, match);
      } else if (origin.skip) {
        modeBuffer += lexeme;
      } else {
        if (!(origin.returnEnd || origin.excludeEnd)) {
          modeBuffer += lexeme;
        }
        processBuffer();
        if (origin.excludeEnd) {
          modeBuffer = lexeme;
        }
      }

      do {
        if (top.scope) {
          emitter.closeNode();
        }
        if (!top.skip && !top.subLanguage) {
          relevance += top.relevance;
        }
        top = top.parent;
      } while (top !== endMode.parent);

      if (endMode.starts) {
        startNewMode(endMode.starts, match);
      }

      return origin.returnEnd ? 0 : lexeme.length;
    };

    const processContinuations = () => {
      const list = [];
      for (let current = top; current !== language; current = current.parent) {
        if (current.scope) {
          list.unshift(current.scope);
        }
      }
      list.forEach((item) => emitter.openNode(item));
    };

    let lastMatch: { type?: MatchType, index?: number, rule?: Mode } = {};
    const processLexeme = (textBeforeMatch: string, match?: EnhancedMatch) => {
      const lexeme = match && match[0];
      modeBuffer += textBeforeMatch;

      if (lexeme === null || lexeme === undefined) {
        processBuffer();
        return 0;
      }
      if (lastMatch.type === 'begin' && match.type === 'end' && lastMatch.index === match.index && lexeme === '') {
        modeBuffer += code.slice(match.index, match.index + 1);
        if (!this._safeMode) {
          const err: AnnotatedError = new Error(`0 width match regex (${languageName})`);
          err.languageName = languageName;
          err.badRule = lastMatch.rule;
          throw err;
        }
        return 1;
      }
      lastMatch = match;
      if (match.type === 'begin') {
        return doBeginMatch(match);
      }
      if (match.type === 'illegal' && !ignoreIllegals) {
        const err: AnnotatedError = new Error(`Illegal lexeme "${lexeme}" for mode "${(top.scope || '<unnamed>')}"`);
        err.mode = top;
        throw err;
      } else if (match.type === 'end') {
        const processed = doEndMatch(match);
        if (processed !== NO_MATCH) {
          return processed;
        }
      }

      if (match.type === 'illegal' && lexeme === '') return 1;
      if (iterations > 100000 && iterations > match.index * 3) {
        const err = new Error('potential infinite loop, way more iterations than matches');
        throw err;
      }

      modeBuffer += lexeme;

      return lexeme.length;
    };

    let result = '';
    let index = 0;
    processContinuations();
    try {
      top.matcher.considerAll();
      for (;;) {
        iterations += 1;
        if (resumeScanAtSamePosition) {
          resumeScanAtSamePosition = false;
        } else {
          top.matcher.considerAll();
        }
        top.matcher.lastIndex = index;
        const match = top.matcher.exec(code);

        if (!match) break;
        const beforeMatch = code.substring(index, match.index);
        const processedCount = processLexeme(beforeMatch, match as EnhancedMatch);
        index = match.index + processedCount;
      }
      processLexeme(code.substring(index));
      emitter.closeAllNodes();
      emitter.finalize();
      result = emitter.toHTML();

      return {
        language: languageName,
        value: result,
        relevance,
        illegal: false,
        _emitter: emitter,
        _top: top,
      };
    } catch (err: any) {
      if (err.message && err.message.includes('Illegal')) {
        return {
          language: languageName,
          value: escapeHTML(code),
          illegal: true,
          relevance: 0,
          _illegalBy: {
            message: err.message,
            index,
            context: code.slice(index - 100, index + 100),
            mode: err.mode,
            resultSoFar: result,
          },
          _emitter: emitter,
        };
      }
      if (this._safeMode) {
        return {
          language: languageName,
          value: escapeHTML(code),
          illegal: false,
          relevance: 0,
          errorRaised: err,
          _emitter: emitter,
          _top: top,
        };
      }
      throw err;
    }
  };

  /**
   * returns a valid highlight result, without actually doing any actual work,
   * auto highlight starts with this and it's possible for small snippets that
   * auto-detection may not find a better match
   * @param {string} code
   * @returns {Result}
   */
  private justTextHighlightResult = (code: string): Result => {
    const result: Result = {
      value: escapeHTML(code),
      illegal: false,
      relevance: 0,
      _top: PLAINTEXT_LANGUAGE,
      _emitter: new this._options.__emitter(this._options),
    };
    result._emitter.addText(code);

    return result;
  };

  /**
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - secondBest (object with the same structure for second-best heuristically
    detected language, may be absent).

    @param {string} code
    @param {string[]} subset
    @returns {Result}
  */
  private highlightAuto = (code: string, subset: string[]): Result => {
    const _languageSubset = subset || this._options.languages || Object.keys(this._languages);
    const plainText = this.justTextHighlightResult(code);

    const results = _languageSubset
      .filter(this.getLanguage)
      .filter(this.autoDetection)
      .map((name) => this._highlight(code, name, false));

    results.unshift(plainText);

    const sorted = results.sort((a, b) => {
      if (a.relevance !== b.relevance) return b.relevance - a.relevance;

      if (a.language && b.language) {
        if (this.getLanguage(a.language).supersetOf === b.language) {
          return 1;
        }
        if (this.getLanguage(b.language).supersetOf === a.language) {
          return -1;
        }
      }

      return 0;
    });

    const [best, secondBest] = sorted;
    const result = best;
    result.secondBest = secondBest;

    return result;
  };

  private autoDetection = (name: string) => {
    const lang = this.getLanguage(name);
    return lang && !lang.disableAutodetect;
  };

  /**
   * Register a language grammar module
   *
   * @param {string} languageName
   * @param {LanguageDFn} langDFn
   */
  registerLanguage = (languageName: string, langDFn: LanguageDFn) => {
    let lang = null;
    try {
      lang = langDFn();
    } catch (err) {
      this._logger.error(`Language definition for ${languageName} could not be registered.`);
      if (!this._safeMode) {
        throw err;
      } else {
        logger.error(err);
      }

      lang = PLAINTEXT_LANGUAGE;
    }

    if (!lang.name) {
      lang.name = languageName;
    }

    this._languages[languageName] = lang;
    lang.rawDefinition = langDFn.bind(null);

    if (lang.aliases) {
      this.registerAliases(lang.aliases, languageName);
    }
  };

  /**
   * Register language aliases.
   *
   * @param {string|string[]} aliasList Single alias or list of aliases.
   * @param {string} languageName
   */
  registerAliases = (aliasList: string | string[], languageName: string) => {
    const _aliasList = typeof aliasList === 'string' ? [aliasList] : [...aliasList];
    _aliasList.forEach((alias) => {
      this._aliases[alias.toLowerCase()] = languageName;
    });
  };

  /**
   * @returns {string[]} List of language internal names
   */
  listLanguages = (): string[] => Object.keys(this._languages);

  /**
   * @param {string} name - name of the language to retrieve
   * @returns {Language | undefined}
   */
  private getLanguage = (name: string): Language | undefined => {
    const _name = (name || '').toLowerCase();
    return this._languages[_name] || this._languages[this._aliases[_name]];
  };
}
