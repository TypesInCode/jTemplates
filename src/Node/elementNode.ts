import {
  IObservableScope,
  ObservableScope,
} from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { IList, INode, List } from "../Utils/list";
import { Schedule, Synch, Thread } from "../Utils/thread";
import { BoundNode } from "./boundNode";
import { IBoundNode, IBoundNodeBase } from "./boundNode.types";
import {
  ElementChildrenFunctionParam,
  ElementNodeFunctionParam,
  IElementDataNode,
  IElementNode,
  IElementNodeBase,
} from "./elementNode.types";
import { NodeConfig } from "./nodeConfig";
import { NodeRef, NodeRefType } from "./nodeRef";
import { AllNodeRefTypes, ElementNodeRefTypes } from "./nodeRef.types";
import { ITextNode } from "./textNode.types";

const valueDefault = [] as Array<any>;
export namespace ElementNode {
  export function Create<T>(
    type: any,
    namespace: string,
    nodeDef: ElementNodeFunctionParam<T>,
    children: ElementChildrenFunctionParam<T>,
  ) {
    var elemNode = NodeRef.Create(
      type,
      namespace,
      NodeRefType.ElementNode,
    ) as IElementNode<T>;
    elemNode.nodeDef = nodeDef;
    if (Array.isArray(children)) elemNode.childrenArray = children;
    else if (children !== undefined) elemNode.children = children;
    return elemNode;
  }

  function CreateValueScopeCallback(dataScope: IObservableScope<unknown | unknown[]>) {
    return function () {
      const value = ObservableScope.Value(dataScope);

      if (!value) return valueDefault;

      if (!Array.isArray(value)) return [value];

      return value;
    }
  }

  function CreateNodeScopeCallback(elementNode: IElementNodeBase<unknown>, valueScope: IObservableScope<unknown[]>) {
    let lastNodeList: IList<IElementDataNode<unknown>> | undefined;
    return function () {
      const values = ObservableScope.Value(valueScope);

      const lastNodeMap =
        lastNodeList && List.ToNodeMap(lastNodeList, GetDataValue);
      const nextNodeList = List.Create<IElementDataNode<unknown>>();

      for (let x = 0; x < values.length; x++) {
        let curNode: INode<IElementDataNode<unknown>> = null;

        if (lastNodeMap !== undefined) {
          const nodeArr = lastNodeMap.get(values[x]);
          if (nodeArr !== undefined) {
            let y = nodeArr.length - 1;
            for (; y >= 0 && nodeArr[y] === null; y--) { }
            curNode = nodeArr[y];
            nodeArr[y] = null;
          }
        }

        const value = values[x];
        if (curNode !== null) {
          List.RemoveNode(lastNodeList, curNode);
          List.AddNode(nextNodeList, curNode);

          const nextNodes = ObservableScope.Value(curNode.data.scope);
          if(curNode.data.nodes !== nextNodes) {
            List.Add(elementNode.destroyNodeList, {
              ...curNode.data,
              scope: null
            });

            curNode.data.init = false;
            curNode.data.nodes = nextNodes;
          }
        } else {
          const scope = ObservableScope.Create(function () {
            return Injector.Scope(
              elementNode.injector,
              CreateNodeArray,
              elementNode.children,
              value,
            );
          });

          curNode = List.Add(nextNodeList, {
            value,
            init: false,
            scope,
            nodes: ObservableScope.Value(scope),
          });
        }
      }
      
      lastNodeList && List.Append(elementNode.destroyNodeList, lastNodeList);
      lastNodeList = nextNodeList;
      return nextNodeList;
    }
  }

  export function Init<T>(elementNode: IElementNodeBase<T>) {
    elementNode.childNodes = new Set();
    if (elementNode.children !== null) {
      const dataScope = elementNode.nodeDef.data ? ObservableScope.Create(elementNode.nodeDef.data) : ObservableScope.Create(function() {
        return [true];
      });
      const valueScope = ObservableScope.Create<T[]>(CreateValueScopeCallback(dataScope));
      const nodeScope = ObservableScope.Create(CreateNodeScopeCallback(elementNode, valueScope));

      elementNode.childNodes = new Set();
      elementNode.scopes ??= [];
      elementNode.scopes.push(dataScope, valueScope, nodeScope);

      ObservableScope.Watch(nodeScope, function (scope) {
        ScheduleSetData(elementNode, scope);
      });

      UpdateNodes(elementNode as IElementNode<T>, ObservableScope.Value(nodeScope), true);
    }
    else if (elementNode.childrenArray !== null) {
      SetDefaultData(elementNode as IElementNode<T>);
    }

    BoundNode.Init(elementNode as IBoundNodeBase);
  }
}

function ScheduleSetData<T>(
  node: IElementNodeBase<T>,
  scope: IObservableScope<IList<IElementDataNode<T>>>,
) {
  if (node.setData) return;

  node.setData = true;
  NodeConfig.scheduleUpdate(function () {
    node.setData = false;
    if (node.destroyed) return;

    UpdateNodes(node as IElementNode<T>, ObservableScope.Value(scope));
  });
}

function SetDefaultData<T>(node: IElementNode<T>) {
  const nodes =
    node.childrenArray ||
    Injector.Scope(node.injector, CreateNodeArray, node.children, true);
  node.childrenArray = null;

  const defaultNodeList = List.Create<IElementDataNode<T>>();
  List.Add(defaultNodeList, {
    value: null,
    init: false,
    scope: null,
    nodes
  });

  UpdateNodes(node, defaultNodeList, true);
}

function GetDataValue<T>(data: IElementDataNode<T>) {
  return data.value;
}

function UpdateNodes(elementNode: IElementNode<unknown>, nodeList: IList<IElementDataNode<unknown>>, init = false) {
  Synch(function () {
    let data: IElementDataNode<unknown> | undefined;
    while (data = List.Pop(elementNode.destroyNodeList)) {
      ObservableScope.Destroy(data.scope);

      for (let x = 0; x < data.nodes.length; x++)
        elementNode.childNodes.delete(data.nodes[x]);

      NodeRef.DestroyAll(data.nodes);
    }

    for (let node = nodeList.head; node !== null; node = node.next) {
      if (!node.data.init) {
        const nodeData = node.data;
        Schedule(function () {
          if (elementNode.destroyed || nodeData.init)
            return;

          NodeRef.InitAll(elementNode, nodeData.nodes);
          nodeData.init = true;
        })
      }
    }

    const startSize = nodeList.size;
    Thread(function (async) {
      if (elementNode.destroyed)
        return;

      if (init || !async)
        NodeRef.ReconcileChildren(elementNode, nodeList);
      else
        NodeConfig.scheduleUpdate(function () {
          if (elementNode.destroyed || nodeList.size !== startSize)
            return;

          NodeRef.ReconcileChildren(elementNode, nodeList);
        });
    })
  });
}

function CreateNodeArray<T>(
  childrenFunc: { (data: T): string | ElementNodeRefTypes | ElementNodeRefTypes[] },
  value: any,
): AllNodeRefTypes[] {
  const newNodes = childrenFunc(value);
  if (typeof newNodes === "string" || !newNodes) {
    const textNode = NodeRef.Create(
      newNodes,
      null,
      NodeRefType.TextNode,
    ) as ITextNode;
    return [textNode];
  }

  if (Array.isArray(newNodes)) return newNodes;

  return [newNodes];
}
