import { IChannel, IConnectMessage, ISourcesMessage } from "./diffTree.types";

type ConnectHandler = (port: MessagePort) => (() => void) | void;

interface IConnections {
  /** The current port to each source */
  ports: Map<string, MessagePort>;
  handlers: Map<string, ConnectHandler>;
  /** What each source's handler returned for its current port */
  cleanups: Map<string, () => void>;
  /** The sources the hub says this worker reads from; unknown until `jt-sources` arrives */
  declared?: ReadonlySet<string>;
}

const registries = new WeakMap<IChannel, IConnections>();

/**
 * Handles a worker's ports to a source it reads from, given by a `DiffTreeHub` (`Register(name,
 * factory, { sources })`). The handler runs for each port: when the worker starts, and again when the source
 * restarts. Before it runs for a new port, the cleanup it returned for the last one runs and that
 * port is closed. A port that arrives before the handler is registered is kept for it, once the
 * worker listens: `HostPublisher` starts listening, and so does the first `OnConnect`.
 *
 * The source must be one the worker was registered with (`sources`). The hub tells the worker its
 * sources when it starts: `OnConnect` for another source throws then, or, when it was called
 * before they arrived (while the worker's module first runs), throws as the worker's uncaught
 * error when they do, which the main thread sees as the `Worker`'s `error` event.
 *
 * @example
 * // trace worker
 * OnConnect("engine", port => {
 *   tree.DeleteRoute("/engine/");
 *   return Subscribe(port, { roots: ["index"], form: "snapshot" }, update => { ... });
 * });
 * @param source The source worker's registered name.
 * @param handler Subscribes over the port; may return a function that ends what it started.
 * @param scope The worker's own channel; `self` when omitted.
 * @returns A function that runs the current cleanup and removes the handler.
 * @throws When the hub has told the worker its sources, and `source` isn't one.
 */
export function OnConnect(source: string, handler: ConnectHandler, scope: IChannel = globalThis as any): () => void {
  const connections = Connections(scope);
  if (connections.declared && !connections.declared.has(source))
    throw UndeclaredError([source], connections.declared);

  connections.cleanups.get(source)?.();
  connections.cleanups.delete(source);
  connections.handlers.set(source, handler);
  const port = connections.ports.get(source);
  port && Run(connections, source, port);

  return () => {
    if (connections.handlers.get(source) !== handler)
      return;

    connections.cleanups.get(source)?.();
    connections.cleanups.delete(source);
    connections.handlers.delete(source);
  };
}

/**
 * Starts keeping the `jt-connect` ports that arrive on a worker's channel, so a port that arrives
 * before its `OnConnect` handler is registered is kept for it. `HostPublisher` calls it.
 */
export function ListenForConnections(scope: IChannel) {
  Connections(scope);
}

function Connections(scope: IChannel) {
  let connections = registries.get(scope);
  if (!connections) {
    const created: IConnections = connections = { ports: new Map(), handlers: new Map(), cleanups: new Map() };
    registries.set(scope, created);
    scope.addEventListener("message", (event: MessageEvent) => {
      const message = event.data as IConnectMessage | ISourcesMessage;
      if (message?.type === "jt-sources") {
        const declared = created.declared = new Set(message.sources);
        const undeclared = Array.from(created.handlers.keys()).filter(source => !declared.has(source));
        if (undeclared.length > 0)
          throw UndeclaredError(undeclared, declared);

        return;
      }

      if (message?.type !== "jt-connect")
        return;

      const { source, port } = message;
      created.cleanups.get(source)?.();
      created.cleanups.delete(source);
      created.ports.get(source)?.close();
      created.ports.set(source, port);
      created.handlers.has(source) && Run(created, source, port);
    });
  }

  return connections;
}

function UndeclaredError(sources: string[], declared: ReadonlySet<string>) {
  const list = declared.size > 0 ? Array.from(declared).join(", ") : "none";
  return new Error(`OnConnect: ${sources.join(", ")} isn't a source this worker was registered with (sources: ${list}); add it to the worker's sources in DiffTreeHub.Register.`);
}

function Run(connections: IConnections, source: string, port: MessagePort) {
  const cleanup = connections.handlers.get(source)!(port);
  cleanup && connections.cleanups.set(source, cleanup);
}
