import NodeBinding from "./nodeBinding";
import Component from "../Component/component";
import { BindingTemplate } from "../bindingTemplate";
import { ComponentDefinition, TemplateDefinitionMap } from "../elements";

/* function CreateBindingFunction(binding: any, component: ComponentDefinition<any>): () => { value: {(): any}, component: {(): { new (): Component<any> }} } {
    var bindingFunc = binding;
    if(typeof bindingFunc != 'function')
        bindingFunc = () => binding;

    var componentFunc = component;
    if(typeof componentFunc != 'function' || componentFunc.prototype instanceof Component)
        componentFunc = () => component as { new (): Component<any> };

    return () => {
        var b = bindingFunc();
        var c = (componentFunc as any)();
        return {
            value: b && b.valueOf(),
            component: c && c.valueOf()
        };
    };
} */

function EnsureFunction(value: any) {
    if(typeof value == 'function')
        return value;

    return () => value;
}

class ComponentBinding extends NodeBinding {
    private componentType: { new(): Component<any> };
    private component: Component<any>;
    private parentTemplates: TemplateDefinitionMap;

    constructor(element: Node, binding: any, compType: { new(): Component<any> }, parentTemplates: TemplateDefinitionMap) {
        //binding = binding && binding.valueOf();
        //compType = compType && (compType as any).valueOf();
        //var newBinding = CreateBindingFunction(binding, compType);
        super(element, binding);

        this.componentType = compType;
        this.parentTemplates = {};
        for(var key in parentTemplates)
            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);
    }

    public Destroy() {
        this.component.Destroy();
        super.Destroy();
    }

    protected Apply() {
        /* var component = this.Value.component;
        var value = this.Value.value;

        if(!component) {
            this.component.Destroy();
            return;
        } */

        if(!this.component) {
            //this.component && this.component.Destroy();
            this.component = new this.componentType();
            this.component.SetParentTemplates(this.parentTemplates);
            this.component.SetParentData(this.Value);
            this.component.AttachTo(this.BoundTo);
        }
        else
            this.component.SetParentData(this.Value);

        /* if(!this.component.Attached)
            this.component.AttachTo(this.BoundTo); */
    }
}

export default ComponentBinding;