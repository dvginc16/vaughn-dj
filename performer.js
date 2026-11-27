import * as T from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const rig=document.querySelector(".performer"), canvas=rig.querySelector("canvas");
const photo=rig.querySelector("img"), motion=document.querySelector(".motion");
const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene(), camera=new T.OrthographicCamera(-2,2,4.88,0,.1,20);
camera.position.z=8;
function group(parent,x=0,y=0,z=0){
  const joint=new T.Group();parent.add(joint);joint.position.set(x,y,z);return joint;
}
function material(color,roughness=.75,metalness=0){
  return new T.MeshStandardMaterial({color,roughness,metalness});
}
const fur=material(0xf8f4ef), earPink=material(0xb78e9a), leather=material(0x211e28,.38),
  capMat=material(0x242329), glass=material(0x100e1c,.13,.48), trim=material(0x78717f,.3,.5),
  noseMat=material(0xad7f86), ember= new T.MeshBasicMaterial({color:0xff8744});
const sphere=new T.SphereGeometry(1,40,28);
function oval(parent,mat,x,y,z,a,b,c){
  const mesh=new T.Mesh(sphere,mat);mesh.position.set(x,y,z);mesh.scale.set(a,b,c);parent.add(mesh);return mesh;
}
function rod(parent,mat,start,end,r){
  const a=new T.Vector3(...start),b=new T.Vector3(...end),delta=b.clone().sub(a);
  const mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),14),mat);
  mesh.position.copy(a.addScaledVector(delta,.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;
}
const root=group(scene,0,2.02), torso=group(root);
oval(torso,leather,0,.37,0,.57,.71,.36);
for(let i=0;i<4;i++) oval(torso,leather,0,.10+i*.16,.01,.55-i*.012,.21,.367);
rod(torso,trim,[0,-.02,.376],[0,.82,.36],.011);
const head=group(torso,0,1.12,.04);
oval(head,fur,0,0,0,.515,.50,.405);
const ears=[-1,1].map(s=>{
 const joint=group(head,s*.22,.31,-.04);
 oval(joint,fur,0,.37,0,.146,.49,.104);
 oval(joint,earPink,0,.41,.069,.093,.364,.046);
 return joint;
});
oval(head,capMat,0,.33,-.012,.49,.242,.39);
oval(head,capMat,.26,.32,-.27,.44,.04,.31);
const muzzle=group(head,0,-.13,.33);
for(const s of [-1,1]){
 oval(muzzle,fur,s*.105,0,.025,.145,.114,.104);
 for(let i=0;i<3;i++) rod(muzzle,trim,[s*.13,-.003-i*.02,.115],[s*(.44+i*.045),.039-i*.055,.094],.003);
 oval(head,glass,s*.207,.076,.337,.231,.136,.09).rotation.z=s*.085;
 oval(head,trim,s*.21,.119,.422,.117,.008,.003).rotation.z=-.2;
 rod(head,glass,[s*.387,.10,.32],[s*.49,.09,-.025],.023);
 oval(head,leather,s*.48,.07,-.06,.118,.205,.145);
 oval(head,trim,s*.536,.07,-.064,.07,.145,.105);
}
rod(head,glass,[-.075,.09,.39],[.075,.09,.39],.03);
for(let i=0;i<3;i++) oval(head,glass,-.31+.035*i,-.07-.045*(i%2),.293+.02*i,.012,.023,.012);
const nose=oval(muzzle,noseMat,0,.066,.134,.083,.047,.041);
const jaw=oval(head,fur,0,-.24,.28,.135,.085,.115);
rod(muzzle,fur,[.10,-.065,.14],[.46,-.145,.24],.018);
oval(muzzle,ember,.46,-.145,.24,.021,.021,.021);
const arms=[-1,1].map(s=>{
 const shoulder=group(torso,s*.415,.68,.02);
 oval(shoulder,leather,s*.105,-.16,.02,.197,.32,.195).rotation.z=s*.37;
 const elbow=group(shoulder,s*.18,-.35,.033);
 oval(elbow,leather,0,-.18,.09,.16,.26,.166);
 const paw=group(elbow,0,-.36,.13);
 oval(paw,fur,0,-.04,.025,.126,.165,.122);
 for(let i=-1;i<=1;i++) oval(paw,fur,i*.06,-.145,.065,.044,.066,.047);
 return {shoulder,elbow,paw};
});
scene.add(new T.HemisphereLight(0xfff8ed,0x53516a,2.0));
for(const [color,power,x,y,z] of [[0xffead7,2.8,3,5,5],[0x9760ff,3,-3,3,-1],[0xd0ec95,2,3,4,-2]]){
 const light=new T.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);
}
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let paused=reduced.matches, playing=false, seconds=415, reported=0, visible=true;
window.addEventListener("vaughn:transport",({detail})=>{playing=detail.playing;seconds=detail.position/1000;reported=performance.now()});
function update(){motion.setAttribute("aria-pressed",String(paused));motion.textContent=paused?"Enable motion":"Pause motion";document.body.classList.toggle("still",paused)}
motion.onclick=()=>{paused=!paused;update()};
reduced.onchange=()=>{paused=reduced.matches;update()};
new ResizeObserver(()=>renderer.setSize(rig.clientWidth,rig.clientHeight,false)).observe(rig);
new IntersectionObserver(([e])=>visible=e.isIntersecting).observe(rig);
let last=-100,clock=0;
function render(now){
 requestAnimationFrame(render);if(!visible||document.hidden||now-last<28)return;
 if(!paused)clock+=Math.min(65,now-last)/1000;
 last=now;
 if(!paused){
 const t=playing?seconds+Math.min(.5,(now-reported)/1000):clock;
 const beat=t*2, phase=beat*Math.PI*2;
 const level=playing?(mixLevels[Math.min(mixLevels.length-1,Math.floor(t/3052.146*mixLevels.length))]||95):112;
 const drive=Math.max(.32,Math.min(1.15,(level-62)/58));
 const nod=Math.cos(phase)*drive, sway=Math.sin(phase/4);
 const gesture=i=>Math.pow(Math.max(0,Math.cos((beat/8-i)*2*Math.PI/5)),3);
 torso.position.set(.085*sway,.042*nod,0);torso.rotation.z=.055*sway;
 head.rotation.set(.095*nod,-.18+.28*Math.sin(phase/8),-.09*sway);
 ears.forEach((ear,i)=>{ear.rotation.z=(i?-.28:.24)+.06*Math.sin(phase-.45+i);ear.rotation.x=.06*nod});
 jaw.position.y=-.241-.023*Math.max(0,nod);muzzle.rotation.z=.055*Math.sin(phase/4);nose.position.y=.067+.009*Math.sin(phase*1.4);
 arms.forEach(({shoulder,elbow,paw},i)=>{
 const sign=i?1:-1,listen=gesture(i?3:0),scratch=gesture(i?1:4),fader=gesture(2);
 shoulder.rotation.z=sign*(.10+.32*listen+.18*scratch*Math.sin(phase/2));
 shoulder.rotation.x=-.25-.52*listen;
 elbow.rotation.x=-.45-2.23*listen-.27*scratch*(1+nod);
 elbow.rotation.z=-sign*(.24+.33*fader+.17*Math.sin(phase/2+i));
 paw.rotation.set(.25*nod,.45*scratch*Math.sin(phase),sign*.28*fader);
 });
 }
 renderer.render(scene,camera);
 if(canvas.hidden){canvas.hidden=false;photo.style.clipPath="inset(56.4% 0 0)";motion.hidden=false;update()}
}
requestAnimationFrame(render);

