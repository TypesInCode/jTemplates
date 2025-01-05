import { ObservableScope } from "../Store";
import { IObservableScope } from "../Store/Tree/observableScope";
import { Injector } from "../Utils/injector";
import { IList, INode, List } from "../Utils/list";
import { Schedule, Thread } from "../Utils/thread";
import { RecursivePartial } from "../Utils/utils.types";
import { NodeConfig } from "./nodeConfig";
import {
  vNode as vNodeType,
  vNodeDefinition,
  FunctionOr,
  vNodeEvents,
  vNodeChildrenFunction,
} from "./vNode.types";

type vNodeConfig<P = HTMLElement, E = HTMLElementEventMap, T = never> = {
  props?: FunctionOr<RecursivePartial<P>>;
  attrs?: FunctionOr<{ [name: string]: string }>;
  on?: FunctionOr<vNodeEvents<E>>;
  data?: () => T | Array<T> | Promise<Array<T>> | Promise<T>;
};

export namespace vNode {
  export function Create<P = HTMLElement, E = HTMLElementEventMap, T = never>(
    definition: vNodeDefinition<P, E, T>,
  ): vNodeType {
    return {
      definition,
      injector: Injector.Current() ?? new Injector(),
      node: null,
      children: null,
      destroyed: false,
      component: null,
      scopes: [],
    };
  }

  export function Init(vnode: vNodeType) {
    if (vnode.definition === null) return;

    InitNode(vnode);
  }

  export function InitAll(vnodes: vNodeType[]) {
    for (let x = 0; x < vnodes.length; x++) Init(vnodes[x]);
  }

  export function Destroy(vnode: vNodeType) {
    if (vnode.destroyed) return;

    vnode.destroyed = true;
    vnode.component?.Destroy();
    ObservableScope.DestroyAll(vnode.scopes);
    vnode.children && DestroyAll(vnode.children);
  }

  export function DestroyAll(vnodes: vNodeType[]) {
    for (let x = 0; x < vnodes.length; x++) Destroy(vnodes[x]);
  }

  export function ToFunction<P = HTMLElement, E = HTMLElementEventMap>(
    type: string,
    namespace?: string,
  ) {
    return function <T>(
      config: vNodeConfig<P, E, T>,
      children?: vNodeType[] | vNodeChildrenFunction<T>,
    ) {
      const childrenConfig = children
        ? Array.isArray(children)
          ? { childrenArray: children }
          : { children }
        : undefined;

      const definition: vNodeDefinition<P, E, T> = Object.assign(
        {
          type,
          namespace: namespace ?? null,
        },
        config,
        childrenConfig,
      );

      return Create(definition);
    };
  }

  export function Attach(node: any, vnode: vNodeType) {
    Init(vnode);
    NodeConfig.addChild(node, vnode.node);
    return vnode;
  }
}

