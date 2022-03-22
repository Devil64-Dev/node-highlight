// -------------------------------------------------------------------------------------
// COMPILER TYPES
// -------------------------------------------------------------------------------------
export type KeywordData = [string, number];

export type KeywordDict = { [key: string]: KeywordData };

export type RawKeywords = string | Record<string, string | string[]> | string[];

export type Extension = (mode: Mode, parent: Mode | Language | null) => void;

// -------------------------------------------------------------------------------------
// MODE TYPES
// -------------------------------------------------------------------------------------
export interface CallbackResponse {
  data: Record<string, unknown>;
  ignoreMatch: () => void;
  isMatchIgnored: boolean;
}

export type ModeCallback = (match: RegExpMatchArray, response: CallbackResponse) => void;

declare namespace Mode {
  export interface Details {
    begin?: RegExp | string | (RegExp | string)[];
    match?: RegExp | string | (RegExp | string)[];
    end?: RegExp | string | (RegExp | string)[];

    // deprecated in favor of `scope`;
    className?: string;
    scope?: string | Record<number, string>;
    beginScope?: string | Record<number, string>;
    endScope?: string | Record<number, string>;
    contains?: ('self' | Mode)[];
    endsParent?: boolean;
    endsWithParent?: boolean;
    endSameAsBegin?: boolean;
    skip?: boolean;
    excludeBegin?: boolean;
    excludeEnd?: boolean;
    returnBegin?: boolean;
    returnEnd?: boolean;
    __beforeBegin?: ModeCallback | (() => void);
    parent?: Mode;
    starts?: Mode;
    lexemes?: string | RegExp;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keywords?: Record<string, any> | string;
    beginKeywords?: string;
    relevance?: number;
    illegal?: string | RegExp | Array<string | RegExp>;
    variants?: Mode[];
    cachedVariants?: Mode[];

    // parsed
    subLanguage?: string | string[];
    isCompiled?: boolean;
    label?: string;
  }

  export interface Callbacks {
    'on:end'?: ModeCallback;
    'on:begin'?: ModeCallback;
  }
}

export interface Mode extends Mode.Details, Mode.Callbacks {
  [key: string]: unknown;
}

export interface CompiledMode extends Mode {
  begin?: RegExp | string
  end?: RegExp | string;
  scope?: string;
  contains: CompiledMode[];
  keywords: KeywordDict;
  data: Record<string, unknown>;
  terminatorEnd: string;
  keywordPatternRe: RegExp;
  beginRe: RegExp;
  endRe: RegExp;
  illegalRe: RegExp;
  matcher: MatcherType;
  isCompiled: true;
  starts?: CompiledMode;
  parent?: CompiledMode;
  beginScope?: CompiledScope;
  endScope?: CompiledScope;
}

// -------------------------------------------------------------------------------------
// LANGUAGE TYPES
// -------------------------------------------------------------------------------------
declare namespace Language {
  export interface Details {
    name?: string;
    unicodeRegex?: boolean;
    rawDefinition?: () => Language;
    aliases?: string[];
    disableAutodetect?: boolean;
    contains: (Mode)[];
    caseInsensitive?: boolean;
    keywords?: Record<string, unknown> | string;
    isCompiled?: boolean;
    exports?: Record<string, unknown>;
    classNameAliases?: Record<string, string>;
    compilerExtensions?: Extension[];
    supersetOf?: string;
  }
}

export type Language = Language.Details & Partial<Mode>;

export type CompiledLanguage = Language.Details & CompiledMode & {
  isCompiled: true;
  contains: CompiledMode;
  keywords: Record<string, unknown>
};

export type LanguageDFn = () => Language;

// -------------------------------------------------------------------------------------
// EMITTER TYPES
// -------------------------------------------------------------------------------------
export type Node = {
  kind?: string;
  subLanguage?: boolean;
};

export type TreeNode = Node & { children: TreeNode[] } | string;

export type DataNode = Node & { children: TreeNode[] };

export interface Renderer {
  addText: (text: string) => void;
  openNode: (node: Partial<Node>) => void;
  closeNode: (node: Partial<Node>) => void;
  value: () => string;
  span: (className: string) => void;
}

export interface Tree {
  walk: (r: Renderer) => void;
}

export interface Emitter {
  addKeyword(text: string, kind: string): void
  addText(text: string): void
  toHTML(): string
  finalize(): boolean
  closeAllNodes(): void
  openNode(kind: string): void
  closeNode(): void
  addSubLanguage(emitter: Emitter, subLanguageName: string): void
}

// -------------------------------------------------------------------------------------
// SCOPE
// -------------------------------------------------------------------------------------
export type CompiledScope = Record<number, string> & {
  _emit?: Record<number, boolean>;
  _multi?: boolean;
  _wrap?: string;
};

