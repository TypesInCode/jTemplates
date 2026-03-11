import { ObservableScope } from "../Store";
import { CalcScope, IObservableScope } from "../Store/Tree/observableScope";
import { Emitter } from "../Utils/emitter";
import { IsAsync } from "../Utils/functions";
import { Injector } from "../Utils/injector";
import { IList, List } from "../Utils/list";
import { Schedule, Thread } from "../Utils/thread";
import { RecursivePartial } from "../Utils/utils.types";
import { NodeConfig } from "./nodeConfig";
import {
  vNode as vNodeType,
  vNodeDefinition,
  FunctionOr,
  vNodeEvents,
  vNodeChildrenFunction,
  isStringNode,
  vElementNode,
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
  ): vElementNode {
    return {
      definition,
      type: definition.type,
      injector: definition.componentFactory
        ? Injector.Scope(Injector.Current(), function () {
            return new Injector();
          })
        : (Injector.Current() ?? new Injector()),
      node: definition.node ?? null,
      children: null,
      destroyed: false,
      onDestroyed: null,
      component: null,
      scopes: [],
    };
  }

  export function CreateText(text: string): vNodeType {
    return {
      definition: null,
      type: "text",
      injector: null,
      node: NodeConfig.createTextNode(text),
      children: null,
      destroyed: false,
      onDestroyed: null,
      component: null,
      scopes: [],
    };
  }

  export function Init(vnode: vNodeType) {
    if (isStringNode(vnode) || vnode.definition === null) return;

    InitNode(vnode);
  }

  export function InitAll(vnodes: vNodeType[]) {
    for (let x = 0; x < vnodes.length; x++) Init(vnodes[x]);
  }

  export function Destroy(vnode: vNodeType) {
    if (isStringNode(vnode) || vnode.destroyed) return;

    vnode.destroyed = true;
    vnode.component?.Destroy();
    ObservableScope.DestroyAll(vnode.scopes);
    vnode.onDestroyed && Emitter.Emit(vnode.onDestroyed);

    for (let x = 0; vnode.children && x < vnode.children.length; x++) {
      DestroyAll(vnode.children[x][1]);
      ObservableScope.Destroy(vnode.children[x][2]);
    }
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

function InitNode(vnode: vElementNode) {
  const {
    type,
    namespace,
    props,
    attrs,
    on,
    data,
    componentFactory,
    children,
    childrenArray,
  } = vnode.definition;
  const node = (vnode.node =
    vnode.definition.node ?? NodeConfig.createNode(type, namespace));
  vnode.definition = null;

  if (props) {
    const assignProperties = NodeConfig.createPropertyAssignment(node);
    if (typeof props === "function") {
      const scope = ObservableScope.Create(props as () => any);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignProperties));
      assignProperties(ObservableScope.Value(scope));
    } else assignProperties(props);
  }

  if (on) {
    const assignEvents = NodeConfig.createEventAssignment(node);
    if (typeof on === "function") {
      const scope = ObservableScope.Create(on);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignEvents));
      assignEvents(ObservableScope.Value(scope));
    } else assignEvents(on);
  }

  if (attrs) {
    const assignAttributes = NodeConfig.createAttributeAssignment(node);
    if (typeof attrs === "function") {
      const scope = ObservableScope.Create(attrs);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignAttributes));
      assignAttributes(ObservableScope.Value(scope));
    } else assignAttributes(attrs);
  }

  if (componentFactory) {
    vnode.component = componentFactory(vnode);
    vnode.component.Bound();
    function componentChildren() {
      return vnode.component.Template();
    }
    Children(vnode, componentChildren, DefaultData);
  } else if (childrenArray) {
    vnode.children = [[undefined, childrenArray, null]];
    vNode.InitAll(childrenArray);
  } else if (children) {
    Children(vnode, children, data);
  }

  UpdateChildren(vnode, true, !!childrenArray);
}

