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

# Configuring a Node
In the previous examples, `span` is an Element function that returns an `ElementNode<T>` which is a child of `NodeRef`. Element functions take two parameters: a node definition object and a child definition function. The full signature is:
```typescript
span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): ElementNode<T>
```
`ElementNodeFunctionParam<T>` is an object that defines properties, attributes, events and data `<T | T[]>` to bind the element to.  
`ElementChildrenFunction<T>` defines the child template for the node. It is a function that takes a single parameter `<T>` and returns `NodeRef | NodeRef[]`.

<div class="example" id="goodbyeWorldProps">
</div>
<script type="text/javascript">
    CreateSample("goodbyeWorldProps");
</script>
