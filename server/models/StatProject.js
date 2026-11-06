import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  video:{type:mongoose.Schema.Types.ObjectId,ref:'Video',required:true,unique:true},
  title:{type:String,required:true},
  config:{type:mongoose.Schema.Types.Mixed,required:true},
  revision:{type:Number,default:1},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'Admin'},
  updatedBy:{type:mongoose.Schema.Types.ObjectId,ref:'Admin'},
},{collection:'stat_projects',timestamps:true});
export default mongoose.model('StatProject',schema);