function Children(
  vnode: vElementNode,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any | undefined,
) {
  const childrenScope = CreateChildrenScope(vnode, children, data);
  if (childrenScope) {
    vnode.scopes.push(childrenScope);

    ObservableScope.Watch(
      childrenScope,
      CreateScheduledCallback(function (scope) {
        if (vnode.destroyed) return;

        const startChildren = vnode.children;
        const newChildren = ObservableScope.Value(scope);
        if (startChildren !== newChildren) {
          vnode.children = newChildren;
          UpdateChildren(vnode);
        }
      }),
    );
  }

  vnode.children = ObservableScope.Value(childrenScope);
}

const DEFAULT_DATA: [undefined] = [undefined];
function DefaultData() {
  return DEFAULT_DATA;
}

function CreateChildrenScope(
  vnode: vElementNode,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any | undefined = DefaultData,
) {
  if (IsAsync(data)) {
    const asyncData = data;
    data = function () {
      return CalcScope(async function () {
        return asyncData();
      });
    };
  }

  return ObservableScope.Create(WrapChildren(vnode.injector, children, data));
}

function WrapChildren(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any,
) {
  let nodeArray: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ])[];
  return function () {
    const nextData = data === DefaultData ? data() : ToArray(data());

    switch (nextData.length) {
      case 0: {
        if (nodeArray !== undefined) {
          for (let x = 0; x < nodeArray.length; x++) {
            vNode.DestroyAll(nodeArray[x][1]);
            ObservableScope.Destroy(nodeArray[x][2]);
          }

          nodeArray = [];
        }
        break;
      }
      default: {
        if (nodeArray === undefined)
          nodeArray = InitializeNextNodes(injector, children, nextData);
        else if (nodeArray.length < 11)
          nodeArray = EvaluateNextNodesSmall(
            injector,
            children,
            nextData,
            nodeArray,
          );
        else
          nodeArray = EvaluateNextNodesLarge(
            injector,
            children,
            nextData,
            nodeArray,
          );

        break;
      }
    }

    return nodeArray;
  };
}

function ToArray(result: any) {
  if (!result) return [];

  if (Array.isArray(result)) return result;

  return [result];
}

function GetNextNodeRow(
  data: any,
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  scope?: IObservableScope<any> | null,
) {
  scope ??=
    data === undefined
      ? null
      : ObservableScope.Create(function () {
          const children = Injector.Scope(injector, getNextChildren, data);
          return CreateNodeArray(children);
        });

  const children =
    scope === null
      ? CreateNodeArray(Injector.Scope(injector, getNextChildren, undefined))
      : ObservableScope.Value(scope);

  return [data, children, scope] as const;
}

function InitializeNextNodes(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
) {
  const nextNodes = new Array(nextData.length);
  for (let x = 0; x < nextData.length; x++) {
    const data = nextData[x];
    nextNodes[x] = GetNextNodeRow(data, injector, getNextChildren);
  }

  return nextNodes;
}

function GetNextNodeRowSmall(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nodeArray: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ])[],
  data: any,
) {
  let i = 0;
  for (
    ;
    i < nodeArray.length && (nodeArray[i] === null || nodeArray[i][0] !== data);
    i++
  ) {}

  if (i === nodeArray.length)
    return GetNextNodeRow(data, injector, getNextChildren);

  const nextNodeRow = GetNextNodeRow(
    data,
    injector,
    getNextChildren,
    nodeArray[i][2],
  );
  if (nodeArray[i][1] !== nextNodeRow[1]) vNode.DestroyAll(nodeArray[i][1]);

  nodeArray[i] = null;
  return nextNodeRow;
}

function EvaluateNextNodesSmall(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ])[],
) {
  const nextNodes: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]>,
  ])[] = new Array(nextData.length);

  for (let x = 0; x < nextData.length; x++)
    nextNodes[x] = GetNextNodeRowSmall(
      injector,
      getNextChildren,
      nodeArray,
      nextData[x],
    );

  return nextNodes;
}

