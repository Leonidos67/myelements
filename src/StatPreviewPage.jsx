import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import Login from './Login';
import { buildStatPreview } from './statPreview';
import localScript from './assets/tt-stat/app.js?raw';
export default function StatPreviewPage({videoId,projectId}) {
  const [code,setCode]=useState(null);
  const [loading,setLoading]=useState(true);
  const [login,setLogin]=useState(false);
  const [error,setError]=useState('');
  async function load(){
    setLoading(true);setError('');setLogin(false);
    try{
      let selectedProject=projectId;
      if(!selectedProject){try{selectedProject=(await api.statProjectForVideo(videoId))._id;}catch(e){if(e.status!==404)throw e;}}
      const result=selectedProject?await api.statProjectScript(selectedProject):await api.videoScript(videoId);setCode(result.code);
    }
    catch(e){if(e.status===401)setLogin(true);else setError(e.status===404?(projectId?'Проект удалён или не найден.':'Не найдено видео или API макетов. Проверьте обновление сервера MyElement.'):e.message);}
    finally{setLoading(false);}
  }
  useEffect(()=>{load();},[videoId,projectId]);
  const html=useMemo(()=>code===null?'':buildStatPreview(code),[code]);
  if(login)return <Login onLogin={load}/>;
  if(loading)return <main className="min-h-screen grid place-items-center bg-[#0a0a0a] text-gray-500">Загрузка макета…</main>;
  if(error)return <main className="min-h-screen grid place-items-center bg-[#0a0a0a] text-white p-6"><div className="max-w-md"><h1 className="text-xl font-semibold">Предпросмотр недоступен</h1><p role="alert" className="mt-3 text-sm text-gray-400">{error}</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={load} className="rounded-lg bg-white px-4 py-2 text-xs text-black">Повторить</button>{!projectId&&<button onClick={()=>{setCode(localScript);setError('');}} className="rounded-lg border border-white/20 px-4 py-2 text-xs">Открыть локальный шаблон</button>}<a href="/" className="p-2 text-xs text-gray-400">В кабинет</a></div></div></main>;
  return <iframe title="Макет аналитики видео" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={html} className="fixed inset-0 h-[100dvh] w-full border-0 bg-white" />;
}
