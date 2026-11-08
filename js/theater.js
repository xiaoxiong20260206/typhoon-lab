import {clamp,describe,radiusAt,windRings} from './rules.js';
import {surfacePoint,geographicPoint,cloudProfile} from './scene-math.js';
import {PLACES} from './geo.js';

const TAU=Math.PI*2;
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=(T,p)=>new T.Vector3(p.x,p.y,p.z);
const disposeGroup=group=>{group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});group.clear();};

export class StormTheater{
  constructor(canvas,map,polygons,onFallback){
    const T=window.THREE;if(!T)throw Error('3D 引擎未加载');this.T=T;this.canvas=canvas;this.map=map;this.onFallback=onFallback;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor('#081621');this.renderer.outputEncoding=T.sRGBEncoding;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.95;
    this.renderer.localClippingEnabled=true;
    this.bounds=[new T.Plane(new T.Vector3(1,0,0),31.5),new T.Plane(new T.Vector3(-1,0,0),31.5),new T.Plane(new T.Vector3(0,0,1),27.5),new T.Plane(new T.Vector3(0,0,-1),27.5)];
    this.scene=new T.Scene();this.scene.fog=new T.FogExp2('#0d2234',.0055);
    this.camera=new T.PerspectiveCamera(43,1,.1,240);this.target=new T.Vector3();this.desiredTarget=new T.Vector3();
    this.scene.add(new T.HemisphereLight('#cce3ff','#1a2d45',.8));
    const sun=new T.DirectionalLight('#fff1d5',1.35);sun.position.set(-30,50,-20);this.scene.add(sun);
    this.active=true;this.mode='follow';this.quality='auto';this.ratio=Math.min(devicePixelRatio,1.6);this.distance=1;this.yaw=0;this.pitch=.87;this.dirty=true;this.visualTime=0;this.frameCount=0;
    this.storms=new Map();this.overlays=new T.Group();this.scene.add(this.overlays);
    this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.buildWorld(polygons);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
    this.labels=document.getElementById('sceneLabels');this.bind();
    this.lost=e=>{e.preventDefault();this.failed=true;this.active=false;onFallback('3D 显示中断，已保留模拟并切回二维地图。');};
    canvas.addEventListener('webglcontextlost',this.lost);
  }
  geometry(){
    const T=this.T,g=new T.PlaneGeometry(63,55,100,90);g.rotateX(-Math.PI/2);
    const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,-.0025*(p.getX(i)**2+p.getZ(i)**2));g.computeVertexNormals();return g;
  }
  buildWorld(polygons){
    const T=this.T;
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1536;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#203e3d';ctx.strokeStyle='#789895';ctx.lineWidth=1.2;ctx.beginPath();
    for(const rings of polygons)for(const ring of rings){ring.forEach(([lon,lat],i)=>{const x=(lon-100)/75*2048,y=(55-lat)/55*1536;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();}
    ctx.fill('evenodd');ctx.stroke();
    ctx.save();ctx.clip('evenodd');const rng=seeded(141);
    for(let i=0;i<22000;i++){ctx.fillStyle=i%3?'#acc4a20c':'#091f2911';ctx.beginPath();ctx.ellipse(rng()*2048,rng()*1536,2+rng()*12,1+rng()*5,-.6,0,TAU);ctx.fill();}ctx.restore();
    const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const land=new T.Mesh(this.geometry(),new T.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.3,roughness:.95,metalness:0}));land.position.y=.025;this.scene.add(land);
    this.water=new T.Mesh(this.geometry(),new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 vP; varying vec3 vN; void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
      uniform float time;varying vec3 vP;varying vec3 vN;
      void main(){
        vec2 p=vP.xz;float t=time*.13;
        float a=sin(p.x*8.+p.y*3.+t+sin(p.y*2.3)*.7)*.4;
        float b=sin(p.x*22.-p.y*17.+t*1.3)*.12;
        vec3 n=normalize(vN+vec3(a*.07,0.,b*.07));
        vec3 v=normalize(cameraPosition-vP),l=normalize(vec3(-.55,1.,-.35));
        float spec=pow(max(dot(n,normalize(l+v)),0.),110.);
        float fres=pow(1.-max(dot(n,v),0.),3.);
        vec3 color=mix(vec3(.017,.075,.11),vec3(.027,.20,.26),.45+.25*sin(p.y*.07));
        color+=vec3(.25,.42,.51)*spec*.3+vec3(.08,.14,.19)*fres+vec3(.005,.009,.012)*(a+b);
        gl_FragColor=vec4(color,1.);
      }` }));this.scene.add(this.water);
    const grid=[];
    for(let lon=100;lon<=175;lon+=5)for(let lat=0;lat<55;lat+=.5){grid.push(vec(T,surfacePoint(lon,lat,.035)),vec(T,surfacePoint(lon,lat+.5,.035)));}
    for(let lat=0;lat<=55;lat+=5)for(let lon=100;lon<175;lon+=.5){grid.push(vec(T,surfacePoint(lon,lat,.035)),vec(T,surfacePoint(lon+.5,lat,.035)));}
    this.scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(grid),new T.LineBasicMaterial({color:'#79a7b8',transparent:true,opacity:.09})));
    const edges=[];for(let lon=100;lon<=175;lon+=.5)edges.push(vec(T,surfacePoint(lon,0,.02)));for(let lat=0;lat<=55;lat+=.5)edges.push(vec(T,surfacePoint(175,lat,.02)));for(let lon=175;lon>=100;lon-=.5)edges.push(vec(T,surfacePoint(lon,55,.02)));for(let lat=55;lat>=0;lat-=.5)edges.push(vec(T,surfacePoint(100,lat,.02)));
    this.scene.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(edges),new T.LineBasicMaterial({color:'#466876',transparent:true,opacity:.4})));
  }
  resize(){
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
    this.renderer.setPixelRatio(this.ratio);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;
  }
  setActive(active){this.active=active&&!this.failed;this.canvas.hidden=!this.active;this.labels.hidden=!this.active;if(this.active){this.resize();this.sync(true);}}
  setMode(mode){this.mode=mode;this.distance=1;this.yaw=0;this.pitch=mode==='eye'?.85:.95;this.dirty=true;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===mode);b.setAttribute('aria-pressed',String(b.dataset.view===mode));});}
  zoom(factor){this.distance=clamp(this.distance*factor,.55,2.1);this.dirty=true;}
  setQuality(value){this.quality=value;this.ratio=value==='low'?1:Math.min(devicePixelRatio,value==='high'?2:1.6);this.resize();this.sync(true);}
  makeStorm(s,detail){
    const T=this.T,group=new T.Group(),profile=cloudProfile(s),rng=seeded(s.id*1307+Math.floor(s.wind/9)),n=detail?1500:400;
    if(!this.puffMap){
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),img=ctx.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const qx=(x-64)/64,qy=(y-64)/64,a=Math.atan2(qy,qx),r=Math.hypot(qx,qy)*(1+.08*Math.sin(a*7)+.045*Math.cos(a*11));
        const noise=.9+.1*Math.sin(qx*21+Math.cos(qy*13))*Math.cos(qy*18),alpha=clamp((1-r)/.48,0,1)*noise;
        const light=clamp(.65+Math.sqrt(Math.max(0,1-r*r))*.25-qy*.18,.25,1),i=(y*128+x)*4;
        img.data[i]=img.data[i+1]=img.data[i+2]=light*255;img.data[i+3]=alpha*190;
      }
      ctx.putImageData(img,0,0);this.puffMap=new T.CanvasTexture(c);
    }
    const cloud=new T.InstancedMesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({
      uniforms:{puff:{value:this.puffMap},opacity:{value:profile.opacity}},transparent:true,depthWrite:false,clippingPlanes:this.bounds,
      vertexShader:`varying vec2 vUv; varying vec3 vTint;
        #include <clipping_planes_pars_vertex>
        void main(){vUv=uv;vTint=instanceColor;
          vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
          float sx=length(instanceMatrix[0].xyz)*length(modelMatrix[0].xyz),sy=length(instanceMatrix[2].xyz)*length(modelMatrix[0].xyz);
          mvPosition.xy+=position.xy*vec2(sx,sy);
          gl_Position=projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader:`uniform sampler2D puff; uniform float opacity;varying vec2 vUv;varying vec3 vTint;
        #include <clipping_planes_pars_fragment>
        void main(){
          #include <clipping_planes_fragment>
          vec4 t=texture2D(puff,vUv);if(t.a<.02)discard;
          vec3 color=mix(vec3(.18,.29,.40),vec3(.94,.97,1.),t.r)*(.85+vTint*.15);
          gl_FragColor=vec4(color,t.a*opacity);
        }`
    }),n);
    const tex=document.createElement('canvas');tex.width=512;tex.height=512;const paint=tex.getContext('2d');
    cloud.frustumCulled=false;const obj=new T.Object3D(),color=new T.Color(),strength=profile.strength,eyerm=profile.eye?1.05+strength*.25:0;
    for(let i=0;i<n;i++){
      let x,z,y,r,scale;
      if(profile.extra){const t=rng(),a=t*5.8;r=.6+t*6;x=Math.cos(a)*r*1.35;z=Math.sin(a)*r*.65;y=.45+rng()*.8;scale=.28+rng()*.42;}
      else if(s.wind<17.2){const a=(i%5)*1.35,r=1+(i%3);x=Math.cos(a)*r+(rng()-.5)*2;z=Math.sin(a)*r+(rng()-.5)*2;y=.35+rng()*.85;scale=.25+rng()*.45;}
      else if(i<n*.35){const a=rng()*TAU;r=eyerm+.28+Math.pow(rng(),1.4)*(2.3-strength*.8);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.65+strength*.8+Math.exp(-Math.pow((r-eyerm-.45)/.6,2))*.55+rng()*.2;scale=.10+rng()*.17;}
      else{const t=rng(),arm=i%3,a=arm*TAU/3+Math.log(1+t*5)*2.8;r=eyerm+.9+t*5.3;x=Math.cos(a)*r+(rng()-.5)*(.8+(1-strength));z=Math.sin(a)*r+(rng()-.5)*.9;y=.35+(1-t)*.7+rng()*.25;scale=(.14+rng()*.26)*(1-t*.4);}
      // Vertical scale is illustrative, not meteorological altitude.
      obj.position.set(x,y,z);obj.rotation.set(rng()*3,rng()*3,rng()*3);obj.scale.set(scale*2.1,scale*(.65+rng()*.7),scale*1.8);obj.updateMatrix();cloud.setMatrixAt(i,obj.matrix);
      color.setHSL(.56,.07,.6+y*.06+rng()*.1);cloud.setColorAt(i,color);
      const px=(x+8)/16*512,pz=(z+8)/16*512,rad=(scale*2+.18)*32;
      const g=paint.createRadialGradient(px,pz,0,px,pz,rad);g.addColorStop(0,'rgba(231,239,246,.72)');g.addColorStop(.45,'rgba(202,219,230,.38)');g.addColorStop(1,'rgba(183,207,222,0)');paint.fillStyle=g;paint.fillRect(px-rad,pz-rad,rad*2,rad*2);
    }
    if(profile.eye){paint.globalCompositeOperation='destination-out';paint.beginPath();paint.arc(256,256,eyerm*32,0,TAU);paint.fillStyle='#000';paint.fill();}
    const cloudTexture=new T.CanvasTexture(tex);cloudTexture.encoding=T.sRGBEncoding;
    const sheetGeo=new T.PlaneGeometry(16,16,90,90);sheetGeo.rotateX(-Math.PI/2);const v=sheetGeo.attributes.position;
    for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x);v.setY(i,.4+(profile.extra?.3:.85)*Math.exp(-((r-eyerm-.7)**2)/2)+.12*Math.sin(a*7+r*5)*Math.sin(z*3));}sheetGeo.computeVertexNormals();
    const sheet=new T.Mesh(sheetGeo,new T.MeshStandardMaterial({map:cloudTexture,color:'#e2eaf2',transparent:true,opacity:profile.opacity,depthWrite:false,side:T.DoubleSide,roughness:1,clippingPlanes:this.bounds}));
    group.add(sheet,cloud);group.scale.set(s.size,s.size,s.size);this.scene.add(group);
    const label=document.createElement('button');label.className='storm-label';label.dataset.id=s.id;label.addEventListener('click',()=>{this.map.onSelect(s.id);this.setMode('follow');});this.labels.append(label);
    return {group,cloud,sheet,label,profile};
  }
  sync(force=false){
    if(!this.active||!this.map.frame)return;
    const T=this.T,frame=this.map.frame,key=`${frame.hour}-${this.map.selected}-${JSON.stringify(this.map.layers)}`;
    if(!force&&this.lastFrame===frame&&this.syncKey===key){this.dirty=true;return;}
    this.lastFrame=frame;this.syncKey=key;
    const ids=new Set(frame.storms.map(s=>s.id));
    for(const [id,item] of this.storms)if(!ids.has(id)){disposeGroup(item.group);this.scene.remove(item.group);item.label.remove();this.storms.delete(id);}
    for(const s of frame.storms){
      const detail=s.id===this.map.selected&&this.quality!=='low',signature=`${Math.floor(s.wind/9)}-${s.wind>=17.2}-${cloudProfile(s).eye}-${s.status}-${s.size}-${detail}`;
      let item=this.storms.get(s.id);
      if(!item||item.signature!==signature){if(item){disposeGroup(item.group);this.scene.remove(item.group);item.label.remove();}item=this.makeStorm(s,detail);item.signature=signature;this.storms.set(s.id,item);}
      const p=surfacePoint(s.lon,s.lat);item.group.position.set(p.x,p.y,p.z);item.storm=s;
      item.group.visible=this.map.layers.clouds&&cloudProfile(s).opacity>0;
      item.cloud.material.uniforms.opacity.value=cloudProfile(s).opacity;item.sheet.material.opacity=cloudProfile(s).opacity;
      item.label.textContent=`${s.name?.cn||s.number||s.invest} · ${describe(s).name}`;item.label.classList.toggle('selected',s.id===this.map.selected);item.label.style.setProperty('--storm-color',describe(s).color);
    }
    disposeGroup(this.overlays);
    for(const s of frame.storms){
      const cos=Math.cos(s.lat*Math.PI/180),color=describe(s).color;
      if(this.map.layers.rings)for(const level of windRings(s)){
        const points=[];for(let i=0;i<120;i++){const a=i/120*TAU,r=radiusAt(s,level,a);points.push(vec(T,surfacePoint(s.lon+Math.cos(a)*r/(111.2*cos),s.lat+Math.sin(a)*r/111.2,.1)));}
        this.overlays.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:{7:'#bace9a',10:'#e9bb70',12:'#ef947b'}[level],transparent:true,opacity:s.id===this.map.selected?.9:.45,depthTest:false})));
      }
      if(this.map.layers.track){
        const points=[];for(let h=s.bornAt;h<=frame.hour;h+=2){const old=this.map.run.frames[h].storms.find(t=>t.id===s.id);if(old)points.push(vec(T,surfacePoint(old.lon,old.lat,.08)));}
        if(points.length>1)this.overlays.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color,transparent:true,opacity:.65})));
      }
      if(this.map.layers.rain&&s.status!=='dissipated'){
        const points=[],rng=seeded(s.id*37);
        for(let i=0;i<180;i++){const a=rng()*TAU,r=(.8+rng()*3.3)*s.size,lon=s.lon+Math.cos(a)*r/cos,lat=s.lat+Math.sin(a)*r;points.push(vec(T,surfacePoint(lon,lat,.15)),vec(T,surfacePoint(lon,lat,.5+rng()*.8)));}
        this.overlays.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#85c3e4',transparent:true,opacity:.22})));
      }
      if(this.map.layers.wind&&s.status!=='dissipated'){
        const points=[];for(let i=0;i<80;i++){const a=i*2.39,r=(1+i%12*.32)*s.size;points.push(vec(T,surfacePoint(s.lon+Math.cos(a)*r/cos,s.lat+Math.sin(a)*r,.2)),vec(T,surfacePoint(s.lon+Math.cos(a+.12)*r/cos,s.lat+Math.sin(a+.12)*r,.2)));}
        this.overlays.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#cee9e1',transparent:true,opacity:.4})));
      }
    }
    this.dirty=true;
  }
  update(dt,playing,reduced){
    if(!this.active||this.failed||!this.map.frame)return;
    const T=this.T,s=this.map.frame.storms.find(s=>s.id===this.map.selected)||this.map.frame.storms[0];
    const p=this.mode==='overview'?surfacePoint(137.5,27.5):surfacePoint(s.lon,s.lat,.6);
    this.desiredTarget.set(p.x,p.y,p.z);
    const aspectFit=Math.max(1,1/this.camera.aspect),dist=(this.mode==='overview'?77:this.mode==='eye'?14*s.size:26*s.size)*this.distance*(this.mode==='overview'?Math.sqrt(aspectFit):Math.sqrt(aspectFit));
    const pitch=this.mode==='overview'?1.22:this.pitch;
    const desired=new T.Vector3(p.x+Math.sin(this.yaw)*dist*Math.cos(pitch),p.y+Math.sin(pitch)*dist,p.z+Math.cos(this.yaw)*dist*Math.cos(pitch));
    const moving=this.camera.position.distanceTo(desired)>.015||this.target.distanceTo(this.desiredTarget)>.015;
    const k=reduced||!this.initialized?1:1-Math.exp(-dt*5);this.camera.position.lerp(desired,k);this.target.lerp(this.desiredTarget,k);this.camera.lookAt(this.target);this.initialized=true;
    if(playing&&!reduced){this.visualTime+=dt;this.water.material.uniforms.time.value=this.visualTime;for(const item of this.storms.values())item.group.rotation.y=this.visualTime*(.015+item.storm.wind*.0006);}
    if(!this.dirty&&!moving&&(!playing||reduced))return;
    this.renderer.render(this.scene,this.camera);this.frameCount++;this.dirty=false;this.positionLabels();
    if(this.quality==='auto'&&playing){this.fpsTime=(this.fpsTime||0)+dt;this.fpsFrames=(this.fpsFrames||0)+1;if(this.fpsTime>3){if(this.fpsFrames/this.fpsTime<24&&this.ratio>1){this.ratio=Math.max(1,this.ratio-.25);this.resize();}this.fpsTime=0;this.fpsFrames=0;}}
  }
  screen(lon,lat,height=0){const p=vec(this.T,surfacePoint(lon,lat,height)).project(this.camera);return {x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2,z:p.z};}
  positionLabels(){
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight,stage=this.canvas.getBoundingClientRect();
    const placed=[...this.canvas.parentElement.querySelectorAll('.view-toolbar,.layer-toolbar,.map-navigation,.theater-caption,.sound-controls,.cinema-readout,.map-hint')].filter(el=>!el.hidden&&el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-stage.left-8,right:r.right-stage.left+8,top:r.top-stage.top-8,bottom:r.bottom-stage.top+8};});
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const items=[...this.storms.values()].sort((a,b)=>(b.storm.id===this.map.selected)-(a.storm.id===this.map.selected));
    for(const item of items){const p=this.screen(item.storm.lon,item.storm.lat,2.6*item.storm.size),el=item.label;
      const visible=p.z>-1&&p.z<1&&p.x>0&&p.x<w&&p.y>80&&p.y<h-70;el.hidden=!visible;if(!visible)continue;
      const half=el.offsetWidth/2+4,height=el.offsetHeight/2+4,x=clamp(p.x,half+8,w-half-8),origin=clamp(p.y,150,h-100);
      let spot=null;for(const offset of [0,38,-38,76,-76,114,-114]){const y=origin+offset,box={left:x-half,right:x+half,top:y-height,bottom:y+height};if(box.top>140&&box.bottom<h-75&&!placed.some(b=>intersects(box,b))){spot={x,y,box};break;}}
      el.hidden=!spot;if(!spot)continue;el.style.left=`${spot.x}px`;el.style.top=`${spot.y}px`;placed.push(spot.box);
    }
    const places=document.getElementById('placeLabels');
    if(!this.placeElements)this.placeElements=PLACES.map(([name])=>{const el=document.createElement('span');el.textContent=name;places.append(el);return el;});
    PLACES.forEach(([,lon,lat],i)=>{const p=this.screen(lon,lat,.15),el=this.placeElements[i];el.hidden=this.mode==='eye'||p.z>=1||p.x<=25||p.x>=w-45||p.y<=170||p.y>=h-90;el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;});
  }
  pick(x,y){
    this.pointer.set(x/this.canvas.clientWidth*2-1,1-y/this.canvas.clientHeight*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObject(this.water)[0];return hit?geographicPoint(hit.point.x,hit.point.z):null;
  }
  bind(){
    let down=null,moved=false;
    this.canvas.addEventListener('pointerdown',e=>{down={x:e.offsetX,y:e.offsetY,yaw:this.yaw,pitch:this.pitch};moved=false;this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(!down||this.map.creating)return;const dx=e.offsetX-down.x,dy=e.offsetY-down.y;if(Math.hypot(dx,dy)>5)moved=true;this.yaw=clamp(down.yaw-dx*.005,-1.4,1.4);this.pitch=clamp(down.pitch+dy*.004,.35,1.45);this.dirty=true;});
    this.canvas.addEventListener('pointerup',e=>{
      if(!moved){const point=this.pick(e.offsetX,e.offsetY);if(point){if(this.map.creating)this.map.onCreate(point.lon,point.lat);else{
        const found=[...this.storms.values()].find(item=>{const p=this.screen(item.storm.lon,item.storm.lat);return Math.hypot(p.x-e.offsetX,p.y-e.offsetY)<40;});
        if(found){this.map.onSelect(found.storm.id);this.setMode('follow');}else{const p=this.map.project(point.lon,point.lat);this.map.click(point.lon,point.lat,...p);}
      }}}down=null;
    });
    this.canvas.addEventListener('pointercancel',()=>down=null);
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?1.1:.91);},{passive:false});
    this.canvas.addEventListener('keydown',e=>{if(e.key==='Enter'&&this.map.creating){e.preventDefault();this.map.onCreate(145,15);}});
  }
  get diagnostics(){return {active:this.active,failed:!!this.failed,mode:this.mode,quality:this.quality,ratio:this.ratio,systems:this.storms.size,frameCount:this.frameCount,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries};}
}
