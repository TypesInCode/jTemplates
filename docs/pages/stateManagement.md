<script type="text/javascript" src="../scripts/docHelpers.js"></script>

# State Management
To implement dynamic state two store classes are provided: `Store` and `StoreAsync`. `ObservableScope` and `ObservableScopeAsync` are used to watch for changes to a store.
## Store
`Store` is a synchronous JSON store. This store emits changes whether the state changed or not. Meant to be used for Component level state management.
<div class="example" id="storeBasic">
</div> 
<script type="text/javascript">
    CreateSample("storeBasic");
</script>

## StoreAsync
`StoreAsync` is an asynchronous JSON store. All objects are stored by ID and a `WebWorker` is used to diff state changes. If the state doesn't change then the store doesn't emit. Meant to be used as a shared store across multiple Components.
<div class="example" id="storeAsyncBasic">
</div> 
<script type="text/javascript">
    CreateSample("storeAsyncBasic"); 
</script> 

