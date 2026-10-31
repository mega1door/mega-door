import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedModule } from './helpers/isolated-module.mjs';
import { componentHarness, nodes } from './helpers/component-harness.mjs';
import { readFile } from 'node:fs/promises';

test('selected hero image is preloaded at high priority without duplicate hints', async () => {
  const links=[];
  const document={
    head:{
      querySelectorAll:()=>links,
      append(link){links.push(link);},
    },
    createElement:()=>({setAttribute(name,value){this[name]=value;}}),
  };
  const {preloadHeroImage}=await isolatedModule('src/lib/heroImagePreload.ts',{}, {document});
  preloadHeroImage('https://storage.example/hero.webp');
  preloadHeroImage('https://storage.example/hero.webp');
  assert.equal(links.length,1);
  assert.equal(links[0].rel,'preload');
  assert.equal(links[0].as,'image');
  assert.equal(links[0].href,'https://storage.example/hero.webp');
  assert.equal(links[0].fetchpriority,'high');
});

test('hero mounts only current/previous/next slides and prioritizes only the current slide', async () => {
  const h=componentHarness();
  const window={
    setTimeout:()=>1,
    clearTimeout:()=>{},
  };
  const {default:Hero}=await isolatedModule('src/components/MobileHero.tsx',{
    react:h.hooks,
    'react/jsx-runtime':h.jsxRuntime,
    'react-router-dom':{Link:'Link'},
  }, {window, document:{hidden:false}});
  const slides=Array.from({length:8},(_,i)=>({src:`https://storage.example/${i}.webp`,alt:`slide ${i}`}));
  const tree=h.render(Hero,{slides,ctaTo:'/interior'});
  const images=nodes(tree,node=>node.type==='img');
  assert.equal(images.length,4,'the current and next slides are mounted, not the full carousel');
  assert.deepEqual([...new Set(images.map(image=>image.props.src))],[slides[0].src,slides[1].src]);
  const active=nodes(tree,node=>node.type==='img' && node.props.alt==='slide 0')[0];
  assert.equal(active.props.loading,'eager');
  assert.equal(active.props.fetchPriority,'high');
  const next=images.find(image=>image.props.alt==='slide 1');
  assert.equal(next.props.loading,'eager');
  assert.equal(next.props.fetchPriority,'low');
});

test('public catalog reads use the publishable key with encoded GET queries and no writes', async () => {
  const calls=[];
  const { fetchPublicRows } = await isolatedModule('src/lib/publicDataApi.ts', {
    './supabaseConfig': { SUPABASE_URL:'https://project.example', SUPABASE_PUBLISHABLE_KEY:'public-key' },
  }, {
    URL, URLSearchParams,
    fetch: async (url, init) => {
      calls.push({ url:String(url), init });
      return { ok:true, status:200, json:async()=>[{ id:'interior', label:'داخلية' }] };
    },
  });

  const result=await fetchPublicRows('categories', { select:'id,label', order:'sort_order.asc', label:'جوزي & أبيض' });
  assert.deepEqual(result, [{ id:'interior', label:'داخلية' }]);
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/rest\/v1\/categories\?/);
  assert.match(calls[0].url,/label=%D8%AC%D9%88%D8%B2%D9%8A\+%26\+%D8%A3%D8%A8%D9%8A%D8%B6/);
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.headers.apikey,'public-key');
  assert.equal(calls[0].init.headers.Authorization,'Bearer public-key');
  assert.equal('body' in calls[0].init,false);
});

test('public catalog reads preserve Supabase error status and message', async () => {
  const { fetchPublicRows } = await isolatedModule('src/lib/publicDataApi.ts', {
    './supabaseConfig': { SUPABASE_URL:'https://project.example', SUPABASE_PUBLISHABLE_KEY:'public-key' },
  }, {
    URL, URLSearchParams,
    fetch: async () => ({ ok:false, status:403, json:async()=>({ code:'42501', message:'permission denied' }) }),
  });
  await assert.rejects(fetchPublicRows('models',{select:'id'}), error =>
    error.message==='permission denied' && error.status===403 && error.code==='42501');
});

test('the public entry does not statically import the Supabase SDK', async () => {
  const [app,models,categories,settings]=await Promise.all([
    readFile('src/App.tsx','utf8'),
    readFile('src/lib/modelsStore.ts','utf8'),
    readFile('src/lib/categoriesStore.ts','utf8'),
    readFile('src/lib/siteSettingsStore.ts','utf8'),
  ]);
  assert.doesNotMatch(app,/from ["']\.\/lib\/supabaseClient["']/);
  for(const source of [models,categories,settings]) assert.doesNotMatch(source,/from ["']\.\/supabaseClient["']/);
});

test('auth callback detection covers reset route, recovery tokens, and PKCE query callbacks', async () => {
  const { isSupabaseAuthCallback }=await isolatedModule('src/lib/authCallback.ts',{}, { URLSearchParams });
  assert.equal(isSupabaseAuthCallback({pathname:'/reset-password',search:'',hash:''}),true);
  assert.equal(isSupabaseAuthCallback({pathname:'/',search:'',hash:'#access_token=opaque&type=recovery'}),true);
  assert.equal(isSupabaseAuthCallback({pathname:'/',search:'?code=opaque',hash:''}),true);
  assert.equal(isSupabaseAuthCallback({pathname:'/',search:'',hash:''}),false);
});
