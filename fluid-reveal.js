import { FluidField } from './fluid-field.mjs';

const card = document.getElementById('eagleReveal');
if (card) initReveal(card);

function initReveal(card) {
  const canvas = card.querySelector('canvas');
  const context = canvas.getContext('2d');
  const historical = card.querySelector('img');
  const current = new Image();
  current.src = 'assets/eagle-bc.jpg';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mask = document.createElement('canvas'), maskContext = mask.getContext('2d');
  const layer = document.createElement('canvas'), layerContext = layer.getContext('2d');
  let field, pixels, width=0, height=0, dpr=1, running=false, previousTime=0;
  let pointer=null, lastPoint=null, revealed=false, inView=true;
  let downPoint=null, dragged=false, ignoreClick=false;

  function drawContained(ctx, image) {
    const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    ctx.drawImage(image,(width-w)/2,(height-h)/2,w,h);
  }
  function resize() {
    const rect=card.getBoundingClientRect();
    width=Math.round(rect.width); height=Math.round(rect.height);
    if (!width || !height) return;
    dpr=Math.min(window.devicePixelRatio||1,1.5);
    canvas.width=layer.width=Math.round(width*dpr); canvas.height=layer.height=Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0); layerContext.setTransform(dpr,0,0,dpr,0,0);
    const simulationWidth=144,simulationHeight=Math.max(48,Math.round(144*height/width));
    field=new FluidField(simulationWidth,simulationHeight);
    mask.width=simulationWidth;mask.height=simulationHeight;
    pixels=maskContext.createImageData(simulationWidth,simulationHeight);
    lastPoint=null;
    wake();
  }
  function drawScene(time) {
    context.clearRect(0,0,width,height);
    if (!historical.naturalWidth || !current.naturalWidth) return;
    context.fillStyle='#10110f';context.fillRect(0,0,width,height);
    context.filter='grayscale(1) contrast(1.06)';drawContained(context,historical);context.filter='none';
    layerContext.clearRect(0,0,width,height);
    layerContext.globalCompositeOperation='source-over';
    layerContext.fillStyle='#10110f';layerContext.fillRect(0,0,width,height);drawContained(layerContext,current);
    const gradient=layerContext.createLinearGradient(0,height*.58,0,height);
    gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(1,'rgba(0,0,0,.88)');
    layerContext.fillStyle=gradient;layerContext.fillRect(0,height*.58,width,height*.42);
    layerContext.textAlign='center';layerContext.textBaseline='alphabetic';layerContext.fillStyle='#f5f2eb';
    layerContext.font=`${Math.max(20,Math.min(38,width*.052))}px Georgia, serif`;
    layerContext.fillText('Donated to BC',width/2,height*.78);
    layerContext.font=`${Math.max(48,Math.min(88,width*.12))}px Georgia, serif`;
    layerContext.fillText('1954',width/2,height*.94);
    if (!revealed) {
      // Thresholding the advected dye gives the reveal a soft liquid edge.
      for(let i=0;i<field.size;i++) {
        const value=Math.max(0,Math.min(1,(field.ink[i]-.055)/.28));
        const alpha=value*value*(3-2*value);
        pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;
        pixels.data[i*4+3]=Math.round(alpha*255);
      }
      maskContext.putImageData(pixels,0,0);
      layerContext.globalCompositeOperation='destination-in';
      layerContext.drawImage(mask,0,0,width,height);
      layerContext.globalCompositeOperation='source-over';
    }
    context.drawImage(layer,0,0,width,height);
  }
  function tick(time) {
    const dt=Math.min((time-previousTime)/1000 || 1/60,1/30);previousTime=time;
    if(!reduceMotion && !revealed && field) {
      if(pointer) {
        const radius=Math.min(23,Math.max(13,field.width*.11));
        field.splat(pointer.x,pointer.y,0,0,radius);
      }
      field.step(dt);
    }
    drawScene(time);
    const hasInk=field?.ink.some(v=>v>.06);
    if(inView && !reduceMotion && !revealed && (pointer || hasInk)) requestAnimationFrame(tick);
    else {running=false;previousTime=0;}
  }
  function wake() {if(!running){running=true;requestAnimationFrame(tick);}}
  function updatePointer(event) {
    if(downPoint && Math.hypot(event.clientX-downPoint.x,event.clientY-downPoint.y)>6) dragged=true;
    if(event.pointerType==='touch' || reduceMotion || !field) return;
    const rect=card.getBoundingClientRect();
    const x=(event.clientX-rect.left)/rect.width*field.width,y=(event.clientY-rect.top)/rect.height*field.height;
    if(lastPoint) {
      const dx=Math.max(-55,Math.min(55,(x-lastPoint.x)*9)),dy=Math.max(-55,Math.min(55,(y-lastPoint.y)*9));
      const distance=Math.hypot(x-lastPoint.x,y-lastPoint.y), steps=Math.min(12,Math.max(1,Math.ceil(distance/3)));
      for(let n=1;n<=steps;n++) field.splat(lastPoint.x+(x-lastPoint.x)*n/steps,lastPoint.y+(y-lastPoint.y)*n/steps,dx/steps,dy/steps,15);
    }
    pointer={x,y};lastPoint=pointer;wake();
  }
  function setRevealed(value) {
    revealed=value;card.setAttribute('aria-pressed',String(value));
    card.classList.toggle('is-revealed',value);wake();
  }
  card.addEventListener('pointermove',updatePointer);
  card.addEventListener('pointerenter',updatePointer);
  card.addEventListener('pointerleave',()=>{pointer=null;lastPoint=null;wake();});
  card.addEventListener('pointerdown',event=>{downPoint={x:event.clientX,y:event.clientY};dragged=false;if(event.pointerType==='mouse')event.preventDefault();});
  card.addEventListener('pointerup',()=>{ignoreClick=dragged;downPoint=null;});
  card.addEventListener('pointercancel',()=>{downPoint=null;pointer=null;lastPoint=null;});
  card.addEventListener('dragstart',event=>event.preventDefault());
  card.addEventListener('click',()=>{if(ignoreClick){ignoreClick=false;return;}setRevealed(!revealed);});
  card.addEventListener('keydown',event=>{if(event.key==='Escape')setRevealed(false);});
  new ResizeObserver(resize).observe(card);
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(inView)wake();else{pointer=null;lastPoint=null;}}).observe(card);
  historical.addEventListener('load',wake);current.addEventListener('load',wake);
  current.addEventListener('error',()=>{card.classList.add('has-image-error');});
  resize();
}
