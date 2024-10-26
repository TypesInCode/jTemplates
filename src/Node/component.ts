import { NodeRef } from "./nodeRef";
import { ComponentNode } from "./componentNode";
import { Destroy } from "../Utils/decorators";
import { ComponentNodeEvents, ComponentNodeFunction } from "./componentNode.types";
import { ObservableScope } from "../Store/Tree/observableScope";
import { INodeRefBase, NodeRefTypes } from "./nodeRef.types";

export class Component<D = void, T = void, E = void> {
  private scope: ObservableScope<D>;
  private templates: T;

  public get Injector() {
    return this.nodeRef.injector;
  }

  public get Destroyed() {
    return this.nodeRef.destroyed;
  }

  protected get Scope() {
    return this.scope;
  }

  protected get Data() {
    return this.scope.Value;
  }

  protected get NodeRef() {
    return this.nodeRef;
  }

  protected get Templates() {
    return this.templates;
  }

  constructor(
    data: D | (() => (D | Promise<D>)),
    templates: T,
    private nodeRef: INodeRefBase,
    private componentEvents: ComponentNodeEvents<E>,
  ) {
    if(typeof data === 'function')
      this.scope = new ObservableScope<D>(data as () => D | Promise<D>);
    else
      this.scope = new ObservableScope<D>(() => data);

    this.templates = templates || ({} as T);
  }

  public Template(): NodeRefTypes | NodeRefTypes[] {
    return [];
  }

  public Bound() {}

  public Fire<P extends keyof E>(event: P, data?: E[P]) {
    var eventCallback = this.componentEvents && this.componentEvents[event];
    eventCallback && eventCallback(data);
  }

  public Destroy() {
    this.scope.Destroy();
    Destroy.All(this);
  }
}

export namespace Component {
  export function ToFunction<D = void, T = void, E = void>(
    type: string,
    constructor: ComponentConstructor<D, T, E>
  ): ComponentNodeFunction<D, T, E>;
  export function ToFunction<D = void, T = void, E = void>(
    type: string,
    namespace: string,
    constructor: ComponentConstructor<D, T, E>
  ): ComponentNodeFunction<D, T, E>;
  export function ToFunction<D = void, T = void, E = void>(
    type: string,
    namespace: string | ComponentConstructor<D, T, E>,
    constructor?: ComponentConstructor<D, T, E>
  ) {
    if(constructor === undefined) {
      constructor = namespace as ComponentConstructor<D, T, E>;
      namespace = undefined;
    }
    return ComponentNode.ToFunction<D, T, E>(type, namespace as string, constructor);
  }

  export function Register<D = void, T = void, E = void>(
    name: string,
    constructor: ComponentConstructor<D, T, E>,
  ) {
    const componentFunction = ToFunction(
      `${name}-component`,
      undefined,
      constructor,
    );

    class WebComponent extends HTMLElement {
      constructor() {
        super();

        const shadowRoot = this.attachShadow({ mode: "open" });
        const node = componentFunction({});
        Attach(shadowRoot, node);
      }
    }

    customElements.define(name, WebComponent);
  }

  export function Attach(node: Node, nodeRef: NodeRefTypes) {
    NodeRef.Init(nodeRef);
    var rootRef = NodeRef.Wrap(node);
    NodeRef.AddChild(rootRef, nodeRef);
  }
}

export type ComponentConstructor<D, T, E> = {
  new (
    data: { (): D | Promise<D> },
    templates: T,
    nodeRef: INodeRefBase,
    componentEvents: ComponentNodeEvents<E>,
  ): Component<D, T, E>;
};