function InitNode(vnode: vNodeType) {
  const {
    type,
    namespace,
    props,
    attrs,
    on,
    data,
    componentConstructor,
    children,
    childrenArray,
  } = vnode.definition;
  const node = (vnode.node = NodeConfig.createNode(type, namespace));
  vnode.definition = null;

  if (props) {
    const assignProperties = NodeConfig.createPropertyAssignment(node);
    if (typeof props === "function") {
      const scope = ObservableScope.Create(props as () => any);
      vnode.scopes.push(scope);

      ObservableScope.Watch(scope, ScheduledAssignment(assignProperties));
      const value = ObservableScope.Peek(scope);
      assignProperties(value);
    } else assignProperties(props);
  }

  if (on) {
    const assignEvents = NodeConfig.createEventAssignment(node);
    if (typeof on === "function") {
      const scope = ObservableScope.Create(on);
      vnode.scopes.push(scope);

      ObservableScope.Watch(scope, ScheduledAssignment(assignEvents));
      const value = ObservableScope.Peek(scope);
      assignEvents(value);
    } else assignEvents(on);
  }

  if (attrs) {
    const assignAttributes = NodeConfig.createAttributeAssignment(node);
    if (typeof attrs === "function") {
      const scope = ObservableScope.Create(attrs);
      vnode.scopes.push(scope);

      ObservableScope.Watch(scope, ScheduledAssignment(assignAttributes));
      const value = ObservableScope.Peek(scope);
      assignAttributes(value);
    } else assignAttributes(attrs);
  }

  if (componentConstructor) {
    vnode.component = new componentConstructor(vnode);
    const componentScope = ObservableScope.Create(function () {
      let nodes = vnode.component.Template();
      if (!Array.isArray(nodes)) nodes = [nodes];

      return nodes as any as vNodeType[];
    });
    vnode.scopes.push(componentScope);

    ObservableScope.Watch(
      componentScope,
      CreateScheduledCallback(function () {
        if (vnode.destroyed) return;

        const nodes = ObservableScope.Peek(componentScope);
        vNode.DestroyAll(vnode.children);
        vnode.children = nodes as any as vNodeType[];
        UpdateChildren(vnode);
      }),
    );

    const nodes = ObservableScope.Peek(componentScope);
    vnode.children = nodes;
  } else if (childrenArray) {
    vnode.children = childrenArray;
  } else if (children) {
    if (data) {
      DynamicChildren(
        vnode,
        children as (data: any) => vNodeType | vNodeType[],
        ToArray(data),
      );
    } else StaticChildren(vnode, children);
  }

  UpdateChildren(vnode, true);
}

function StaticChildren(
  vnode: vNodeType,
  children: (data: any) => string | vNodeType | vNodeType[],
) {
  const childrenScope = ObservableScope.Create(
    WrapStaticChildren(vnode.injector, children),
  );
  vnode.scopes.push(childrenScope);
  
  const child = ObservableScope.Peek(childrenScope);
  switch(typeof child) {
    case 'string': {
      const node = vNode.Create({
        type: "text",
        namespace: null,
        props() {
          return { nodeValue: ObservableScope.Value(childrenScope) as string };
        },
      });
      vnode.children = [node];
      break;
    }
    default: {
      ObservableScope.Touch(childrenScope);
      ObservableScope.Watch(
        childrenScope,
        CreateScheduledCallback(function () {
          if (vnode.destroyed) return;

          vNode.DestroyAll(vnode.children);
          const nodes = ObservableScope.Peek(childrenScope) as vNodeType[];
          vnode.children = Array.isArray(nodes) ? nodes : [nodes];
          UpdateChildren(vnode);
        }),
      );

      vnode.children = (Array.isArray(child) ? child : [child] as vNodeType[]);
      break;
    }
  }
}

function WrapStaticChildren(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
) {
  return function () {
    return Injector.Scope(injector, children, undefined);
  };
}

type NodeListData = {
  data: any;
  nodes: vNodeType[];
  scope: IObservableScope<vNodeType[]>;
};

function DestroyNodeList(nodeList: IList<NodeListData>) {
  for (let node = nodeList.head; node !== null; node = node.next) {
    vNode.DestroyAll(node.data.nodes);
    ObservableScope.Destroy(node.data.scope);
  }
}

function DynamicChildren(
  vnode: vNodeType,
  children: (data: any) => vNodeType | vNodeType[],
  data: () => any[],
) {
  const dataScope = ObservableScope.Create(data);
  vnode.scopes.push(dataScope);

  const nodeList: IList<NodeListData> = List.Create();
  const childrenScope = ObservableScope.Create(
    WrapDynamicChildren(dataScope, nodeList, vnode.injector, children),
  );
  vnode.scopes.push(childrenScope);
  ObservableScope.OnDestroyed(dataScope, function () {
    DestroyNodeList(nodeList);
  });

  ObservableScope.Watch(
    childrenScope,
    CreateScheduledCallback(function () {
      if (vnode.destroyed) return;

      vnode.children = ObservableScope.Peek(childrenScope);
      UpdateChildren(vnode);
    }),
  );
  vnode.children = ObservableScope.Value(childrenScope);
}

