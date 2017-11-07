import { BindingTemplate, IBindingTemplate } from "../bindingTemplate";
declare abstract class Component {
    private bindingTemplate;
    private parentTemplates;
    readonly BindingTemplate: BindingTemplate;
    readonly abstract Template: IBindingTemplate | Array<IBindingTemplate>;
    readonly DefaultTemplates: {
        [name: string]: {
            (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate>;
        };
    };
    protected readonly Templates: {
        [name: string]: {
            (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate>;
        };
    };
    readonly Attached: boolean;
    constructor();
    SetParentData(data: any): void;
    SetParentTemplates(parentTemplates: {
        [name: string]: {
            (...args: Array<any>): IBindingTemplate | Array<IBindingTemplate>;
        };
    }): void;
    AttachTo(element: Node): void;
    Detach(): void;
    Destroy(): void;
    protected Updating(): void;
    protected Updated(): void;
}
export default Component;
