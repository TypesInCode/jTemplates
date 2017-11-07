import NodeBinding from './nodeBinding';
import { IBindingTemplate, BindingTemplate } from "../bindingTemplate";
declare class DataBinding extends NodeBinding {
    private childTemplates;
    private updatingTemplates;
    private localUpdate;
    private templateFunction;
    constructor(boundTo: Node, binding: any | {
        (): any;
    }, children: IBindingTemplate | Array<IBindingTemplate> | {
        (c: {}, i: number): IBindingTemplate | Array<IBindingTemplate>;
    });
    Destroy(): void;
    protected Apply(): void;
    protected Updated(): void;
    protected TemplateUpdating(template: BindingTemplate): void;
    protected TemplateUpdated(template: BindingTemplate): void;
}
export default DataBinding;
