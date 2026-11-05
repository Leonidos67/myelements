import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

const ADMINS = [
  { username: 'Leonid', password: '2509' },
  { username: 'Dasha',  password: '0809' },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('mongo connected');

  for (const { username, password } of ADMINS) {
    const exists = await Admin.findOne({ username });
    if (exists) {
      console.log(`skip ${username} (already exists)`);
      continue;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.create({ username, passwordHash });
    console.log(`created ${username}`);
  }

  await mongoose.disconnect();
  console.log('done');
}

main().catch(err => { console.error(err); process.exit(1); });