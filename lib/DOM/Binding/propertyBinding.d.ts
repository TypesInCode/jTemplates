import NodeBinding from "./nodeBinding";
declare class PropertyBinding extends NodeBinding {
    private parentObject;
    private propName;
    constructor(boundTo: Node, propertyPath: Array<string>, bindingFunction: () => any);
    protected Apply(): void;
}
export default PropertyBinding;
