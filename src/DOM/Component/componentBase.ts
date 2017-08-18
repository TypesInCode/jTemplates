import Binding from "../../binding";
import Bindings from "../Binding/bindings";
import Template from "../template";

abstract class ComponentBase {
    private template: Template;
    private bindings: Array<Binding<Node>>;
    private destroyed: boolean;
    private bound: boolean;

    public get Attached(): boolean {
        return this.template.Attached;
    }

    constructor() {
        this.destroyed = false;
        this.bound = false;
    }

    public AttachTo(element: Node): void {
        if(this.destroyed)
            throw "Can't attach destroyed component";

        if(!this.bound) {
            this.bindings = Bindings.Bind(this.template.DocumentFragment, this.BindingParameters());
            this.bindings.forEach(c => c.Update());
            this.bound = true;
        }
        
        this.template.AttachTo(element);
    }

    public Detach(): void {
        this.template.Detach();
    }

    public Destroy(): void {
        this.Detach();

        this.bindings.forEach(c => {
            c.Destroy();
        });

        this.destroyed = true;
    }

    public SetChildElements(fragments: { [name: string]: DocumentFragment }) {
        if(this.bound)
            throw "Child elements can't be set after component is bound";

        this.template.OverwriteChildElements(fragments);
    }

    protected SetTemplate(template: Node | string | Template): void {
        this.template = Template.Create(template);
    }

    protected BindingParameters(): {[name: string]: any} {
        return {
            $comp: this
        }
    }
}

export default ComponentBase;