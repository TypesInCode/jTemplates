import NodeBinding from './nodeBinding';
import { BindingTemplate } from "../bindingTemplate";
import browser from "../browser";
import { BindingElementsDefinition, BindingDefinition, ValueFunction } from "../elements";
import Observable from '../../Observable/observable';

class DataBinding extends NodeBinding {
    private childTemplates: Array<BindingTemplate>;
    //private updatingTemplates: Array<BindingTemplate>;
    private localUpdate: boolean;
    private destroyedTemplates: Array<BindingTemplate>;

    private templateFunction: {(c: {}, i: number): BindingElementsDefinition};

    constructor(boundTo: Node, binding: ValueFunction<any>, children: BindingDefinition) {
        super(boundTo, binding);
        this.childTemplates = [];
        this.destroyedTemplates = [];
        //this.updatingTemplates = [];

        if(typeof children != 'function')
            this.templateFunction = () => children;
        else
            this.templateFunction = children;
    }

    public Update() {
        var newValue = this.GetValue();
        if(newValue.length < this.childTemplates.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            for(var x=0; x<oldComponents.length; x++) {
                if(this.destroyedTemplates.indexOf(oldComponents[x]) < 0)
                    this.destroyedTemplates.push(oldComponents[x]);
            }
        }
        super.Update();
    }

    public Destroy() {
        for(var x=0; x<this.childTemplates.length; x++)
            this.childTemplates[x].Destroy();
            
        super.Destroy();
    }

    protected Apply() {
        var currentLength = this.childTemplates.length;
        var newValue = this.GetValue();

        this.destroyedTemplates.forEach(c => c.Destroy());
        
        /* if(currentLength > newValue.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            oldComponents.forEach(c => {
                c.Destroy();
            });
        } */
        if(currentLength < newValue.length) {
            var frag = browser.createDocumentFragment();
            for(var x=currentLength; x<newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new BindingTemplate(temp);
                // newTemplate.AddListener("updating", this.TemplateUpdating.bind(this));
                // newTemplate.AddListener("updated", this.TemplateUpdated.bind(this));
                newTemplate.AttachTo(frag);
                this.childTemplates.push(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }
        this.destroyedTemplates = [];
    }

    private GetValue(): Array<any> {
        var newValue = this.Value;
        if(newValue instanceof Observable)
            newValue = newValue.valueOf();

        if(!Array.isArray(newValue))
            newValue = [newValue];
        
        return newValue;
    }

    /* protected Updated() {
        if(this.updatingTemplates.length == 0)
            super.Updated();
    }

    protected TemplateUpdating(template: BindingTemplate) {
        var index = this.updatingTemplates.indexOf(template);
        if(index < 0)
            this.updatingTemplates.push(template);

        this.Updating();
    }

    protected TemplateUpdated(template: BindingTemplate) {
        var index = this.updatingTemplates.indexOf(template);
        if(index >= 0)
            this.updatingTemplates.splice(index, 1);

        this.Updated();
    } */
}

export default DataBinding;