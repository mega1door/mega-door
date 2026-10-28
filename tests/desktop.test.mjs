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
