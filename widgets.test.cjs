const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const W=require('./widgets.js');
test('existing vehicles retain all four widgets and their original order',()=>{assert.deepEqual(W.normalize(null),['RCA','CASCO','ITP','Rovinietă'].map(kind=>({kind,enabled:true})))});
test('normalization keeps a hidden widget in its saved position and repairs malformed layouts',()=>{
  const layout=W.normalize([{kind:'ITP',enabled:false},{kind:'ITP',enabled:true},{kind:'<script>',enabled:false},null,{kind:'RCA',enabled:true}]);
  assert.deepEqual(layout.map(x=>x.kind),['ITP','RCA','CASCO','Rovinietă']);assert.equal(layout[0].enabled,false);assert.equal(new Set(layout.map(x=>x.kind)).size,4);
});
test('reordering preserves visibility, does not mutate input and respects boundaries',()=>{
  const layout=W.normalize([{kind:'CASCO',enabled:false}]),snapshot=JSON.stringify(layout),moved=W.move(layout,'CASCO',2);
  assert.equal(moved[2].kind,'CASCO');assert.equal(moved[2].enabled,false);assert.equal(JSON.stringify(layout),snapshot);assert.deepEqual(W.move(layout,'CASCO',-1),layout);
});
function setup(fail=false){
  const calls=[],a={id:'car-a',dashboardWidgets:W.normalize(null)},b={id:'car-b',dashboardWidgets:W.normalize(null)};
  let payload;const q={update(p){payload=p;calls.push(['update',p]);return q},eq(k,v){calls.push(['eq',k,v]);return q},select(){return q},single:async()=>fail?{error:Error('offline')}:{data:{id:'car-a',dashboard_widgets:payload.dashboard_widgets}}};
  const c={module:{exports:{}},user:{id:'owner'},cars:[a,b],sb:{from:table=>(assert.equal(table,'vehicles'),q)},checked:r=>{if(r.error)throw r.error;return r.data}};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/widgets.js','utf8'),c);return {c,calls,a,b};
}
test('saving targets only the selected owned vehicle and changes no document data',async()=>{
  const s=setup(),other=JSON.stringify(s.b);await s.c.module.exports.persist('car-a',[{kind:'CASCO',enabled:false}]);
  assert(s.calls.some(x=>x[0]==='eq'&&x[1]==='user_id'&&x[2]==='owner'));assert(s.calls.some(x=>x[0]==='eq'&&x[1]==='id'&&x[2]==='car-a'));assert.deepEqual(Object.keys(s.calls[0][1]),['dashboard_widgets']);assert.equal(s.a.dashboardWidgets[0].enabled,false);assert.equal(JSON.stringify(s.b),other);
});
test('failed saves do not replace the last saved layout',async()=>{const s=setup(true),before=JSON.stringify(s.a);await assert.rejects(s.c.module.exports.persist('car-a',[{kind:'CASCO',enabled:false}]));assert.equal(JSON.stringify(s.a),before)});
