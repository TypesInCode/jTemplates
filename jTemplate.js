!function(t){var e={};function n(i){if(e[i])return e[i].exports;var r=e[i]={exports:{},id:i,loaded:!1};return t[i].call(r.exports,r,r.exports,n),r.loaded=!0,r.exports}n.m=t,n.c=e,n.p="",n(0)}([function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(1);e.Template=i.Template,e.CreateComponentFunction=i.CreateComponentFunction;const r=n(8);e.ProxyObservable=r.ProxyObservable},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(2),r=n(5),s=n(10),a=n(11),o=n(12);function l(t,e,n){return{type:t,props:e&&e.props,on:e&&e.on,data:e&&e.data,text:e&&e.text,children:n}}function u(t,e,n,i){return{type:t,class:e,props:n&&n.props,on:n&&n.on,data:n&&n.data,templates:i}}function c(){return{}}e.TemplateFunction=l,e.CreateTemplateFunction=function(t){return l.bind(null,t)},e.ComponentFunction=u,e.CreateComponentFunction=function(t,e){return u.bind(null,t,e)};e.Template=class{constructor(t){this.templates=this.DefaultTemplates,this.SetTemplates(t.templates),t.children=t.children||this.Template.bind(this),this.bindingDefinition=t}get DefaultTemplates(){return{}}get Templates(){return this.templates}SetTemplates(t){if(t)for(var e in t)this.templates[e]=t[e]}AttachTo(t){this.bindingRoot||this.BindRoot(),this.Detach(),this.bindingParent=t,i.BindingConfig.addChild(t,this.bindingRoot)}Detach(){this.bindingParent&&(i.BindingConfig.removeChild(this.bindingParent,this.bindingRoot),this.bindingParent=null)}Destroy(){this.Detach(),this.bindingRoot=null,this.bindings.forEach(t=>t.Destroy()),this.bindings=[]}Template(t,e){return null}BindRoot(){var t,e,n,l;this.bindingRoot=i.BindingConfig.createBindingTarget(this.bindingDefinition.type),this.bindings=(t=this.bindingRoot,e=this.bindingDefinition,n=[],(l=e).props&&n.push(new r.default(t,l.props)),l.on&&n.push(new o.default(t,l.on)),l.text?n.push(new a.default(t,l.text)):l.children&&(l.data=l.data||c,n.push(new s.default(t,l.data,l.children))),n)}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(3);e.BindingConfig=i.DOMBindingConfig},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(4);var r=[],s=!1;e.DOMBindingConfig={scheduleUpdate:function(t){r.push(t),s||(s=!0,i.browser.requestAnimationFrame(()=>{s=!1;for(var t=0;t<r.length;t++)r[t]();r=[]}))},addListener:function(t,e,n){t.addEventListener(e,n)},removeListener:function(t,e,n){t.removeEventListener(e,n)},createBindingTarget:function(t){return i.browser.window.document.createElement(t)},addChild:function(t,e){t.appendChild(e)},removeChild:function(t,e){t.removeChild(e)},setText:function(t,e){t.textContent=e}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var i=null;function r(t){return t(),0}i="undefined"!=typeof window?window:new(n(!function(){var t=new Error('Cannot find module "jsdom"');throw t.code="MODULE_NOT_FOUND",t}()).JSDOM)("").window;var s=!1,a=/<([^\s]+)([^>]*)\/>/g;e.browser={window:i,get immediateAnimationFrames(){return s},set immediateAnimationFrames(t){s=t,this.requestAnimationFrame=(s?r:i.requestAnimationFrame||r).bind(i)},requestAnimationFrame:null,createDocumentFragment:function t(e){if("string"==typeof e)return e=e.replace(a,function(t,e,n){return`<${e}${n}></${e}>`}),t((new i.DOMParser).parseFromString(e,"text/html").body);for(var n=i.document.createDocumentFragment();e&&e.childNodes.length>0;)n.appendChild(e.childNodes[0]);return n}},e.browser.immediateAnimationFrames=!1},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(6);e.default=class extends i.Binding{constructor(t,e){super(t,e,null)}Apply(){this.ApplyRecursive(this.BoundTo,this.Value)}ApplyRecursive(t,e){if("object"!=typeof e)throw"Property binding must resolve to an object";for(var n in e){var i=e[n];null!==i&&"object"==typeof i&&i.constructor==={}.constructor?(t[n]=t[n]||{},this.ApplyRecursive(t[n],i)):t[n]=i&&i.valueOf()}}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(7),r=n(2);var s;!function(t){t[t.Init=0]="Init",t[t.Updating=1]="Updating",t[t.Updated=2]="Updated"}(s||(s={}));e.Binding=class{constructor(t,e,n){this.boundTo=t,this.status=s.Init,this.setCallback=this.Update.bind(this),this.observableScope=new i.ProxyObservableScope(e),this.observableScope.addListener("set",this.setCallback),this.Init(n),this.Update()}get Value(){return this.observableScope.Value}get BoundTo(){return this.boundTo}Update(){this.status==s.Init?(this.status=s.Updating,this.Apply(),this.status=s.Updated):this.status!=s.Updating&&(this.status=s.Updating,r.BindingConfig.scheduleUpdate(()=>{this.Apply(),this.status=s.Updated}))}Destroy(){this.observableScope&&this.observableScope.Destroy()}Init(t){}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(8),r=n(9);e.ProxyObservableScope=class extends r.Emitter{constructor(t){super(),this.valueFunction=t,this.trackedEmitters=new Set,this.setCallback=this.SetCallback.bind(this),this.UpdateValue()}get Value(){return this.dirty?(this.UpdateValue(),this.value):this.value}get Dirty(){return this.dirty}Destroy(){this.removeAllListeners(),this.trackedEmitters.forEach(t=>t.removeListener("set",this.setCallback)),this.trackedEmitters.clear()}UpdateValue(){var t=i.ProxyObservable.Watch(()=>{this.value=this.valueFunction()}),e=new Set([...t]);this.trackedEmitters.forEach(t=>{e.has(t)||t.removeListener("set",this.setCallback)}),e.forEach(t=>t.addListener("set",this.setCallback)),this.trackedEmitters=e,this.dirty=!1}SetCallback(){this.dirty=!0,this.emit("set")}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(9);!function(t){var e=new i.Emitter,n=0,r={},s={};class a{constructor(t,e,n){this.parent=t,this.path=e,this.prop=n}get value(){var t=this.parent[this.prop];return t&&t.__getRealValue()}__getRealValue(){return s[`${this.path}.${this.prop}`]}toString(){return this.value&&this.value.toString()}valueOf(){return this.value&&this.value.valueOf()}}function o(t){return!(Array.isArray(t)||"object"==typeof t&&{}.constructor===t.constructor)}function l(t,n){var l=new Proxy(n,{get:function(n,i){if("string"!=typeof i)return n[i];var s=r[`${t}.${i}`];return s&&e.emit("get",s),n[i]},set:function(e,n,c){var d=Array.isArray(e);if("string"!=typeof n)return e[n]=c,!0;var h,p=`${t}.${n}`;return r[p]=r[p]||new i.Emitter,!(e[n]!==c||d&&"length"===n)||(!o(c)||d&&"length"===n?e[n]=d&&"length"===n?c:u(c,p):e[n]=function(t,e,n,i){if(s[`${e}.${n}`]=i,"function"==typeof i){var r=function(){var e=t[n];e&&e.__getRealValue().apply(this,arguments)};return r.__getRealValue=function(){return s[`${e}.${n}`]},r}return new a(t,e,n)}(l,t,n,(h=c)&&h.__getRealValue?h.__getRealValue():h),r[p].emit("set"),d&&"length"===n&&r[t].emit("set"),!0)}});return l}function u(t,e){var n=l(e,Array.isArray(t)?[]:{});for(var s in Array.isArray(t)&&(r[`${e}.length`]=r[`${e}.length`]||new i.Emitter),t)n[s]=t[s];return n}t.Value=a,t.Create=function(t){if(o(t))throw"Only arrays and JSON types are supported";return u(t,(++n).toString())},t.Watch=function(t){var n=new Set;return e.addListener("get",t=>{n.has(t)||n.add(t)}),t(),e.removeAllListeners(),[...n]}}(e.ProxyObservable||(e.ProxyObservable={}))},function(t,e){"use strict";Object.defineProperty(e,"__esModule",{value:!0});class n{constructor(){this.callbackMap={}}addListener(t,e){var n=this.callbackMap[t]||new Set;n.has(e)||n.add(e),this.callbackMap[t]=n}removeListener(t,e){var n=this.callbackMap[t];n&&n.delete(e)}emit(t,...e){var n=this.callbackMap[t];n&&n.forEach(t=>t(...e))}clear(t){var e=this.callbackMap[t];e&&e.clear()}removeAllListeners(){for(var t in this.callbackMap)this.clear(t)}}e.Emitter=n,e.default=n},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(6),r=n(1);e.default=class extends i.Binding{constructor(t,e,n){super(t,e,n)}Destroy(){super.Destroy(),this.DestroyTemplates(this.activeTemplates),this.activeTemplates=[]}Init(t){this.activeTemplates=[],this.childrenFunction=t}Apply(){this.activeTemplates=this.activeTemplates||[];var t,e=this.Value;if(e?Array.isArray(e)||(e=[e]):e=[],this.activeTemplates.length<e.length)for(var n=this.activeTemplates.length;n<e.length;n++){var i=this.childrenFunction(e[n],n);Array.isArray(i)||(i=[i]);var s=i.filter(t=>t).map(e=>(t=e,new(t.class||r.Template)(t)));this.activeTemplates[n]=s,s.forEach(t=>t.AttachTo(this.BoundTo))}else{var a=this.activeTemplates.splice(e.length);this.DestroyTemplates(a)}}DestroyTemplates(t){for(var e=0;e<t.length;e++)for(var n=0;n<t[e].length;n++)t[e][n].Destroy()}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(6),r=n(2);e.default=class extends i.Binding{constructor(t,e){super(t,e,null)}Apply(){r.BindingConfig.setText(this.BoundTo,this.Value)}}},function(t,e,n){"use strict";Object.defineProperty(e,"__esModule",{value:!0});const i=n(6),r=n(2);e.default=class extends i.Binding{constructor(t,e){super(t,e,null)}Apply(){for(var t in this.boundEvents)r.BindingConfig.removeListener(this.BoundTo,t,this.boundEvents[t]);this.boundEvents={};var e=this.Value;for(var t in e)this.boundEvents[t]=e[t],r.BindingConfig.addListener(this.BoundTo,t,e[t])}}}]);