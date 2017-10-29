import NodeBinding from "./nodeBinding";
import Component from "../Component/component";
import { IBindingTemplate, BindingTemplate } from "../bindingTemplate";

function CreateBindingFunction(binding: any, component: { (): { new (): Component } } | { new (): Component }): () => { value: {(): any}, component: {(): { new (): Component }} } {
    var bindingFunc = binding;
    if(typeof bindingFunc != 'function')
        bindingFunc = () => binding;

    var componentFunc = component;
    if(typeof componentFunc != 'function' || componentFunc.prototype instanceof Component)
        componentFunc = () => component as { new (): Component };

    return () => {
        var b = bindingFunc();
        var c = (componentFunc as any)();
        return {
            value: b && b.valueOf(),
            component: c && c.valueOf()
        };
    };
}

function EnsureFunction(value: any) {
    if(typeof value == 'function')
        return value;

    return () => value;
}

class ComponentBinding extends NodeBinding {
    private component: Component;
    private parentTemplates: { [name: string]: { (): IBindingTemplate | Array<IBindingTemplate> } };

    constructor(element: Node, binding: any, compType: { (): { new (): Component } } | { new (): Component }, parentTemplates: { [name: string]: { (): IBindingTemplate | Array<IBindingTemplate> } | Array<IBindingTemplate> | IBindingTemplate }) {
        binding = binding && binding.valueOf();
        compType = compType && (compType as any).valueOf();
        var newBinding = CreateBindingFunction(binding, compType);
        super(element, newBinding);

        this.parentTemplates = {};
        for(var key in parentTemplates)
            this.parentTemplates[key] = EnsureFunction(parentTemplates[key]);

        /* this.childTemplates = {};
        for(var key in templates)
            this.childTemplates[key] = new BindingTemplate(templates[key]); */
    }

    public Destroy() {
        /* for(var key in this.childTemplates)
            this.childTemplates[key].Destroy(); */
        
        this.component.Destroy();
    }

    protected Apply() {
        var component = this.Value.component;
        var value = this.Value.value;

        if(!component) {
            this.component.Destroy();
            return;
        }

        if(!this.component || !(this.component instanceof component)) {
            this.component && this.component.Destroy();
            this.component = new component();
            this.component.SetParentTemplates(this.parentTemplates);
            /* this.component.BindingTemplate.Bind();
            this.component.BindingTemplate.OverwriteChildElements(this.childTemplates); */
        }

        this.component.SetParentData(this.Value.value);

        if(!this.component.Attached)
            this.component.AttachTo(this.BoundTo);
    }
}

export default ComponentBinding;