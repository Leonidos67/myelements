import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
import {applyTheme} from './theme';
export default function ThemeToggle(){
 const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme||'dark');
 useEffect(()=>{const event=e=>setTheme(e.detail);const storage=e=>{if(e.key==='myelement-theme')setTheme(applyTheme(e.newValue));};window.addEventListener('myelement-theme',event);window.addEventListener('storage',storage);return()=>{window.removeEventListener('myelement-theme',event);window.removeEventListener('storage',storage);};},[]);
 return <button aria-label={theme==='dark'?'Включить светлую тему':'Включить тёмную тему'} title="Сменить тему" onClick={()=>setTheme(applyTheme(theme==='dark'?'light':'dark'))} className="theme-toggle fixed bottom-4 right-4 z-[160] inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-[11px] font-medium text-foreground shadow-lg hover:bg-elevated">{theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}<span>{theme==='dark'?'Светлая тема':'Тёмная тема'}</span></button>;
}