function WrapDynamicChildren(
  dataScope: IObservableScope<any[]>,
  nodeList: IList<NodeListData>,
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
) {
  return function () {
    const nextData = ObservableScope.Value(dataScope);
    const nodeMap = List.ToNodeMap(nodeList, function (data) {
      return data.data;
    });
    const nextNodeList: IList<NodeListData> = List.Create();
    const nextNodeArray: vNodeType[] = [];

    for (let x = 0; x < nextData.length; x++) {
      const data = nextData[x];
      const existingNodeArray = nodeMap.get(data);
      let existingNode: INode<NodeListData> = null;
      for (
        let x = 0;
        existingNodeArray &&
        x < existingNodeArray.length &&
        existingNode === null;
        x++
      ) {
        existingNode = existingNodeArray[x];
        existingNodeArray[x] = null;
      }

      if (existingNode !== null) {
        List.RemoveNode(nodeList, existingNode);
        List.AddNode(nextNodeList, existingNode);
        if (existingNode.data.scope.dirty) {
          const newNodes = ObservableScope.Value(existingNode.data.scope);
          vNode.DestroyAll(existingNode.data.nodes);
          existingNode.data.nodes = newNodes;
          existingNode.data.nodes = ObservableScope.Value(
            existingNode.data.scope,
          );
        }
      } else {
        const childrenScope = ObservableScope.Create(function () {
          const childNodes = Injector.Scope(injector, children, data);
          const nodes = Array.isArray(childNodes) ? childNodes : [childNodes];
          for (let x = 0; x < nodes.length; x++) {
            if (typeof nodes[x] === "string")
              nodes[x] = vNode.Create({
                type: "text",
                namespace: null,
                props: {
                  nodeValue: nodes[x] as string,
                },
              });
          }
          return nodes;
        });
        List.Add(nextNodeList, {
          data,
          nodes: ObservableScope.Value(childrenScope),
          scope: childrenScope,
        });
      }

      nextNodeArray.push(...nextNodeList.tail.data.nodes);
    }

    DestroyNodeList(nodeList);
    List.Clear(nodeList);
    List.Append(nodeList, nextNodeList);
    return nextNodeArray;
  };
}

function UpdateChildren(vnode: vNodeType, init = false) {
  if (!vnode.children) return;

  const children = vnode.children;
  Thread(function () {
    if (vnode.destroyed || children !== vnode.children) return;

    for (let x = 0; x < children.length; x++)
      if (children[x].node === null) {
        const childNode = children[x];
        Schedule(function () {
          if (vnode.destroyed || children !== vnode.children) return;

          vNode.Init(childNode);
        });
      }

    Thread(function (async) {
      if (vnode.destroyed || children !== vnode.children) return;

      if (init || !async)
        NodeConfig.reconcileChildren(
          vnode.node,
          vnode.children.map((vnode) => vnode.node),
        );
      else
        NodeConfig.scheduleUpdate(function () {
          if (vnode.destroyed || children !== vnode.children) return;

          NodeConfig.reconcileChildren(
            vnode.node,
            vnode.children.map((vnode) => vnode.node),
          );
        });
    });
  });
}

function ToArray<T, P extends any[]>(
  callback: (...args: P) => T | T[],
): () => T[] {
  return function (...args: P) {
    const result = callback(...args);
    if (Array.isArray(result)) return result;

    if (!result) return [];

    return [result];
  };
}

function ScheduledAssignment(assign: (data: any) => void) {
  let scheduled = false;
  return function (scope: IObservableScope<any>) {
    if (scheduled) return;

    scheduled = true;
    NodeConfig.scheduleUpdate(function () {
      if (scope.destroyed) return;

      scheduled = false;
      const value = ObservableScope.Peek(scope);
      assign(value);
    });
  };
}

function CreateScheduledCallback(callback: { (): void }) {
  let scheduled = false;
  return function () {
    if (scheduled) return;

    scheduled = true;
    NodeConfig.scheduleUpdate(function () {
      scheduled = false;
      callback();
    });
  };
}
