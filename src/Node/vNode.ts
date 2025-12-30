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
      type: definition.type,
      injector: definition.componentConstructor
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
  const node = (vnode.node =
    vnode.definition.node ?? NodeConfig.createNode(type, namespace));
  vnode.definition = null;

  if (props) {
    const assignProperties = NodeConfig.createPropertyAssignment(node);
    if (typeof props === "function") {
      const [value, scope] = ObservableScope.CreateIf(props as () => any);
      if (scope) {
        vnode.scopes.push(scope);
        ObservableScope.Watch(scope, ScheduledAssignment(assignProperties));
      }
      assignProperties(value);
    } else assignProperties(props);
  }

  if (on) {
    const assignEvents = NodeConfig.createEventAssignment(node);
    if (typeof on === "function") {
      const [value, scope] = ObservableScope.CreateIf(on);
      if (scope) {
        vnode.scopes.push(scope);
        ObservableScope.Watch(scope, ScheduledAssignment(assignEvents));
      }
      assignEvents(value);
    } else assignEvents(on);
  }

  if (attrs) {
    const assignAttributes = NodeConfig.createAttributeAssignment(node);
    if (typeof attrs === "function") {
      const [value, scope] = ObservableScope.CreateIf(attrs);
      if (scope) {
        vnode.scopes.push(scope);
        ObservableScope.Watch(scope, ScheduledAssignment(assignAttributes));
      }
      assignAttributes(value);
    } else assignAttributes(attrs);
  }

  if (componentConstructor) {
    vnode.component = new componentConstructor(vnode);
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
  vnode: vNodeType,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any | undefined,
) {
  const [childNodes, childrenScope] = CreateChildrenScope(
    vnode,
    children,
    data,
  );
  if (childrenScope) {
    vnode.scopes.push(childrenScope);

    ObservableScope.Watch(
      childrenScope,
      CreateScheduledCallback(function (scope) {
        if (vnode.destroyed) return;

        const startChildren = vnode.children;
        const newChildren = ObservableScope.Value(scope);
        // AssignChildren(vnode, scope);
        if (startChildren !== newChildren) {
          vnode.children = newChildren;
          UpdateChildren(vnode);
        }
      }),
    );
  }

  vnode.children = childNodes;
  // AssignChildren(vnode, childrenScope);
}

function AssignChildren(
  vnode: vNodeType,
  childrenScope: IObservableScope<
    [
      any,
      vNodeType[],
      IObservableScope<string | vNodeType | vNodeType[]> | null,
    ][]
  >,
) {
  const children = ObservableScope.Peek(childrenScope);
  vnode.children = children;
}

const DEFAULT_DATA: [undefined] = [undefined];
function DefaultData() {
  return DEFAULT_DATA;
}

function CreateChildrenScope(
  vnode: vNodeType,
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

  return ObservableScope.CreateIf(WrapChildren(vnode.injector, children, data));
}

