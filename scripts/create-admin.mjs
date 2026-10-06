import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcrypt';
const {ADMIN_EMAIL,ADMIN_PASSWORD,ADMIN_NAME}=process.env;
if(!ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL) || !ADMIN_PASSWORD || ADMIN_PASSWORD.length<12 || Buffer.byteLength(ADMIN_PASSWORD)>72)throw new Error('Set ADMIN_EMAIL and a 12–72 byte ADMIN_PASSWORD before provisioning an administrator.');
const db=new PrismaClient();
try{
 const email=ADMIN_EMAIL.trim().toLowerCase();
 if(await db.user.findUnique({where:{email}}))throw new Error('This email already exists. Existing accounts are never silently promoted or overwritten.');
 await db.user.create({data:{email,name:ADMIN_NAME||'Administrator',role:'ADMIN',passwordHash:await bcrypt.hash(ADMIN_PASSWORD,12)}});
 console.log('Administrator created successfully.');
}finally{await db.$disconnect();}
