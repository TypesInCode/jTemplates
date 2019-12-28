function GetFile(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = () => {
        if (xhr.readyState === xhr.DONE) {
            if (xhr.status === 200) {
                callback(xhr.responseText);
            }
        }
    };

    xhr.send(null);
}

var onLoadCount = 0;
var totalOnLoad = 0;
function LoadScript(scriptUrl, callback) {
    totalOnLoad++;
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.onload = () => {
        onLoadCount++;
        if(onLoadCount >= totalOnLoad)
            callback();
    };
    script.src = scriptUrl;
    document.body.appendChild(script);
}

function LoadCSS(cssUrl) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = cssUrl;
    document.body.appendChild(css);
}

function AddDependencies(scriptFolder, callback) {
    LoadScript("https://rawgit.com/Microsoft/TypeScript/master/lib/typescriptServices.js", callback);
    LoadScript("https://unpkg.com/j-templates/jTemplates.js", callback);
    LoadScript(scriptFolder + "codemirror.js", callback);
    LoadCSS(scriptFolder + "codemirror.css");
}

function CreateSample(sample) {
    var curScriptUrl = document.querySelector("[src$='docHelpers.js'").src;
    var curScriptFolder = curScriptUrl.replace(/docHelpers\.js$/, "");
    AddDependencies(curScriptFolder, () => {
        var samplesFolder = curScriptFolder + "../samples/";
        var sampleUrl = samplesFolder + sample + ".ts";

        GetFile(sampleUrl, (text) => {
            var container = document.getElementById(sample);
            container.innerHTML = "";
            var code = document.createElement("textarea");
            code.value = text;
            // hljs.highlightBlock(code);
            container.appendChild(code);
            CodeMirror.fromTextArea(code, {
                lineNumbers: true,
                readOnly: true,
                mode: "typescript"
            });
            var js = ts.transpile(text, { target: "es6" });
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.innerHTML = js;
            document.body.appendChild(script);
        });
    });
}
