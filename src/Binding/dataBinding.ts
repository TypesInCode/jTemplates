import { Binding } from "./binding";
import { BindingDefinitions, Template } from "../template";
import { BindingConfig } from "./bindingConfig";
import { PromiseOr } from "../template.types";

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

    constructor(boundTo: Node, bindingFunction: PromiseOr<any>, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, [], { children: childrenFunction, key: keyFunction });
    }

    public Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
        this.activeTemplateMap = null;
    }

    protected OverrideBinding(bindingFunction: PromiseOr<any>, config: { key: (val: any) => any }) {
        var localBinding = null;
        if(typeof bindingFunction === 'function') {
            localBinding = async () => {
                var value = await bindingFunction();
                var array = ConvertToArray(value);
                return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr) || index
                    };
                });
            }
        }
        else
            localBinding = () => {
                var array = ConvertToArray(bindingFunction);
                return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr) || index
                    };
                });
            };

        return localBinding;
    }

    protected Init(config: { children: {(c: any, i: number): BindingDefinitions<any, any>}, key: (val: any) => any }) {
        this.activeTemplateMap = new Map();
        this.activeKeys = [];
        this.childrenFunction = config.children;
        // this.keyFunction = config.key;
        /* this.dataObservableScope = new Scope(() => {
            var value = ConvertToArray(this.Value);
            return value.map((curr, index) => {
                return {
                    value: curr,
                    key: this.keyFunction && this.keyFunction(curr) || index
                };
            });
        }, []); */
    }

    protected Apply() {
        var value = this.Value;
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