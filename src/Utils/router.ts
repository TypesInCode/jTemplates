import { Scope } from "../Store/scope/scope";
import { wndw } from "../DOM/window";
import { StoreBase } from "..";

export abstract class Router<T extends {}> {

    private routeScope: Scope<string>;

    protected get State() {
        return this.store.Root.Value;
    }

    protected get ReplaceHistory() {
        return false;
    }

    constructor(private store: StoreBase<T>) {
        this.routeScope = new Scope(() => this.CreateRoutePart());
        
        Router.Register(this).then(() => {
            this.routeScope.addListener("set", () => this.ReplaceHistory ? Router.ReplaceRoute() : Router.PushRoute());
        });
    }

    protected abstract CreateRoutePart(): string;

    public abstract GetRoutePart(route: string): string;

    public async abstract Read(routePart: string): Promise<void>;

    public Route() {
        return this.routeScope.Value;
    }

    public JSON() {
        return (this.State as any).toJSON();
    }

    public async SetState(state: Partial<T>) {
        await this.store.Merge(state);
    }

    public Destroy() {
        this.routeScope.Destroy();
        this.store.Destroy();
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
        // do history API calls

        updateScheduled = true;
        setTimeout(() => {
            var route = routers.map(r => r.Route()).join("/");
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

            var route = routers.map(r => r.Route()).join("/");
            route = "/" + route;        
            var state = routers.map(r => r.JSON());
            wndw.history.replaceState(state, "", route);
        }, 250);
    }

    export function Destroy(router: Router<any>) {
        var index = routers.indexOf(router);
        if(index >= 0) {
            routers.splice(index, 1);
            PushRoute();
        }
    }

    /* async function ReadRoute() {
        var route = wndw.location.pathname;
        for(var x=0; x<routers.length; x++) {
            route = await routers[x].ReadRoute(route.replace(leadingSlash, ""));
        }
    } */

    export async function Register(router: Router<any>) {
        var index = routers.indexOf(router);
        if(index < 0) {
            /* routers.push(router);
            await ReadRoute(); */
            var route = wndw.location.pathname.replace(leadingSlash, "");
            for(var x=0; x<routers.length; x++) {
                route = route.replace(routers[x].GetRoutePart(route), "");
                route = route.replace(leadingSlash, "");
            }
            
            var routePart = router.GetRoutePart(route);
            router.Read(routePart);
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