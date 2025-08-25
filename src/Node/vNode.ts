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

const DEFAULT_VNODE_ARRAY: [undefined] = [undefined];
function DEFAULT_VNODE_DATA() {
  return DEFAULT_VNODE_ARRAY;
}

export namespace vNode {
  export function Create<P = HTMLElement, E = HTMLElementEventMap, T = never>(
    definition: vNodeDefinition<P, E, T>,
  ): vNodeType {
    return {
      definition,
      type: definition.type,
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
    vnode.component.Bound();
    const componentScope = ObservableScope.Create(function () {
      let nodes = Injector.Scope(vnode.injector, function() { return vnode.component.Template() });
      if (!Array.isArray(nodes)) nodes = [nodes];

      return nodes as any as vNodeType[];
    });
    vnode.scopes.push(componentScope);

    ObservableScope.Watch(
      componentScope,
      CreateScheduledCallback(function () {
        if (vnode.destroyed) return;

        const nodes = Injector.Scope(vnode.injector, ObservableScope.Peek, componentScope);
        vNode.DestroyAll(vnode.children);
        vnode.children = nodes as any as vNodeType[];
        UpdateChildren(vnode);
      }),
    );

    const nodes = ObservableScope.Peek(componentScope);
    vnode.children = nodes;
  } else if (childrenArray) {
    vnode.children = childrenArray;
    vNode.InitAll(vnode.children);
  } else if (children) {
    Children(vnode, children, data ? ToArray(data) : DEFAULT_VNODE_DATA)
  }

  UpdateChildren(vnode, true, !!childrenArray);
}

function Children(
  vnode: vNodeType,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any[]
) {
  const nodeList = List.Create<NodeListData>();
  const childrenScope = ObservableScope.Create(
    WrapChildren(vnode.injector, children, data, nodeList)
  );
  
  ObservableScope.OnDestroyed(childrenScope, function() {
    DestroyNodeList(nodeList)
  });
  
  vnode.scopes.push(childrenScope);

  ObservableScope.Watch(childrenScope, CreateScheduledCallback(function(scope) {
    if(vnode.destroyed)
      return;
      
    AssignChildren(vnode, scope);
    UpdateChildren(vnode);
  }));

  AssignChildren(vnode, childrenScope);
}

function AssignChildren(vnode: vNodeType, childrenScope: IObservableScope<string | vNodeType |  vNodeType[]>) {
  const children = ObservableScope.Value(childrenScope);
  switch(typeof children) {
    case 'string': {
      if(vnode.children?.[0]?.type !== 'text') {
        vnode.children && vNode.DestroyAll(vnode.children);
        const node = Injector.Scope(vnode.injector, vNode.Create, {
          type: "text",
          namespace: null,
          props() {
            return { nodeValue: ObservableScope.Value(childrenScope) as string };
          },
        } as vNodeDefinition);
        vnode.children = [node];
      }
      break;
    }
    default: {
      vnode.children = Array.isArray(children) ? children : [children];
      break;
    }
  }
}

function WrapChildren(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any[],
  nodeList: IList<NodeListData>
) {
  return function() {
    const nextData = data();

    switch(nextData.length) {
      case 0:
        DestroyNodeList(nodeList);
        return [];
      case 1:
        DestroyNodeList(nodeList);
        return Injector.Scope(injector, children, nextData[0]);
      default: {
        const nodeListMap = List.ToListMap(nodeList, GetData);
        const nextNodeList = List.Create<NodeListData>();
        const nextNodeArray: vNodeType[] = [];

        for(let x=0; x<nextData.length; x++) {
          const data = nextData[x];
          const existingNodeList = nodeListMap.get(data);

          const existingNode = existingNodeList && List.PopNode(existingNodeList);
          if(existingNode) {
            List.AddNode(nextNodeList, existingNode);
            if(existingNode.data.scope.dirty) {
              vNode.DestroyAll(existingNode.data.nodes);
              existingNode.data.nodes = ObservableScope.Value(
                existingNode.data.scope
              );
            }
          }
          else {
            nodeListMap.delete(data);
            const childrenScope = ObservableScope.Create(function() {
              const childNodes = Injector.Scope(injector, children, data);
              const nodes = typeof childNodes === 'string' ? [vNode.Create({
                type: 'text',
                namespace: null,
                props: {
                  nodeValue: childNodes
                }
              })] : Array.isArray(childNodes) ? childNodes : [childNodes];
          
              return nodes;
            });

            List.Add(nextNodeList, {
              data,
              nodes: ObservableScope.Value(childrenScope),
              scope: childrenScope
            });
          }
          nextNodeArray.push(...nextNodeList.tail.data.nodes);
        }

        for(let value of nodeListMap.values())
          DestroyNodeList(value);        
        
        List.Append(nodeList, nextNodeList);
        return nextNodeArray;
      }
    }
  }
}

type NodeListData = {
  data: any;
  nodes: vNodeType[];
  scope: IObservableScope<vNodeType[]>;
};

function DestroyNodeList(nodeList: IList<NodeListData> | null) {
  for (let node = nodeList.head; node !== null; node = node.next) {
    vNode.DestroyAll(node.data.nodes);
    ObservableScope.Destroy(node.data.scope);
  }

  List.Clear(nodeList);
}

function GetData(data: NodeListData) {
  return data.data;
}

function UpdateChildren(vnode: vNodeType, init = false, skipInit = false) {
  if (!vnode.children) return;

  const children = vnode.children;
  Thread(function () {
    if (vnode.destroyed || children !== vnode.children) return;

    for (let x = 0; !skipInit && x < children.length; x++)
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

function CreateScheduledCallback<R extends any[]>(callback: { (...args: R): void }) {
  let scheduled = false;
  return function (...args: R) {
    if (scheduled) return;

    scheduled = true;
    NodeConfig.scheduleUpdate(function () {
      scheduled = false;
      callback(...args);
    });
  };
}
