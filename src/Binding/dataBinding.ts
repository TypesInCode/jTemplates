import { Binding } from "./binding";
import { BindingDefinitions, Template, BindingDefinition } from "../template";

function CreateTemplate(bindingDef: BindingDefinition<any, any>): Template<any, any> {
    var constructor = (bindingDef.class || Template) as { new(bindingDef: BindingDefinition<any, any>): Template<any, any> };
    var template = new constructor(bindingDef);
    return template;
}

class DataBinding extends Binding<{(c: any, i: number): BindingDefinitions<any, any>}> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplates: Array<Array<Template<any, any>>>;
    activeKeys: Array<any>;

    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, private rebind: boolean, private keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, childrenFunction);
    }

    public Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplates);
        this.activeTemplates = [];
    }

    protected Init(childrenFunction: {(c: any, i: number): BindingDefinitions<any, any>}) {
        this.activeTemplates = [];
        this.activeKeys = [];
        this.childrenFunction = childrenFunction;
    }

    protected Apply() {
        if(this.rebind) {
            this.DestroyTemplates(this.activeTemplates);
            this.activeTemplates = [];
        }
        var value = this.Value as Array<any>;
        if(!value)
            value = [];
        else if(!Array.isArray(value))
            value = [value];

        for(var x=0; x<this.activeKeys.length && value.length; x++) {
            var newKey = this.keyFunction && this.keyFunction(value[x]) || value[x];
            if(newKey !== this.activeKeys[x]) {
                this.activeTemplates[x].forEach(t => t.Destroy());
                var childDef = this.childrenFunction(value[x], x) as Array<any>;
                if(!Array.isArray(childDef))
                    childDef = [childDef];
                
                var templates = childDef.filter(c => c).map(c => CreateTemplate(c)); //new Template(c));
                this.activeTemplates[x] = templates;
                var nextTemplate = this.activeTemplates[x+1] && this.activeTemplates[x+1][0];
                templates.forEach(t => t.AttachBefore(this.BoundTo, nextTemplate));
                this.activeKeys[x] = newKey;
            }
        }

        if(this.activeTemplates.length < value.length) {
            for(var x=this.activeTemplates.length; x<value.length; x++) {
                this.activeKeys[x] = this.keyFunction && this.keyFunction(value[x]) || value[x];
                var childDef = this.childrenFunction(value[x], x) as Array<any>;
                if(!Array.isArray(childDef))
                    childDef = [childDef];

                var templates = childDef.filter(c => c).map(c => CreateTemplate(c)); //new Template(c));
                this.activeTemplates[x] = templates;
                templates.forEach(t => t.AttachTo(this.BoundTo));
            }
        }
        else {
            this.activeKeys.splice(value.length);
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