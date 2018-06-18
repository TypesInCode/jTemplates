import { TemplateDefinitionsValueFunction, TemplateDefinitions, TemplateValueFunctionMap, TemplateFunctionMap } from "../elements";
import { BindingTemplate } from "../bindingTemplate";

function CreateFunction(value: any) {
    if(typeof value != 'function')
        return () => value;

    return value;
}

abstract class Component<P, T> {
    private bindingTemplate: BindingTemplate;
    private parentTemplates: any;
    
    public get BindingTemplate() {
        if(!this.bindingTemplate) {
            this.bindingTemplate = new BindingTemplate(this.Template);
            // this.bindingTemplate.AddListener("updating", this.Updating.bind(this));
            // this.bindingTemplate.AddListener("updated", this.Updated.bind(this));
        }

        return this.bindingTemplate;
    }

    public static get Name(): string {
        throw "public static property Name must be overidden";
    }

    public abstract get Template(): TemplateDefinitions;

    public get DefaultTemplates(): TemplateValueFunctionMap<T> {
        return {} as any;
    }

    protected get Templates(): TemplateFunctionMap<T> {
        return this.parentTemplates;
    }

    public get Attached(): boolean {
        return this.BindingTemplate.Attached;
    }

    public get AttachedTo(): Node {
        return this.BindingTemplate.AttachedTo;
    }

    constructor() {
        this.parentTemplates = {} as any;
        for(var key in this.DefaultTemplates)
            this.parentTemplates[key] = (this.DefaultTemplates as any)[key];
    }

    public SetParentData(data: P) { }

    public SetParentTemplates(parentTemplates: TemplateValueFunctionMap<T>) {
        for(var key in parentTemplates) {
            this.parentTemplates[key] = CreateFunction(parentTemplates[key]);
            /* if(typeof parentTemplates[key] != 'function')
                (this.parentTemplates as any)[key] = CreateFunction(parentTemplates[key]);
            else
                this.parentTemplates[key] = parentTemplates[key]; */
        }
    }

    public AttachTo(element: Node) {
        this.BindingTemplate.AttachTo(element);
    }

    public Detach() {
        this.BindingTemplate.Detach();
    }

    public Destroy() {
        this.BindingTemplate.Destroy();
    }

    /* protected Updating() { }

    protected Updated() { } */
}

export default Component;