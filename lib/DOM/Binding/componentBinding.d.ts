import NodeBinding from "./nodeBinding";
import Component from "../Component/component";
import { IBindingTemplate } from "../bindingTemplate";
declare class ComponentBinding extends NodeBinding {
    private component;
    private parentTemplates;
    constructor(element: Node, binding: any, compType: {
        (): {
            new (): Component;
        };
    } | {
        new (): Component;
    }, parentTemplates: {
        [name: string]: {
            (): IBindingTemplate | Array<IBindingTemplate>;
        } | Array<IBindingTemplate> | IBindingTemplate;
    });
    Destroy(): void;
    protected Apply(): void;
}
export default ComponentBinding;
