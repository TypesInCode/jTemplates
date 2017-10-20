import NodeBinding from './nodeBinding';
import { IBindingTemplate, BindingTemplate } from "../bindingTemplate";
import browser from "../browser";

class DataBinding extends NodeBinding {
    private childTemplates: Array<BindingTemplate>;
    private templateFunction: {(c: {}, i: number): IBindingTemplate | Array<IBindingTemplate>};

    constructor(boundTo: Node, binding: any | { (): any }, children: IBindingTemplate | Array<IBindingTemplate> | {(c: {}, i: number): IBindingTemplate | Array<IBindingTemplate>}) {
        super(boundTo, binding);
        this.childTemplates = [];

        if(typeof children != 'function')
            this.templateFunction = () => children;
        else
            this.templateFunction = children;
    }

    protected Apply() {
        var currentLength = this.childTemplates.length;
        var newValue = this.Value;
        if(!Array.isArray(newValue))
            newValue = [newValue];
        
        if(currentLength > newValue.length) {
            var oldComponents = this.childTemplates.splice(newValue.length);
            oldComponents.forEach(c => {
                c.Destroy();
            });
        }
        else if(currentLength < newValue.length) {
            var frag = browser.createDocumentFragment();
            for(var x=currentLength; x<newValue.length; x++) {
                var temp = this.templateFunction(newValue[x], x);
                var newTemplate = new BindingTemplate(temp);
                newTemplate.AttachTo(frag);
                this.childTemplates.push(newTemplate);
            }
            this.BoundTo.appendChild(frag);
        }
    }

    public Destroy() {
        for(var x=0; x<this.childTemplates.length; x++)
            this.childTemplates[x].Destroy();
    }
}

export default DataBinding;