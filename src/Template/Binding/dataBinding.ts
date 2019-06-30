import { Binding } from "./binding";
import { Template } from "../template";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr, ChildrenOr, BindingDefinitions } from "../template.types";
import { Injector } from "../../injector";

function ConvertToArray(val: any): Array<any> {
    if(!val)
        return [];

    if(!Array.isArray(val))
        return [val];

    return val;
}

class DataBinding extends Binding<{ children: ChildrenOr<any>, key: {(val: any): any} }> {
    childrenFunction: (c: any, i: number) => BindingDefinitions<any, any>;
    activeTemplateMap: Map<any, Array<Template<any, any>>>;
    // activeKeys: Array<any>;
    keyFunction: (val: any) => any;
    injector: Injector;

    constructor(boundTo: Node, bindingFunction: FunctionOr<any>, childrenFunction: ChildrenOr<any>, keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
        this.injector = Injector.Current();
    }

    public Destroy(parentDestroyed = false) {
        super.Destroy(parentDestroyed);
        this.DestroyTemplates(this.activeTemplateMap, parentDestroyed);
        this.activeTemplateMap = null;
    }

    protected OverrideBinding(bindingFunction: FunctionOr<any>, config: { key: (val: any) => any }) {
        var binding = null;
        if(typeof bindingFunction === 'function') {
            binding = () => {
                var value = bindingFunction();
                var array = ConvertToArray(value);
                var ret = array.map((val, index) => ({
                    value: val, 
                    key: config.key && config.key(val)
                }));
                
                return ret;
            };
        }
        else if(config.key) {
            binding = () => ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: config.key && config.key(curr)
                }
            });
        }
        else {
            binding = ConvertToArray(bindingFunction).map((curr, index) => {
                return {
                    value: curr,
                    key: config.key && config.key(curr)
                }
            });
        }

        return binding;
    }

    protected Init(config: { children: ChildrenOr<any>, key: (val: any) => any }) {
        this.activeTemplateMap = new Map();
        this.keyFunction = config.key;

        var children = config.children;
        if(typeof children !== 'function')
            children = () => config.children as BindingDefinitions<any, any>;

        this.childrenFunction = children;
    }

    protected Apply() {
        var value = this.Value; //ConvertToArray(this.Value);
        var newTemplateMap = new Map() as Map<any, Array<Template<any, any>>>;
        // var newKeys = [];
        var currentRowCount = this.activeTemplateMap.size;
        var container = BindingConfig.createContainer();
        // var previousTemplate = null as Template<any, any>;

        for(var x=0; x<value.length; x++) {
            var newKey = value[x].key || x; //this.keyFunction && this.keyFunction(value[x]) || x;
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
                
                Injector.Scope(this.injector, () => {
                    templates = newDefs.map(d => Template.Create(d, !this.IsStatic));
                });
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