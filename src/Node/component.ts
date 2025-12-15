import { Destroy } from "../Utils/decorators";
import { ComponentEvents } from "./component.types";
import { ObservableScope } from "../Store/Tree/observableScope";
import { FunctionOr, vNode as vNodeType, vNodeDefinition } from "./vNode.types";
import { RecursivePartial } from "../Utils/utils.types";
import { vNode } from "./vNode";

/**
 * Base Component class.
 *
 * @template D - Data type for the component's scoped state.
 * @template T - Template type used by the component.
 * @template E - Event map type for component events.
 */
export class Component<D = void, T = void, E = {}> {
  private scope: ObservableScope<D>;
  private templates: T;

  /**
   * Returns the component's virtual node injector.
   */
  public get Injector() {
    return this.vNode.injector;
  }

  /**
   * Indicates whether the component has been destroyed.
   */
  public get Destroyed() {
    return this.vNode.destroyed;
  }

  /**
   * Internal scoped Observable for component state.
   */
  protected get Scope() {
    return this.scope;
  }

  /**
   * Current data value from the scoped Observable.
   */
  protected get Data() {
    return this.scope.Value;
  }

  /**
   * Accessor for the component's virtual node.
   */
  protected get VNode() {
    return this.vNode;
  }

  /**
   * Accessor for the component's template collection.
   */
  protected get Templates() {
    return this.templates;
  }

  /**
   * Creates a new Component instance. Not intended to be overriden.
   *
   * @param data - Initial data or a factory function returning data/promise.
   * @param templates - Template definitions for rendering.
   * @param vNode - The underlying virtual node instance.
   * @param componentEvents - Optional event callbacks.
   */
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

  /**
   * Returns the component's rendered vNode(s).
   * Override to provide custom rendering logic.
   *
   * @returns A vNode or array of vNodes representing the component UI.
   */
  public Template(): vNodeType | vNodeType[] {
    return [];
  }

  /**
   * Lifecycle hook called after the component has been bound to the DOM.
   * Override to perform post‑binding initialization.
   */
  public Bound() {}

  /**
   * Fires a component event.
   *
   * @param event - The event name to fire.
   * @param data - Optional payload for the event.
   */
  public Fire<P extends keyof E>(event: P, data?: E[P]) {
    var eventCallback =
      this.componentEvents && (this.componentEvents as any)[event];
    eventCallback && eventCallback(data);
  }

  /**
   * Destroys the component, cleaning up its scoped data and decorators.
   */
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
  
  /**
   * Attaches a virtual node to a real DOM node.
   *
   * @param node - The target DOM node to attach to.
   * @param vnode - The virtual node to be attached.
   * @returns The result of the attachment operation.
   */
  export function Attach(node: any, vnode: vNodeType) {
    return vNode.Attach(node, vnode);
  }
}
