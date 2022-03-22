import { Mode } from '../../../types';
import { concat, lookahead } from '../../../utils/regex';

const beforeMatchExt = (mode: Mode): void => {
  if (!mode.beforeMatch) return undefined;

  if (mode.starts) {
    throw new Error('beforeMatch cannot be used with starts');
  }

  const originalMode = { ...mode };
  Object.keys(mode).forEach((key) => { delete mode[key]; });

  mode.keywords = originalMode.keywords;
  mode.begin = concat(
    originalMode.beforeMatch as string | RegExp,
    lookahead(originalMode.begin as string | RegExp),
  );
  mode.starts = {
    relevance: 0,
    contains: [Object.assign<Mode, Mode>(originalMode, { endsParent: true })],
  };

  mode.relevance = 0;
  delete originalMode.beforeMatch;

  return undefined;
};

export default beforeMatchExt;
