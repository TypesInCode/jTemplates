import { Store } from "../store";
export declare abstract class Router<T extends {}> {
    private store;
    private routeScope;
    private initPromise;
    protected readonly State: T;
    protected readonly ReplaceHistory: boolean;
    readonly Init: Promise<void>;
    constructor(store: Store<T>);
    protected abstract CreateRoutePart(): string;
    abstract GetRoutePart(route: string): string;
    abstract Read(routePart: string): Promise<void>;
    Route(): string;
    JSON(): any;
    SetState(state: Partial<T>): Promise<void>;
    Destroy(): void;
}
export declare namespace Router {
    function PushRoute(): void;
    function ReplaceRoute(): void;
    function Destroy(router: Router<any>): void;
    function Register(router: Router<any>): Promise<void>;
}
