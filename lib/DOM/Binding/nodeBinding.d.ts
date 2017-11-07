import Binding from "../../binding";
declare abstract class NodeBinding extends Binding<Node> {
    constructor(boundTo: Node, binding: any | {
        (): any;
    });
}
export default NodeBinding;
