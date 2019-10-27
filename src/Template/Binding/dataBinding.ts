import { Binding } from "./binding";
import { Template } from "../template";
import { BindingConfig } from "./bindingConfig";
import { FunctionOr, ChildrenOr, BindingDefinitions } from "../template.types";
import { Injector } from "../../injector";
import { NodeRef } from "../nodeRef";

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

    protected get SynchInit() {
        return true;
    }

    constructor(boundTo: NodeRef, bindingFunction: FunctionOr<any>, childrenFunction: ChildrenOr<any>, keyFunction: (val: any) => any) {
        super(boundTo, bindingFunction, { children: childrenFunction, key: keyFunction });
    }

    public Destroy() {
        super.Destroy();
        this.DestroyTemplates(this.activeTemplateMap);
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
        // var container = BindingConfig.createContainer();
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
        var newNodeRefs: Array<NodeRef> = [];
        var newTemplates: Array<Template<any, any>> = [];
        newTemplateMap.forEach((templates, key) => {
            if(!templates) {
                var newDefs = this.childrenFunction(value[index].value, index) as Array<any>;
                if(!Array.isArray(newDefs))
                    newDefs = [newDefs];
                
                Injector.Scope(this.Injector, () => {
                    templates = newDefs.map(d => Template.Create(d, !this.IsStatic));
                });
                newTemplateMap.set(key, templates);
            }

            if(index < (currentRowCount - this.activeTemplateMap.size)) {
                templates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            }
            else
                templates.forEach(t => {
                    // t.AttachToContainer(container);
                    newTemplates.push(t);
                    newNodeRefs.push(t.Root);
                    // previousTemplate = t;
                });

            /* if(index >= currentRowCount) {
                templates.forEach(t => {
                    // t.AttachToContainer(container);
                    // newNodeRefs.push(t.Root);
                    newTemplates.push(t);
                    previousTemplate = t;
                });
            }
            else {
                templates.forEach(t => {
                    t.AttachAfter(this.BoundTo, previousTemplate);
                    previousTemplate = t;
                });
            } */
            index++;
        });

        this.activeTemplateMap = newTemplateMap;
        this.BoundTo.AddChildren(newNodeRefs);

        for(var x=0; x<newTemplates.length; x++)
            newTemplates[x].BindTemplate();
        // BindingConfig.addChildContainer(this.BoundTo, container);
    }

    private DestroyTemplates(templateMap: Map<any, Array<Template<any, any>>>) {
        templateMap.forEach(templates => templates.forEach(t => t.Destroy()));
    }
}

export default DataBinding;