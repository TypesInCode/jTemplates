import { IChannel, IConnectMessage } from "./diffTree.types";

type ConnectHandler = (port: MessagePort) => (() => void) | void;

interface IConnections {
  /** The current port to each source */
  ports: Map<string, MessagePort>;
  handlers: Map<string, ConnectHandler>;
  /** What each source's handler returned for its current port */
  cleanups: Map<string, () => void>;
}

const registries = new WeakMap<IChannel, IConnections>();

/**
 * Handles a consumer worker's ports to a source, given by a `WorkerHub` (`hub.Connect(consumer,
 * source)`). The handler runs for each port: when the worker starts, and again when the source
 * restarts. Before it runs for a new port, the cleanup it returned for the last one runs and that
 * port is closed. A port that arrives before the handler is registered is kept for it, once the
 * worker listens: `HostPublisher` starts listening, and so does the first `OnConnect`.
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
 */
export function OnConnect(source: string, handler: ConnectHandler, scope: IChannel = globalThis as any): () => void {
  const connections = Connections(scope);
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
      const message = event.data as IConnectMessage;
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

function Run(connections: IConnections, source: string, port: MessagePort) {
  const cleanup = connections.handlers.get(source)!(port);
  cleanup && connections.cleanups.set(source, cleanup);
}
