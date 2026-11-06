self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{e.waitUntil((async()=>{
let data={};try{data=e.data?.json()||{}}catch{}
await self.registration.showNotification(data.title||'MyCar · Test',{body:data.body||'Notificare de test.',icon:new URL('icon-192.png',self.registration.scope).href,tag:'mycar-manual-test',data:{test:true}});
if(self.navigator.setAppBadge)try{await self.navigator.setAppBadge(1)}catch{}
})())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{
if(self.navigator.clearAppBadge)try{await self.navigator.clearAppBadge()}catch{}
const url=self.registration.scope;
for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(client.url.startsWith(url)&&'focus' in client){await client.focus();return}}
await self.clients.openWindow(url);
})())});
