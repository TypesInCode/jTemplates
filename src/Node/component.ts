import { Destroy } from "../Utils/decorators";
import { ComponentEvents } from "./component.types";
import { ObservableScope } from "../Store/Tree/observableScope";
import { FunctionOr, vNode as vNodeType, vNodeDefinition } from "./vNode.types";
import { RecursivePartial } from "../Utils/utils.types";
import { vNode } from "./vNode";

export class Component<D = void, T = void, E = {}> {
  private scope: ObservableScope<D>;
  private templates: T;

  public get Injector() {
    return this.vNode.injector;
  }

  public get Destroyed() {
    return this.vNode.destroyed;
  }

  protected get Scope() {
    return this.scope;
  }

  protected get Data() {
    return this.scope.Value;
  }

  protected get VNode() {
    return this.vNode;
  }

  protected get Templates() {
    return this.templates;
  }

  constructor(
    data: D | (() => D | Promise<D>),
    templates: T,
    private vNode: vNodeType,
    private componentEvents: ComponentEvents<E>,
  ) {
    if (typeof data === "function")
      this.scope = new ObservableScope<D>(data as () => D | Promise<D>);
    else this.scope = new ObservableScope<D>(() => data);

    this.templates = templates || ({} as T);
  }

  public Template(): vNodeType | vNodeType[] {
    return [];
  }

  public Bound() {}

  public Fire<P extends keyof E>(event: P, data?: E[P]) {
    var eventCallback =
      this.componentEvents && (this.componentEvents as any)[event];
    eventCallback && eventCallback(data);
  }

  public Destroy() {
    this.scope.Destroy();
    Destroy.All(this);
  }
}

type vComponentConfig<D, E, P = HTMLElement> = {
  data?: () => D | undefined;
  props?: FunctionOr<RecursivePartial<P>> | undefined;
  on?: ComponentEvents<E> | undefined;
};

type ComponentConstructor<D, T, E> = {
  new (
    data: D | (() => D | Promise<D>),
    templates: T,
    vNode: vNodeType,
    componentEvents: ComponentEvents<E>,
  ): Component<D, T, E>;
};

export namespace Component {
  /**
   * Function wraps the Component as a function that can be used to create vNode objects
   * and generate templates.
   */
  export function ToFunction<D, T, E, P = HTMLElement>(
    type: string,
    constructor: ComponentConstructor<D, T, E>,
    namespace?: string,
  ) {
    return function (
      config: vComponentConfig<D, E, P>,
      templates?: T,
    ): vNodeType {
      const { data, on, props } = config;

      class ConcreteComponent extends constructor {
        constructor(vnode: vNodeType) {
          super(data, templates, vnode, on);
        }
      }

      const definition: vNodeDefinition<P, any, never> = {
        type,
        namespace: namespace ?? null,
        props,
        componentConstructor: ConcreteComponent,
      };

      return vNode.Create(definition);
    };
  }

  /**
   * Function registers the Component as a WebComponent as the provided name. 
   */
  export function Register<D = void, T = void, E = void>(
    name: string,
    constructor: ComponentConstructor<D, T, E>,
  ) {
    const componentFunction = ToFunction(
      `${name}-component`,
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
  
  export function Attach(node: any, vnode: vNodeType) {
    return vNode.Attach(node, vnode);
  }
}
