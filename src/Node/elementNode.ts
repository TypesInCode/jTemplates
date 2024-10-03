import { IObservableScope, ObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { INode, List } from "../Utils/list";
import { Schedule, Synch, Thread } from "../Utils/thread";
import { BoundNode } from "./boundNode";
import { IBoundNode } from "./boundNode.types";
import { ElementChildrenFunctionParam, ElementNodeFunctionParam, IElementDataNode, IElementNode, IElementNodeBase } from "./elementNode.types";
import { NodeConfig } from "./nodeConfig";
import { NodeRef, NodeRefType } from "./nodeRef";
import { NodeRefTypes } from "./nodeRef.types";

const valueDefault = [] as Array<any>;
export namespace ElementNode {

  export function Create<T>(type: any, namespace: string, nodeDef: ElementNodeFunctionParam<T>, children: ElementChildrenFunctionParam<T>) {
    var elemNode = NodeRef.Create(type, namespace, NodeRefType.ElementNode) as IElementNode<T>;
    elemNode.nodeDef = nodeDef;
    if(Array.isArray(children))
      elemNode.childrenArray = children;
    else if(children !== undefined)
      elemNode.children = children;
    return elemNode;
  }

  export function Init<T>(elementNode: IElementNodeBase<T>) {
    const nodeDef = elementNode.nodeDef;
    if  (elementNode.childrenArray !== null || (elementNode.children !== null && !nodeDef.data)) {
      SetDefaultData(elementNode);
    }
    else if (elementNode.children !== null) {
      const dataScope = ObservableScope.Create(nodeDef.data);
      const valueScope = ObservableScope.Create(function () {
        const value = ObservableScope.Value(dataScope);
        if (!value)
          return valueDefault;

        if (!Array.isArray(value))
          return [value];

        return value;
      });
      elementNode.childNodes = new Set();
      elementNode.scopes ??= [];
      elementNode.scopes.push(dataScope, valueScope);

      ObservableScope.Watch(valueScope, function () {
        ScheduleSetData(elementNode, valueScope);
      });

      SetData(elementNode, ObservableScope.Value(valueScope), true);
    }

    BoundNode.Init(elementNode);
  }
}

function ScheduleSetData<T>(node: IElementNodeBase<T>, scope: IObservableScope<any>) {
  if (node.setData)
    return;

  node.setData = true;
  NodeConfig.scheduleUpdate(function () {
    node.setData = false;
    if (node.destroyed)
      return;

    SetData(node, ObservableScope.Value(scope));
  });
}

function SetDefaultData<T>(node: IElementNodeBase<T>) {
  Synch(function () {
    const nodes = node.childrenArray || Injector.Scope(node.injector, CreateNodeArray, node.children, true);
    node.childrenArray = null;

    if (nodes.length > 0) {
      Schedule(function() {
        if(node.destroyed)
          return;

        NodeRef.InitAll(node as IElementNode<T>, nodes);
      });

      Thread(function () {
        if (node.destroyed)
          return;

        const defaultNodeList = List.Create<IElementDataNode<T>>();
        List.Add(defaultNodeList, {
          value: null,
          init: true,
          nodes
        });
        NodeRef.ReconcileChildren(node, defaultNodeList);
        List.Clear(defaultNodeList);
      });
    }
  });
}

function GetDataValue<T>(data: IElementDataNode<T>) {
  return data.value;
}

function ReconcileNodeData<T>(node: IElementNodeBase<T>, values: T[]) {
  const nextNodeList = List.Create<IElementDataNode<T>>();
  const currentNodeList = node.nodeList;
  const nodeMap = currentNodeList && List.ToNodeMap(currentNodeList, GetDataValue);

  for (let x = 0; x < values.length; x++) {
    let curNode: INode<IElementDataNode<T>> = null;

    if (nodeMap) {
      const nodeArr = nodeMap.get(values[x]);
      if (nodeArr) {
        let y = nodeArr.length - 1;
        for (; y >= 0 && !curNode; y--) {
          curNode = nodeArr[y];
          nodeArr[y] = null;
        }
      }
    }

    if (curNode) {
      List.RemoveNode(currentNodeList, curNode);
      List.AddNode(nextNodeList, curNode);
    }
    else {
      curNode = List.Add(nextNodeList, {
        value: values[x],
        init: false,
        nodes: Injector.Scope(node.injector, CreateNodeArray, node.children, values[x])
      });
    }
  }

  let curNode = nextNodeList.head;
  while (curNode) {
    const data = curNode.data;
    !data.init && Schedule(function () {
      if (node.destroyed || nextNodeList.size === 0)
        return;

      NodeRef.InitAll(node as IElementNode<T>, data.nodes);
      data.init = true;
    });

    curNode = curNode.next;
  }

  if (currentNodeList) {
    let curDetach = currentNodeList.head;
    while (curDetach) {
      const data = curDetach.data;
      curDetach = curDetach.next;

      for (let x = 0; x < data.nodes.length; x++)
        (node.childNodes as Set<NodeRefTypes>).delete(data.nodes[x]);

      NodeRef.DestroyAll(data.nodes);
    }
    List.Clear(currentNodeList);
  }

  node.nodeList = nextNodeList;
}

function SetData<T>(node: IElementNodeBase<T>, values: T[], init = false) {
  Synch(function () {
    ReconcileNodeData(node, values);

    const attachNodes = node.nodeList;
    const startSize = attachNodes.size;
    Thread(function (async) {
      if (node.destroyed)
        return;

      if (init || !async)
        NodeRef.ReconcileChildren(node, attachNodes);
      else
        NodeConfig.scheduleUpdate(function () {
          if (node.destroyed || attachNodes.size !== startSize)
            return;

          NodeRef.ReconcileChildren(node, attachNodes);
        });
    });
  });
}

function CreateNodeArray<T>(childrenFunc: { (data: T): string | NodeRefTypes | NodeRefTypes[] }, value: any): NodeRefTypes[] {
  const newNodes = childrenFunc(value);
  if (typeof newNodes === "string" || !newNodes) {
    const textNode = NodeRef.Create("text", null, NodeRefType.BoundNode) as IBoundNode;
    textNode.nodeDef = {
      text: function () {
        return childrenFunc(value) as string;
      }
    };
    return [textNode];
  }

  if (Array.isArray(newNodes))
    return newNodes;

  return [newNodes];
}
