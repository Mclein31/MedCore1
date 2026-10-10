import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db';
import { staffNotificationReads } from '../db/schema';
import { requireAuth, requireRole } from '../middleware/auth';
import { apiError } from '../middleware/error';
import { getStaffNotifications } from '../services/staffNotifications';

const notificationsApp = new Hono();
notificationsApp.use('*',requireAuth,requireRole(['BILLING_SPECIALIST','HMO_COORDINATOR','CLAIMS_ENCODER','HOSPITAL_CFO','ATTENDING_PHYSICIAN','LOBBY_SECURITY']));
const query = z.object({limit:z.coerce.number().int().min(1).max(100).default(30)});
notificationsApp.get('/',zValidator('query',query),async c=>{
  const user=c.get('user');
  return c.json(await getStaffNotifications(user.facilityId,user.id,c.req.valid('query').limit));
});
const markSchema=z.object({notificationIds:z.array(z.string().min(1).max(128)).max(100).optional(),markAll:z.boolean().optional()}).strict()
  .refine(value=>value.markAll===true || !!value.notificationIds?.length,'Choose notifications to mark as read.');
notificationsApp.post('/mark-read',zValidator('json',markSchema),async c=>{
  const user=c.get('user'); const input=c.req.valid('json');
  // The visible feed is facility-scoped. Never accept future or foreign event IDs.
  const feed=await getStaffNotifications(user.facilityId,user.id,input.markAll?30:100);
  const visible=new Set(feed.notifications.map(event=>event.id));
  const ids=input.markAll?feed.notifications.map(event=>event.id):[...new Set(input.notificationIds!)];
  if(ids.some(id=>!visible.has(id))) return apiError(c,400,'INVALID_NOTIFICATION_IDS','Refresh the notification list and try again.');
  if(ids.length) await db.insert(staffNotificationReads).values(ids.map(notificationId=>({facilityId:user.facilityId,userId:user.id,notificationId}))).onConflictDoNothing();
  return c.json({success:true});
});
export default notificationsApp;
