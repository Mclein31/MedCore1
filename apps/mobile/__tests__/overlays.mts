import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';

const requireMobile=createRequire(resolve('apps/mobile/package.json'));
const React=requireMobile('react');const {act}=React;const {createRoot}=requireMobile('react-dom/client');
const {JSDOM}=await import(process.env.MEDCORE_DOM_MODULE||'/private/tmp/medcore-visual-tools/node_modules/jsdom/lib/api.js');
const dom=new JSDOM('<div id="root"></div>');
Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
const fixture:any={nodes:{},groups:[],size:{height:844,width:390},modal:null};
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true,__MEDCORE_NATIVE_OVERLAY__:fixture});
const directory=await mkdtemp(join(tmpdir(),'medcore-native-overlay-'));const compiled=join(directory,'overlay.cjs');
const nativeMock=`import React from 'react';
const f=globalThis.__MEDCORE_NATIVE_OVERLAY__;
const host=name=>props=>{ if(props.testID)f.nodes[props.testID]=props; return React.createElement('div',{'data-native':name,'data-testid':props.testID},props.children); };
export const View=host('View'),KeyboardAvoidingView=host('KeyboardAvoidingView');
export const Pressable=props=>{f.pressable=props;return React.createElement('button',{disabled:props.disabled,onClick:props.onPress},props.children);};
export const Modal=props=>{f.modal=props;return props.visible?React.createElement('div',{'data-native':'Modal'},props.children):null;};
export const Platform={OS:'ios'};
export const StyleSheet={create:styles=>styles,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0}};
export const useWindowDimensions=()=>f.size;
export const Easing={cubic:x=>x*x*x,out:e=>e,in:e=>e};
export const AccessibilityInfo={isReduceMotionEnabled:async()=>false,addEventListener:(_name,cb)=>{f.motionListener=cb;return {remove(){}};}};
class Value{constructor(value){this.value=value;}setValue(value){this.value=value;}interpolate(config){return {value:this,config};}}
export const Animated={Value,View:host('AnimatedView'),timing:(value,config)=>({value,config}),parallel:animations=>{
 const group={animations,stopped:false,callback:null,start(cb){this.callback=cb;f.groups.push(this);},stop(){this.stopped=true;this.callback?.({finished:false});},finish(){if(!this.stopped){this.animations.forEach(a=>a.value.setValue(a.config.toValue));this.callback?.({finished:true});}}};return group;
}};`;
await build({entryPoints:['apps/mobile/src/components/ModalOverlay.tsx'],bundle:true,platform:'node',format:'cjs',outfile:compiled,plugins:[{name:'native-driver-test',setup(b){
 b.onResolve({filter:/^react-native$/},()=>({path:'native',namespace:'overlay-test'}));b.onLoad({filter:/.*/,namespace:'overlay-test'},()=>({contents:nativeMock,loader:'js'}));
 b.onResolve({filter:/^react(?:\/.+)?$/},args=>({path:requireMobile.resolve(args.path),external:true}));
}}]});
const require=createRequire(import.meta.url);const {ModalOverlay}=require(compiled);const root=createRoot(document.getElementById('root')!);
const render=(visible:boolean,children='OPEN_PANEL',motion='slide',dismiss?:()=>void)=>act(async()=>{root.render(React.createElement(ModalOverlay,{visible,motion,onRequestClose:()=>{},onBackdropPress:dismiss,panelStyle:{width:'100%'}},children));});
const flatten=(styles:any):any[]=>Array.isArray(styles)?styles.flatMap(flatten):[styles];
let passed=0;const pass=(name:string)=>{passed++;console.log(`[PASS] ${name}`);};
try{
 await render(false);fixture.groups=[];
 await render(true);
 assert.equal(fixture.modal.animationType,'none');assert.equal(fixture.modal.statusBarTranslucent,true);assert.equal(fixture.modal.navigationBarTranslucent,true);assert.equal(fixture.modal.presentationStyle,'overFullScreen');
 const backdrop=flatten(fixture.nodes['modal-backdrop'].style);const panel=flatten(fixture.nodes['modal-panel'].style);
 assert.ok(!backdrop.some(s=>s?.transform));assert.ok(panel.some(s=>s?.transform));
 const latest=fixture.groups.at(-1);assert.equal(latest.animations.length,2);assert.notEqual(latest.animations[0].value,latest.animations[1].value);
 assert.equal(latest.animations[0].config.duration,180);assert.equal(latest.animations[1].config.duration,280);assert.ok(latest.animations.every((a:any)=>a.config.useNativeDriver));
 pass('Native window stays still/full-screen; scrim fades independently of sheet translation');
 await render(false,'NEW_HIDDEN_CONTENT');assert.equal(fixture.modal.visible,true);assert.match(document.body.textContent||'',/OPEN_PANEL/);assert.doesNotMatch(document.body.textContent||'',/NEW_HIDDEN_CONTENT/);
 await act(async()=>fixture.groups.at(-1).finish());assert.equal(fixture.modal.visible,false);
 pass('Closing retains the visible panel until both independent exit animations finish');
 await render(true);await render(false);const oldExit=fixture.groups.at(-1);await render(true);
 await act(async()=>oldExit.finish());assert.equal(fixture.modal.visible,true);assert.ok(oldExit.stopped);
 pass('Rapid reopening cancels the old close instead of hiding the new modal');
 fixture.size={height:390,width:844};await render(true);
 const translated=flatten(fixture.nodes['modal-panel'].style).find(s=>s?.transform).transform[0].translateY;
 assert.equal(translated.config.outputRange[0],390);
 pass('Sheet trajectory adapts to the current viewport without moving the backdrop');
 await render(true,'BUSY','fade');assert.equal(fixture.pressable.disabled,true);assert.equal(fixture.pressable.onPress,undefined);
 assert.ok(!flatten(fixture.nodes['modal-panel'].style).some(s=>s?.transform));
 pass('Busy/fade overlays remain nondismissable and do not translate');
 const groupsBefore=fixture.groups.length;
 await act(async()=>fixture.motionListener(true));assert.equal(fixture.groups.length,groupsBefore);
 assert.equal(flatten(fixture.nodes['modal-backdrop'].style).find(s=>s?.opacity).opacity.value,1);
 await render(false);assert.equal(fixture.modal.visible,false);
 pass('Reduced motion shows/hides immediately without animated movement');
 console.log(`MOBILE_OVERLAY_CHECKS_DONE passed=${passed}; actual component lifecycle, controlled native driver; no device UI claimed.`);
}finally{await act(async()=>root.unmount());dom.window.close();delete(globalThis as any).__MEDCORE_NATIVE_OVERLAY__;await rm(directory,{recursive:true,force:true});}
