export interface IMirrorTreeNode {
    GetSourceNode(): JsonTreeNode<IMirrorTreeNode>;
    SetSourceNode(sourceNode: JsonTreeNode<IMirrorTreeNode>): void;
    SetValue(value: any): void;
    NodeUpdated(): void;
    Destroy(): void;
    valueOf(): any;
}
export declare enum ValueType {
    Unknown = 0,
    Value = 1,
    Object = 2,
    Array = 3,
}
export declare class JsonTreeNode<N extends IMirrorTreeNode> {
    private mirrorNodeType;
    private mirroredNodes;
    private objectProperties;
    private type;
    private value;
    readonly Type: ValueType;
    readonly Properties: (string | number)[];
    constructor(mirrorNodeType: {
        new (): N;
    }, properties?: Array<string | number>, type?: ValueType, value?: any);
    CopyNode(): JsonTreeNode<N>;
    AddMirrorNode(mirrorNode: N): void;
    RemoveMirroredNode(mirrorNode: N): JsonTreeNode<N>;
    GetValue(): any;
    GetMirroredValue(node: N): any;
    GetRawValue(): any;
    SetValue(newValue: any): void;
    Destroy(): void;
    private ResetToNull();
    private GetValueType(value);
    private ConvertToObject();
    private ConvertToArray();
    private ConvertToValue();
    private ReconcileProperties(newValue, oldProperties, newProperties);
    private RemoveProperties(properties);
    private RemovePropertiesFrom(properties, mirrors);
    private AddPropertiesTo(properties, mirrors);
    private DefineProperty(mirror, property, value);
    private AddArrayMixinToMirrors();
    private AddArrayMixin(object);
    private RemoveArrayMixinFromMirrors();
    private RemoveArrayMixin(object);
}
export declare namespace JsonTreeNode {
    function Create<T, N extends IMirrorTreeNode>(value: T, nodeType: {
        new (): N;
    }): N & T;
}
export default JsonTreeNode;
