import {
  DataNode,
  Renderer,
  Tree,
  TreeNode,
} from '../../types';

export default class TokenTree implements Tree {
  rootNode: DataNode;

  stack: DataNode[];

  constructor() {
    this.rootNode = { children: [] };
    this.stack = [this.rootNode];
  }

  get top() {
    return this.stack[this.stack.length - 1];
  }

  get root() {
    return this.rootNode;
  }

  add = (node: TreeNode) => {
    this.top.children.push(node);
  };

  openNode = (kind: string) => {
    const node: TreeNode = { kind, children: [] };
    this.add(node);
    this.stack.push(node);
  };

  closeNode = () => {
    if (this.stack.length > 1) return this.stack.pop();

    return undefined;
  };

  closeAllNodes = () => {
    while (this.closeNode());
  };

  toJSON = () => JSON.stringify(this.rootNode, null, 2);

  walk = (builder: Renderer) => TokenTree._walk(builder, this.rootNode);

  static _walk(builder: Renderer, node: TreeNode) {
    if (typeof node === 'string') {
      builder.addText(node);
    } else if (node.children) {
      builder.openNode(node);
      node.children.forEach((child) => this._walk(builder, child));
      builder.closeNode(node);
    }

    return builder;
  }

  static _collpase(node: TreeNode): void {
    if (typeof node === 'string') return undefined;
    if (!node.children) return undefined;

    if (node.children.every((el) => typeof el === 'string')) {
      node.children = [node.children.join('')];
    } else {
      node.children.forEach((child) => {
        TokenTree._collpase(child);
      });
    }

    return undefined;
  }
}