function WrapChildren(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any,
) {
  let nodeArray: [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ][] = [];
  return function () {
    const nextData = ToArray(data());

    switch (nextData.length) {
      case 0: {
        for (let x = 0; x < nodeArray.length; x++) {
          vNode.DestroyAll(nodeArray[x][1]);
          ObservableScope.Destroy(nodeArray[x][2]);
        }

        nodeArray.splice(0);
      }
      default: {
        if (nodeArray.length < 21)
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

function EvaluateNextNodesSmall(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ][],
) {
  if (nextData === DEFAULT_DATA) {
    const nextChildren = Injector.Scope(injector, getNextChildren, nextData[0]);
    const children = CreateNodeArray(nextChildren, nodeArray[0]?.[1]);
    for (let x = 0; x < nodeArray.length; x++) {
      vNode.DestroyAll(nodeArray[x][1]);
      ObservableScope.Destroy(nodeArray[x][2]);
    }

    return [
      [undefined, children, null] as [
        any,
        vNodeType[],
        IObservableScope<string | vNodeType | vNodeType[]> | null,
      ],
    ];
  }

  const nextNodes: [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]>,
  ][] = new Array(nextData.length);
  for (let x = 0; x < nextData.length; x++) {
    const data = nextData[x];

    let i = 0;
    for (
      ;
      i < nodeArray.length &&
      (nodeArray[i] === null || nodeArray[i][0] !== data);
      i++
    ) {}

    if (i !== nodeArray.length) {
      if (nodeArray[i][2]) {
        const scope = nodeArray[i][2];
        const value = scope.value;
        const updatedValue = ObservableScope.Value(scope);
        if (value !== updatedValue)
          nodeArray[i][1] = CreateNodeArray(updatedValue);
      }
      nextNodes[x] = nodeArray[i];
      nodeArray[i] = null;
    } else {
      const [nextChildren, scope] = ObservableScope.CreateIf(function () {
        return Injector.Scope(injector, getNextChildren, data);
      });

      nextNodes[x] = [data, CreateNodeArray(nextChildren), scope];
    }
  }

  for (let x = 0; x < nodeArray.length; x++) {
    if (nodeArray[x] !== null) {
      vNode.DestroyAll(nodeArray[x][1]);
      ObservableScope.Destroy(nodeArray[x][2]);
    }
  }

  return nextNodes;
}

function EvaluateNextNodesLarge(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ][],
) {
  const nextNodes: [
    any,
    vNodeType[],
    IObservableScope<string | vNodeType | vNodeType[]> | null,
  ][] = new Array(nextData.length);
  const dataMap = new Map<any, (typeof nodeArray)[number][]>();

  for (let x = 0; x < nodeArray.length; x++) {
    const arr = dataMap.get(nodeArray[x][0]) ?? [];
    arr.push(nodeArray[x]);
    dataMap.set(nodeArray[x][0], arr);
  }

  for (let x = 0; x < nextData.length; x++) {
    const data = nextData[x];

    const currentChildren = dataMap.get(data);
    let currentChildIndex = currentChildren ? currentChildren.length - 1 : -1;
    for (
      ;
      currentChildIndex >= 0 && currentChildren[currentChildIndex] === null;
      currentChildIndex--
    ) {}

    if (currentChildIndex !== -1) {
      const currentChild = currentChildren[currentChildIndex];
      if (currentChild[2]) {
        const scope = currentChild[2];
        const value = scope.value;
        const updatedValue = ObservableScope.Value(scope);
        if (value !== updatedValue)
          currentChild[1] = CreateNodeArray(updatedValue);
      }

      if (currentChild[2]?.dirty) {
        const nextChildren = ObservableScope.Value(currentChild[2]);
        currentChild[1] = CreateNodeArray(nextChildren);
      }
      nextNodes[x] = currentChild;
      currentChildren[currentChildIndex] = null;
      if (currentChildIndex === 0) dataMap.delete(data);
    } else {
      const [nextChildren, scope] = ObservableScope.CreateIf(function () {
        return Injector.Scope(injector, getNextChildren, data);
      });

      nextNodes[x] = [data, CreateNodeArray(nextChildren), scope];
    }
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
  previousChildren?: vNodeType[],
) {
  if (Array.isArray(children)) return children;

  if (typeof children === "string") {
    const firstPrevChild = previousChildren?.[0];
    if (
      firstPrevChild &&
      firstPrevChild.node &&
      firstPrevChild.type === "text"
    ) {
      NodeConfig.setText(firstPrevChild.node, children);
      return previousChildren.length === 1
        ? previousChildren
        : [firstPrevChild];
    }

    return [vNode.CreateText(children)];
  }

  return [children];
}

function UpdateChildren(vnode: vNodeType, init = false, skipInit = false) {
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
      for (let y = 0; y < children[x][1].length; y++)
        if (children[x][1][y].definition) {
          const childNode = children[x][1][y];
          Schedule(function () {
            if (vnode.destroyed || children !== vnode.children) return;

            vNode.Init(childNode);
          });
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
      if (scope.destroyed) return;

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
