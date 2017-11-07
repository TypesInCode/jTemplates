import Template from "./template";
import Component from "./Component/component";
import NodeBinding from "./Binding/nodeBinding";
export interface IBindingTemplate {
    [name: string]: {};
    text?: string | {
        (): string;
    };
    component?: {
        (): {
            new (): Component;
        };
    } | {
        new (): Component;
    };
    templates?: {
        [name: string]: {
            (): IBindingTemplate | Array<IBindingTemplate>;
        } | Array<IBindingTemplate> | IBindingTemplate;
    };
    data?: {
        (): any;
    } | any;
    children?: {
        (c?: any, i?: number): IBindingTemplate | Array<IBindingTemplate>;
    } | Array<IBindingTemplate> | IBindingTemplate;
    on?: {
        [name: string]: {
            (): EventListener;
        };
    };
}
export declare class BindingTemplate extends Template {
    private bindings;
    private destroyed;
    private bound;
    private updatingBindings;
    private updatingCallback;
    private updatedCallback;
    constructor(template: IBindingTemplate | Array<IBindingTemplate>);
    AttachTo(element: Node): void;
    Bind(): void;
    Destroy(): void;
    protected Updating(binding: NodeBinding): void;
    protected Updated(binding: NodeBinding): void;
}
