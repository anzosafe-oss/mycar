self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>e.waitUntil((async()=>{let d={};try{d=e.data?.json()||{}}catch{}
await self.registration.showNotification(d.title||'MyCar · Scadențe',{body:d.body||'Ai scadențe care necesită atenție.',icon:new URL('icon-192.png?v=3',self.registration.scope).href,tag:'mycar-due',data:{url:self.registration.scope}});
if(self.navigator.setAppBadge&&d.badge>0)try{await self.navigator.setAppBadge(d.badge)}catch{}
})()));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const url=self.registration.scope;for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(c.url.startsWith(url)&&'focus' in c){await c.focus();return}}await self.clients.openWindow(url)})())});
