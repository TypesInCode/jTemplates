import { ObservableScope } from "../Store";
import {
  InlineScope,
  IObservableScope,
  MappedScope,
} from "../Store/Tree/observableScope";
import { Emitter } from "../Utils/emitter";
import { IsAsync } from "../Utils/functions";
import { Injector } from "../Utils/injector";
import { Schedule, Thread } from "../Utils/thread";
import { RecursivePartial } from "../Utils/utils.types";
import { Component } from "./component";
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

function ComponentChildren(this: Component) {
  return this.Template();
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
    if (typeof props === "function") {
      const assignProperties = NodeConfig.createPropertyAssignment(node);
      const scope = ObservableScope.Create(props as () => any);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignProperties));
      assignProperties(ObservableScope.Value(scope));
    } else NodeConfig.propertyAssignment(node, props);
  }

  if (on) {
    if (typeof on === "function") {
      const assignEvents = NodeConfig.createEventAssignment(node);
      const scope = ObservableScope.Create(on);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignEvents));
      assignEvents(ObservableScope.Value(scope));
    } else NodeConfig.eventAssignment(node, on);
  }

  if (attrs) {
    if (typeof attrs === "function") {
      const assignAttributes = NodeConfig.createAttributeAssignment(node);
      const scope = ObservableScope.Create(attrs);
      vnode.scopes.push(scope);
      ObservableScope.Watch(scope, ScheduledAssignment(assignAttributes));
      assignAttributes(ObservableScope.Value(scope));
    } else NodeConfig.attributeAssignment(node, attrs);
  }

  if (componentFactory) {
    vnode.component = componentFactory(vnode);
    vnode.component.Bound();
    Children(vnode, ComponentChildren.bind(vnode.component));
  } else if (childrenArray) {
    vnode.children = childrenArray;
    vNode.InitAll(childrenArray);
  } else if (children) {
    Children(vnode, children, data);
  }

  UpdateChildren(vnode, true, !!childrenArray);
}

function Children(
  vnode: vElementNode,
  children: (data: any) => string | vNodeType | vNodeType[],
  data?: () => any | undefined,
) {
  const childrenScope = CreateChildrenScope(vnode, children, data);
  vnode.scopes.push(childrenScope);
  ObservableScope.Watch(
    childrenScope,
    CreateScheduledCallback(function (scope) {
      if (vnode.destroyed) return;

      vnode.children = ObservableScope.Value(scope);
      UpdateChildren(vnode);
    }),
  );

  vnode.children = ObservableScope.Value(childrenScope);
}

function CreateChildrenScope(
  vnode: vElementNode,
  children: (data: any) => string | vNodeType | vNodeType[],
  data?: () => any | undefined,
) {
  if (data === undefined) {
    const scope = ObservableScope.Create<vNodeType[]>(GetNextNodesAsArray.bind(null, vnode.injector, children));
    ObservableScope.OnUpdated(scope, DestroyScopedVNodes);
    ObservableScope.OnDestroyed(scope, DestroyScopedVNodes);
    return scope;
  }

  if (IsAsync(data)) {
    const asyncData = data;
    data = function () {
      return InlineScope(async function () {
        return asyncData();
      });
    };
  }

  return ObservableScope.Create<vNodeType[]>(DynamicChildrenFunction.bind(null, vnode.injector, children, data));
}

function GetNextNodes(injector: Injector, children: (data: any) => string | vNodeType | vNodeType[], data: any) {
  return ToVNodeType(Injector.Scope(injector, children, data));
}

function GetNextNodesAsArray(injector: Injector, children: (data: any) => string | vNodeType | vNodeType[], data: any) {
  const nodes = GetNextNodes(injector, children, data);
  return ToArray(nodes);
}

function DestroyScopedVNodes(value: vNodeType | vNodeType[]) {
  Array.isArray(value) ? vNode.DestroyAll(value) : vNode.Destroy(value);
}

function DynamicChildrenFunction(
  injector: Injector,
  children: (data: any) => string | vNodeType | vNodeType[],
  data: () => any,
) {
  const nextData = ToArray(data());
  const getNextNodes = GetNextNodes.bind(null, injector, children);

  let results: (vNodeType | vNodeType[])[] = new Array(nextData.length);
  for (let x = 0; x < nextData.length; x++) {
    const nodes = MappedScope(
      nextData[x], getNextNodes, DestroyScopedVNodes, DestroyScopedVNodes
    );
    results[x] = nodes;
  }

  return results.flat();
}

function ToArray(result: any) {
  if (!result) return [];

  if (Array.isArray(result)) return result;

  return [result];
}

function ToVNodeType(
  children: string | vNodeType | vNodeType[],
): vNodeType | vNodeType[] {
  return typeof children === "string" ? { type: "string", node: children } : children;
}

function GetNode(vnode: vNodeType) {
  return vnode.node;
}

function UpdateChildren(vnode: vElementNode, init = false, skipInit = false) {
  if (!vnode.children) return;

  const children = vnode.children;
  Thread(function () {
    if (vnode.destroyed || children !== vnode.children) return;

    for (let x = 0; !skipInit && x < children.length; x++) {
      const childNode = children[x];
      if (!isStringNode(childNode) && childNode.definition) {
        Schedule(function () {
          if (vnode.destroyed || children !== vnode.children) return;

          vNode.Init(childNode);
        })
      }
    }

    Thread(function (async) {
      if (vnode.destroyed || children !== vnode.children) return;

      if (init || !async) {
        NodeConfig.reconcileChildren(
          vnode.node,
          vnode.children.map(GetNode),
        );
      } else
        NodeConfig.scheduleUpdate(function () {
          if (vnode.destroyed || children !== vnode.children) return;

          NodeConfig.reconcileChildren(
            vnode.node,
            vnode.children.map(GetNode),
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
