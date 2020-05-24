# Hello World
A basic hello world component. The code is editable and will re-execute after making changes.

<script type="text/javascript" src="../scripts/docHelpers.js"></script>
<div class="example" id="helloWorld">
</div>
<script type="text/javascript">
    CreateSample("helloWorld");
</script>

Creating a new component is as simple as extending `Component` and overriding the `Template()` function. The `Template()` return type is flexible and can return `NodeRef | NodeRef[]`.

<div class="example" id="goodbyeWorld">
</div>
<script type="text/javascript">
    CreateSample("goodbyeWorld");
</script>

## Configuring a Node
In the previous examples, `span` is an Element function that returns an `ElementNode<T>` which is a child of `NodeRef`. Element functions take two parameters: a node definition object and a child definition function. The full signature is:
```typescript
span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): ElementNode<T>
```
`ElementNodeFunctionParam<T>` is an object that defines properties, attributes, events and data `<T | T[]>` to bind the element to.  
`ElementChildrenFunction<T>` defines the child template for the node. It is a function that takes a single parameter `<T>` and returns `NodeRef | NodeRef[] | string`.

<div class="example" id="goodbyeWorldProps">
</div>
<script type="text/javascript">
    CreateSample("goodbyeWorldProps");
</script>

## Data Binding
The data property of the `ElementNodeFunctionParam<T>` takes a method with return type `<T | T[]>`. When binding to an array the child template binds to each element in the array. Binding to a falsy value is equivalent to binding to an empty array and results in no children.

<div class="example" id="goodbyeWorldData">
</div>
<script type="text/javascript">
    CreateSample("goodbyeWorldData");
</script>
