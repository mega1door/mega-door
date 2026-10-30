import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedModule } from './helpers/isolated-module.mjs';
import { componentHarness, nodes } from './helpers/component-harness.mjs';

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
