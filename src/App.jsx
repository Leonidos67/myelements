import { useEffect, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { api } from './api';
import Login from './Login';
import WorkspaceShell from './WorkspaceShell';
import LikesHint from './LikesHint';
import {likesTarget} from './likesPolicy';
import CommentPageModal from './CommentPageModal';
import VideoScriptModal from './VideoScriptModal';
import EditVideoModal from './EditVideoModal';
import AIChat from './AIChat';
import CalendarView from './CalendarView';
import SavingsView from './SavingsView';
import { getUsdRate } from './currency';
import { 
  Copy, CopyPlus, ExternalLink, ArrowRightLeft, Filter, ArrowDownWideNarrow, Search, Plus, LogOut, User, Wallet, Eye, EyeOff,
  Gift, Gamepad2, Sparkles, Palette, 
  Settings, Trash2, X, ChevronDown, CreditCard, DollarSign,
  LayoutDashboard, FolderOpen, MoreVertical, Target, Calendar, Bot, Bookmark,
  ChevronLeft, ChevronRight, Upload, FileCode2, Star, Pin, PinOff, Info, Heart, AlertCircle, CheckCircle2, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';

const fmtMoney = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => n.toLocaleString('en-US');

const CAT_ICONS = {
  gifts: Gift,
  cs2: Gamepad2,
  dota: Gamepad2,
  creative: Palette,
  rubup: Sparkles,
};


export default function App() {
  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(true);
  const [stats, setStats] = useState(null);
  const [showDashboardSummary, setShowDashboardSummary] = useState(true);
  const summaryToggleLabel = showDashboardSummary ? 'Скрыть сводку' : 'Показать сводку';
  const [accounts, setAccounts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [savings, setSavings] = useState([]);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [adjustments, setAdjustments] = useState([]);

  const [activeAccount, setActiveAccount] = useState(() => {
    const saved = localStorage.getItem('ubt_active_account');
    return saved === 'all' ? '' : (saved || '');
  });

  const [err, setErr] = useState('');
  const [videoNotice,setVideoNotice]=useState('');
  useEffect(()=>{if(!videoNotice)return;const timer=setTimeout(()=>setVideoNotice(''),4500);return()=>clearTimeout(timer);},[videoNotice]);
  function safeVideoUrl(url){try{const value=new URL(url);return ['http:','https:'].includes(value.protocol)?value.href:null;}catch{return null;}}
  async function copyVideoLink(video){setOpenMenuId(null);try{await navigator.clipboard.writeText(video.url);setVideoNotice('Ссылка на видео скопирована');}catch{setErr('Не удалось скопировать ссылку. Откройте настройки и скопируйте её из поля.');}}
  async function copyVideoCode(code) {
    try { await navigator.clipboard.writeText('#' + code); setVideoNotice('ID #' + code + ' скопирован'); }
    catch { setErr('Не удалось скопировать ID #' + code); }
  }
  async function duplicateVideo(video){
    setOpenMenuId(null);if(!window.confirm('Создать копию видео без статистики и расходов? Комментарии, проект и JS не копируются.'))return;
    setVideoActionIds(ids=>new Set(ids).add(video._id));
    try{await api.duplicateVideo(video._id);setVideoQuery('');setVideoStatus('');setOnlyFavorites(false);setVideoSort('newest');await reload();setVideoNotice('Копия создана со статусом «На модерации» и нулевыми показателями.');}catch(e){setErr(e.message);}finally{setVideoActionIds(ids=>{const next=new Set(ids);next.delete(video._id);return next;});}
  }
  async function removeVideo(video){
    setOpenMenuId(null);if(!window.confirm('Удалить видео «'+(video.title||video.url)+'»? Его страницы комментариев, проект макета и сохранённый JS также будут удалены. Это действие нельзя отменить.'))return;
    setVideoActionIds(ids=>new Set(ids).add(video._id));
    try{await api.deleteVideo(video._id);setVideos(rows=>rows.filter(v=>v._id!==video._id));await reload();await refreshCommentSummary();setVideoNotice('Видео и связанные данные удалены.');}catch(e){setErr(e.message);}finally{setVideoActionIds(ids=>{const next=new Set(ids);next.delete(video._id);return next;});}
  }
  const [goal, setGoal] = useState(null);

  const [currentView, setCurrentView] = useState(() => { const view=new URLSearchParams(window.location.search).get('view'); return ['dashboard','accounts','finance','calendar','savings','ai'].includes(view)?view:'dashboard'; });
  const [isAddOpen, setIsAddOpen] = useState(() => new URLSearchParams(window.location.search).get('create')==='video');
  const [editVideo, setEditVideo] = useState(null);
  const [commentVideo, setCommentVideo] = useState(null);
  const [scriptVideo, setScriptVideo] = useState(null);
  const [openingProject, setOpeningProject] = useState(false);
  async function openProject(video) {
    setOpeningProject(true); setOpenMenuId(null); setErr('');
    try { const project=await api.openStatProject(video._id); window.location.assign('/projects/'+project._id); }
    catch(e){setErr(e.status===404?'API проектов пока недоступно. Перезапустите обновлённый сервер MyElement.':e.message);}
    finally{setOpeningProject(false);}
  }
  const [videoQuery,setVideoQuery]=useState('');
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [videoCategory,setVideoCategory]=useState('');
  const [videoStatus,setVideoStatus]=useState('');
  const [videoSort,setVideoSort]=useState('newest');
  const hasVideoFilters=!!(videoQuery.trim()||onlyFavorites||videoCategory||videoStatus||activeAccount);
  function resetVideoFilters(){setVideoQuery('');setOnlyFavorites(false);setVideoCategory('');setVideoStatus('');setVideoSort('newest');setActiveAccount('');}
  const [videoMenuPage, setVideoMenuPage] = useState('main');
  const [videoMenuAnchor,setVideoMenuAnchor]=useState(null);

  function menuStyle(){if(!videoMenuAnchor)return{};const below=window.innerHeight-videoMenuAnchor.bottom-12,above=videoMenuAnchor.top-12,desired=videoMenuPage==='layout'?210:260;const down=below>=desired||below>=above;return{left:Math.max(8,Math.min(window.innerWidth-248,videoMenuAnchor.right-240)),top:down?videoMenuAnchor.bottom+6:undefined,bottom:down?undefined:window.innerHeight-videoMenuAnchor.top+6,maxHeight:Math.max(100,(down?below:above)-6)};}
  const scriptFileInput = useRef(null);
  const scriptFileVideo = useRef(null);
  const [videoActionIds, setVideoActionIds] = useState(() => new Set());
  const toggleVideoFlag = async (video, field) => {
    setVideoActionIds(ids => new Set(ids).add(video._id));
    try {
      const updated = await api.updateVideo(video._id, { [field]: !video[field] });
      setVideos(rows => rows.map(row => row._id === video._id ? updated : row));
    } catch (e) { setErr(e.message || 'Не удалось обновить видео'); }
    finally { setVideoActionIds(ids => { const next = new Set(ids); next.delete(video._id); return next; }); }
  };
  const [commentSummary, setCommentSummary] = useState(null);
  const [commentSummaryError, setCommentSummaryError] = useState(false);
  const refreshCommentSummary = async () => {
    try {
      const rows = await api.commentSummary();
      setCommentSummary(Object.fromEntries(rows.map(row => [row._id, row])));
      setCommentSummaryError(false);
    } catch { setCommentSummaryError(true); }
  };
  useEffect(() => {
    if (!me) { setCommentSummary(null); return; }
    refreshCommentSummary();
    const timer = setInterval(() => { if (!document.hidden) refreshCommentSummary(); }, 15000);
    window.addEventListener('focus', refreshCommentSummary);
    return () => { clearInterval(timer); window.removeEventListener('focus', refreshCommentSummary); };
  }, [me]);

  const [openMenuId, setOpenMenuId] = useState(null);
  useEffect(()=>{if(!openMenuId)return;const close=e=>{if(e?.target?.closest?.('.video-actions-menu'))return;setOpenMenuId(null);};const key=e=>{if(e.key==='Escape')close();};window.addEventListener('resize',close);window.addEventListener('scroll',close,true);document.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);document.removeEventListener('keydown',key);};},[openMenuId]);
  const [openStatusId, setOpenStatusId] = useState(null);

  useEffect(() => {
    if (activeAccount) {
      localStorage.setItem('ubt_active_account', activeAccount);
    } else {
      localStorage.setItem('ubt_active_account', 'all');
    }
  }, [activeAccount]);

  useEffect(() => {
    api.me()
      .then((m) => { setMe(m); reload(); })
      .catch(() => setMe(null))
      .finally(() => setBooting(false));
  }, []);

  const reload = async () => {
    try {
      const [s, a, v, g, i, sv, adj] = await Promise.all([
        api.stats(), api.accounts(), api.videos(), api.getGoal(), api.ideas(), api.savings(), api.adjustments()
      ]);
      setStats(s); setAccounts(a); setVideos(v); setGoal(g); setIdeas(i || []); setSavings(sv || []); setAdjustments(adj || []);

      if (activeAccount) {
        if (!a.some(acc => acc._id === activeAccount)) setActiveAccount('');
      } else {
        const saved = localStorage.getItem('ubt_active_account');
        if (saved !== 'all' && a.length > 0) setActiveAccount(a[0]._id);
      }
    } catch (e) {
      setErr(e.message || 'load failed');
    }
  };

  const logout = async () => {
    await api.logout();
    localStorage.setItem('ubt_active_account', 'all');
    setActiveAccount('');
    setMe(null);
  };

  const addAccount = async () => {
    const name = prompt('Название аккаунта UBT:');
    if (name) {
      await api.addAccount({ name });
      reload();
    }
  };

  const deleteAccount = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Удалить аккаунт?')) return;
    try {
      await api.deleteAccount(id);
      if (activeAccount === id) setActiveAccount('');
      reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const getLikesStatus=(likes,views)=>{
    const target=likesTarget(views,likes);if(!target)return null;
    const appearance={low:{color:'text-red-400',icon:ArrowDownCircle,label:'Мало'},ideal:{color:'text-green-400',icon:CheckCircle2,label:'Норма'},high:{color:'text-blue-400',icon:ArrowDownCircle,label:'Перебор'}};
    return {...target,...appearance[target.status]};
  };

  if (booting) return <div className="p-6 text-muted bg-surface min-h-screen">…</div>;
  if (!me) return <Login onLogin={(user) => { setMe(user); reload(); }} />;

  const accountVideos=activeAccount?videos.filter(v=>(typeof v.account==='string'?v.account:v.account?._id)===activeAccount):videos;
  const displayedVideos=accountVideos.filter(v=>(!onlyFavorites||v.isFavorite)&&(!videoCategory||v.category===videoCategory)&&(!videoStatus||v.status===videoStatus)&&[v.title,v.url,v.createdBy?.username,v.shortId && '#' + v.shortId].filter(Boolean).join(' ').toLowerCase().includes(videoQuery.trim().toLowerCase())).sort((a,b)=>{
    const pinned=Number(!!b.isPinned)-Number(!!a.isPinned);if(pinned)return pinned;
    const date=(new Date(b.createdAt).getTime()||0)-(new Date(a.createdAt).getTime()||0);
    if(videoSort==='oldest')return -date;
    if(videoSort==='views')return (Number(b.views)||0)-(Number(a.views)||0)||date;
    if(videoSort==='likes')return (Number(b.likes)||0)-(Number(a.likes)||0)||date;
    if(videoSort==='revenue')return (Number(b.revenue)||0)-(Number(a.revenue)||0)||date;
    return date;
  });

  const daysLeft = goal ? Math.max(0, Math.ceil((new Date(goal.deadlineDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <WorkspaceShell view={currentView} onNavigate={setCurrentView} username={me.username} accounts={accounts} activeAccount={activeAccount} onAccountChange={setActiveAccount} onAddAccount={addAccount} onCreate={() => setIsAddOpen(true)} onAgent={() => setCurrentView('ai')} onLogout={logout}><div className="studio-shell text-foreground font-sans">
      <header className="studio-header flex flex-wrap justify-between items-center gap-5">
        <div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {currentView === 'dashboard' && 'Партнёрская программа'}
            {currentView === 'accounts' && 'Аккаунты UBT'}
            {currentView === 'finance' && 'Финансы и цели'}
            {currentView === 'calendar' && 'Календарь'}
            {currentView === 'savings' && 'Сохраненки'}
            {currentView === 'ai' && 'AI Ассистент'}
          </h1>
          <p className="text-xs text-subtle mt-2">
            {currentView === 'dashboard' && 'Управление видео и выплатами'}
            {currentView === 'accounts' && 'Список всех аккаунтов и их статистика'}
            {currentView === 'finance' && 'Анализ выплат и планирование'}
            {currentView === 'calendar' && 'Идеи и график выплат'}
            {currentView === 'savings' && 'Референсы и вдохновение'}
            {currentView === 'ai' && 'Интеллектуальный помощник (RouterAI)'}
          </p>
        </div>

        {currentView === 'dashboard' && stats && (
          <button
            type="button"
            aria-label={summaryToggleLabel}
            aria-expanded={showDashboardSummary}
            aria-controls="dashboard-summary"
            title={summaryToggleLabel}
            onClick={() => setShowDashboardSummary(visible => !visible)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            {showDashboardSummary ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        )}
      </header>


      {videoNotice&&<p role="status" className="mb-4 rounded-xl border border-line bg-elevated px-4 py-3 text-xs text-foreground">{videoNotice}</p>}
      {err && <div className="mb-6 rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-red-400 text-sm">{err}</div>}

      {currentView === 'dashboard' && (
        <>
          {stats && (
            <div id="dashboard-summary" hidden={!showDashboardSummary} className={showDashboardSummary ? "grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" : undefined}>
              <div className="studio-panel bg-surface border border-line rounded-2xl p-6 relative group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider">
                    <Wallet size={14} /> Выплачено
                  </div>
                  <button 
                    onClick={() => setIsAdjustOpen(true)} 
                    className="p-1 bg-elevated rounded-md text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="Пополнить баланс"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{fmtMoney(stats.totalRevenue)}</div>
                <button 
                  onClick={() => setIsHistoryOpen(true)} 
                  className="text-[11px] text-subtle hover:text-foreground transition-colors underline decoration-dotted underline-offset-2 mt-2 inline-block"
                >
                  история операций
                </button>
              </div>
              <div className="studio-panel bg-surface border border-line rounded-2xl p-6">
                <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider mb-2"><Eye size={14} /> Просмотры</div>
                <div className="text-3xl font-mono font-semibold">{fmtInt(stats.totalViews)}</div>
                <div className="text-[11px] text-subtle mt-2">{stats.totalVideos} видео</div>
              </div>
              <div className="studio-panel expected-profit-card bg-surface border border-line rounded-2xl p-6">
                <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider mb-2"><DollarSign size={14} /> Ожидаемая прибыль</div>
                <div className="text-3xl font-mono font-semibold">{fmtMoney(stats.totalGross)}</div>
                <div className="text-[11px] text-subtle mt-2">по остальным статусам</div>
              </div>
              <div className="studio-panel bg-surface border border-line rounded-2xl p-6">
                <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider mb-2"><CreditCard size={14} /> Расходы</div>
                <div className="text-3xl font-mono font-semibold text-red-400">{fmtMoney(stats.totalExpenses)}</div>
              </div>
            </div>
          )}

          <div className="studio-panel bg-surface border border-line rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold">Ваши видео {activeAccount && <span className="text-subtle text-xs font-normal">(фильтр по аккаунту)</span>}</h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted font-mono">{displayedVideos.length} из {accountVideos.length}</span>
                <button onClick={() => setIsAddOpen(true)} className="h-8 px-4 bg-primary text-primary-foreground font-medium text-xs rounded-lg hover:opacity-90 flex items-center gap-1.5"><Plus size={14} /> Добавить видео</button>
              </div>
            </div>

            <div className="workspace-filters">
              <label className="workspace-video-search"><Search size={14}/><input aria-label="Найти видео" value={videoQuery} onChange={e=>setVideoQuery(e.target.value)} placeholder="Видео или #ID…"/></label>
              <button aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(v=>!v)} className={'workspace-filter-chip '+(onlyFavorites?'selected':'')}><Star size={13} fill={onlyFavorites?'currentColor':'none'}/>Избранные</button>
              <label className={'workspace-filter-chip workspace-filter-select '+(videoCategory?'selected':'')}><Filter size={13}/><select aria-label="Тематика видео" value={videoCategory} onChange={e=>setVideoCategory(e.target.value)}><option value="">Тематика: все</option>{Object.entries(stats?.categories||{}).map(([key,cat])=><option key={key} value={key}>{cat.label}</option>)}</select></label>
              <label className={'workspace-filter-chip workspace-filter-select '+(videoStatus?'selected':'')}><select aria-label="Статус видео" value={videoStatus} onChange={e=>setVideoStatus(e.target.value)}><option value="">Статус: все</option><option value="moderation">На модерации</option><option value="published">Опубликовано</option><option value="rejected">Отказано</option><option value="paid">Выплатили</option></select></label>
              {activeAccount&&<button onClick={()=>setActiveAccount('')} className="workspace-filter-chip dashed"><span className="text-subtle">Аккаунт</span>{accounts.find(a=>a._id===activeAccount)?.name}<X size={12}/></button>}
              {(hasVideoFilters||videoSort!=='newest')&&<button onClick={resetVideoFilters} className="workspace-filter-reset"><X size={12}/>Сбросить</button>}
              <label className="workspace-filter-chip workspace-filter-select workspace-sort" title="Закреплённые видео всегда сверху"><ArrowDownWideNarrow size={13}/><select aria-label="Сортировка видео" value={videoSort} onChange={e=>setVideoSort(e.target.value)}><option value="newest">Новые сначала</option><option value="oldest">Старые сначала</option><option value="views">Больше просмотров</option><option value="likes">Больше лайков</option><option value="revenue">Больше дохода</option></select></label>
            </div>
            <div className="studio-table-wrap overflow-x-auto">
              <table className="studio-table w-full text-xs text-left border-collapse min-w-[1290px]">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="pb-3 w-10 text-center" aria-label="Избранное"><Star size={12} className="mx-auto text-subtle" aria-hidden="true" /></th>
                    <th scope="col" className="pb-3 font-medium video-id-column">ID</th>
                    <th className="pb-3 font-medium">Админ</th>
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium">Ссылка</th>
                    <th className="pb-3 font-medium">Тематика</th>
                    <th className="pb-3 font-medium text-right">Просмотры</th>
                    <th className="pb-3 font-medium text-center" title="Общая норма: 30–50 лайков на 1 000 просмотров (ER 3–5%)">Лайки (ER+факт)</th>
                    <th className="pb-3 font-medium text-center px-3">Комментарии</th>
                    <th className="pb-3 font-medium text-right">CPM</th>
                    <th className="pb-3 font-medium text-right">Начислено</th>
                    <th className="pb-3 font-medium text-right">Траты</th>
                    <th className="pb-3 font-medium text-right">Доход</th>
                    <th className="pb-3 font-medium text-center">Статус</th>
                    <th className="pb-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                {displayedVideos.map(v => {
                  const cat = stats?.categories[v.category] || { label: v.category, minViews: 0 };
                  const isMin = v.views >= (cat.minViews || 0);
                  const cpm = v.views > 0 ? ((v.grossRevenue / v.views) * 1000).toFixed(2) : '0.00';

                  const likesStatus = getLikesStatus(v.likes, v.views);
                  const comments = commentSummary?.[v._id];

                  const statusColors = {
                    moderation: 'bg-gray-500/20 text-muted',
                    published: 'bg-blue-500/20 text-blue-400',
                    rejected: 'bg-red-500/20 text-red-400',
                    paid: 'bg-green-500/20 text-green-400',
                  };
                  const statusLabels = {
                    moderation: 'На модерации',
                    published: 'Опубликовано',
                    rejected: 'Отказано',
                    paid: 'Выплатили',
                  };
                  const CatIcon = CAT_ICONS[v.category] || Sparkles;
                  const adminName = typeof v.createdBy === 'object' && v.createdBy !== null ? v.createdBy.username : 'Admin';
                  const dateStr = new Date(v.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });

                  return (
                    <tr key={v._id} className="border-b border-line/50 hover:bg-elevated transition-colors">
                      <td className="py-3 pr-2 text-center"><button disabled={videoActionIds.has(v._id)} onClick={() => toggleVideoFlag(v, 'isFavorite')} title={v.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'} aria-label={v.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'} aria-pressed={!!v.isFavorite} className={'p-1.5 rounded-lg transition-colors hover:bg-elevated disabled:opacity-40 ' + (v.isFavorite ? 'text-amber-400' : 'text-subtle hover:text-amber-300')}><Star size={15} fill={v.isFavorite ? 'currentColor' : 'none'} /></button></td>
                      <td className="py-3 video-id-column">
                        {v.shortId ? <button type="button" onClick={() => copyVideoCode(v.shortId)} title="Скопировать ID видео" aria-label={'Скопировать ID видео #' + v.shortId} className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted hover:bg-inset hover:text-foreground">#{v.shortId}<Copy size={10} aria-hidden="true" /></button> : <span title="Короткий ID ещё не получен" className="text-subtle">—</span>}
                      </td>
                      <td className="py-3 text-foreground font-mono text-[11px]">{adminName}</td>
                      <td className="py-3 text-muted font-mono text-[11px]">{dateStr}</td>
                      <td className="py-3">
                        <a href={v.url} target="_blank" rel="noreferrer" className="text-foreground hover:underline break-all block max-w-[150px] truncate" title={v.title || v.url}>{v.title || v.url}</a>
                        {v.isPinned && <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-subtle"><Pin size={10} />Закреплено</span>}
                      </td>
                      <td className="py-3 text-foreground">
                        <div className="flex items-center gap-2" title={cat.label}>
                          <CatIcon size={14} className="text-subtle" />
                          <span>{cat.label.replace(/^[^\s]+\s/, '')}</span>
                        </div>
                      </td>
                      {/* ЯЧЕЙКА ПРОСМОТРОВ */}
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Иконка повышения просмотров, если лайков перебор */}
                          {likesStatus && likesStatus.status === 'high' && (
                            <ArrowUpCircle size={14} className="text-blue-400" title="Много лайков! Пора докрутить просмотры." />
                          )}
                          <input 
                            type="number" 
                            defaultValue={v.views} 
                            onBlur={async (e) => {
                              const n = +e.target.value || 0;
                              if (n !== v.views) { await api.updateVideo(v._id, { views: n }); reload(); }
                            }} 
                            className={`w-20 bg-surface border rounded px-2 py-1 text-right font-mono text-xs outline-none focus:border-foreground ${!isMin ? 'border-red-500/50' : 'border-line'}`}
                            title={!isMin ? `Внимание: минимум ${cat.minViews} просмотров` : ''} 
                          />
                        </div>
                      </td>
                      {/* ЯЧЕЙКА ЛАЙКОВ */}
                      <td className="py-3">
                        <div className="flex flex-col items-center">
                          <LikesHint views={v.views} likes={v.likes||0}/>

                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              defaultValue={v.likes || ''} 
                              placeholder="0"
                              onBlur={async (e) => {
                                const n = +e.target.value || 0;
                                if (n !== (v.likes || 0)) { await api.updateVideo(v._id, { likes: n }); reload(); }
                              }} 
                              className="w-16 bg-surface border border-line rounded px-2 py-1 text-center font-mono text-xs outline-none focus:border-foreground"
                            />

                            {/* Иконка + Текст статуса */}
                            <div className="flex items-center gap-1 min-w-[50px]">
                              {/* Мало лайков -> Стрелка ВВЕРХ (нужно больше) */}
                              {likesStatus && likesStatus.status === 'low' && (
                                <>
                                  <ArrowUpCircle size={14} className="text-red-400" />
                                  <span className="text-[9px] text-red-400">Мало</span>
                                </>
                              )}

                              {/* Норма -> Стрелка ВВЕРХ (почти идеал) */}
                              {likesStatus && likesStatus.status === 'ok' && (
                                <>
                                  <ArrowUpCircle size={14} className="text-yellow-400" />
                                  <span className="text-[9px] text-yellow-400">Норма</span>
                                </>
                              )}

                              {/* Идеал -> Галочка */}
                              {likesStatus && likesStatus.status === 'ideal' && (
                                <>
                                  <CheckCircle2 size={14} className="text-green-400" />
                                  <span className="text-[9px] text-green-400">Ок</span>
                                </>
                              )}

                              {/* Перебор лайков -> Стрелка ВНИЗ (сбавь обороты) */}
                              {likesStatus && likesStatus.status === 'high' && (
                                <>
                                  <ArrowDownCircle size={14} className="text-blue-400" />
                                  <span className="text-[9px] text-blue-400">Много</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {commentSummaryError ? <button onClick={refreshCommentSummary} className="text-muted text-[10px] hover:text-foreground" title="Не удалось загрузить прогресс. Повторить">Обновить</button> : !commentSummary ? <span className="text-subtle">…</span> : comments ? <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <span className={comments.issued === comments.total ? 'font-mono text-green-400' : 'font-mono text-foreground'} title="Выдано комментариев">{comments.issued} из {comments.total}</span>
                          <button onClick={() => setCommentVideo(v)} title="Подробнее о комментариях" aria-label="Подробнее о комментариях" className="p-1 rounded text-muted hover:text-foreground hover:bg-elevated"><Info size={15} /></button>
                        </div> : <button onClick={() => setCommentVideo(v)} className="px-2 py-1 rounded text-foreground hover:bg-elevated inline-flex items-center gap-1"><Plus size={12} /> Добавить</button>}
                      </td>
                      <td className="py-3 text-right font-mono text-muted text-[11px]" title="Стоимость 1000 просмотров">${cpm}</td>
                      <td className="py-3 text-right font-mono text-foreground">${v.grossRevenue.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono text-red-400">-${v.totalExpenses.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono text-foreground font-semibold">${v.revenue.toFixed(2)}</td>
                      <td className="py-3 text-center relative">
                        <button onClick={() => setOpenStatusId(openStatusId === v._id ? null : v._id)} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase font-semibold transition-opacity hover:opacity-80 ${statusColors[v.status]}`}>
                          {statusLabels[v.status]} <ChevronDown size={10} className="opacity-50" />
                        </button>
                        {openStatusId === v._id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenStatusId(null)} />
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-36 bg-surface border border-line rounded-lg shadow-xl py-1">
                              {Object.entries(statusLabels).map(([key, label]) => (
                                <button key={key} onClick={async () => {
                                  setOpenStatusId(null);
                                  if (v.status !== key) { await api.updateVideo(v._id, { status: key }); reload(); }
                                }} className={`w-full text-left px-3 py-2 text-[11px] transition-colors flex items-center justify-between ${v.status === key ? 'bg-elevated text-foreground' : 'text-foreground hover:bg-elevated'}`}>
                                  {label}
                                  {v.status === key && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-3 text-right relative">
                        <button onClick={e => { const rect=e.currentTarget.getBoundingClientRect();setVideoMenuAnchor({right:rect.right,top:rect.top,bottom:rect.bottom});setVideoMenuPage('main');setOpenMenuId(openMenuId===v._id?null:v._id); }} aria-label="Действия с видео" aria-expanded={openMenuId===v._id} className="p-1 text-subtle hover:text-foreground rounded hover:bg-elevated transition-colors"><MoreVertical size={16} /></button>
                        {openMenuId === v._id && videoMenuAnchor && createPortal(
                          <>
                            <div className="fixed inset-0 z-[150]" onClick={() => setOpenMenuId(null)} />
                            <div style={menuStyle()} className="video-actions-menu fixed z-[151] w-60 overflow-y-auto bg-surface border border-line rounded-xl shadow-xl p-1.5">
                              {videoMenuPage === 'layout' ? <>
                                <button onClick={() => setVideoMenuPage('main')} className="flex w-full items-center gap-2 border-b border-line px-3 py-2.5 text-left text-xs font-medium text-foreground hover:bg-elevated"><ChevronLeft size={14} />Макет</button>
                                <button disabled={openingProject} onClick={() => openProject(v)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-elevated disabled:opacity-40"><FolderOpen size={13} />{openingProject?'Открываем…':'Проект и параметры'}</button>
                                <button onClick={() => {setOpenMenuId(null);setScriptVideo(v);}} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-elevated"><FileCode2 size={13} />Извлечь JS</button>
                                <button onClick={() => {scriptFileVideo.current=v;setOpenMenuId(null);scriptFileInput.current.click();}} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-elevated"><Upload size={13} />Загрузить новый JS</button>
                                <a href={'/tt-stat/' + v._id} target="_blank" rel="noreferrer" onClick={() => setOpenMenuId(null)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground hover:bg-elevated"><Eye size={13} />Предпросмотр<ChevronRight size={12} className="ml-auto text-subtle" /></a>
                              </> : <>
                              <div className="video-menu-quick">
                                <button title={v.isPinned?'Открепить':'Закрепить'} aria-label={v.isPinned?'Открепить':'Закрепить'} aria-pressed={!!v.isPinned} disabled={videoActionIds.has(v._id)} onClick={()=>{setOpenMenuId(null);toggleVideoFlag(v,'isPinned');}}>{v.isPinned?<PinOff size={15}/>:<Pin size={15}/>}</button>
                                <button title={v.isFavorite?'Убрать из избранного':'В избранное'} aria-label={v.isFavorite?'Убрать из избранного':'В избранное'} aria-pressed={!!v.isFavorite} disabled={videoActionIds.has(v._id)} onClick={()=>{setOpenMenuId(null);toggleVideoFlag(v,'isFavorite');}}><Heart size={15} fill={v.isFavorite?'currentColor':'none'}/></button>
                                <button title="Копировать ссылку" aria-label="Копировать ссылку" onClick={()=>copyVideoLink(v)}><Copy size={15}/></button>
                                {safeVideoUrl(v.url)?<a title="Открыть видео" aria-label="Открыть видео" href={safeVideoUrl(v.url)} target="_blank" rel="noopener noreferrer" onClick={()=>setOpenMenuId(null)}><ExternalLink size={15}/></a>:<button disabled aria-label="Ссылка недоступна"><ExternalLink size={15}/></button>}
                              </div>
                              <div className="video-menu-divider"/>
                              <button onClick={()=>setVideoMenuPage('layout')} className="video-menu-item"><FileCode2 size={13}/>Макет<ChevronRight size={12} className="ml-auto text-subtle"/></button>
                              <button onClick={()=>{setOpenMenuId(null);setCommentVideo(v);}} className="video-menu-item"><Bot size={13}/>Комментарии</button>
                              <div className="video-menu-divider"/>
                              <button disabled={accounts.length<2} title={accounts.length<2?'Сначала добавьте ещё один аккаунт':undefined} onClick={()=>{setOpenMenuId(null);setEditVideo({...v,focusAccount:true});}} className="video-menu-item"><ArrowRightLeft size={13}/>Сменить аккаунт</button>
                              <button disabled={videoActionIds.has(v._id)} onClick={()=>duplicateVideo(v)} className="video-menu-item"><CopyPlus size={13}/>Дублировать</button>
                              <div className="video-menu-divider"/>
                              <div className="video-menu-footer"><button onClick={()=>{setOpenMenuId(null);setEditVideo(v);}} className="video-menu-item"><Settings size={13}/>Настройки</button><button disabled={videoActionIds.has(v._id)} onClick={()=>removeVideo(v)} className="video-menu-item text-red-400"><Trash2 size={13}/>Удалить видео</button></div>
                              </>}
                            </div>
                          </>, document.body)}
                      </td>
                    </tr>
                  );
                })}
                  {displayedVideos.length === 0 && (
                    <tr><td colSpan={15}><div className="workspace-empty"><span className="workspace-empty-icon"><FolderOpen size={24}/></span><h3>{hasVideoFilters?'Ничего не найдено':'Пока нет видео'}</h3><p>{hasVideoFilters?'Попробуйте изменить запрос или сбросить фильтры.':'Добавьте первое видео, чтобы отслеживать статистику и создавать макеты.'}</p><button onClick={()=>{if(hasVideoFilters){resetVideoFilters();}else setIsAddOpen(true);}} className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">{hasVideoFilters?'Сбросить фильтры':'Добавить видео'}</button></div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ... остальные вкладки (accounts, finance, calendar, savings, ai) остаются без изменений ... */}
      {currentView === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.accounts.map(acc => {
            const accVideo = videos.find(v => (typeof v.account === 'string' ? v.account : v.account?._id) === acc._id);
            const adminName = typeof accVideo?.createdBy === 'object' && accVideo.createdBy !== null 
              ? accVideo.createdBy.username 
              : 'Не назначен';

            return (
              <div key={acc._id} className="studio-panel bg-surface border border-line rounded-2xl p-6 flex flex-col hover:border-foreground/50 transition-colors cursor-pointer" onClick={() => { setActiveAccount(acc._id); setCurrentView('dashboard'); }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center text-foreground"><CreditCard size={20} /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{acc.name}</h3>
                      <p className="text-[11px] text-muted font-mono mt-0.5 flex items-center gap-1">
                        <User size={10} className="text-subtle" /> Админ: <span className="text-foreground">{adminName}</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => deleteAccount(acc._id, e)} className="text-subtle hover:text-red-500 p-1"><Trash2 size={16} /></button>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-line">
                  <div>
                    <div className="text-[10px] text-subtle uppercase mb-1 flex items-center gap-1"><FolderOpen size={10} /> Видео</div>
                    <div className="text-sm font-mono font-semibold">{acc.videos} шт.</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-subtle uppercase mb-1 flex items-center gap-1"><Eye size={10} /> Смотрели</div>
                    <div className="text-sm font-mono font-semibold">{fmtInt(acc.views)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-subtle uppercase mb-1 flex items-center gap-1"><Wallet size={10} /> Выплачено</div>
                    <div className="text-sm font-mono font-semibold text-foreground">{fmtMoney(acc.revenue)}</div>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={addAccount} className="border border-dashed border-line hover:border-foreground/50 hover:bg-surface rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-subtle hover:text-foreground transition-all min-h-[160px]">
            <Plus size={24} /><span className="text-xs font-medium">Новый аккаунт</span>
          </button>
          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12 text-subtle text-sm">У вас пока нет аккаунтов. Создайте первый.</div>
          )}
        </div>
      )}

      {currentView === 'finance' && stats && (
        <div className="space-y-6">
          <div className="studio-panel bg-surface border border-line rounded-2xl p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-muted uppercase tracking-wider mb-2"><Wallet size={16} /> Всего выплачено</div>
              <div className="text-4xl font-mono font-semibold text-foreground">{fmtMoney(stats.totalRevenue)}</div>
              <div className="text-[11px] text-subtle mt-2">по статусу "Выплатили"</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-muted uppercase tracking-wider mb-2">Ожидается</div>
              <div className="text-xl font-mono font-semibold text-foreground">{fmtMoney(stats.totalGross)}</div>
              <div className="text-[11px] text-subtle mt-1">по остальным статусам</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="studio-panel bg-surface border border-line rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 text-sm font-semibold mb-4"><Target size={18} className="text-foreground"/> Моя цель</div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await api.setGoal({
                  title: fd.get('title'),
                  imageUrl: fd.get('imageUrl'),
                  targetAmount: Number(fd.get('targetAmount')),
                  deadlineDate: fd.get('deadlineDate')
                });
                reload();
              }} className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-subtle uppercase mb-1 block">Название</label>
                  <input name="title" defaultValue={goal?.title} required className="w-full bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground" placeholder="Например: Новый ПК" />
                </div>
                <div>
                  <label className="text-[10px] text-subtle uppercase mb-1 block">URL картинки</label>
                  <input name="imageUrl" defaultValue={goal?.imageUrl} className="w-full bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-subtle uppercase mb-1 block">Сумма ($)</label>
                    <input name="targetAmount" type="number" defaultValue={goal?.targetAmount} required className="w-full bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground" placeholder="500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-subtle uppercase mb-1 block">Дедлайн (дата)</label>
                    <input name="deadlineDate" type="date" defaultValue={goal?.deadlineDate ? new Date(goal.deadlineDate).toISOString().split('T')[0] : ''} required className="w-full bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground" />
                  </div>
                </div>
                <button className="w-full h-9 mt-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90">Сохранить цель</button>
              </form>

              {goal && (
                <div className="mt-6 rounded-xl overflow-hidden border border-line">
                  {goal.imageUrl ? (
                    <img src={goal.imageUrl} alt={goal.title} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-elevated flex items-center justify-center text-subtle"><Target size={32} /></div>
                  )}
                  <div className="p-3 bg-surface">
                    <div className="text-xs font-semibold">{goal.title}</div>
                    <div className="text-[10px] text-subtle mt-1 flex items-center gap-1"><Calendar size={10}/> до {new Date(goal.deadlineDate).toLocaleDateString('ru-RU')}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 studio-panel bg-surface border border-line rounded-2xl p-6 flex flex-col">
              {goal ? (() => {
                const target = goal.targetAmount;
                const current = stats.totalRevenue;
                const remaining = Math.max(0, target - current);
                const progress = Math.min(100, (current / target) * 100);

                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const deadline = new Date(goal.deadlineDate);
                deadline.setHours(0, 0, 0, 0);

                const diffTime = deadline.getTime() - now.getTime();
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isPast = daysLeft < 0;

                const cats = Object.entries(stats.categories);

                return (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Осталось собрать</div>
                        <div className="text-3xl font-mono font-semibold text-foreground">{fmtMoney(remaining)}</div>
                        <div className="text-[11px] text-subtle mt-2">
                          {isPast ? (
                            <span className="text-red-500">Дедлайн просрочен</span>
                          ) : (
                            <span>Осталось дней: {daysLeft}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">Прогресс</div>
                        <div className="text-xl font-mono font-semibold">{progress.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="w-full h-3 bg-elevated rounded-full mb-8 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="text-[11px] text-muted uppercase tracking-wider mb-3">
                      {isPast ? 'Дедлайн прошел, нужно обновить цель' : `Сколько просмотров в день нужно (по тематикам)`}
                    </div>

                    {!isPast && remaining > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cats.map(([key, cat]) => {
                          const CatIcon = CAT_ICONS[key] || Sparkles;
                          const totalNeededViews = Math.ceil((remaining / cat.rate1k) * 1000);
                          const viewsPerDay = Math.ceil(totalNeededViews / Math.max(1, daysLeft));

                          return (
                            <div key={key} className="bg-elevated border border-line rounded-xl p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-muted"><CatIcon size={14} /></div>
                                <div>
                                  <div className="text-xs font-medium text-foreground">{cat.label.replace(/^[^\s]+\s/, '')}</div>
                                  <div className="text-[10px] text-subtle">${cat.rate1k} / 1k</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-mono font-semibold text-foreground">{fmtInt(viewsPerDay)}</div>
                                <div className="text-[10px] text-subtle">в день</div>
                                <div className="text-[9px] text-subtle mt-0.5">всего {fmtInt(totalNeededViews)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-subtle mt-4">
                        {remaining <= 0 ? 'Цель достигнута! 🎉' : 'Дедлайн истек, установите новую дату.'}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <div className="flex-1 flex flex-col items-center justify-center text-subtle text-sm">
                  <Target size={48} className="mb-4 opacity-20" />
                  <p>Установите цель слева, чтобы увидеть расчёты</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentView === 'calendar' && (
        <CalendarView 
          videos={videos} 
          ideas={ideas} 
          reload={reload} 
          categories={stats?.categories} 
        />
      )}

      {currentView === 'savings' && (
        <SavingsView savings={savings} reload={reload} />
      )}

      {currentView === 'ai' && (
        <AIChat 
          user={me} 
          contextData={{ 
            goal, 
            ideas, 
            videos, 
            stats, 
            daysLeft 
          }} 
        />
      )}

      {isAddOpen && (
        <AddVideoModal 
          accounts={accounts} 
          activeAccountId={activeAccount} 
          categories={stats?.categories} 
          onClose={() => setIsAddOpen(false)} 
          onAdd={() => { setIsAddOpen(false); reload(); }} 
        />
      )}
      <input ref={scriptFileInput} type="file" accept=".js,text/javascript,application/javascript" className="hidden" onChange={e => {const file=e.target.files?.[0];e.target.value='';if(file && scriptFileVideo.current)setScriptVideo({...scriptFileVideo.current, initialFile:file});}} />
      {scriptVideo && <VideoScriptModal video={scriptVideo} onClose={() => setScriptVideo(null)} />}
      {commentVideo && <CommentPageModal video={commentVideo} videos={videos} onClose={() => { setCommentVideo(null); refreshCommentSummary(); }} onChange={refreshCommentSummary} />}
      {editVideo && <EditVideoModal video={editVideo} accounts={accounts} categories={stats?.categories} onClose={() => setEditVideo(null)} onSave={async (data) => { await api.updateVideo(editVideo._id, data); setEditVideo(null);setVideoNotice('Настройки видео сохранены.');await reload(); }} />}
      {isAdjustOpen && <AdjustModal onClose={() => setIsAdjustOpen(false)} onAdd={() => { setIsAdjustOpen(false); reload(); }} />}
      {isHistoryOpen && <HistoryModal adjustments={adjustments} onClose={() => setIsHistoryOpen(false)} reload={reload} />}
    </div></WorkspaceShell>
  );
}

function AddVideoModal({ accounts, activeAccountId, categories, onClose, onAdd }) {
  const DEFAULT_CATS = {
    gifts:    { label: 'Подарки Telegram', rate1k: 1.5, minViews: 3000 },
    cs2:      { label: 'Игры (CS2)',       rate1k: 1.0, minViews: 6000 },
    dota:     { label: 'Dota 2',           rate1k: 0.6, minViews: 6000 },
    creative: { label: 'Креатив',          rate1k: 0.15, minViews: 6000 },
    rubup:    { label: 'Геймплей в RubUP', rate1k: 3.5, minViews: 3000 },
  };
  const cats = categories || DEFAULT_CATS;

  const [account, setAccount] = useState(activeAccountId || accounts[0]?._id || '');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [views, setViews] = useState(0);
  const [category, setCategory] = useState('rubup');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!account || !url) { setError('Заполни ссылку и выбери аккаунт'); return; }
    setBusy(true);
    try {
      await api.addVideo({ account, url, title, views, category });
      onAdd();
    } catch (err) { 
      setError(err.message || 'Ошибка при сохранении'); 
    } finally { 
      setBusy(false); 
    }
  };

  const inputCls = 'bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground w-full mb-3';

  return (
    <div className="modal-backdrop fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-6">
      <form onSubmit={submit} className="studio-panel bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-line flex justify-between items-center">
          <h2 className="text-sm font-semibold">Добавить видео</h2>
          <button type="button" onClick={onClose} className="text-subtle hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-6">
          <label className="text-[10px] text-muted uppercase mb-1 block">Ссылка на видео</label>
          <input className={inputCls} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} required />

          <label className="text-[10px] text-muted uppercase mb-1 block">Аккаунт UBT</label>
          <select className={inputCls} value={account} onChange={e => setAccount(e.target.value)}>
            {accounts.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>

          <label className="text-[10px] text-muted uppercase mb-1 block">Тематика</label>
          <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
            {Object.entries(cats).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — ${v.rate1k} / 1k (от {v.minViews})</option>
            ))}
          </select>

          <label className="text-[10px] text-muted uppercase mb-1 block">Начальные просмотры</label>
          <input type="number" className={inputCls} value={views} onChange={e => setViews(+e.target.value)} />

          {error && <div className="text-red-500 text-xs mb-3">{error}</div>}

          <button disabled={busy} className="w-full h-9 mt-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
            {busy ? '…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Модалка настроек видео
function AdjustModal({ onClose, onAdd }) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('usd');
  const [note, setNote] = useState('');
  const [rate, setRate] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getUsdRate().then(setRate);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || !rate) return;
    const usd = currency === 'usd' ? num : num / rate;
    setBusy(true);
    try {
      await api.addAdjustment({ amountUsd: +usd.toFixed(2), note });
      onAdd();
    } finally { setBusy(false); }
  };

  const inputCls = 'bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground w-full mb-3';

  return (
    <div className="modal-backdrop fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-6">
      <form onSubmit={submit} className="studio-panel bg-surface border border-line rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-line flex justify-between items-center">
          <h2 className="text-sm font-semibold">Корректировка баланса</h2>
          <button type="button" onClick={onClose} className="text-subtle hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-4">
          <label className="text-[10px] text-muted uppercase mb-1 block">Сумма</label>
          <div className="flex gap-2 mb-3">
            <input 
              type="number" 
              step="0.01"
              className="bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground flex-1"
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder={currency === 'usd' ? '100' : '9500'}
              required
            />
            <select 
              className="bg-surface border border-line rounded-lg h-9 px-3 text-xs outline-none focus:border-foreground w-20"
              value={currency} 
              onChange={e => setCurrency(e.target.value)}
            >
              <option value="usd">USD</option>
              <option value="rub">RUB</option>
            </select>
          </div>

          {amount && rate > 0 && (
            <div className="text-[11px] text-subtle mb-3 font-mono">
              {currency === 'usd' 
                ? `≈ ${(parseFloat(amount) * rate).toFixed(0)} ₽` 
                : `≈ $${(parseFloat(amount) / rate).toFixed(2)}`}
            </div>
          )}

          <label className="text-[10px] text-muted uppercase mb-1 block">Комментарий (опционально)</label>
          <input 
            className={inputCls} 
            placeholder="Например: ручное пополнение из банка"
            value={note} 
            onChange={e => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setAmount((Math.abs(parseFloat(amount) || 0) * -1).toString())}
              className="flex-1 h-9 border border-line text-xs text-red-400 rounded-lg hover:bg-elevated"
            >
              Сделать списанием
            </button>
            <button 
              disabled={busy} 
              className="flex-1 h-9 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {busy ? '...' : 'Применить'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function HistoryModal({ adjustments, onClose, reload }) {
  return (
    <div className="modal-backdrop fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-6">
      <div className="studio-panel bg-surface border border-line rounded-2xl w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-line flex justify-between items-center">
          <h2 className="text-sm font-semibold">История корректировок</h2>
          <button onClick={onClose} className="text-subtle hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {adjustments.length === 0 && (
            <div className="text-center text-subtle text-xs py-10">Нет операций</div>
          )}
          {adjustments.map(a => (
            <div key={a._id} className="flex items-center justify-between p-3 bg-elevated border border-line rounded-lg mb-2 group">
              <div>
                <div className="text-xs text-foreground">
                  {a.note || 'Без комментария'}
                </div>
                <div className="text-[10px] text-subtle mt-1 font-mono">
                  {new Date(a.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-sm font-semibold ${a.amountUsd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {a.amountUsd >= 0 ? '+' : ''}${a.amountUsd.toFixed(2)}
                </span>
                <button 
                  onClick={async () => {
                    if (confirm('Удалить запись?')) { await api.deleteAdjustment(a._id); reload(); }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-subtle hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-line flex justify-end">
          <button onClick={onClose} className="h-8 px-4 text-xs bg-elevated rounded-lg hover:bg-elevated">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}