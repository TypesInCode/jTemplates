import { vNode } from "../Node/vNode";

// Layout
export const div = vNode.ToFunction("div");
export const span = vNode.ToFunction("span");
export const section = vNode.ToFunction("section");
export const article = vNode.ToFunction("article");
export const aside = vNode.ToFunction("aside");
export const nav = vNode.ToFunction("nav");
export const main = vNode.ToFunction("main");
export const header = vNode.ToFunction("header");
export const footer = vNode.ToFunction("footer");
export const hr = vNode.ToFunction("hr");
export const blockquote = vNode.ToFunction("blockquote");
export const address = vNode.ToFunction("address");

// Text content
export const h1 = vNode.ToFunction("h1");
export const h2 = vNode.ToFunction("h2");
export const h3 = vNode.ToFunction("h3");
export const h4 = vNode.ToFunction("h4");
export const h5 = vNode.ToFunction("h5");
export const h6 = vNode.ToFunction("h6");
export const p = vNode.ToFunction("p");
export const pre = vNode.ToFunction("pre");
export const code = vNode.ToFunction("code");
export const kbd = vNode.ToFunction("kbd");
export const samp = vNode.ToFunction("samp");
export const _var = vNode.ToFunction("var");
export const cite = vNode.ToFunction("cite");
export const q = vNode.ToFunction("q");

// Inline text formatting
export const a = vNode.ToFunction("a");
export const b = vNode.ToFunction("b");
export const strong = vNode.ToFunction("strong");
export const i = vNode.ToFunction("i");
export const em = vNode.ToFunction("em");
export const u = vNode.ToFunction("u");
export const s = vNode.ToFunction("s");
export const strike = vNode.ToFunction("strike");
export const del = vNode.ToFunction("del");
export const ins = vNode.ToFunction("ins");
export const sub = vNode.ToFunction("sub");
export const sup = vNode.ToFunction("sup");
export const mark = vNode.ToFunction("mark");
export const small = vNode.ToFunction("small");
export const abbr = vNode.ToFunction("abbr");
export const time = vNode.ToFunction("time");
export const dfn = vNode.ToFunction("dfn");
export const rt = vNode.ToFunction("rt");
export const rp = vNode.ToFunction("rp");

// Lists
export const ul = vNode.ToFunction("ul");
export const ol = vNode.ToFunction("ol");
export const li = vNode.ToFunction("li");
export const dl = vNode.ToFunction("dl");
export const dt = vNode.ToFunction("dt");
export const dd = vNode.ToFunction("dd");

// Tables
export const table = vNode.ToFunction("table");
export const thead = vNode.ToFunction("thead");
export const tbody = vNode.ToFunction("tbody");
export const tfoot = vNode.ToFunction("tfoot");
export const tr = vNode.ToFunction("tr");
export const th = vNode.ToFunction("th");
export const td = vNode.ToFunction("td");
export const col = vNode.ToFunction("col");
export const colgroup = vNode.ToFunction("colgroup");

// Forms
export const form = vNode.ToFunction("form");
export const input = vNode.ToFunction<HTMLInputElement>("input");
export const textarea = vNode.ToFunction<HTMLTextAreaElement>("textarea");
export const button = vNode.ToFunction<HTMLButtonElement>("button");
export const select = vNode.ToFunction<HTMLSelectElement>("select");
export const option = vNode.ToFunction<HTMLOptionElement>("option");
export const optgroup = vNode.ToFunction<HTMLOptGroupElement>("optgroup");
export const label = vNode.ToFunction("label");
export const fieldset = vNode.ToFunction("fieldset");
export const legend = vNode.ToFunction("legend");
export const datalist = vNode.ToFunction("datalist");
export const output = vNode.ToFunction("output");
export const progress = vNode.ToFunction<HTMLProgressElement>("progress");
export const meter = vNode.ToFunction<HTMLMeterElement>("meter");

// Media
export const img = vNode.ToFunction<HTMLImageElement>("img");
export const figure = vNode.ToFunction("figure");
export const figcaption = vNode.ToFunction("figcaption");
export const picture = vNode.ToFunction("picture");
export const source = vNode.ToFunction("source");
export const audio = vNode.ToFunction<HTMLAudioElement>("audio");
export const video = vNode.ToFunction<HTMLVideoElement>("video");
export const track = vNode.ToFunction("track");
export const embed = vNode.ToFunction("embed");
export const object = vNode.ToFunction("object");
export const param = vNode.ToFunction("param");
export const iframe = vNode.ToFunction("iframe");

// Interactive
export const details = vNode.ToFunction("details");
export const summary = vNode.ToFunction("summary");
export const dialog = vNode.ToFunction("dialog");
export const menu = vNode.ToFunction("menu");

// Scripting
export const canvas = vNode.ToFunction<HTMLCanvasElement>("canvas");
export const svg = vNode.ToFunction("svg");
export const map = vNode.ToFunction("map");
export const area = vNode.ToFunction("area");

// Meta content
export const template = vNode.ToFunction("template");
export const slot = vNode.ToFunction("slot");

// Text node
const textElement = vNode.ToFunction("text");
export const text = function (callback: () => string) {
  return textElement({ props: () => ({ nodeValue: callback() }) });
};
