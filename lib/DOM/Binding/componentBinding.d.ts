import NodeBinding from "./nodeBinding";
import Component from "../Component/component";
import { TemplateValueFunctionMap } from "../elements";
declare class ComponentBinding extends NodeBinding {
    private componentType;
    private component;
    private parentTemplates;
    constructor(element: Node, binding: any, compType: {
        new (): Component<any, any>;
    }, parentTemplates: TemplateValueFunctionMap<any>);
    Destroy(): void;
    protected Apply(): void;
}
export default ComponentBinding;
