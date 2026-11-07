import express from 'express';
import mongoose from 'mongoose';
import Video,{CATEGORIES} from '../models/Video.js';
import Account from '../models/Account.js';
import CommentPage from '../models/CommentPage.js';
import StatProject from '../models/StatProject.js';
import VideoScript from '../models/VideoScript.js';
import auth from '../middleware/auth.js';
import { createVideoWithCode } from '../services/videoCodes.js';
const router=express.Router();router.use(auth);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.param('id',(req,res,next,id)=>mongoose.isValidObjectId(id)?next():res.status(400).json({error:'Некорректный ID видео'}));
const populate=doc=>doc.populate([{path:'account',select:'name'},{path:'createdBy',select:'username'}]);
async function validatePatch(raw,{creating=false}={}){
 const patch={};
 function fail(message){const e=Error(message);e.status=400;throw e;}
 if(creating||raw.url!==undefined){if(typeof raw.url!=='string'||raw.url.length>2000)fail('Укажите ссылку на видео');try{const url=new URL(raw.url);if(!['http:','https:'].includes(url.protocol))fail('Нужна HTTP(S)-ссылка');patch.url=url.href;}catch{fail('Укажите корректную HTTP(S)-ссылку на видео');}}
 if(raw.title!==undefined){if(typeof raw.title!=='string'||raw.title.length>500)fail('Название должно быть не длиннее 500 символов');patch.title=raw.title.trim();}
 if(creating||raw.account!==undefined){if(!mongoose.isValidObjectId(raw.account)||!await Account.exists({_id:raw.account}))fail('Выбранный аккаунт не найден');patch.account=raw.account;}
 if(raw.category!==undefined){if(!Object.hasOwn(CATEGORIES,raw.category))fail('Неизвестная тематика');patch.category=raw.category;}
 if(raw.status!==undefined){if(!['moderation','published','rejected','paid'].includes(raw.status))fail('Неизвестный статус');patch.status=raw.status;}
 for(const key of ['views','likes'])if(raw[key]!==undefined){const n=Number(raw[key]);if(!Number.isSafeInteger(n)||n<0)fail(key==='views'?'Просмотры должны быть целым неотрицательным числом':'Лайки должны быть целым неотрицательным числом');patch[key]=n;}
 for(const key of ['isPinned','isFavorite'])if(raw[key]!==undefined){if(typeof raw[key]!=='boolean')fail('Неверное значение '+key);patch[key]=raw[key];}
 if(raw.expenses!==undefined){if(!raw.expenses||typeof raw.expenses!=='object'||Array.isArray(raw.expenses))fail('Проверьте расходы');patch.expenses={};for(const key of ['p1','p2','p3','p4','p5']){const n=Number(raw.expenses[key]??0);if(!Number.isFinite(n)||n<0)fail('Расходы не могут быть отрицательными');patch.expenses[key]=Math.round(n*100)/100;}}
 return patch;
}
const withValidation=fn=>wrap(async(req,res)=>{try{await fn(req,res);}catch(e){if(e.status===400)return res.status(400).json({error:e.message});throw e;}});
router.get('/',wrap(async(req,res)=>{
 const q={};if(req.query.account){if(!mongoose.isValidObjectId(req.query.account))return res.status(400).json({error:'Некорректный аккаунт'});q.account=req.query.account;}
 res.json(await Video.find(q).sort({isPinned:-1,createdAt:-1}).populate('account','name').populate('createdBy','username'));
}));
router.post('/',withValidation(async(req,res)=>{
 const patch=await validatePatch(req.body||{},{creating:true});const v=await createVideoWithCode({...patch,createdBy:req.admin.id});res.status(201).json(await populate(v));
}));
router.patch('/:id',withValidation(async(req,res)=>{
 const patch=await validatePatch(req.body||{});const v=await Video.findByIdAndUpdate(req.params.id,{$set:{...patch,updatedAt:new Date()}},{new:true,runValidators:true});
 if(!v)return res.status(404).json({error:'Видео не найдено'});res.json(await populate(v));
}));
router.post('/:id/duplicate',wrap(async(req,res)=>{
 const source=await Video.findById(req.params.id).lean();if(!source)return res.status(404).json({error:'Видео не найдено'});
 if(!await Account.exists({_id:source.account}))return res.status(400).json({error:'Сначала назначьте видео существующему аккаунту'});
 const v=await createVideoWithCode({account:source.account,url:source.url,title:(source.title||'Видео').slice(0,490)+' (копия)',category:source.category,views:0,likes:0,status:'moderation',expenses:{p1:0,p2:0,p3:0,p4:0,p5:0},isPinned:false,isFavorite:false,createdBy:req.admin.id});
 res.status(201).json(await populate(v));
}));
router.delete('/:id',wrap(async(req,res)=>{
 const session=await mongoose.startSession();let removed=false;
 try{await session.withTransaction(async()=>{
  const v=await Video.findByIdAndDelete(req.params.id,{session});if(!v)return;
  // One transaction: either the video and all linked resources disappear, or none do.
  await CommentPage.deleteMany({video:v._id},{session});
  await StatProject.deleteMany({video:v._id},{session});
  await VideoScript.deleteMany({video:v._id},{session});
  removed=true;
 });}finally{await session.endSession();}
 if(!removed)return res.status(404).json({error:'Видео уже удалено'});res.json({ok:true});
}));
export default router;
