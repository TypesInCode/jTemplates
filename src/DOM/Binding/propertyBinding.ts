import NodeBinding from "./nodeBinding";

class PropertyBinding extends NodeBinding {
    private parentObject: any;
    private propName: string;

    constructor(boundTo: Node, propertyPath: Array<string>, bindingFunction: () => any) {
        super(boundTo, bindingFunction);
        this.parentObject = this.BoundTo;
        var x=0;
        for(; x<propertyPath.length-1; x++)
            this.parentObject = this.parentObject[propertyPath[x]];
        this.propName = propertyPath[x];
    }

    protected Apply() {
        var newValue = this.Value;
        /* if(newValue != null && typeof newValue == "object") {
            for(var key in newValue)
                this.parentObject[this.propName][key] = newValue[key].valueOf();
        }
        else */
            this.parentObject[this.propName] = newValue;
    }
}

/* namespace PropertyBinding {
    export function Create(element: any, bindingParameters: {[name: string]: any}): Array<Binding<Node>> {
        var ret: Array<Binding<Node>> = [];
        if(element.nodeType == element.ELEMENT_NODE) {
            for(var x=0; x<element.attributes.length; x++) {
                var att = element.attributes[x];
                if(propRgx.test(att.name))
                    ret.push(new PropertyBinding(element, att.name, bindingParameters));
            }
        }
        return ret;
    }
} */

export default PropertyBinding;