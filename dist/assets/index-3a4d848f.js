(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function r(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(n){if(n.ep)return;n.ep=!0;const o=r(n);fetch(n.href,o)}})();var O=Object.defineProperty,f=(e,t)=>{for(var r in t)O(e,r,{get:t[r],enumerable:!0})},g={};f(g,{convertFileSrc:()=>v,invoke:()=>l,transformCallback:()=>u});function D(){return window.crypto.getRandomValues(new Uint32Array(1))[0]}function u(e,t=!1){let r=D(),i=`_${r}`;return Object.defineProperty(window,i,{value:n=>(t&&Reflect.deleteProperty(window,i),e?.(n)),writable:!1,configurable:!0}),r}async function l(e,t={}){return new Promise((r,i)=>{let n=u(a=>{r(a),Reflect.deleteProperty(window,`_${o}`)},!0),o=u(a=>{i(a),Reflect.deleteProperty(window,`_${n}`)},!0);window.__TAURI_IPC__({cmd:e,callback:n,error:o,...t})})}function v(e,t="asset"){let r=encodeURIComponent(e);return navigator.userAgent.includes("Windows")?`https://${t}.localhost/${r}`:`${t}://localhost/${r}`}async function s(e){return l("tauri",e)}var w={};f(w,{TauriEvent:()=>m,emit:()=>d,listen:()=>c,once:()=>I});async function E(e,t){return s({__tauriModule:"Event",message:{cmd:"unlisten",event:e,eventId:t}})}async function W(e,t,r){await s({__tauriModule:"Event",message:{cmd:"emit",event:e,windowLabel:t,payload:r}})}async function _(e,t,r){return s({__tauriModule:"Event",message:{cmd:"listen",event:e,windowLabel:t,handler:u(r)}}).then(i=>async()=>E(e,i))}async function L(e,t,r){return _(e,t,i=>{r(i),E(e,i.id).catch(()=>{})})}var m=(e=>(e.WINDOW_RESIZED="tauri://resize",e.WINDOW_MOVED="tauri://move",e.WINDOW_CLOSE_REQUESTED="tauri://close-requested",e.WINDOW_CREATED="tauri://window-created",e.WINDOW_DESTROYED="tauri://destroyed",e.WINDOW_FOCUS="tauri://focus",e.WINDOW_BLUR="tauri://blur",e.WINDOW_SCALE_FACTOR_CHANGED="tauri://scale-change",e.WINDOW_THEME_CHANGED="tauri://theme-changed",e.WINDOW_FILE_DROP="tauri://file-drop",e.WINDOW_FILE_DROP_HOVER="tauri://file-drop-hover",e.WINDOW_FILE_DROP_CANCELLED="tauri://file-drop-cancelled",e.MENU="tauri://menu",e.CHECK_UPDATE="tauri://update",e.UPDATE_AVAILABLE="tauri://update-available",e.INSTALL_UPDATE="tauri://update-install",e.STATUS_UPDATE="tauri://update-status",e.DOWNLOAD_PROGRESS="tauri://update-download-progress",e))(m||{});async function c(e,t){return _(e,null,t)}async function I(e,t){return L(e,null,t)}async function d(e,t){return W(e,void 0,t)}let p,y;const A=async()=>{y.textContent=await l("greet",{name:p.value}),console.log("PASKAA")};window.addEventListener("DOMContentLoaded",()=>{p=document.querySelector("#greet-input"),y=document.querySelector("#greet-msg"),document.querySelector("#greet-button").addEventListener("click",()=>A())});c("testi",e=>{console.log("event:",e)});c("loadtest",e=>{console.log("mainissa, event:",e)});d("testi",{theMessage:"shite"});window.addEventListener("DOMContentLoaded",()=>{d("loadtest",{payload:"contentloaded"})});c("loadtest",()=>{console.log("täällä")});