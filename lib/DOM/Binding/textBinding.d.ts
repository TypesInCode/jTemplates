import NodeBinding from "./nodeBinding";
declare class TextBinding extends NodeBinding {
    constructor(element: Node, binding: string | {
        (): string;
    });
    protected Apply(): void;
}
export default TextBinding;
