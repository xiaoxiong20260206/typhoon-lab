import {clamp,describe,displayName,radiusAt,windRings} from './rules.js?v=6b87e2dea47f';
import {surfacePoint,geographicPoint,cloudProfile,cloudDetail,GLOBE_RADIUS} from './scene-math.js?v=6b87e2dea47f';
import {PLACES} from './geo.js?v=6b87e2dea47f';

const TAU=Math.PI*2;
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const vec=(T,p)=>new T.Vector3(p.x,p.y,p.z);
const disposeGroup=group=>{group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});group.clear();};

export class StormTheater{
  constructor(canvas,map,polygons,onFallback){
    const T=window.THREE;if(!T)throw Error('3D 引擎未加载');this.T=T;this.canvas=canvas;this.map=map;this.onFallback=onFallback;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setClearColor('#061321');this.renderer.outputEncoding=T.sRGBEncoding;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.08;
    this.scene=new T.Scene();this.scene.fog=new T.FogExp2('#061321',.0018);
    this.camera=new T.PerspectiveCamera(42,1,.1,520);this.target=new T.Vector3();this.desiredTarget=new T.Vector3();
    this.scene.add(new T.HemisphereLight('#d5efff','#0a2940',.80));
    const sun=new T.DirectionalLight('#fff0d2',2.05);sun.position.set(-62,54,-48);this.scene.add(sun);
    const rim=new T.DirectionalLight('#54b7ff',.55);rim.position.set(60,-15,42);this.scene.add(rim);
    this.active=true;this.mode='overview';this.quality='auto';this.ratio=Math.min(devicePixelRatio,1.6);this.distance=1;this.yaw=0;this.pitch=.18;this.dirty=true;this.visualTime=0;this.frameCount=0;
    this.storms=new Map();this.overlays=new T.Group();this.scene.add(this.overlays);
    this.lines=new Map();this.cloudBuilds=0;this.overlayAllocations=0;this.labelPasses=0;this.labelClock=0;this.introAge=0;this.cameraGoal=new T.Vector3();
    this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();this.buildWorld(polygons);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
    this.labels=document.getElementById('sceneLabels');this.bind();
    this.lost=e=>{e.preventDefault();this.failed=true;this.active=false;onFallback('3D 显示中断，已保留模拟并切回二维地图。');};
    canvas.addEventListener('webglcontextlost',this.lost);
  }
  geometry(){
    const T=this.T,g=new T.SphereGeometry(GLOBE_RADIUS,112,72);
    const pos=g.attributes.position,uv=g.attributes.uv;
    for(let i=0;i<pos.count;i++){const point=geographicPoint(pos.getX(i),pos.getZ(i),pos.getY(i));uv.setXY(i,(point.lon+180)/360,(point.lat+90)/180);}
    g.computeVertexNormals();return g;
  }
  buildWorld(polygons){
    const T=this.T;
    const canvas=document.createElement('canvas');canvas.width=4096;canvas.height=2048;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#3f8b52';ctx.beginPath();
    for(const rings of polygons)for(const ring of rings){
      ring.forEach(([lon,lat],index)=>{const x=(lon+180)/360*canvas.width,y=(90-lat)/180*canvas.height;index?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    }
    ctx.closePath();ctx.fill('evenodd');ctx.strokeStyle='#b9e3c2';ctx.lineWidth=2.2;ctx.stroke();
    ctx.save();ctx.clip('evenodd');const rng=seeded(141);
    for(let i=0;i<32000;i++){
      const lat=Math.abs((rng()-.5)*160),humid=Math.max(.08,1-Math.abs(lat-18)/46);
      const colors=humid>.45?['#9dcc6d26','#1f60302a','#d4d08b18']:['#c6b16b20','#335f3528','#d8e6b51a'];
      ctx.fillStyle=colors[i%colors.length];ctx.beginPath();ctx.ellipse(rng()*canvas.width,rng()*canvas.height,5+rng()*28,2+rng()*10,-.62,0,TAU);ctx.fill();
    }
    for(let i=0;i<9000;i++){ctx.fillStyle=i%4?'#f1f2dd0d':'#061b1322';ctx.beginPath();ctx.ellipse(rng()*canvas.width,rng()*canvas.height,1+rng()*8,1+rng()*3,-.7,0,TAU);ctx.fill();}ctx.restore();
    const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());
    const globe=this.geometry();
    const land=new T.Mesh(globe,new T.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.08,roughness:.88,metalness:0,side:T.FrontSide}));land.scale.setScalar(1.002);this.scene.add(land);
    this.water=new T.Mesh(globe,new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 vP; varying vec3 vN; void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
      uniform float time;varying vec3 vP;varying vec3 vN;
      void main(){
        vec3 p=normalize(vP);float t=time*.16;
        float a=sin(p.x*23.+p.z*17.+t+sin(p.y*12.)*.7)*.36;
        float b=sin(p.x*71.-p.z*53.+t*1.5)*.13;
        vec3 n=normalize(vN+normalize(vec3(a,b,a*.8))*.065);
        vec3 v=normalize(cameraPosition-vP),l=normalize(vec3(-.55,1.,-.35));
        float spec=pow(max(dot(n,normalize(l+v)),0.),125.);
        float fres=pow(1.-max(dot(n,v),0.),7.);
        float equator=.5+.5*cos(p.y*4.6);
        vec3 color=mix(vec3(.018,.105,.20),vec3(.025,.225,.37),equator);
        color+=vec3(.42,.52,.48)*spec*.72+vec3(.035,.145,.26)*fres+vec3(.008,.018,.024)*(a+b);
        gl_FragColor=vec4(color,1.);
      }` }));this.scene.add(this.water);
    const atmosphere=new T.Mesh(new T.SphereGeometry(GLOBE_RADIUS*1.045,96,64),new T.ShaderMaterial({
      transparent:true,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending,
      vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vN=normal;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vN;varying vec3 vP;void main(){vec3 v=normalize(cameraPosition-vP);float rim=pow(1.-abs(dot(normalize(vN),v)),2.8);gl_FragColor=vec4(.16,.56,.95,rim*.22);}`
    }));this.scene.add(atmosphere);
    const stars=[],starRng=seeded(2077);
    for(let i=0;i<1200;i++){const theta=starRng()*TAU,phi=Math.acos(starRng()*2-1),radius=175+starRng()*55;stars.push(new T.Vector3(radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta)));}
    this.scene.add(new T.Points(new T.BufferGeometry().setFromPoints(stars),new T.PointsMaterial({color:'#b9d9ee',size:.28,transparent:true,opacity:.66,depthWrite:false})));
    const grid=[];
    for(let lon=100;lon<=175;lon+=5)for(let lat=0;lat<55;lat+=.5){grid.push(vec(T,surfacePoint(lon,lat,.035)),vec(T,surfacePoint(lon,lat+.5,.035)));}
    for(let lat=0;lat<=55;lat+=5)for(let lon=100;lon<175;lon+=.5){grid.push(vec(T,surfacePoint(lon,lat,.035)),vec(T,surfacePoint(lon+.5,lat,.035)));}
    this.scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(grid),new T.LineBasicMaterial({color:'#86bccf',transparent:true,opacity:.12})));
    const worldGrid=[];
    for(let lat=-75;lat<=75;lat+=15)for(let lon=-180;lon<180;lon+=2)worldGrid.push(vec(T,surfacePoint(lon,lat,.018)),vec(T,surfacePoint(lon+2,lat,.018)));
    for(let lon=-180;lon<180;lon+=15)for(let lat=-80;lat<80;lat+=2)worldGrid.push(vec(T,surfacePoint(lon,lat,.018)),vec(T,surfacePoint(lon,lat+2,.018)));
    this.scene.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(worldGrid),new T.LineBasicMaterial({color:'#91bad0',transparent:true,opacity:.055})));
    const edges=[];for(let lon=100;lon<=175;lon+=.5)edges.push(vec(T,surfacePoint(lon,0,.02)));for(let lat=0;lat<=55;lat+=.5)edges.push(vec(T,surfacePoint(175,lat,.02)));for(let lon=175;lon>=100;lon-=.5)edges.push(vec(T,surfacePoint(lon,55,.02)));for(let lat=55;lat>=0;lat-=.5)edges.push(vec(T,surfacePoint(100,lat,.02)));
    this.scene.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(edges),new T.LineBasicMaterial({color:'#72bbd4',transparent:true,opacity:.48})));
  }
  resize(){
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
    this.renderer.setPixelRatio(this.ratio);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;this.labelClock=1;
    for(const item of this.storms.values())item.labelWidth=0;
  }
  setActive(active){this.active=active&&!this.failed;this.canvas.hidden=!this.active;this.labels.hidden=!this.active;if(this.active){this.resize();this.sync(true);}}
  setMode(mode){this.mode=mode;this.distance=1;this.yaw=0;this.pitch=mode==='eye'?.64:mode==='overview'?.18:.82;this.dirty=true;document.getElementById('cameraSelect').value=mode;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===mode);b.setAttribute('aria-pressed',String(b.dataset.view===mode));});this.sync(true);}
  zoom(factor){this.distance=clamp(this.distance*factor,.45,2.6);this.dirty=true;}
  setQuality(value){this.quality=value;this.ratio=value==='low'?1:Math.min(devicePixelRatio,value==='high'?2:1.6);this.resize();this.sync(true);}
  makeStorm(s,detail){
    const T=this.T,group=new T.Group(),profile=cloudProfile(s),rng=seeded(s.id*1307+Math.floor(s.wind/9)),n=detail.particles;this.cloudBuilds++;
    if(!this.puffMap){
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),img=ctx.createImageData(128,128);
      for(let y=0;y<128;y++)for(let x=0;x<128;x++){
        const qx=(x-64)/64,qy=(y-64)/64,a=Math.atan2(qy,qx),r=Math.hypot(qx,qy)*(1+.08*Math.sin(a*7)+.045*Math.cos(a*11));
        const noise=.9+.1*Math.sin(qx*21+Math.cos(qy*13))*Math.cos(qy*18),alpha=clamp((1-r)/.48,0,1)*noise;
        const light=clamp(.35+Math.sqrt(Math.max(0,1-r*r))*.4-qy*.2-qx*.12,.16,1),i=(y*128+x)*4;
        img.data[i]=img.data[i+1]=img.data[i+2]=light*255;img.data[i+3]=alpha*190;
      }
      ctx.putImageData(img,0,0);this.puffMap=new T.CanvasTexture(c);
    }
    const cloud=new T.InstancedMesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({
      uniforms:{puff:{value:this.puffMap},opacity:{value:profile.opacity},eyeRadius:{value:profile.eyeRadius}},transparent:true,depthWrite:false,
      vertexShader:`varying vec2 vUv; varying vec3 vTint; varying vec2 vEye;
        void main(){vUv=uv;vTint=instanceColor;
          vec4 mvPosition=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
          float sx=length(instanceMatrix[0].xyz)*length(modelMatrix[0].xyz),sy=length(instanceMatrix[2].xyz)*length(modelMatrix[0].xyz);
          vec3 right=vec3(viewMatrix[0].x,viewMatrix[1].x,viewMatrix[2].x),up=vec3(viewMatrix[0].y,viewMatrix[1].y,viewMatrix[2].y);
          vec3 center=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
          vEye=(center.xz+(right*position.x*sx+up*position.y*sy).xz-modelMatrix[3].xz)/length(modelMatrix[0].xyz);
          mvPosition.xy+=position.xy*vec2(sx,sy);
          gl_Position=projectionMatrix*mvPosition;
        }`,
      fragmentShader:`uniform sampler2D puff; uniform float opacity;uniform float eyeRadius;varying vec2 vUv;varying vec3 vTint;varying vec2 vEye;
        void main(){
          vec4 t=texture2D(puff,vUv);if(eyeRadius>0.)t.a*=smoothstep(eyeRadius,eyeRadius+.12,length(vEye));if(t.a<.02)discard;
          vec3 color=mix(vec3(.12,.20,.27),vec3(.86,.88,.86),t.r)*(.76+vTint*.24);
          gl_FragColor=vec4(color,t.a*opacity);
        }`
    }),n);
    const tex=document.createElement('canvas');tex.width=512;tex.height=512;const paint=tex.getContext('2d');
    cloud.frustumCulled=false;const obj=new T.Object3D(),color=new T.Color(),strength=profile.strength,eyerm=profile.eyeRadius;
    for(let i=0;i<n;i++){
      let x,z,y,r,scale;
      if(profile.extra){const t=rng(),a=t*5.8;r=.6+t*6;x=Math.cos(a)*r*1.35;z=Math.sin(a)*r*.65;y=.45+rng()*.8;scale=.28+rng()*.42;}
      else if(s.wind<17.2){const a=(i%5)*1.35,r=1+(i%3);x=Math.cos(a)*r+(rng()-.5)*2;z=Math.sin(a)*r+(rng()-.5)*2;y=.35+rng()*.85;scale=.25+rng()*.45;}
      else if(i<n*.35){const a=rng()*TAU;r=eyerm+.26+Math.pow(rng(),1.4)*(2.3-strength*.8);x=Math.cos(a)*r;z=Math.sin(a)*r;y=.35+strength*.45+Math.exp(-Math.pow((r-eyerm-.35)/.55,2))*.45+rng()*.2;scale=.09+rng()*.14;}
      else{const t=rng(),arm=i%3,a=arm*TAU/3+Math.log(1+t*5)*2.8;r=eyerm+.9+t*5.3;x=Math.cos(a)*r+(rng()-.5)*(.8+(1-strength));z=Math.sin(a)*r+(rng()-.5)*.9;y=.35+(1-t)*.7+rng()*.25;scale=(.14+rng()*.26)*(1-t*.4);}
      // Vertical scale is illustrative, not meteorological altitude.
      obj.position.set(x,y,z);obj.rotation.set(rng()*3,rng()*3,rng()*3);obj.scale.set(scale*2.1,scale*(.65+rng()*.7),scale*1.8);obj.updateMatrix();cloud.setMatrixAt(i,obj.matrix);
      color.setHSL(.56,.07,.6+y*.06+rng()*.1);cloud.setColorAt(i,color);
      const px=(x+8)/16*512,pz=(z+8)/16*512,rad=(scale*2+.18)*32;
      const g=paint.createRadialGradient(px,pz,0,px,pz,rad);g.addColorStop(0,'rgba(212,224,230,.8)');g.addColorStop(.45,'rgba(164,186,200,.46)');g.addColorStop(1,'rgba(129,160,178,0)');paint.fillStyle=g;paint.fillRect(px-rad,pz-rad,rad*2,rad*2);
    }
    if(profile.eye){paint.globalCompositeOperation='destination-out';paint.beginPath();paint.arc(256,256,eyerm*32,0,TAU);paint.fillStyle='#000';paint.fill();}
    const cloudTexture=new T.CanvasTexture(tex);cloudTexture.encoding=T.sRGBEncoding;
    const sheetGeo=new T.RingGeometry(.01,8,detail.segments*2,detail.segments);sheetGeo.rotateX(-Math.PI/2);const v=sheetGeo.attributes.position;
    for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getZ(i),r=Math.hypot(x,z),a=Math.atan2(z,x);v.setY(i,.25+(profile.extra?.25:.7)*Math.exp(-((r-eyerm-.5)**2)/1.4)+.035*Math.sin(a*5+r*3)*Math.sin(z*2));}sheetGeo.computeVertexNormals();
    const sheet=new T.Mesh(sheetGeo,new T.MeshStandardMaterial({map:cloudTexture,color:'#b6ccd5',transparent:true,opacity:profile.opacity*.86,depthWrite:false,side:T.DoubleSide,roughness:1}));
    sheet.renderOrder=1;cloud.renderOrder=2;
    group.add(sheet,cloud);group.scale.set(s.size,s.size,s.size);this.scene.add(group);
    const normal=vec(T,surfacePoint(s.lon,s.lat)).normalize(),baseQuaternion=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal);
    const label=document.createElement('button');label.className='storm-label';label.dataset.id=s.id;label.addEventListener('click',()=>{this.map.onSelect(s.id);this.setMode('follow');});this.labels.append(label);
    return {group,cloud,sheet,label,profile,labelWidth:0,baseQuaternion,spinQuaternion:new T.Quaternion()};
  }
  updateLine(key,points,color,opacity,kind='line',count=points.length){
    const T=this.T;let line=this.lines.get(key);this.usedLines.add(key);
    if(!line){const geometry=new T.BufferGeometry(),capacity=Math.max(128,2**Math.ceil(Math.log2(points.length||1)));geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage));
      const Material=new T.LineBasicMaterial({color,transparent:true,opacity,depthTest:kind!=='loop'});
      const Type=kind==='loop'?T.LineLoop:kind==='segments'?T.LineSegments:T.Line;line=new Type(geometry,Material);line.frustumCulled=false;this.lines.set(key,line);this.overlays.add(line);this.overlayAllocations++;
    }
    if(line.geometry.attributes.position.count<points.length){line.geometry.dispose();line.geometry=new T.BufferGeometry();line.geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(2**Math.ceil(Math.log2(points.length))*3),3).setUsage(T.DynamicDrawUsage));this.overlayAllocations++;}
    if(line.userData.points!==points){const p=line.geometry.attributes.position;points.forEach((v,i)=>p.setXYZ(i,v.x,v.y,v.z));p.needsUpdate=true;line.userData.points=points;}
    line.geometry.setDrawRange(0,count);line.material.color.set(color);line.material.opacity=opacity;
  }
  sync(force=false){
    if(!this.active||!this.map.frame)return;
    const T=this.T,frame=this.map.frame,key=`${frame.hour}-${this.map.selected}-${JSON.stringify(this.map.layers)}`;
    if(!force&&this.lastFrame===frame&&this.syncKey===key)return;
    this.lastFrame=frame;this.syncKey=key;
    const ids=new Set(frame.storms.map(s=>s.id));
    for(const [id,item] of this.storms)if(!ids.has(id)){disposeGroup(item.group);this.scene.remove(item.group);item.label.remove();this.storms.delete(id);}
    for(const s of frame.storms){
      const detail=cloudDetail(this.quality,s.id===this.map.selected,this.mode,frame.storms.length),signature=`${Math.floor(s.wind/9)}-${s.wind>=17.2}-${cloudProfile(s).eye}-${s.status}-${s.size}-${detail.segments}-${detail.particles}`;
      let item=this.storms.get(s.id);
      if(!item||item.signature!==signature){if(item){disposeGroup(item.group);this.scene.remove(item.group);item.label.remove();}item=this.makeStorm(s,detail);item.signature=signature;this.storms.set(s.id,item);}
      const p=surfacePoint(s.lon,s.lat);item.group.position.set(p.x,p.y,p.z);item.storm=s;
      const normal=vec(T,p).normalize();item.baseQuaternion.setFromUnitVectors(new T.Vector3(0,1,0),normal);item.group.quaternion.copy(item.baseQuaternion);
      item.group.visible=this.map.layers.clouds&&cloudProfile(s).opacity>0;
      item.cloud.material.uniforms.opacity.value=cloudProfile(s).opacity;item.sheet.material.opacity=cloudProfile(s).opacity*.86;
      const text=displayName(s)+' · '+describe(s).name;if(item.label.textContent!==text){item.label.textContent=text;item.labelWidth=0;}item.label.classList.toggle('selected',s.id===this.map.selected);item.label.style.setProperty('--storm-color',describe(s).color);
    }
    this.usedLines=new Set();
    if(this.trackRun!==this.map.run){this.trackRun=this.map.run;this.tracks=new Map();for(const f of this.trackRun.frames)for(const s of f.storms)if((f.hour-s.bornAt)%2===0){if(!this.tracks.has(s.id))this.tracks.set(s.id,[]);this.tracks.get(s.id).push(vec(T,surfacePoint(s.lon,s.lat,.08)));}}
    for(const s of frame.storms){
      const cos=Math.cos(s.lat*Math.PI/180),color=describe(s).color;
      if(this.map.layers.rings)for(const level of windRings(s)){
        const points=[];for(let i=0;i<120;i++){const a=i/120*TAU,r=radiusAt(s,level,a);points.push(vec(T,surfacePoint(s.lon+Math.cos(a)*r/(111.2*cos),s.lat+Math.sin(a)*r/111.2,.1)));}
        this.updateLine(`${s.id}-ring-${level}`,points,{7:'#bace9a',10:'#e9bb70',12:'#ef947b'}[level],s.id===this.map.selected?.9:.45,'loop');
      }
      if(this.map.layers.track){
        const points=this.tracks.get(s.id)||[],count=Math.min(points.length,Math.floor((frame.hour-s.bornAt)/2)+1);
        if(count>1)this.updateLine(`${s.id}-track`,points,color,.65,'line',count);
      }
      if(this.map.layers.rain&&s.status!=='dissipated'){
        const points=[],rng=seeded(s.id*37);
        for(let i=0;i<180;i++){const a=rng()*TAU,r=(.8+rng()*3.3)*s.size,lon=s.lon+Math.cos(a)*r/cos,lat=s.lat+Math.sin(a)*r;points.push(vec(T,surfacePoint(lon,lat,.15)),vec(T,surfacePoint(lon,lat,.5+rng()*.8)));}
        this.updateLine(`${s.id}-rain`,points,'#85c3e4',.22,'segments');
      }
      if(this.map.layers.wind&&s.status!=='dissipated'){
        const points=[];for(let i=0;i<80;i++){const a=i*2.39,r=(1+i%12*.32)*s.size;points.push(vec(T,surfacePoint(s.lon+Math.cos(a)*r/cos,s.lat+Math.sin(a)*r,.2)),vec(T,surfacePoint(s.lon+Math.cos(a+.12)*r/cos,s.lat+Math.sin(a+.12)*r,.2)));}
        this.updateLine(`${s.id}-wind`,points,'#cee9e1',.4,'segments');
      }
    }
    for(const [key,line] of this.lines)if(!this.usedLines.has(key)){line.geometry.dispose();line.material.dispose();this.overlays.remove(line);this.lines.delete(key);}
    this.dirty=true;this.labelClock=1;
  }
  update(dt,playing,reduced){
    if(!this.active||this.failed||!this.map.frame)return;
    const T=this.T,s=this.map.frame.storms.find(s=>s.id===this.map.selected)||this.map.frame.storms[0];
    const p=this.mode==='overview'?surfacePoint(137.5,27.5):surfacePoint(s.lon,s.lat,.45);
    this.desiredTarget.set(p.x,p.y,p.z);
    this.introAge+=dt;this.labelClock+=dt;
    const intro=reduced?1:1+.16*Math.max(0,1-this.introAge/1.5),aspectFit=Math.max(1,1/this.camera.aspect),dist=(this.mode==='overview'?96:this.mode==='eye'?14*s.size:this.mode==='orbit'?30*s.size:29*s.size)*this.distance*Math.sqrt(aspectFit)*intro;
    const orbit=this.mode==='orbit'&&!reduced,pitch=this.mode==='overview'?.18:orbit?.24+Math.sin(this.visualTime*.035)*.045:this.pitch,yaw=this.yaw+(orbit?Math.sin(this.visualTime*.045)*.62:0);
    const radial=vec(T,p).normalize(),side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),radial);
    if(side.lengthSq()<1e-5)side.set(1,0,0);side.normalize();const north=new T.Vector3().crossVectors(radial,side).normalize();
    const tangent=north.multiplyScalar(Math.cos(yaw)).add(side.multiplyScalar(Math.sin(yaw)));
    const desired=this.cameraGoal.copy(p).add(radial.multiplyScalar(Math.cos(pitch)*dist)).add(tangent.multiplyScalar(Math.sin(pitch)*dist));
    const moving=this.camera.position.distanceTo(desired)>.015||this.target.distanceTo(this.desiredTarget)>.015;
    const k=reduced||!this.initialized?1:1-Math.exp(-dt*5);this.camera.position.lerp(desired,k);this.target.lerp(this.desiredTarget,k);this.camera.lookAt(this.target);this.initialized=true;
    if(playing&&!reduced){this.visualTime+=dt;this.water.material.uniforms.time.value=this.visualTime;for(const item of this.storms.values()){const spin=this.visualTime*(.015+item.storm.wind*.0006);item.spinQuaternion.setFromAxisAngle(new T.Vector3(0,1,0),spin);item.group.quaternion.copy(item.baseQuaternion).multiply(item.spinQuaternion);item.sheet.rotation.y=-spin*.10;item.cloud.rotation.y=spin*.08;}}
    if(!this.dirty&&!moving&&(!playing||reduced))return;
    const changed=this.dirty;this.renderer.render(this.scene,this.camera);this.frameCount++;this.dirty=false;
    if(changed||this.labelClock>=.12){this.positionLabels();this.labelClock=0;}
    if(this.quality==='auto'&&playing){this.fpsTime=(this.fpsTime||0)+dt;this.fpsFrames=(this.fpsFrames||0)+1;if(this.fpsTime>3){if(this.fpsFrames/this.fpsTime<24&&this.ratio>1){this.ratio=Math.max(1,this.ratio-.25);this.resize();}this.fpsTime=0;this.fpsFrames=0;}}
  }
  screen(lon,lat,height=0){const p=vec(this.T,surfacePoint(lon,lat,height)).project(this.camera);return {x:(p.x+1)*this.canvas.clientWidth/2,y:(1-p.y)*this.canvas.clientHeight/2,z:p.z,front:this.frontFacing(lon,lat)};}
  frontFacing(lon,lat){
    const T=this.T,p=surfacePoint(lon,lat),normal=vec(T,p).normalize(),toCamera=new T.Vector3().subVectors(this.camera.position,vec(T,p)).normalize();
    return normal.dot(toCamera)>.02;
  }
  positionLabels(){
    this.labelPasses++;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight,stage=this.canvas.getBoundingClientRect();
    const placed=[...this.canvas.parentElement.querySelectorAll('.view-toolbar,.layer-toolbar,.map-navigation,.theater-caption,.sound-controls,.cinema-readout,.map-hint,.storm-summary,.scene-actions')].filter(el=>!el.hidden&&el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-stage.left-8,right:r.right-stage.left+8,top:r.top-stage.top-8,bottom:r.bottom-stage.top+8};});
    const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const items=[...this.storms.values()].sort((a,b)=>(b.storm.id===this.map.selected)-(a.storm.id===this.map.selected));
    for(const item of items){const p=this.screen(item.storm.lon,item.storm.lat,2.6*item.storm.size),el=item.label;
      const visible=p.front&&p.z>-1&&p.z<1&&p.x>0&&p.x<w&&p.y>80&&p.y<h-70;el.hidden=!visible;if(!visible)continue;
      if(!item.labelWidth){item.labelWidth=el.offsetWidth;item.labelHeight=el.offsetHeight;}
      const half=item.labelWidth/2+4,height=item.labelHeight/2+4,x=clamp(p.x,half+8,w-half-8),origin=clamp(p.y,150,h-100);
      let spot=null;for(const offset of [0,38,-38,76,-76,114,-114]){const y=origin+offset,box={left:x-half,right:x+half,top:y-height,bottom:y+height};if(box.top>140&&box.bottom<h-75&&!placed.some(b=>intersects(box,b))){spot={x,y,box};break;}}
      el.hidden=!spot;if(!spot)continue;el.style.left=`${spot.x}px`;el.style.top=`${spot.y}px`;placed.push(spot.box);
    }
    const places=document.getElementById('placeLabels');
    if(!this.placeElements)this.placeElements=PLACES.map(([name,,,tier])=>{const el=document.createElement('span');el.textContent=name;el.className=tier?'minor':'major';places.append(el);return el;});
    const placeBoxes=placed.slice();
    PLACES.map((place,index)=>({place,index})).sort((a,b)=>a.place[3]-b.place[3]).forEach(({place:[,lon,lat,tier],index})=>{
      const p=this.screen(lon,lat,.14),el=this.placeElements[index],tooSmall=tier>0&&(w<900||this.mode==='eye');
      let visible=!tooSmall&&p.front&&p.z>-1&&p.z<1&&p.x>=8&&p.x<=w-8&&p.y>=8&&p.y<=h-8;
      if(visible){const half=(el.offsetWidth||22)/2+3,box={left:p.x-half,right:p.x+half,top:p.y-7,bottom:p.y+7};visible=!placeBoxes.some(item=>intersects(box,item));if(visible)placeBoxes.push(box);}
      el.hidden=!visible;if(visible){el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}
    });
  }
  pick(x,y){
    this.pointer.set(x/this.canvas.clientWidth*2-1,1-y/this.canvas.clientHeight*2);this.raycaster.setFromCamera(this.pointer,this.camera);
    const hit=this.raycaster.intersectObject(this.water)[0];return hit?geographicPoint(hit.point.x,hit.point.z,hit.point.y):null;
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
  get diagnostics(){return {active:this.active,failed:!!this.failed,mode:this.mode,quality:this.quality,ratio:this.ratio,systems:this.storms.size,frameCount:this.frameCount,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,cloudBuilds:this.cloudBuilds,overlayAllocations:this.overlayAllocations,labelPasses:this.labelPasses};}
}
