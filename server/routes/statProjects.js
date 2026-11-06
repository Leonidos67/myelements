import express from 'express';
import mongoose from 'mongoose';
import {readFileSync} from 'node:fs';
import auth from '../middleware/auth.js';
import Video from '../models/Video.js';
import StatProject from '../models/StatProject.js';
import {defaultProjectConfig,validateProjectConfig,projectDataSource} from '../services/statProjectData.js';
const engine=readFileSync(new URL('../data/tt-stat/engine.js',import.meta.url),'utf8');
const router=express.Router(); router.use(auth);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.param('id',(req,res,next,id)=>mongoose.isValidObjectId(id)?next():res.status(400).json({error:'Некорректный ID проекта'}));
router.post('/',wrap(async(req,res)=>{
  const {videoId}=req.body||{};
  if(!mongoose.isValidObjectId(videoId))return res.status(400).json({error:'Некорректное видео'});
  const video=await Video.findById(videoId).lean();
  if(!video)return res.status(404).json({error:'Видео не найдено'});
  const existing=await StatProject.findOne({video:videoId}).lean();
  if(existing)return res.json(existing);
  const config=defaultProjectConfig();config.video.stats[0]=video.views||0;config.video.stats[1]=video.likes||0;
  await StatProject.init();
  try{res.status(201).json(await StatProject.create({video:videoId,title:video.title||'Проект видео',config,createdBy:req.admin.id,updatedBy:req.admin.id}));}
  catch(e){if(e.code!==11000)throw e;res.json(await StatProject.findOne({video:videoId}).lean());}
}));
router.get('/by-video/:videoId',wrap(async(req,res)=>{
  if(!mongoose.isValidObjectId(req.params.videoId))return res.status(400).json({error:'Некорректное видео'});
  const project=await StatProject.findOne({video:req.params.videoId}).select('_id').lean();
  if(!project)return res.status(404).json({error:'У видео пока нет проекта'});res.json(project);
}));
router.get('/:id',wrap(async(req,res)=>{
  res.set('Cache-Control','no-store');const project=await StatProject.findById(req.params.id).lean();
  if(!project)return res.status(404).json({error:'Проект удалён или не найден'});res.json(project);
}));
router.get('/:id/script',wrap(async(req,res)=>{
  res.set('Cache-Control','no-store');const project=await StatProject.findById(req.params.id).lean();
  if(!project)return res.status(404).json({error:'Проект удалён или не найден'});
  res.json({code:projectDataSource(project.config)+engine,revision:project.revision,source:'project'});
}));
router.put('/:id',wrap(async(req,res)=>{
  const {title,config:raw,revision}=req.body||{};
  if(typeof title!=='string'||!title.trim()||title.length>200||!Number.isInteger(revision)||revision<1)return res.status(400).json({error:'Проверьте название и версию проекта'});
  let config;try{config=validateProjectConfig(raw);}catch(e){return res.status(400).json({error:e.message});}
  const project=await StatProject.findOneAndUpdate({_id:req.params.id,revision},{$set:{title:title.trim(),config,updatedBy:req.admin.id},$inc:{revision:1}},{new:true}).lean();
  if(!project){if(!await StatProject.exists({_id:req.params.id}))return res.status(404).json({error:'Проект удалён или не найден'});return res.status(409).json({error:'Проект изменён в другом окне. Перезагрузите данные перед сохранением.'});}
  res.json(project);
}));
router.delete('/:id',wrap(async(req,res)=>{
  const project=await StatProject.findByIdAndDelete(req.params.id).select('_id').lean();
  if(!project)return res.status(404).json({error:'Проект уже удалён'});res.json({ok:true});
}));
export default router;
