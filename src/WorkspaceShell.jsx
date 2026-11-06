import {useEffect,useRef,useState} from 'react';
import {Layers,LayoutDashboard,FolderOpen,Wallet,Calendar,Bookmark,Bot,Search,ChevronsUpDown,Plus,ChevronRight,Menu,X,LogOut,FileSliders} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AccountSwitcher from './AccountSwitcher';
const links=[{id:'dashboard',label:'Обзор',icon:LayoutDashboard},{id:'accounts',label:'Аккаунты UBT',icon:FolderOpen},{id:'finance',label:'Финансы и цели',icon:Wallet},{id:'calendar',label:'Календарь',icon:Calendar},{id:'savings',label:'Сохранёнки',icon:Bookmark},{id:'ai',label:'AI-ассистент',icon:Bot}];
export default function WorkspaceShell({children,view='project',onNavigate,username='Личный кабинет',breadcrumb='MyElement',onCreate,onAgent,onLogout,accounts,activeAccount,onAccountChange,onAddAccount}){
 const [query,setQuery]=useState(''),[mobile,setMobile]=useState(false);const search=useRef(null);
 useEffect(()=>{const key=e=>{if(e.key==='Escape')setMobile(false);if(e.key.toLowerCase()==='f'&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){e.preventDefault();search.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
 const items=links.filter(l=>l.label.toLowerCase().includes(query.toLowerCase()));
 function navigate(e,id){setMobile(false);if(onNavigate){e.preventDefault();onNavigate(id);}}
 return <div className="workspace-layout min-h-screen text-foreground">
  {mobile&&<button aria-label="Закрыть навигацию" onClick={()=>setMobile(false)} className="fixed inset-0 z-[69] bg-black/40 backdrop-blur-sm lg:hidden"/>}
  <aside aria-label="Рабочее пространство" className={'workspace-sidebar '+(mobile?'is-open':'')}>
   <div className="workspace-switcher"><AccountSwitcher accounts={accounts} activeAccount={activeAccount} onChange={onAccountChange} onAdd={onAddAccount}/><button onClick={()=>setMobile(false)} aria-label="Закрыть меню" className="p-1 text-subtle lg:hidden"><X size={15}/></button></div>
   <label className="workspace-search"><Search size={15}/><input ref={search} aria-label="Найти раздел" placeholder="Найти раздел…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>F</kbd></label>
   <nav className="workspace-navigation" aria-label="Разделы кабинета">
    {view==='project'&&<><a className="workspace-nav-item active" href={window.location.pathname}><FileSliders size={16}/><span>Проект макета</span></a><div className="workspace-divider"/></>}
    {items.map(({id,label,icon:Icon},i)=><div key={id}>{id==='savings'&&!query&&<div className="workspace-divider"/>}<a href={'/?view='+id} onClick={e=>navigate(e,id)} aria-current={view===id?'page':undefined} className={'workspace-nav-item '+(view===id?'active':'')}><Icon size={16}/><span>{label}</span>{id==='ai'&&<span className="workspace-beta">AI</span>}{id==='accounts'&&<ChevronRight size={13} className="ml-auto text-subtle"/>}</a></div>)}
    {!items.length&&<p className="px-3 py-4 text-xs text-subtle">Раздел не найден</p>}
   </nav>
   <footer className="workspace-sidebar-footer"><ThemeToggle inline/><div className="workspace-profile"><span className="workspace-avatar small">{username.slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-xs">{username}</span>{onLogout&&<button onClick={onLogout} aria-label="Выйти" title="Выйти" className="rounded-md p-1.5 text-subtle hover:bg-elevated hover:text-foreground"><LogOut size={14}/></button>}</div></footer>
  </aside>
  <div className="workspace-main"><header className="workspace-topbar"><div className="flex min-w-0 items-center gap-3"><button onClick={()=>setMobile(true)} aria-label="Открыть навигацию" className="rounded-md p-1.5 text-muted hover:bg-elevated lg:hidden"><Menu size={17}/></button><nav aria-label="Путь страницы" className="workspace-breadcrumbs"><a href="/" onClick={e=>{if(onNavigate){e.preventDefault();onNavigate('dashboard');}}}>Главная</a><span aria-hidden="true">/</span>{view==='project'?<><span className="workspace-crumb-parent">Проекты</span><span aria-hidden="true">/</span><span aria-current="page" title={breadcrumb}>{breadcrumb==='MyElement'?'Проект видео':breadcrumb}</span></>:<span aria-current="page">{links.find(item=>item.id===view)?.label||'Обзор'}</span>}</nav></div><div className="flex shrink-0 items-center gap-2 sm:gap-4">{onCreate?<button onClick={onCreate} aria-label="Создать видео" className="workspace-top-action"><Plus size={15}/><span className="hidden sm:inline">Создать</span></button>:<a href="/?create=video" aria-label="Создать видео" className="workspace-top-action"><Plus size={15}/><span className="hidden sm:inline">Создать</span></a>}{onAgent?<button onClick={onAgent} className="workspace-top-action"><Bot size={15}/><span>Ассистент</span></button>:<a href="/?view=ai" className="workspace-top-action"><Bot size={15}/><span>Ассистент</span></a>}</div></header>
   <div className="workspace-content">{children}</div>
  </div>
 </div>;
}
