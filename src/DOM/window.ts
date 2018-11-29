

var glbl: Window = null;
if(typeof window != "undefined") 
    glbl = window;
else {
    glbl = (new (require("jsdom").JSDOM)("")).window;
}

export var window = glbl;