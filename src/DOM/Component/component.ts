import { BindingDefinition, BindingElementsDefinition, TemplateDefinitionMap, ValueFunction } from "../elements";
import { BindingTemplate } from "../bindingTemplate";

function CreateFunction(value: any) {
    return () => value;
}

abstract class Component<P> {
    private bindingTemplate: BindingTemplate;
    private parentTemplates: TemplateDefinitionMap;
    
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

    public abstract get Template(): BindingElementsDefinition;

    public get DefaultTemplates(): TemplateDefinitionMap {
        return {};
    }

    protected get Templates(): TemplateDefinitionMap {
        return this.parentTemplates;
    }

    public get Attached(): boolean {
        return this.BindingTemplate.Attached;
    }

    public get AttachedTo(): Node {
        return this.BindingTemplate.AttachedTo;
    }

    constructor() {
        this.parentTemplates = this.DefaultTemplates;
    }

    public SetParentData(data: P) { }

    public SetParentTemplates(parentTemplates: TemplateDefinitionMap) {
        for(var key in parentTemplates) {
            if(typeof parentTemplates[key] != 'function')
                (this.parentTemplates as any)[key] = CreateFunction(parentTemplates[key]);
            else
                this.parentTemplates[key] = parentTemplates[key];
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