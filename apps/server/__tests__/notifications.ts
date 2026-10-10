// Actual feed/routes with synthetic joined rows; asserts every SQL tenant predicate.
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import { getTableName } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { runWithDb } from '../src/db';
import app from '../src/routes/notifications';
import { sortStaffEvents } from '../src/services/staffNotifications';
const facility='10000000-0000-4000-8000-000000000001',userId='20000000-0000-4000-8000-000000000001';
const now=new Date('2026-10-10T00:00:00Z');
const encounter={id:'30000000-0000-4000-8000-000000000001',facilityId:facility,encounterNumber:'ENC-2026-8812',roomBed:'Bed 412'};
const patient={facilityId:facility,fullName:'Synthetic Juan'};
const fixtures:Record<string,any[]>={
  payments:[{payment:{id:'pay-one',status:'SUCCESS',paymentRail:'MAYA',amount:'10.01',paymentReference:'PAY-SYNTHETIC',createdAt:now,settledAt:now},encounter,patient}],
  discharge_passes:[{pass:{id:'pass-one',passNumber:'PASS-SYNTHETIC',status:'VERIFIED_AT_LOBBY',issuedAt:now,verifiedAt:new Date(now.getTime()+1000)},encounter,patient}],
  system_audit_logs:[{audit:{id:10,action:'HMO_LOA_APPROVED',createdAt:now,newState:{approvedAmount:30}},encounter,patient}],
  staff_notification_reads:[]
};
const reads:any[]=[];let writes=0,activeUserId=userId,authenticated=true;
const dialect=new PgDialect();
function database(){return {
  select:(shape:any)=>{
    let table:any,condition:any,cap=100;
    const query:any={from(value:any){table=value;return query;},innerJoin(){return query;},where(value:any){condition=value;return query;},orderBy(){return query;},limit(value:number){cap=value;return query;},then(resolve:any,reject:any){
      try {
        const compiled=dialect.sqlToQuery(condition),name=getTableName(table);
        assert.ok(compiled.params.includes(facility),`${name}: missing facility predicate`);
        if(name==='staff_notification_reads'){assert.ok(compiled.params.includes(activeUserId));return Promise.resolve(reads.filter(row=>row.userId===activeUserId).map(row=>({notificationId:row.notificationId}))).then(resolve,reject);}
        assert.match(compiled.sql,/"encounters"\."facility_id"/);assert.match(compiled.sql,/"patients"\."facility_id"/);
        if(name==='payments')assert.ok(compiled.params.includes('SUCCESS'));
        if(name==='system_audit_logs'&&compiled.params.includes('SUPERVISORY_WAIVER_EXECUTED'))return Promise.resolve([]).then(resolve,reject);
        return Promise.resolve((fixtures[name]||[]).slice(0,cap)).then(resolve,reject);
      } catch(error){return Promise.reject(error).then(resolve,reject);}
    }};return query;
  },
  insert:()=>({values:(values:any[])=>({onConflictDoNothing:async()=>{writes++;for(const row of values){assert.equal(row.facilityId,facility);assert.equal(row.userId,activeUserId);if(!reads.some(existing=>existing.notificationId===row.notificationId&&existing.userId===row.userId))reads.push(row);}}})})
} as any;}
const router=new Hono();let role='BILLING_SPECIALIST';
router.use('*',async(c,next)=>{if(authenticated)c.set('user',{id:activeUserId,facilityId:facility,role,fullName:'Synthetic Staff'} as any);await next();});router.route('/notifications',app);
const request=(path:string,body?:object)=>runWithDb(database(),()=>router.request(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined}));
let response=await request('/notifications');assert.equal(response.status,200);let feed:any=await response.json();
assert.equal(feed.notifications.length,4);assert.equal(feed.unreadCount,4);assert.ok(feed.notifications.every((item:any)=>item.encounterId==='enc-8812'));
assert.equal(feed.notifications[0].id,'gate-verified:pass-one');assert.ok(feed.notifications.some((item:any)=>item.message.includes('₱10.01')));
assert.equal((await request('/notifications/mark-read',{notificationIds:['payment:foreign']})).status,400);assert.equal(writes,0);
assert.equal((await request('/notifications/mark-read',{notificationIds:['payment:pay-one']})).status,200);
feed=await(await request('/notifications')).json();assert.equal(feed.unreadCount,3);assert.equal(feed.notifications.find((item:any)=>item.id==='payment:pay-one').read,true);
assert.equal((await request('/notifications/mark-read',{markAll:true})).status,200);feed=await(await request('/notifications')).json();assert.equal(feed.unreadCount,0);
activeUserId='20000000-0000-4000-8000-000000000002';feed=await(await request('/notifications')).json();assert.equal(feed.unreadCount,4,'Another staff member inherited read flags');
activeUserId=userId;authenticated=false;assert.equal((await request('/notifications')).status,401);assert.equal((await request('/notifications/mark-read',{markAll:true})).status,401);authenticated=true;
role='PATIENT_GUARANTOR';assert.equal((await request('/notifications')).status,403);
role='BILLING_SPECIALIST';assert.equal((await request('/notifications?limit=101')).status,400);
assert.equal(sortStaffEvents([{id:'b',timestamp:now.toISOString()},{id:'a',timestamp:now.toISOString()}] as any,1)[0].id,'b');
console.log('STAFF_NOTIFICATION_CHECKS_DONE: SQL facility/user predicates, SUCCESS rails, stable IDs/sort, exact amount, persisted per-user reads, anonymous/foreign-ID/patient rejection, limit validation pass; synthetic DB only.');
