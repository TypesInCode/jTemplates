import Template from "../template";
import ComponentBase from "./componentBase";

class ComponentSimple extends ComponentBase {
    private data: any;
    private parameterOverrides: { [name: string]: any };

    public get Data(): any {
        return this.data;
    }

    constructor(template: string | Node | Template, data: any, parameterOverrides: { [name: string]: any }) {
        super();
        this.data = data;
        this.parameterOverrides = parameterOverrides;
        this.SetTemplate(template);
    }

    protected BindingParameters(): {} {
        var params = super.BindingParameters();
        params["$data"] = this.Data;
        for(var key in this.parameterOverrides)
            params[key] = this.parameterOverrides[key];
        
        return params;
    }
}

export default ComponentSimple;