# Hello World
A basic hello world component. The code is editable and will re-execute after making changes.

<script type="text/javascript" src="../scripts/docHelpers.js"></script>
<div class="example" id="helloWorld">
</div>
<script type="text/javascript">
    CreateSample("helloWorld");
</script>

# Setting Element Properties
In the previous example, `span` is an Element function and returns a `NodeRef`. A Component's Template function 
returns `NodeRef | NodeRef[]`. Element functions take two parameters: a node definition object and a child
definition function. The full signature is:  
```typescript
span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunction<T>): ElementNode<T>
```
