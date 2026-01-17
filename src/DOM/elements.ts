import { vNode } from "../Node/vNode";

export const div = vNode.ToFunction("div");
export const a = vNode.ToFunction("a");
export const b = vNode.ToFunction("b");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
export const h1 = vNode.ToFunction("h1");
export const h2 = vNode.ToFunction("h2");
export const h3 = vNode.ToFunction("h3");
export const input = vNode.ToFunction<HTMLInputElement>("input");
export const textarea = vNode.ToFunction<HTMLTextAreaElement>("textarea");
export const span = vNode.ToFunction("span");
export const table = vNode.ToFunction("table");
export const thead = vNode.ToFunction("thead");
export const th = vNode.ToFunction("th");
export const tbody = vNode.ToFunction("tbody");
export const tr = vNode.ToFunction("tr");
export const td = vNode.ToFunction("td");
export const img = vNode.ToFunction<HTMLImageElement>("img");
export const video = vNode.ToFunction<HTMLVideoElement>("video");
export const select = vNode.ToFunction<HTMLSelectElement>("select");
export const option = vNode.ToFunction<HTMLOptionElement>("option");
export const aside = vNode.ToFunction("aside");
export const p = vNode.ToFunction("p");
export const label = vNode.ToFunction("label");
export const pre = vNode.ToFunction("pre");

const textElement = vNode.ToFunction("text");
export const text = function (callback: () => string) {
  return textElement({ props: () => ({ nodeValue: callback() }) });
};
