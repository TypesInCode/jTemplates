import { Binding } from "./binding";
import { BindingDefinitions, Template, BindingDefinition } from "../template";

function CreateTemplate(bindingDef: BindingDefinition<any, any>): Template<any, any> {
    var constructor = (bindingDef.class || Template) as { new(bindingDef: BindingDefinition<any, any>): Template<any, any> };
    var template = new constructor(bindingDef);
    return template;
}

class DataBinding extends Binding<{(c: any, i: number): BindingDefinitions}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions;
    activeTemplates: Array<Array<Template<any, any>>>;

    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions) {
        super(boundTo, bindingFunction, childrenFunction);
    }

    public Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplates);
        this.activeTemplates = [];
    }

    protected Init(childrenFunction: {(c: any, i: number): BindingDefinitions}) {
        this.activeTemplates = [];
        this.childrenFunction = childrenFunction;
    }

    protected Apply() {
        this.activeTemplates = this.activeTemplates || [];
        var value = this.Value as Array<any>;
        if(!value)
            value = [];
        else if(!Array.isArray(value))
            value = [value];

        if(this.activeTemplates.length < value.length) {
            for(var x=this.activeTemplates.length; x<value.length; x++) {
                var childDef = this.childrenFunction(value[x], x) as Array<any>;
                if(!Array.isArray(childDef))
                    childDef = [childDef];

                var templates = childDef.filter(c => c).map(c => CreateTemplate(c)); //new Template(c));
                this.activeTemplates[x] = templates;
                templates.forEach(t => t.AttachTo(this.BoundTo));
            }
        }
        else {
            var destroyedTemplates = this.activeTemplates.splice(value.length);
            this.DestroyTemplates(destroyedTemplates);
        }
    }

    private DestroyTemplates(templates: Array<Array<Template<any, any>>>) {
        for(var x=0; x<templates.length; x++)
            for(var y=0; y<templates[x].length; y++)
                templates[x][y].Destroy();
    }
}

export default DataBinding;