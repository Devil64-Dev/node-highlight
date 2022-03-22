import { Language } from '../types';
import { source } from './regex';

export const escapeHTML = (value: string) => (
  value.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
);

type OriginalParam<T> = T & { [key: string]: unknown };
export const inherit = <T = { [key: string]: unknown }, ST = T>(
  original: OriginalParam<T>,
  ...objects: Record<string, unknown>[]
) => {
  const result: { [key: string]: unknown } = Object.create(null);

  Object.keys(original).forEach((key) => {
    result[key] = original[key];
  });

  objects.forEach((obj) => {
    Object.keys(obj).forEach((key) => {
      result[key] = obj[key];
    });
  });

  return result as OriginalParam<T> & ST;
};

export const langRe = (value: string | RegExp, global: boolean, language: Language) => new RegExp(
  source(value),
  [
    'm',
    language.caseInsensitive ? 'i' : '',
    language.unicodeRegex ? 'u' : '',
    global ? 'g' : '',
  ].join(''),
);
