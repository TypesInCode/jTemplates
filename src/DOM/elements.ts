import { vNode } from "../Node/vNode";

export const div = vNode.ToFunction("div");
export const a = vNode.ToFunction("a");
export const b = vNode.ToFunction("b");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
export const h1 = vNode.ToFunction("h1");
export const input = vNode.ToFunction<HTMLInputElement>("input");
export const textarea = vNode.ToFunction<HTMLTextAreaElement>("textarea");
export const span = vNode.ToFunction("span");
export const table = vNode.ToFunction("table");
export const tbody = vNode.ToFunction("tbody");
export const tr = vNode.ToFunction("tr");
export const td = vNode.ToFunction("td");
export const img = vNode.ToFunction<HTMLImageElement>("img");
export const video = vNode.ToFunction<HTMLVideoElement>("video");

const textElement = vNode.ToFunction("text");
export const text = function (callback: () => string) {
  return textElement({ props: () => ({ nodeValue: callback() }) });
};
