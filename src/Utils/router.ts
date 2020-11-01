import { ObservableScope, IObservableScope } from "../Store/Tree/observableScope";
import { wndw } from "../DOM/window";
import { Store } from "../Store";

export abstract class Router<T extends {}> {

    private routeScope: IObservableScope<string>;
    private initPromise: Promise<void>;

    protected get State() {
        return this.store.Root.Value;
    }

    protected get ReplaceHistory() {
        return false;
    }

    public get Init() {
        return this.initPromise;
    }

    constructor(private store: Store<T>) {
        this.initPromise = new Promise(async (resolve, reject) => {
            try{
                // this.routeScope = new ObservableScope(() => this.CreateRoutePart());
                this.routeScope = ObservableScope.Create(() => this.CreateRoutePart());
                await Router.Register(this);
                // this.routeScope.Watch(() => this.ReplaceHistory ? Router.ReplaceRoute() : Router.PushRoute());
                ObservableScope.Watch(this.routeScope, () => this.ReplaceHistory ? Router.ReplaceRoute() : Router.PushRoute());
                resolve();
            }
            catch(e) {
                reject(e);
            }
        })
    }

    protected abstract CreateRoutePart(): string;

    public abstract GetRoutePart(route: string): string;

    public async abstract Read(routePart: string): Promise<void>;

    public Route() {
        // return this.routeScope.Value;
        return ObservableScope.Value(this.routeScope);
    }

    public JSON() {
        var state = this.State;
        return (state as any).toJSON ? (state as any).toJSON() : state;
    }

    public async SetState(state: Partial<T>) {
        await this.store.Merge(state);
    }

    public Destroy() {
        this.routeScope.Destroy();
        Router.Destroy(this);
    }

}

export namespace Router {

    var leadingSlash = /^\//;

    var routers = [] as Array<Router<any>>;
    
    var updateScheduled = false;
    export function PushRoute() {
        if(updateScheduled)
            return;

        updateScheduled = true;
        setTimeout(() => {
            var route = routers.map(r => r.Route()).filter(r => r).join("/");
            route = "/" + route;
            var state = routers.map(r => r.JSON());

            if(route === wndw.location.pathname)
                wndw.history.replaceState(state, "", route);
            else
                wndw.history.pushState(state, "", route);

            updateScheduled = false;
        }, 250);
    }

    var replaceScheduled = false;
    export function ReplaceRoute() {
        if(replaceScheduled || updateScheduled)
            return;

        replaceScheduled = true;
        setTimeout(() => {
            replaceScheduled = false;
            if(updateScheduled)
                return;

            var route = routers.map(r => r.Route()).filter(r => r).join("/");
            route = "/" + route;        
            var state = routers.map(r => r.JSON());
            wndw.history.replaceState(state, "", route);
        }, 250);
    }

    export function Destroy(router: Router<any>) {
        var index = routers.indexOf(router);
        if(index >= 0) {
            routers.splice(index, 1);
            ReplaceRoute();
        }
    }

    export async function Register(router: Router<any>) {
        var index = routers.indexOf(router);
        if(index < 0) {
            var route = wndw.location.pathname.replace(leadingSlash, "");
            for(var x=0; x<routers.length; x++) {
                route = route.replace(routers[x].GetRoutePart(route), "");
                route = route.replace(leadingSlash, "");
            }
            
            var routePart = router.GetRoutePart(route);
            if(routePart)
                await router.Read(routePart);
            
            routers.push(router);
            ReplaceRoute();
        }
    }

    wndw.onpopstate = function(e: PopStateEvent) {
        var state = e.state as Array<any>;
        for(var x=0; x<state.length; x++) {
            if(x < routers.length)
                routers[x].SetState(state[x]);
        }
    }
}