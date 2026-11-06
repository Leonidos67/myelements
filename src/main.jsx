import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import GetComment from './GetComment.jsx';
import StatPreviewPage from './StatPreviewPage.jsx';
import StatProjectPage from './StatProjectPage.jsx';
import './index.css';

const path=window.location.pathname;
const comment=path.match(/^\/get-comment\/([a-f0-9]{36})\/?$/);
const stat=path.match(/^\/tt-stat\/([a-f0-9]{24})\/?$/i);
const project=path.match(/^\/projects\/([a-f0-9]{24})(\/preview)?\/?$/i);
function page(){
  if(project)return project[2]?<StatPreviewPage projectId={project[1]}/>:<StatProjectPage id={project[1]}/>;
  if(stat)return <StatPreviewPage videoId={stat[1]}/>;
  if(comment)return <GetComment id={comment[1]}/>;
  if(/^\/(get-comment|tt-stat|projects)(\/|$)/.test(path))return <main className="min-h-screen bg-[#080808] text-white p-8">Страница не найдена</main>;
  return <App/>;
}
createRoot(document.getElementById('root')).render(page());