function GetNextNodeRowLarge(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nodeRowMap: Map<
    any,
    (readonly [
      any,
      vNodeType[],
      IObservableScope<string | vNodeType | vNodeType[]> | null,
    ])[]
  >,
  data: any,
) {
  const currentChildren = nodeRowMap.get(data);
  let currentChildIndex = currentChildren ? currentChildren.length - 1 : -1;
  for (
    ;
    currentChildIndex >= 0 && currentChildren[currentChildIndex] === null;
    currentChildIndex--
  ) {}

  if (currentChildIndex >= 0) {
    const nodeRow = currentChildren[currentChildIndex];
    if (currentChildIndex === 0) nodeRowMap.delete(data);
    else currentChildren[currentChildIndex] = null;

    const nextNodeRow = GetNextNodeRow(
      data,
      injector,
      getNextChildren,
      nodeRow[2],
    );
    if (nodeRow[1] !== nextNodeRow[1]) vNode.DestroyAll(nodeRow[1]);

    return nextNodeRow;
  }

  return GetNextNodeRow(data, injector, getNextChildren);
}

function EvaluateNextNodesLarge(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ])[],
) {
  const nextNodes: (readonly [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ])[] = new Array(nextData.length);
  const dataMap = new Map<any, (typeof nodeArray)[number][]>();

  for (let x = 0; x < nodeArray.length; x++) {
    const arr = dataMap.get(nodeArray[x][0]) ?? [];
    arr.push(nodeArray[x]);
    dataMap.set(nodeArray[x][0], arr);
  }

  for (let x = 0; x < nextData.length; x++) {
    nextNodes[x] = GetNextNodeRowLarge(
      injector,
      getNextChildren,
      dataMap,
      nextData[x],
    );
  }

  for (const value of dataMap.values()) {
    for (let x = 0; x < value.length; x++) {
      const row = value[x];
      row && vNode.DestroyAll(row[1]);
      row && ObservableScope.Destroy(row[2]);
    }
  }

  return nextNodes;
}

function CreateNodeArray(
  children: string | vNodeType | vNodeType[],
): vNodeType[] {
  if (!Array.isArray(children)) {
    return typeof children === "string"
      ? [{ type: "string", node: children }]
      : [children];
  }

  return children;
}

function UpdateChildren(vnode: vElementNode, init = false, skipInit = false) {
  if (!vnode.children) return;

  if (
    vnode.children.length === 1 &&
    vnode.children[0][1].length === 1 &&
    vnode.children[0][1][0].node
  ) {
    NodeConfig.reconcileChild(vnode.node, vnode.children[0][1][0].node);
    return;
  }

  const children = vnode.children;
  Thread(function () {
    if (vnode.destroyed || children !== vnode.children) return;

    for (let x = 0; !skipInit && x < children.length; x++)
      for (let y = 0; y < children[x][1].length; y++) {
        const childNode = children[x][1][y];
        if (!isStringNode(childNode) && childNode.definition) {
          Schedule(function () {
            if (vnode.destroyed || children !== vnode.children) return;

            vNode.Init(childNode);
          });
        }
      }

    Thread(function (async) {
      if (vnode.destroyed || children !== vnode.children) return;

      if (init || !async) {
        if (vnode.children.length === 1 && vnode.children[0][1].length === 1)
          NodeConfig.reconcileChild(vnode.node, vnode.children[0][1][0].node);
        else
          NodeConfig.reconcileChildren(
            vnode.node,
            vnode.children.flatMap((row) => row[1].map((vnode) => vnode.node)),
          );
      } else
        NodeConfig.scheduleUpdate(function () {
          if (vnode.destroyed || children !== vnode.children) return;

          if (vnode.children.length === 1 && vnode.children[0][1].length === 1)
            NodeConfig.reconcileChild(vnode.node, vnode.children[0][1][0].node);
          else
            NodeConfig.reconcileChildren(
              vnode.node,
              vnode.children.flatMap((row) =>
                row[1].map((vnode) => vnode.node),
              ),
            );
        });
    });
  });
}

function ScheduledAssignment(assign: (data: any) => void) {
  let scheduled = false;
  return function (scope: IObservableScope<any>) {
    if (scheduled) return;

    scheduled = true;
    NodeConfig.scheduleUpdate(function () {
      scheduled = false;
      const value = ObservableScope.Peek(scope);
      assign(value);
    });
  };
}

function CreateScheduledCallback<R extends any[]>(callback: {
  (...args: R): void;
}) {
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
