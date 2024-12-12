import { NodeRefType } from "./nodeRef";

export interface ITextNode {
    type: NodeRefType.TextNode;
    parent: any;
    node: any;
    value: string;
}