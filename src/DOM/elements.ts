import { vNode } from "../Node/vNode";

export const div = vNode.ToFunction("div");
export const a = vNode.ToFunction("a");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
export const h1 = vNode.ToFunction("h1");
export const input = vNode.ToFunction<HTMLInputElement>("input");
export const span = vNode.ToFunction("span");
export const table = vNode.ToFunction("table");
export const tbody = vNode.ToFunction("tbody");
export const tr = vNode.ToFunction("tr");
export const td = vNode.ToFunction("td");

const textElement = vNode.ToFunction("text");
export const text = function (callback: () => string) {
  return textElement({ props: () => ({ nodeValue: callback() }) });
};

// import { ElementNode } from "../Node/elementNode";
// import { ElementNodeFunctionParam, ElementChildrenFunctionParam } from "../Node/elementNode.types";

// export function div<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("div", null, nodeDef, children);
// }

// export function a<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("a", null, nodeDef, children);
// }

// export function ul<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("ul", null, nodeDef, children);
// }

// export function li<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("li", null, nodeDef, children);
// }

// export function br<T>(nodeDef: ElementNodeFunctionParam<T>) {
//     return ElementNode.Create<T>("br", null, nodeDef, null);
// }

// export function b<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("b", null, nodeDef, children);
// }

// export function span<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("span", null, nodeDef, children);
// }

// export function img<T>(nodeDef: ElementNodeFunctionParam<T>) {
//     return ElementNode.Create<T>("img", null, nodeDef, null);
// }

// export function video<T>(nodeDef: ElementNodeFunctionParam<T, HTMLVideoElement, HTMLVideoElementEventMap>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("video", null, nodeDef, children);
// }

// export function source<T>(nodeDef: ElementNodeFunctionParam<T>) {
//     return ElementNode.Create<T>("source", null, nodeDef, null);
// }

// export function input<T>(nodeDef: ElementNodeFunctionParam<T, HTMLInputElement>) {
//     return ElementNode.Create<T>("input", null, nodeDef, null);
// }

// export function textarea<T>(nodeDef: ElementNodeFunctionParam<T>) {
//     return ElementNode.Create<T>("textarea", null, nodeDef, null);
// }

// export function select<T>(nodeDef: ElementNodeFunctionParam<T, HTMLSelectElement>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("select", null, nodeDef, children);
// }

// export function option<T>(nodeDef: ElementNodeFunctionParam<T, HTMLOptionElement>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("option", null, nodeDef, children);
// }

// export function h1<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("h1", null, nodeDef, children);
// }

// export function h2<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("h2", null, nodeDef, children);
// }

// export function h3<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("h3", null, nodeDef, children);
// }

// export function p<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("p", null, nodeDef, children);
// }

// export function style<T>(nodeDef: ElementNodeFunctionParam<T, HTMLStyleElement>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("style", null, nodeDef, children);
// }

// export function button<T>(nodeDef: ElementNodeFunctionParam<T, HTMLButtonElement>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("button", null, nodeDef, children);
// }

// export function table<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("table", null, nodeDef, children);
// }

// export function tbody<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("tbody", null, nodeDef, children);
// }

// export function th<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("th", null, nodeDef, children);
// }

// export function tr<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("tr", null, nodeDef, children);
// }

// export function td<T>(nodeDef: ElementNodeFunctionParam<T>, children?: ElementChildrenFunctionParam<T>) {
//     return ElementNode.Create<T>("td", null, nodeDef, children);
// }

/* export function text(value: string | {(): string}) {
    var valueFunc: {(): string} = null;
    if(typeof value === 'string')
        valueFunc = () => value;
    else
        valueFunc = value;

    return ElementNode.Create("text", null, { props: () => ({ nodeValue: valueFunc() }) });
} */
