import { LanguageDFn } from '../types';
import cssLanguage from './css';
import javascriptLanguage from './javascript';
import jsonLanguage from './json';
import perlLanguage from './perl';
import pythonLanguage from './python';
import scssLanguage from './scss';
import typescriptLanguage from './typescript';
import xmlLanguage from './xml';

const nativeLanguages: Record<string, LanguageDFn> = {
  python: pythonLanguage,
  json: jsonLanguage,
  css: cssLanguage,
  perl: perlLanguage,
  javascript: javascriptLanguage,
  typescript: typescriptLanguage,
  xml: xmlLanguage,
  scss: scssLanguage,
};

export default nativeLanguages;
