import { ObservableScope } from "../Store";
import { IObservableScope } from "../Store/Tree/observableScope";
import { Emitter } from "../Utils/emitter";
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

    for (let x = 0; vnode.children && x < vnode.children.length; x++)
      DestroyAll(vnode.children[x][1]);
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
    vnode.onDestroyed ??= Emitter.Create();
    Emitter.On(vnode.onDestroyed, function () {
      assignEvents(null);
      return true;
    });
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
    function componentChildren() {
      return vnode.component.Template();
    }
    Children(vnode, componentChildren, DefaultData);
  } else if (childrenArray) {
    vnode.children = [[undefined, childrenArray]];
    vNode.InitAll(childrenArray);
  } else if (children) {
    Children(vnode, children, data);
  }

  UpdateChildren(vnode, true, !!childrenArray);
}

function Children(
  vnode: vNodeType,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any[] | undefined,
) {
  const childrenScope = CreateChildrenScope(vnode, children, data);
  vnode.scopes.push(childrenScope);

  ObservableScope.Watch(
    childrenScope,
    CreateScheduledCallback(function (scope) {
      if (vnode.destroyed) return;

      const startChildren = vnode.children;
      AssignChildren(vnode, scope);
      startChildren !== vnode.children && UpdateChildren(vnode);
    }),
  );

  AssignChildren(vnode, childrenScope);
}

const DEFAULT_DATA: [undefined] = [undefined];
function DefaultData() {
  return DEFAULT_DATA;
}

function CreateChildrenScope(
  vnode: vNodeType,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any[] | undefined,
) {
  // if (data === undefined)
  //   return ObservableScope.Create(WrapStaticChildren(vnode, children));
  let dataScope: IObservableScope<any> | undefined;
  if (data !== undefined) {
    dataScope = ObservableScope.Create(data);
    data = function () {
      const result = ObservableScope.Value(dataScope);
      if (!result) return [];

      if (Array.isArray(result)) return result;

      return [result];
    };
  } else data = DefaultData;

  const scope = ObservableScope.Create(
    WrapChildren(vnode.injector, children, data),
  );
  dataScope &&
    ObservableScope.OnDestroyed(scope, function () {
      ObservableScope.Destroy(dataScope);
      return true;
    });

  return scope;
}

function WrapChildren(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any[],
) {
  let nodeArray: [any, vNodeType[]][] = [];
  return function () {
    const nextData = data();

    switch (nextData.length) {
      case 0: {
        for (let x = 0; x < nodeArray.length; x++) {
          vNode.DestroyAll(nodeArray[x][1]);
        }

        nodeArray.splice(0);
        return [];
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

    return nodeArray; // .flatMap(row => row[1]);
  };
}

function EvaluateNextNodesSmall(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: [any, vNodeType[]][],
) {
  if (nextData.length === 1) {
    const nextChildren = Injector.Scope(injector, getNextChildren, nextData[0]);
    const children = CreateNodeArray(nextChildren, nodeArray[0]?.[1]);
    for (let x = 0; x < nodeArray.length; x++)
      vNode.DestroyAll(nodeArray[x][1]);

    return [[undefined, children] as [any, vNodeType[]]];
  }

  let nodeArrayLength = nodeArray.length;
  const nextNodes: [any, vNodeType[]][] = new Array(nextData.length);
  for (let x = 0; x < nextData.length; x++) {
    const data = nextData[x];
    const nextChildren = Injector.Scope(injector, getNextChildren, data);

    let i = 0;
    for (; i < nodeArrayLength && nodeArray[i][0] !== data; i++) {}

    if (i !== nodeArrayLength) {
      nextNodes[x] = nodeArray[i];
      nodeArray[i] = nodeArray[nodeArray.length - 1];
      nodeArrayLength--;
    } else nextNodes[x] = [data, CreateNodeArray(nextChildren)];
  }

  for (let x = 0; x < nodeArrayLength; x++) vNode.DestroyAll(nodeArray[x][1]);

  return nextNodes;
}

function EvaluateNextNodesLarge(
  injector: Injector,
  getNextChildren: (data: any) => string | vNodeType | vNodeType[],
  nextData: any[],
  nodeArray: [any, vNodeType[]][],
) {
  const nextNodes: [any, vNodeType[]][] = new Array(nextData.length);
  const dataMap = new Map<any, (typeof nodeArray)[number][1][]>();

  for (let x = 0; x < nodeArray.length; x++) {
    const arr = dataMap.get(nodeArray[x][0]) ?? [];
    arr.push(nodeArray[x][1]);
    dataMap.set(nodeArray[x][0], arr);
  }

  for (let x = 0; x < nextData.length; x++) {
    const data = nextData[x];
    const nextChildren = Injector.Scope(injector, getNextChildren, data);

    const currentChildren = dataMap.get(data);
    let currentChildIndex = currentChildren ? currentChildren.length - 1 : -1;
    for (
      ;
      currentChildIndex >= 0 && currentChildren[currentChildIndex] === null;
      currentChildIndex--
    ) {}

    if (currentChildIndex !== -1) {
      nextNodes[x] = [data, currentChildren[currentChildIndex]];
      currentChildren[currentChildIndex] = null;
      if (currentChildIndex === 0) dataMap.delete(data);
    } else {
      nextNodes[x] = [data, CreateNodeArray(nextChildren)];
    }
  }

  for (const value of dataMap.values()) {
    for (let x = 0; x < value.length; x++) {
      for (let y = 0; y < value[x].length; y++)
        value[x][y] && vNode.Destroy(value[x][y]);
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

function AssignChildren(
  vnode: vNodeType,
  childrenScope: IObservableScope<[any, vNodeType[]][]>,
) {
  const children = ObservableScope.Peek(childrenScope);
  vnode.children = children;
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
