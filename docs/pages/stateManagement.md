<script type="text/javascript" src="../scripts/docHelpers.js"></script>

# State Management
To implement dynamic state two store classes are provided: `Store` and `StoreAsync`. `ObservableScope` and `ObservableScopeAsync` are used to watch for changes to a store.
## Store
`Store` is a synchronous JSON store. This store emits changes whether the state changed or not.
<div class="example" id="storeBasic">
</div> 
<script type="text/javascript">
    CreateSample("storeBasic");
</script>

