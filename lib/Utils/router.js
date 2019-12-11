"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const scope_1 = require("../Store/scope/scope");
const window_1 = require("../DOM/window");
class Router {
    constructor(store) {
        this.store = store;
        this.initPromise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                this.routeScope = new scope_1.Scope(() => this.CreateRoutePart());
                yield Router.Register(this);
                this.routeScope.addListener("set", () => this.ReplaceHistory ? Router.ReplaceRoute() : Router.PushRoute());
                resolve();
            }
            catch (e) {
                reject(e);
            }
        }));
    }
    get State() {
        return this.store.Root.Value;
    }
    get ReplaceHistory() {
        return false;
    }
    get Init() {
        return this.initPromise;
    }
    Route() {
        return this.routeScope.Value;
    }
    JSON() {
        var state = this.State;
        return state.toJSON ? state.toJSON() : state;
    }
    SetState(state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.store.Merge(state);
        });
    }
    Destroy() {
        this.routeScope.Destroy();
        Router.Destroy(this);
    }
}
exports.Router = Router;
(function (Router) {
    var leadingSlash = /^\//;
    var routers = [];
    var updateScheduled = false;
    function PushRoute() {
        if (updateScheduled)
            return;
        updateScheduled = true;
        setTimeout(() => {
            var route = routers.map(r => r.Route()).join("/");
            route = "/" + route;
            var state = routers.map(r => r.JSON());
            if (route === window_1.wndw.location.pathname)
                window_1.wndw.history.replaceState(state, "", route);
            else
                window_1.wndw.history.pushState(state, "", route);
            updateScheduled = false;
        }, 250);
    }
    Router.PushRoute = PushRoute;
    var replaceScheduled = false;
    function ReplaceRoute() {
        if (replaceScheduled || updateScheduled)
            return;
        replaceScheduled = true;
        setTimeout(() => {
            replaceScheduled = false;
            if (updateScheduled)
                return;
            var route = routers.map(r => r.Route()).join("/");
            route = "/" + route;
            var state = routers.map(r => r.JSON());
            window_1.wndw.history.replaceState(state, "", route);
        }, 250);
    }
    Router.ReplaceRoute = ReplaceRoute;
    function Destroy(router) {
        var index = routers.indexOf(router);
        if (index >= 0) {
            routers.splice(index, 1);
            ReplaceRoute();
        }
    }
    Router.Destroy = Destroy;
    function Register(router) {
        return __awaiter(this, void 0, void 0, function* () {
            var index = routers.indexOf(router);
            if (index < 0) {
                var route = window_1.wndw.location.pathname.replace(leadingSlash, "");
                for (var x = 0; x < routers.length; x++) {
                    route = route.replace(routers[x].GetRoutePart(route), "");
                    route = route.replace(leadingSlash, "");
                }
                var routePart = router.GetRoutePart(route);
                if (routePart)
                    yield router.Read(routePart);
                routers.push(router);
                ReplaceRoute();
            }
        });
    }
    Router.Register = Register;
    window_1.wndw.onpopstate = function (e) {
        var state = e.state;
        for (var x = 0; x < state.length; x++) {
            if (x < routers.length)
                routers[x].SetState(state[x]);
        }
    };
})(Router = exports.Router || (exports.Router = {}));
//# sourceMappingURL=router.js.map