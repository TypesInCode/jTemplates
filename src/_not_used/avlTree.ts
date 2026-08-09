type Compare<T> = (a: T, b: T) => number;

export interface AvlTree<T> {
  size: number;
  root: AvlTreeNode<T> | null;
  compare: Compare<T>;
}

export type AvlTreeNode<T> = [T, number, number, AvlTreeNode<T> | null, AvlTreeNode<T> | null];
const VALUE = 0;
const BALANCE = 1;
const HEIGHT = 2;
const LEFT = 3;
const RIGHT = 4;


function Squash(x: number) {
  return x ? x < 0 ? -1 : 1 : 0;
}

export namespace AVL {
  export function Create<T>(compare: Compare<T>): AvlTree<T> {
    return CreateTree(compare);
  }

  export function Clear(tree: AvlTree<unknown>) {
    tree.root = null;
    tree.size = 0;
  }

  export function Insert<T>(tree: AvlTree<T>, value: T) {
    if(tree.size === 0) {
      tree.root = CreateNode(value);
      tree.size = 1;
      return;
    }

    InsertValue(tree, value);
  }

  export function ForEach<T>(tree: AvlTree<T>, callback: (value: T) => void) {
    InOrder(tree.root, callback);
  }

  export function ToArray<T>(tree: AvlTree<T>): T[] {
    const result = new Array<T>(tree.size);

    let index = 0;
    ForEach(tree, function(value) {
      result[index++] = value;
    });

    return result;
  }
}

function InOrder<T>(node: AvlTreeNode<T> | null, callback: (value: T) => void) {
  if(node === null)
    return;

  InOrder(node[LEFT], callback);
  callback(node[VALUE]);
  InOrder(node[RIGHT], callback);
}

function CreateTree<T>(compare: Compare<T>): AvlTree<T> {
  return {
    size: 0,
    compare,
    root: null,
  };
}

function CreateNode<T>(value: T): AvlTreeNode<T> {
  return [value, 0, 1, null, null];
}

function InsertValue<T>(
  tree: AvlTree<T>,
  value: T,
) {
  const startSize = tree.size;
  let node = tree.root;
  const path = [] as [number, AvlTreeNode<T>][];
  while(node !== null) {
    const comp = Squash(tree.compare(value, node[VALUE]));
    path.push([comp, node]);
    switch(comp) {
      case 0:
        node = null;
        break;
      case -1: 
        node = node[LEFT] ??= (tree.size++, CreateNode(value));
        break;
      case 1: 
        node = node[RIGHT] ??= (tree.size++, CreateNode(value));
        break;
    }
  }

  if(tree.size === startSize)
    return;

  for(let x=path.length - 2; x >= 0; x--) {
    SetHeight(path[x][1]);

    if(Math.abs(path[x][1][BALANCE]) === 2) {
      const newRoot = BalanceNode(path[x][1]);
      if(x === 0)
        tree.root = newRoot;
      else {
        const [comp, parent] = path[x-1];
        switch(comp) {
          case -1:
            parent[LEFT] = newRoot;
            break;
          case 1:
            parent[RIGHT] = newRoot;
            break;
        }
      }
    }
  }
}

function BalanceNode(node: AvlTreeNode<any>) {
  if(node[BALANCE] < 0) {
    if(node[LEFT][BALANCE] > 0)
      node[LEFT] = RotateLeft(node[LEFT]);

    return RotateRight(node);
  }

  if(node[RIGHT][BALANCE] < 0)
    node[RIGHT] = RotateRight(node[RIGHT]);

  return RotateLeft(node);
}

function RotateLeft(node: AvlTreeNode<any>) {
  const startRightLeft = node[RIGHT][LEFT];
  const root = node[RIGHT];

  root[LEFT] = node;
  node[RIGHT] = startRightLeft;

  SetHeight(node);
  SetHeight(root);
  return root;
}

function RotateRight(node: AvlTreeNode<any>) {
  const startLeftRight = node[LEFT][RIGHT];
  const root = node[LEFT];

  root[RIGHT] = node;
  node[LEFT] = startLeftRight;

  SetHeight(node);
  SetHeight(root);
  return root;
}

function SetHeight(node: AvlTreeNode<any>) {
  const leftHeight = node[LEFT]?.[HEIGHT] ?? 0;
  const rightHeight = node[RIGHT]?.[HEIGHT] ?? 0;
  const balance = rightHeight - leftHeight;
  const height = leftHeight > rightHeight ? leftHeight : rightHeight;
  node[HEIGHT] = height + 1;
  node[BALANCE] = balance;
}
