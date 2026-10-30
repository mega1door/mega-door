import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import { isolatedModule } from './helpers/isolated-module.mjs';
import { componentHarness, nodes, text } from './helpers/component-harness.mjs';

test('desktop catalog uses real category order, unique model links and balanced bounded columns', async () => {
  const h = componentHarness();
  const categories = [{id:'interior',label:'داخلي'},{id:'exterior',label:'خارجي'}];
  const models = Array.from({length:7},(_,i)=>({id:`000${i}`,category:'interior'}));
  const {default:Catalog} = await isolatedModule('src/components/DesktopCatalog.tsx', {
    'react/jsx-runtime':h.jsxRuntime, 'react-router-dom':{Link:'Link'},
    '../lib/categoriesStore':{useCategories:()=>categories},
    '../lib/modelsStore':{useModels:()=>models},
    '../lib/whatsapp':{buildGeneralWhatsAppLink:()=> 'https://wa.me/test'},
    './ProductCard':{default:'ProductCard'},
  });
  const tree = h.render(Catalog);
  assert.deepEqual(nodes(tree,n=>n.type==='h2').map(text),['داخلي','خارجي']);
  assert.deepEqual(nodes(tree,n=>n.type==='ProductCard').map(n=>n.props.model.id),models.map(m=>m.id));
  assert.match(nodes(tree,n=>n.props.className==='desktop-model-grid')[0].props.style.gridTemplateColumns,/repeat\(5,/);
  assert.deepEqual(nodes(tree,n=>n.type==='Link').map(n=>n.props.to),['/interior','/exterior']);
  models.splice(2);
  const grid=nodes(h.render(Catalog),n=>n.props.className==='desktop-model-grid')[0];
  assert.equal(grid.props.style.maxWidth,'704px');
  assert.equal(grid.props.style.gridTemplateColumns,'repeat(2,minmax(0,1fr))');
});

test('desktop CSS cannot affect mobile and imports the existing palette without new color tokens', async () => {
  const css=postcss.parse(await readFile('src/styles/desktop.css','utf8'));
  css.walkRules(rule=> {
    let parent=rule.parent;
    while(parent && !(parent.type==='atrule' && parent.name==='media' && /min-width:\s*(1024|1600)px/.test(parent.params))) parent=parent.parent;
    assert.ok(parent,`Mobile-affecting rule: ${rule.selector}`);
  });
  assert.doesNotMatch(css.toString(),/--mega-|#[a-fA-F0-9]{6}.*(?:blue|bronze)/);
  const main=await readFile('src/main.tsx','utf8');
  assert.ok(main.indexOf('./styles/desktop.css')>main.indexOf('./styles/brand-colors.css'));
});


test('merged RTL gallery: short swipe advances once, respects boundaries and cleans listeners', async () => {
  const gallery=await isolatedModule('src/lib/gallery.ts',{});
  const events={},moves=[];
  const el={scrollWidth:900,clientWidth:300,scrollLeft:0,
    getBoundingClientRect:()=>({left:0,width:300}),
    addEventListener:(name,fn)=>events[name]=fn,
    removeEventListener:(name,fn)=>{assert.equal(events[name],fn);delete events[name];},
    scrollTo:value=>moves.push(value.left)};
  el.children=[0,1,2].map(i=>({getBoundingClientRect:()=>({left:-i*300-el.scrollLeft,width:300})}));
  const clean=gallery.attachSwipeAssist(el);
  events.touchstart();el.scrollLeft=-30;events.touchend();assert.deepEqual(moves,[-300]);
  moves.length=0;el.scrollLeft=-600;events.touchstart();el.scrollLeft=-630;events.touchend();assert.deepEqual(moves,[]);
  clean();assert.deepEqual(events,{});
  assert.equal(gallery.GALLERY_DIR,'rtl');
});


test('footer contact is always visible; header retains two collapsed accordions', async () => {
 const h=componentHarness();const {default:Contact}=await isolatedModule('src/components/ContactAccordions.tsx',{
 'react/jsx-runtime':h.jsxRuntime,'../lib/whatsapp':{buildSalesWhatsAppLink:()=> 'https://wa.me/test'},'../lib/metaPixel':{trackContact:()=>{}},'../lib/siteSettingsStore':{useSiteSettings:()=>({contactEmail:''})}});
 const footer=Contact({source:'footer'});assert.equal(nodes(footer,n=>n.type==='details').length,0);assert.match(text(footer),/07751420001/);assert.match(text(footer),/السيدية/);assert.equal(nodes(footer,n=>n.props.href==='tel:+9647751420001').length,1);
 const menu=Contact({source:'menu'});assert.equal(nodes(menu,n=>n.type==='details').length,2);assert.ok(nodes(menu,n=>n.type==='details').every(n=>!n.props.open));
});
