import Binding from "../../binding";
import { ValueFunction } from "../elements";
declare abstract class NodeBinding extends Binding<Node> {
    constructor(boundTo: Node, binding: ValueFunction<any>);
}
export default NodeBinding;
