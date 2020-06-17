# Components
This example shows how to reference one Component from another Component

<script type="text/javascript" src="../scripts/docHelpers.js"></script>
<div class="example" id="componentsEx">
</div>
<script type="text/javascript">
    CreateSample("componentsEx");
</script>

The call to `Component.ToFunction(...)` returns a reusable Component function. Calling this function returns a `ComponentNode<D, T, E>` which is a child of `NodeRef`. Component functions take two parameters: a component definition object and a template definition object. The full signature is:
```
component<D, T, E>(nodeDef: ComponentNodeFunctionParam<D, E>, templates?: T): NodeRef
```
The three generic types `D` `T` and `E` define types that can be passed from a parent component.  
`D` defines the type of data the component accepts. Data can be accessed in a component through the `Data` property.  
`T` defines templates the component accepts. This type is recommended to be of the form `{ [name: string]: {(...args: any[]): NodeRef | NodeRef[]} }`. Templates can be referenced in a Component through the `Templates` property.  
`E` defines the events a Component supports as a JSON map. Events can be fired from a Component using the `Fire(name: string, data?: E[P])` method.  

<div class="example" id="componentsConfig">
</div>
<script type="text/javascript">
    CreateSample("componentsConfig");
</script>

