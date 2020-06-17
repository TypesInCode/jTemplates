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

<div class="example" id="componentsConfig">
</div>
<script type="text/javascript">
    CreateSample("componentsConfig");
</script>

