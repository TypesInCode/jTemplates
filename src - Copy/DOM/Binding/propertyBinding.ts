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
        this.parentObject[this.propName] = this.Value && this.Value.valueOf();
    }
}

export default PropertyBinding;