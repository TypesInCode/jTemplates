declare namespace Symbol {
    export var iterator: string;
}

var supported = typeof Symbol != "undefined";

export default {
    get __supported() {
        return supported;
    },
    get iterator() {
        if(supported)
            return Symbol.iterator;

        return "Symbol.iterator";
    }
}