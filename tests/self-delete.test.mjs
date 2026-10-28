import assert from 'node:assert/strict';
import {test} from 'node:test';
import {importTS} from '../scripts/import-ts.mjs';
import {isolatedModule} from './helpers/isolated-module.mjs';
import {componentHarness,nodes,text} from './helpers/component-harness.mjs';
const {deletionHandler}=await importTS('supabase/proposals/delete-own-account/handler.ts');
const OWNER='4ece01b2-d222-4291-b404-60bff142177f';
function setup(overrides={}){
  const removed=[],reauth=[],cleanups=[];
  const deps={authenticate:async()=>({id:'second-user',email:'alaa@example.test'}),role:async()=> 'admin',ready:async()=>true,
    reauthenticate:async(email,password)=>{reauth.push({email,password});return{user:{id:'second-user'},cleanup:async()=>cleanups.push(true)}},
    eraseCredentials:async id=>removed.push(id),...overrides};
  const handle=deletionHandler(deps);
  const request=(body={password:'isolated-secret',confirmation:'حذف حسابي'},headers={})=>handle(new Request('https://example.test/delete',{method:'POST',headers:{Authorization:'Bearer isolated-jwt',Origin:'https://mega1door.github.io','Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
  return{request,removed,reauth,cleanups};
}
test('self deletion uses verified identity and password, never a caller-supplied target',async()=>{
  const x=setup();assert.equal((await x.request()).status,200);assert.deepEqual(x.removed,['second-user']);assert.equal(x.reauth[0].email,'alaa@example.test');assert.equal(x.cleanups.length,1);
  const y=setup();assert.equal((await y.request({password:'secret',confirmation:'حذف حسابي',user_id:OWNER})).status,400);assert.equal(y.removed.length,0);
});
for(const [name,overrides,status] of [
  ['owner UUID protected',{authenticate:async()=>({id:OWNER,email:'owner@example.test'})},403],
  ['owner role protected',{role:async()=> 'owner'},403],
  ['unknown identity',{authenticate:async()=>null},401],
  ['backend unavailable',{ready:async()=>false},503],
  ['role lookup failed',{role:async()=>{throw Error('Unavailable')}},503],
  ['wrong password',{reauthenticate:async()=>null},401],
  ['identity mismatch',{reauthenticate:async()=>({user:{id:OWNER},cleanup:async()=>{}})},403],
])test(name,async()=>{const x=setup(overrides);assert.equal((await x.request()).status,status);assert.equal(x.removed.length,0)});
test('confirmation and allowed origin are enforced; failed erasure never reports success',async()=>{
  const x=setup();assert.equal((await x.request({password:'secret',confirmation:'no'})).status,400);
  assert.equal((await x.request(undefined,{Origin:'https://untrusted.test'})).status,403);assert.equal(x.removed.length,0);
  const y=setup({eraseCredentials:async()=>{throw Error('Auth rejected')}});assert.equal((await y.request()).status,503);assert.equal(y.cleanups.length,1);
});
test('browser calls only its own deletion endpoint and signs out only after confirmed success',async()=>{
  const calls=[];let success=false;
  const auth=await isolatedModule('src/lib/adminAuth.ts',{'./catalogMetadata':{},'./supabaseClient':{supabase:{functions:{invoke:async(name,args)=>{calls.push([name,args]);return{data:{success},error:null}}},auth:{signOut:async()=>{calls.push('logout');return{error:null}}}}}});
  await assert.rejects(auth.deleteOwnAccount('secret','حذف حسابي'));assert.ok(!calls.includes('logout'));
  success=true;await auth.deleteOwnAccount('secret','حذف حسابي');assert.equal(calls.at(-1),'logout');
  assert.deepEqual(Object.keys(calls[0][1].body).sort(),['confirmation','password']);
});
test('owner has no deletion control; other accounts must enter password and explicit confirmation',async()=>{
  const h=componentHarness();let access={user:{id:OWNER},role:'owner',status:'authorized'},calls=0;
  const component=await isolatedModule('src/components/admin/DeleteOwnAccount.tsx',{react:h.hooks,'react/jsx-runtime':h.jsxRuntime,'../../lib/adminAccess':{useAdminAccess:()=>access},'../../lib/adminAuth':{deleteOwnAccount:async()=>{calls++}}});
  const render=()=>h.render(component.default);assert.equal(render(),null);
  access={user:{id:'second-user'},role:'admin',status:'authorized'};let tree=render();nodes(tree,n=>n.type==='button'&&text(n)==='حذف حسابي')[0].props.onClick();tree=render();
  assert.equal(nodes(tree,n=>n.type==='button'&&text(n)==='تأكيد حذف حسابي')[0].props.disabled,true);
  assert.equal(calls,0);
});