// -------------------------------------------------------------------------------------
// MATCHER/REGEX TYPES
// -------------------------------------------------------------------------------------
interface MatcherType {
  rules: [(string | RegExp), MultiRegexOptions][];
  multiRegexes: MultiRegex[];
  count: number;
  lastIndex: number;
  regexIndex: number;
  getMatcher: (index: number) => MultiRegex;
  resumingScanAtSamePosition: () => boolean;
  considerAll: () => void;
  addRule: (re: string | RegExp, opts: MultiRegexOptions) => void;
  exec: (str: string) => RegExpExecArray & MultiRegexOptions;
}

interface MultiRegexOptions {
  [key: number]: MultiRegexOptions;
  rule?: CompiledMode;
  position?: number;
  type?: 'begin' | 'end' | 'illegal';
}
interface MultiRegex {
  matchIndexes: MultiRegexOptions;
  regexes: [MultiRegexOptions, (string | RegExp)][];
  matchAt: number;
  position: number;
  matcherRe: RegExp;
  lastIndex: number;
  addRule: (re: string | RegExp, opts: MultiRegexOptions) => void;

  compile: () => void;

  exec: (str: string) => RegExpExecArray & MultiRegexOptions;
}

interface EmitterConstructor {
  new (opts: Options): Emitter;
}

// -------------------------------------------------------------------------------------
// SyntaxHighlight TYPES
// -------------------------------------------------------------------------------------
export interface Options {
  noHighlightRe: RegExp;
  languageDetectRe: RegExp;
  classPrefix: string;
  languages?: string[];
  __emitter: EmitterConstructor;
  ignoreUnescapedHTML?: boolean;
  throwUnescapedHTML?: boolean;
}

export interface illegalData {
  message: string;
  context: string;
  index: number;
  resultSoFar : string;
  mode: CompiledMode;
}

export interface Result {
  code?: string;
  relevance : number;
  value : string;
  language? : string;
  illegal : boolean;
  errorRaised? : Error;
  // * for auto-highlight;
  secondBest? : Omit<Result, 'second_best'>;
  // private;
  _illegalBy? : illegalData;
  _emitter : Emitter;
  _top? : Language | CompiledMode;
}

export type BHContext = {
  code: string;
  language: string;
  result?: Result;
}

export interface Plugin {
  'after:highlight'?: (result: Result) => void;
  'before:highlight'?: (context: BHContext) => void;
}

export type MatchType = 'begin' | 'end' | 'illegal';

export type EnhancedMatch = RegExpMatchArray & {rule: CompiledMode, type: MatchType}

export interface AnnotatedError extends Error {
  mode?: Mode | Language,
  languageName?: string,
  badRule?: Mode,
}

export type LoggerFunction = <T = { [key: string]: unknown }>(
  msg: string | unknown,
  options?: T,
) => void;

export interface Logger {
  info: LoggerFunction;
  error: LoggerFunction;
  warn: LoggerFunction;
}

type Languages = 'javascript' | 'css' | 'python' |
  'typescript' | 'perl' | 'json' | 'xml' | 'html' |
  'svg' | 'xhtml' | 'atom' | 'xsl' | 'plist' | 'rss';
export type NativeLanguages = Languages | (string & Record<never, never>);

export declare class NodeHighlight {
  constructor(options?: Options, logger?: Logger);

  get safeMode(): boolean;

  set safeMode(state: boolean);

  /**
   * Core highlighting function.
   *
   * @param {string|Options} code the code to highlight
   * @param {string} languageName - the language to use for highlighting
   * @param {boolean} [ignoreIllegals] - whether to ignore illegal matches, default is to bail
   *
   * @returns {Result} Result - an object that represents the result
   * @property {string} language - the language name
   * @property {number} relevance - the relevance score
   * @property {string} value - the highlighted HTML code
   * @property {string} code - the original raw code
   * @property {CompiledMode} top - top of the current mode stack
   * @property {boolean} illegal - indicates whether any illegal matches were found
  */
  highlight: (code: string, languageName: NativeLanguages, ignoreIllegals?: boolean) => Result;

  /**
   * Register a language grammar module
   *
   * @param {string} languageName
   * @param {LanguageDFn} langDFn
   */
  registerLanguage: (languageName: string, langDFn: LanguageDFn) => void;

  /**
   * Register language aliases.
   *
   * @param aliasList Single alias or list of aliases.
   * @param languageName
   */
  registerAliases: (aliasList: string | string[], languageName: string) => void;

  /**
   * @returns {string[]} List of language internal names
   */
  listLanguages: () => NativeLanguages[];
}
