import {describe,it,expect} from 'vitest';
import {randomBytes} from 'node:crypto';
import {environmentSchema} from '../src/config.js';
const production={DATABASE_URL:'postgresql://travel:local@db:5432/travel',JWT_SECRET:randomBytes(32).toString('hex'),JWT_REFRESH_SECRET:randomBytes(32).toString('hex'),NODE_ENV:'production',CLIENT_URL:'https://travel.example.com',TRUST_PROXY_HOPS:'1'};
describe('Production configuration',()=>{
 it('accepts secure production settings and one trusted gateway',()=>{const value=environmentSchema.parse(production);expect(value.TRUST_PROXY_HOPS).toBe(1);expect(value.CLIENT_URL).toBe('https://travel.example.com');});
 it('rejects HTTP origins in production',()=>{expect(()=>environmentSchema.parse({...production,CLIENT_URL:'http://travel.example.com'})).toThrow();});
 it('rejects example and reused signing secrets',()=>{expect(()=>environmentSchema.parse({...production,JWT_SECRET:'replace-with-a-generated-secret-at-least-32-characters'})).toThrow();expect(()=>environmentSchema.parse({...production,JWT_REFRESH_SECRET:production.JWT_SECRET})).toThrow();});
 it('normalizes origins and parses SMTP TLS booleans correctly',()=>{const value=environmentSchema.parse({...production,CLIENT_URL:'https://travel.example.com/',SMTP_SECURE:'false'});expect(value.CLIENT_URL).toBe('https://travel.example.com');expect(value.SMTP_SECURE).toBe(false);expect(environmentSchema.parse({...production,SMTP_SECURE:'true'}).SMTP_SECURE).toBe(true);});
});
