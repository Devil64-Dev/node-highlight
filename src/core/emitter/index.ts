import { DataNode, Emitter, Options } from '../../types';
import HTMLRenderer from './renderer';
import TokenTree from './token-tree';

export default class TokenTreeEmitter extends TokenTree implements Emitter {
  options: Options;

  constructor(options: Options) {
    super();
    this.options = options;
  }

  addKeyword = (text: string, kind: string): void => {
    if (text === '') return undefined;

    this.openNode(kind);
    this.addText(text);
    this.closeNode();

    return undefined;
  };

  addText = (text: string): void => {
    if (text === '') return undefined;
    this.add(text);

    return undefined;
  };

  addSubLanguage = (emitter: Emitter & { root: DataNode }, name: string): void => {
    const node = emitter.root;
    node.kind = name;
    node.subLanguage = true;
    this.add(node);
  };

  toHTML = (): string => {
    const renderer = new HTMLRenderer(this, this.options);
    return renderer.value();
  };

  // eslint-disable-next-line class-methods-use-this
  finalize = () => true;
}
