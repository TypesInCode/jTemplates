import Binding from "../../binding";
import Bindings from "../Binding/bindings";
import Template from "../template";
import ComponentBase from "./componentBase";

abstract class Component extends ComponentBase {
    public static get Name(): string {
        return null;
    }

    private parentData: {};

    public abstract get Template(): string;

    constructor() {
        super();
        this.SetTemplate(this.Template);
    }

    public SetParentData(data: {}) {
        this.parentData = data;
    }

    protected BindingParameters(): {[name: string]: any} {
        var params = super.BindingParameters();
        params["$parent"] = this.parentData;
        return params;
    }

    public static toString(): string {
        Component.Register(this);
        return (this as typeof Component).Name;
    }
}

namespace Component {
    var componentMap: { [name: string]: { new (): Component } } = {};

    export function Register(constructor: typeof Component) {
        var name = constructor.Name.toLowerCase();
        var comp = componentMap[name];
        if(!comp)
            componentMap[name] = constructor as any as { new(): Component };
    }

    export function Get(name: string) {
        var comp = componentMap[name.toLowerCase()];
        return comp;
    }

    export function Exists(name: string) {
        return !!Get(name);
    }
}

export default Component;