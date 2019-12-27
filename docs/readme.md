<html>
    <head>
        <script type="text/javascript" src="https://rawgit.com/Microsoft/TypeScript/master/lib/typescriptServices.js"></script>
        <script type="text/javascript" src="https://unpkg.com/j-templates/jTemplates.js"></script>
        <script type="text/javascript" src="./scripts/docHelpers.js"></script>
        <link rel="stylesheet"
      href="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.17.1/build/styles/default.min.css">
        <script src="//cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.17.1/build/highlight.min.js"></script>
    </head>
    <body>
        <code class="typescript" id="hello-world-tsc">
        </code>
        compiled code:
        <code class="javascript" id="hello-world-js">
        </code>
        <div id="hello-world"></div>
        <script type="text/javascript">
            GetFile('./samples/helloWorld.ts', (code) => {
                var elem = document.getElementById("hello-world-tsc");
                elem.innerHTML = code;
                var js = ts.transpile(code, { target: 'es6' });
                var jsElem = document.getElementById("hello-world-js");
                jsElem.innerHTML = js;
                hljs.highlightBlock(elem);
                hljs.highlightBlock(jsElem);
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.innerHTML = js;
                document.body.appendChild(script);
            });
        </script>
    </body>
</html>


