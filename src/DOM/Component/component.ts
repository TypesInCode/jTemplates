import { BindingTemplate, IBindingTemplate } from "../bindingTemplate";

function CreateFunction(value: any) {
    return () => value;
}

abstract class Component {
    private bindingTemplate: BindingTemplate;
    private parentTemplates: { [name: string]: { (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate> } }
    
    public get BindingTemplate() {
        if(!this.bindingTemplate) {
            this.bindingTemplate = new BindingTemplate(this.Template);
            this.bindingTemplate.AddListener("updating", this.Updating.bind(this));
            this.bindingTemplate.AddListener("updated", this.Updated.bind(this));
        }

        return this.bindingTemplate;
    }

    public abstract get Template(): IBindingTemplate | Array<IBindingTemplate>;

    public get DefaultTemplates(): { [name: string]: { (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate> } } {
        return {};
    }

    protected get Templates(): { [name: string]: { (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate> } } {
        return this.parentTemplates;
    }

    public get Attached(): boolean {
        return this.BindingTemplate.Attached;
    }

    constructor() {
        this.parentTemplates = this.DefaultTemplates;
    }

    public SetParentData(data: any) { }

    public SetParentTemplates(parentTemplates: { [name: string]: { (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate> } }) {
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

    protected Updating() { }

    protected Updated() { }
}

export default Component;