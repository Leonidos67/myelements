export function applyTheme(theme){
 const value=theme==='light'?'light':'dark';
 document.documentElement.dataset.theme=value;document.documentElement.style.colorScheme=value;
 try{localStorage.setItem('myelement-theme',value);}catch{}
 window.dispatchEvent(new CustomEvent('myelement-theme',{detail:value}));return value;
}
export function initTheme(){let theme='light';try{theme=localStorage.getItem('myelement-theme')||'light';}catch{}return applyTheme(theme);}
