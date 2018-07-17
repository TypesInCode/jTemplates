import NodeBinding from './nodeBinding';
import { BindingTemplate } from "../bindingTemplate";
import browser from "../browser";
import { TemplateDefinitions, TemplateDefinitionsValueFunction, ValueFunction } from "../elements";
import { Observable } from '../../Observable/observable';

class DataBinding extends NodeBinding {
    //private childTemplates: Array<BindingTemplate>;
    private childTemplates: Set<BindingTemplate>;
    private rebind: boolean;
    private destroyedTemplates: Set<BindingTemplate>;

    private templateFunction: {(c: {}, i: number): TemplateDefinitions};

    constructor(boundTo: Node, binding: ValueFunction<any>, rebind: boolean, children: TemplateDefinitionsValueFunction) {
        super(boundTo, binding);
        this.rebind = rebind;
        this.childTemplates = new Set();
        this.destroyedTemplates = new Set();

        if(typeof children != 'function')
            this.templateFunction = () => children;
        else
            this.templateFunction = children;
    }

    public Update() {
        if(this.rebind) {
            this.destroyedTemplates = new Set(this.childTemplates);
            this.childTemplates.clear();
        }

        var childTemplates = [...this.childTemplates];
        var newValue = this.GetValue();
        if(newValue.length < childTemplates.length) {
            var oldComponents = childTemplates.splice(newValue.length);
            for(var x=0; x<oldComponents.length; x++) {
                if(!this.destroyedTemplates.has(oldComponents[x]))
                    this.destroyedTemplates.add(oldComponents[x]);
            }
            this.childTemplates = new Set(childTemplates);
        }
        super.Update();
    }

    public Destroy() {
        /* for(var x=0; x<this.childTemplates.length; x++)
            this.childTemplates[x].Destroy(); */
        this.childTemplates.forEach(t => t.Destroy());
            
        super.Destroy();
    }

    protected Apply() {
        var currentLength = this.childTemplates.size;
        var newValue = this.GetValue();

        this.destroyedTemplates.forEach(c => c.Destroy());
        if(currentLength < newValue.length) {
            var frag = browser.createDocumentFragment();
            for(var x=currentLength; x<newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new BindingTemplate(temp);
                newTemplate.AttachTo(frag);
                this.childTemplates.add(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }

        this.destroyedTemplates.clear();
    }

    private GetValue(): Array<any> {
        var newValue = this.Value;
        var valueOf = newValue && newValue.valueOf();

        if(!valueOf)
            return [];

        if(!Array.isArray(valueOf)) {
            return [newValue];
        }
        
        return newValue;
    }
}

export default DataBinding;