import 'dotenv/config';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import router from '../routes/videos.js';
import commentRouter from '../routes/commentPages.js';
import '../models/Admin.js';
import Video from '../models/Video.js';
import { backfillVideoCodes } from '../services/videoCodes.js';
import Account from '../models/Account.js';
import CommentPage from '../models/CommentPage.js';
import StatProject from '../models/StatProject.js';
import VideoScript from '../models/VideoScript.js';
const models=[Video,Account,CommentPage,StatProject,VideoScript];
const app=express();app.use(express.json());app.use(cookieParser());app.use('/videos',router);app.use('/comments',commentRouter);app.use((e,req,res,next)=>res.status(500).json({error:e.message}));
const server=app.listen(0,'127.0.0.1');let connected=false;
try{
 await mongoose.connect(process.env.MONGO_URI,{dbName:'cxva_'+randomUUID().replaceAll('-',''),autoCreate:false,autoIndex:false,maxPoolSize:3,serverSelectionTimeoutMS:10000,socketTimeoutMS:15000});connected=true;
 for(const model of models)await model.createCollection();
 await backfillVideoCodes();
 const user=new mongoose.Types.ObjectId();const cookie='token='+jwt.sign({id:user.toString()},process.env.JWT_SECRET);
 const request=(path='',method='GET',body,auth=true)=>fetch('http://127.0.0.1:'+server.address().port+'/videos'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const account=await Account.create({name:'Test',createdBy:user});const other=await Account.create({name:'Other',createdBy:user});
 assert.equal((await request('','GET',undefined,false)).status,401);
 assert.equal((await request('/bad','PATCH',{})).status,400);
 assert.equal((await request('','POST',{account:account.id,url:'javascript:alert(1)'})).status,400);
 const response=await request('','POST',{account:account.id,url:'https://example.com/video',title:'Original'});assert.equal(response.status,201);const video=await response.json();assert.match(video.shortId,/^[A-Z0-9]{5}$/);
 const changed=await request('/'+video._id,'PATCH',{account:other.id,title:'Updated',views:1200,likes:48,isPinned:true,isFavorite:true,status:'published',expenses:{p1:3}});assert.equal(changed.status,200);const updated=await changed.json();assert.equal(updated.account._id,other.id);assert.equal(updated.views,1200);assert.equal(updated.isPinned,true);assert.equal(updated.shortId,video.shortId);
 for(const body of [{views:-1},{status:'unknown'},{account:new mongoose.Types.ObjectId().toString()}])assert.equal((await request('/'+video._id,'PATCH',body)).status,400);
 const copyResponse=await request('/'+video._id+'/duplicate','POST');assert.equal(copyResponse.status,201);const copy=await copyResponse.json();assert.match(copy.shortId,/^[A-Z0-9]{5}$/);assert.notEqual(copy.shortId,video.shortId);assert.equal(copy.views,0);assert.equal(copy.likes,0);assert.equal(copy.expenses.p1,0);assert.equal(copy.isPinned,false);assert.equal(copy.status,'moderation');assert.equal(copy.account._id,other.id);
 for(const id of [video._id,copy._id]){await CommentPage.create({_id:randomUUID(),video:id,total:1,remaining:[{text:'Test'}]});await StatProject.create({video:id,title:'Test',config:{stats:[1,2,3,4,5]}});await VideoScript.create({video:id,code:'const DATA={};',revision:1});}
 const pending=await CommentPage.findOne({video:video._id}).lean();
 const remove=()=>fetch('http://127.0.0.1:'+server.address().port+'/comments/'+pending._id+'/comments',{method:'DELETE',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({comment:{text:'Test',tags:[]}})});
 const removals=await Promise.all([remove(),remove()]);assert.deepEqual(removals.map(r=>r.status).sort(),[200,409]);
 const after=await CommentPage.findById(pending._id).lean();assert.equal(after.total,0);assert.equal(after.remaining.length,0);assert.equal(after.discarded.length,1);
 await CommentPage.updateOne({_id:pending._id},{$push:{claims:{visitor:'test',comment:{text:'Test',tags:[]},issuedAt:new Date()}},$inc:{total:1}});
 assert.equal((await remove()).status,409);assert.equal((await CommentPage.findById(pending._id)).claims.length,1);
 console.log('PASS: pending removal, counters, concurrent deletion, issued comments protected');
 const originalDelete=VideoScript.deleteMany;
 try{VideoScript.deleteMany=()=>{throw Error('Simulated failure');};assert.equal((await request('/'+video._id,'DELETE')).status,500);}finally{VideoScript.deleteMany=originalDelete;}
 assert.ok(await Video.exists({_id:video._id}));assert.equal(await CommentPage.countDocuments({video:video._id}),1);assert.equal(await StatProject.countDocuments({video:video._id}),1);
 assert.equal((await request('/'+video._id,'DELETE')).status,200);assert.equal(await Video.countDocuments({_id:video._id}),0);
 for(const model of [CommentPage,StatProject,VideoScript]){assert.equal(await model.countDocuments({video:video._id}),0);assert.equal(await model.countDocuments({video:copy._id}),1);}
 assert.ok(await Video.exists({_id:copy._id}));assert.equal(await Account.countDocuments(),2);assert.equal((await request('/'+video._id,'DELETE')).status,404);
 const legacy=await Video.create({account:account.id,url:'https://example.com/legacy',createdBy:user});
 await backfillVideoCodes();
 const migrated=await Video.findById(legacy.id);assert.match(migrated.shortId,/^[A-Z0-9]{5}$/);
 await backfillVideoCodes();assert.equal((await Video.findById(legacy.id)).shortId,migrated.shortId);
 await assert.rejects(Video.collection.updateOne({_id:legacy._id},{$set:{shortId:copy.shortId}}),{code:11000});
 const commentRequest = (path = '', method = 'GET', body, auth = true) =>
   fetch('http://127.0.0.1:' + server.address().port + '/comments' + path, {
     method, headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: cookie } : {}) },
     ...(body ? { body: JSON.stringify(body) } : {}),
   });
 const [theme] = await (await commentRequest('/themes')).json();
 const created = await commentRequest('', 'POST', { videoId: legacy.id, theme: theme.id, count: 2 });
 assert.equal(created.status, 201);
 const root = await created.json();
 const branchPath = '/' + root._id + '/branch';
 const branchInput = { videoId: copy._id, theme: theme.id, count: 1 };
 assert.equal((await commentRequest(branchPath, 'POST', branchInput, false)).status, 401);
 const branches = await Promise.all([commentRequest(branchPath, 'POST', branchInput), commentRequest(branchPath, 'POST', branchInput)]);
 assert.deepEqual(branches.map(r => r.status).sort(), [201, 409]);
 const branch = await branches.find(r => r.status === 201).json();
 const publicPage = await (await commentRequest('/' + branch.branchId, 'GET', undefined, false)).json();
 assert.equal(publicPage.publicId, root._id);
 assert.equal(publicPage.remaining, 1);
 assert.deepEqual(publicPage.targets.map(item => item.videoUrl), [legacy.url, copy.url]);
 const visitor = randomUUID();
 const claim = (id, visitor) => commentRequest('/' + id + '/claim', 'POST', { visitor }, false);
 const firstClaim = await claim(root._id, visitor);
 assert.equal(firstClaim.status, 200);
 const pair = await firstClaim.json();
 assert.equal(pair.items.length, 2);
 assert.deepEqual(await (await claim(branch.branchId, visitor)).json(), pair);
 assert.equal((await commentRequest('/' + root._id + '/reset-timer', 'POST')).status, 200);
 assert.equal((await claim(root._id, randomUUID())).status, 410);
 const unspent = await CommentPage.findById(root._id);
 assert.equal(unspent.remaining.length, 1);
 assert.equal(unspent.claims.length, 1);
 assert.equal((await request('/' + copy._id, 'DELETE')).status, 200);
 assert.equal(await CommentPage.exists({ _id: branch.branchId }), null);
 assert.equal((await CommentPage.findById(root._id)).branchId, undefined);
 const single = await claim(root._id, randomUUID());
 assert.equal(single.status, 200);
 assert.equal((await single.json()).items, undefined);
 console.log('PASS: branch authentication, concurrency, shared link, repeat delivery, rollback and detachment');
 console.log('PASS: code format, unique index, stable codes, existing video backfill');
 console.log('PASS: auth, validation, settings/account/flags, clean duplicate, transactional delete and rollback, unrelated data preserved');
}finally{server.close();if(connected)await Promise.allSettled(models.map(model=>model.collection.drop()));await mongoose.disconnect();}
