<script type="text/javascript" src="https://rawgit.com/Microsoft/TypeScript/master/lib/typescriptServices.js"></script>
<script type="text/javascript" src="https://unpkg.com/j-templates/jTemplates.js"></script>
<script type="text/javascript" src="./scripts/docHelpers.js"></script>

<pre id="hello-world">
</pre>
compiled code
<pre id="hello-world-js">
</pre>
<script type="text/javascript">
    GetFile('./samples/helloWorld.ts', (code) => {
        var elem = document.getElementById("hello-world");
        elem.innerHTML = code;
        var js = ts.transpile(code);
        var jsElem = document.getElementById("hello-world-js");
        jsElem.innerHTML = js;
    });
</script>


