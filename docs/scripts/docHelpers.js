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

function AppendScript(url, callback) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.onload = callback;
    script.src = url;
    document.body.appendChild(script);
}

var onLoadCount = 0;
var totalOnLoad = 0;
/* function LoadScript(scriptUrl, callback) {
    totalOnLoad++;
    AppendScript(scriptUrl, () => {
        onLoadCount++;
        if(onLoadCount >= totalOnLoad)
            callback();
    });
} */

function LoadScripts(scriptUrls, callback, index) {
    if(index === undefined) {
        index = 0;
        totalOnLoad += scriptUrls.length;
    }
    
    if(index >= scriptUrls.length) {
        if(onLoadCount >= totalOnLoad) {
            onLoadCount = 0;
            totalOnLoad = 0;
            callback();
        }
        return;
    }
    
    AppendScript(scriptUrls[index], () => {
        onLoadCount++;
        LoadScripts(scriptUrls, callback, index + 1);
    });
}

function LoadCSS(cssUrl) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = cssUrl;
    document.body.appendChild(css);
}

var loading = false;
var loaded = false;
var callbacks = [];
function AddDependencies(scriptFolder, callback) {
    if(loaded) {
        callback();
        return;
    }

    callbacks.push(callback);
    if(loading)
        return;

    loading = true;
    function onComplete() {
        loaded = true;
        callbacks.forEach(cb => cb());
        callbacks = [];
    }

    LoadScripts(["https://cdn.jsdelivr.net/gh/Microsoft/TypeScript@master/lib/typescriptServices.js"], onComplete);
    // LoadScripts(["https://unpkg.com/j-templates/jTemplates.js"], callback);
    LoadScripts([
        scriptFolder + "codemirror.js", 
        scriptFolder + "javascript.js",
        // scriptFolder + "show-hint.js",
        // scriptFolder + "javascript-hint.js"
    ], onComplete);
    // LoadScript(scriptFolder + "javascript.js", callback);
    LoadCSS(scriptFolder + "styles/codemirror.css");
    LoadCSS(scriptFolder + "styles/styles.css");
    LoadCSS(scriptFolder + "styles/show-hint.css");
}

function HandleError(containerId, message, source, lineNo, colNo, error) {
    console.debug(arguments);
    var parentDoc = window.parent.document;
    var errorSpan = parentDoc.querySelector("#" + containerId + " span.error");
    errorSpan.innerHTML = message;
    return false;
}

function ExecuteTs(container, code) {
    var errorSpan = document.querySelector("#" + container.id + " span.error");
    errorSpan.innerHTML = "";

    var iframe = container.querySelector("iframe");
    if(iframe)
        container.removeChild(iframe);
    
    iframe = document.createElement("iframe");
    iframe.className = "output";
    iframe.srcDoc = '<!DOCTYPE html><html><head></head><body></body></html>';
    container.appendChild(iframe);
    var jTempScript = iframe.contentDocument.createElement("script");
    jTempScript.type = "text/javascript";
    jTempScript.src = "https://unpkg.com/j-templates/jTemplates.js";
    jTempScript.onload = () => {
        var js = ts.transpile(code, { target: "es6" });
        js = js.replace(/^import.*$/gm, "");
        js = HandleError.toString() + '; var containerId="' + container.id + '";  var errorHandler = HandleError.bind(null, containerId); window.onerror = errorHandler; ' + js;
        var script = iframe.contentDocument.createElement("script");
        script.type = "text/javascript";
        script.innerHTML = js;
        iframe.contentDocument.head.appendChild(script);
    };
    iframe.contentDocument.head.appendChild(jTempScript);
}

var changeTimeout = null;
function CreateCodeMirror(container, initValue) {
    var cm = CodeMirror(container, { 
        value: initValue,
        matchBrackets: true,
        lineNumbers: true,
        extraKeys: { "Ctrl-Space": "autocomplete" },
        mode: {name: "text/typescript", globalVars: false}
    });
    cm.on("change", () => {
        clearTimeout(changeTimeout);
        changeTimeout = setTimeout(() => {
            ExecuteTs(container, cm.getDoc().getValue());
        }, 4000);
    });
}

function CreateSample(sample) {
    var container = document.getElementById(sample);
    container.innerHTML = "Loading...";
    var curScriptUrl = document.querySelector("[src$='docHelpers.js'").src;
    var curScriptFolder = curScriptUrl.replace(/docHelpers\.js$/, "");
    AddDependencies(curScriptFolder, () => {
        var samplesFolder = curScriptFolder + "../samples/";
        var sampleUrl = samplesFolder + sample + ".ts";

        GetFile(sampleUrl, (text) => {
            container.innerHTML = "";

            var h2 = document.createElement("h2");
            h2.innerText = "Code";
            var span = document.createElement("span");
            span.className = "error";
            h2.appendChild(span);
            container.appendChild(h2);
            
            CreateCodeMirror(container, text);

            h2 = document.createElement("h2");
            h2.innerText = "Output";
            container.appendChild(h2);
            
            ExecuteTs(container, text);
        });
    });
}
