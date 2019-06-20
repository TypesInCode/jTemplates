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
    // activeKeys: Array<any>;
    keyFunction: (val: any) => any;

    constructor(boundTo: Node, bindingFunction: PromiseOr<any>, childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>, keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, [], { children: childrenFunction, key: keyFunction });
    }

    public Destroy(parentDestroyed = false) {
        super.Destroy(parentDestroyed);
        this.DestroyTemplates(this.activeTemplateMap, parentDestroyed);
        this.activeTemplateMap = null;
    }

    protected OverrideBinding(bindingFunction: PromiseOr<any>, config: { key: (val: any) => any }) {
        var localBinding = null;
        if(typeof bindingFunction === 'function') {
            localBinding = () => {
                var value = bindingFunction();
                var array = ConvertToArray(value);
                var ret = new Array(array.length);
                for(var x=0; x<ret.length; x++)
                    ret[x] = { value: array[x], key: config.key && config.key(array[x]) };

                return ret;
                /* return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr) || time++
                    };
                }); */
            }
        }
        else
            localBinding = () => {
                var array = ConvertToArray(bindingFunction);
                return array.map((curr, index) => {
                    return {
                        value: curr,
                        key: config.key && config.key(curr)
                    };
                });
            };

        return localBinding;
    }

    protected Init(config: { children: {(c: any, i: number): BindingDefinitions<any, any>}, key: (val: any) => any }) {
        this.activeTemplateMap = new Map();
        // this.activeKeys = [];
        this.childrenFunction = config.children;
    }

    protected Apply() {
        var value = this.Value;
        var newTemplateMap = new Map() as Map<any, Array<Template<any, any>>>;
        // var newKeys = [];
        var currentRowCount = this.activeTemplateMap.size;
        var container = BindingConfig.createContainer();
        // var previousTemplate = null as Template<any, any>;

        for(var x=0; x<value.length; x++) {
            var newKey = value[x].key || x;
            // newKeys.push(newKey);
            newTemplateMap.set(newKey, this.activeTemplateMap.get(newKey));
            this.activeTemplateMap.delete(newKey);
        }

        this.DestroyTemplates(this.activeTemplateMap);
        var previousTemplate = null as Template<any, any>;
        var index = 0;
        newTemplateMap.forEach((templates, key) => {
            if(!templates) {
                var newDefs = this.childrenFunction(value[index].value, index) as Array<any>;
                if(!Array.isArray(newDefs))
                    newDefs = [newDefs];
                
                templates = newDefs.map(d => Template.Create(d));
                newTemplateMap.set(key, templates);
            }

            if(index >= currentRowCount) {
                templates.forEach(t => {
                    t.AttachToContainer(container);
                    previousTemplate = t;
                });
            }
            else {
                templates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            }
            index++;
        });

        this.activeTemplateMap = newTemplateMap;
        BindingConfig.addChildContainer(this.BoundTo, container);
    }

    private DestroyTemplates(templateMap: Map<any, Array<Template<any, any>>>, parentDestroyed = false) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy(parentDestroyed)));
    }
}

export default DataBinding;