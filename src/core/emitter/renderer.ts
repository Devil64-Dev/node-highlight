import {
  Node,
  Options,
  Renderer,
  Tree,
} from '../../types';
import { escapeHTML } from '../../utils';

const SPAN_CLOSE = '</span>';

const emitsWrappingTags = (node: Partial<Node>) => !!node.kind;

const expandScopeName = (name: string, { prefix }: { prefix: string }) => {
  if (name.includes('.')) {
    const pieces = name.split('.');
    return [
      `${prefix}${pieces.shift()}`,
      ...(pieces.map((x, i) => `${x}${'_'.repeat(i + 1)}`)),
    ].join(' ');
  }

  return `${prefix}${name}`;
};

export default class HTMLRenderer implements Renderer {
  buffer: string;

  classPrefix: string;

  private _options: Options;

  constructor(tree: Tree, options: Options) {
    this.buffer = '';
    this.classPrefix = options.classPrefix;
    this._options = options;
    tree.walk(this);
  }

  /**
   * Add texts to the output stream.
   *
   * @param text
   */
  addText = (text: string) => {
    this.buffer += this._options.escapeHTML ? escapeHTML(text) : text;
  };

  /**
   * Adds a node open to the output stream (if needed).
   *
   * @param {Partial<Node>} node */
  openNode = (node: Partial<Node>): void => {
    if (!emitsWrappingTags(node)) return undefined;

    let scope = node.kind;
    if (node.subLanguage) {
      scope = `language-${scope}`;
    } else {
      scope = expandScopeName(scope, { prefix: this.classPrefix });
    }

    this.span(scope);

    return undefined;
  };

  /**
   * Adds a node close to the output stream (if needed).
   *
   * @param {Partial<Node>} node */
  closeNode = (node: Partial<Node>): void => {
    if (!emitsWrappingTags(node)) return undefined;

    this.buffer += SPAN_CLOSE;

    return undefined;
  };

  /**
   * returns the accumulated buffer.
   */
  value = () => this.buffer;

  /**
   * Builds a span element
   *
   * @param className
   */
  span = (className: string) => {
    this.buffer += `<span class="${className}">`;
  };
}
