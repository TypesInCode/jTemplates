import NodeBinding from './nodeBinding';
import { BindingTemplate } from "../bindingTemplate";
import { BindingDefinition, ValueFunction } from "../elements";
declare class DataBinding extends NodeBinding {
    private childTemplates;
    private updatingTemplates;
    private localUpdate;
    private templateFunction;
    constructor(boundTo: Node, binding: ValueFunction<any>, children: BindingDefinition);
    Destroy(): void;
    protected Apply(): void;
    protected Updated(): void;
    protected TemplateUpdating(template: BindingTemplate): void;
    protected TemplateUpdated(template: BindingTemplate): void;
}
export default DataBinding;
