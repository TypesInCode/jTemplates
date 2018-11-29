import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
import { BindingConfig } from "./bindingConfig";

class DataBinding extends Binding<{ children: {(c: any, i: number): BindingDefinitions<any, any>}, key: (val: any) => any }> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    activeKeys: Array<any>;
    keyFunction: (val: any) => any;

    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
    }

    public Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }

    protected Init(config: { children: {(c: any, i: number): BindingDefinitions<any, any>}, key: (val: any) => any }) {
        this.activeTemplateMap = new Map();
        this.activeKeys = [];
        this.childrenFunction = config.children;
        this.keyFunction = config.key;
    }

    protected Apply() {
        var value = this.Value as Array<any>;
        if(!value)
            value = [];
        else if(!Array.isArray(value))
            value = [value];

        var newTemplateMap = new Map();
        var newKeys = [];
        var container = BindingConfig.createContainer();
        var previousTemplate = null as Template<any, any>;
        for(var x=0; x<value.length; x++) {
            var newKey = this.keyFunction && this.keyFunction(value[x]) || x;
            newKeys.push(newKey);

            var newTemplates = this.activeTemplateMap.get(newKey);
            if(!newTemplates) {
                var newDefs = this.childrenFunction(value[x], x) as Array<any>;
                if(!Array.isArray(newDefs))
                    newDefs = [newDefs];
                
                newTemplates = newDefs.map(d => Template.Create(d));
            }

            newTemplateMap.set(newKey, newTemplates);
            this.activeTemplateMap.delete(newKey);

            if(x >= this.activeKeys.length)
                newTemplates.forEach(t => {
                    t.AttachToContainer(container);
                    previousTemplate = t;
                });
            else if(newKey !== this.activeKeys[x])
                newTemplates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            else
                previousTemplate = newTemplates[newTemplates.length - 1] || previousTemplate;
        }

        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = newTemplateMap;
        this.activeKeys = newKeys;
        BindingConfig.addChildContainer(this.BoundTo, container);
    }

    private DestroyTemplates(templateMap: Map<any, Array<Template<any, any>>>) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
    }
}

export default DataBinding;