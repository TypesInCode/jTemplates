import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
import { BindingConfig } from "./bindingConfig";

function ConvertToArray(val: any): Array<any> {
    if(!val)
        return [];

    if(!Array.isArray(val))
        return [val];

    return val;
}

class DataBinding extends Binding<{ children: {(c: any, i: number): BindingDefinitions<any, any>}, key: (val: any) => any }> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    activeKeys: Array<any>;
    keyFunction: (val: any) => any;

    constructor(boundTo: Node, bindingFunction: () => any, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, keyFunction: (val: any) => any) {
        var bindingWrapper = null;
        if(typeof bindingFunction === 'function')
            bindingWrapper = () => {
                var value = bindingFunction() as Array<any>;
                value = ConvertToArray(value);

                return value.map((curr, index) => {
                    return {
                        value: curr,
                        key: keyFunction && keyFunction(curr) || index
                    };
                });
            };
        else {
            bindingWrapper = ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: keyFunction && keyFunction(curr) || index
                };
            });
        }
            

        super(boundTo, bindingWrapper, { children: childrenFunction, key: keyFunction });
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
        var value = this.Value as Array<{ value: any, key: any }>;
        /* if(!value)
            value = [];
        else if(!Array.isArray(value))
            value = [value]; */

        var newTemplateMap = new Map();
        var newKeys = [];
        var container = BindingConfig.createContainer();
        var previousTemplate = null as Template<any, any>;
        for(var x=0; x<value.length; x++) {
            var newKey = value[x].key; // this.keyFunction && this.keyFunction(value[x]) || x;
            newKeys.push(newKey);

            var newTemplates = this.activeTemplateMap.get(newKey);
            if(!newTemplates) {
                var newDefs = this.childrenFunction(value[x].value, x) as Array<any>;
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