// A small incompressible flow field for the cursor's reveal mask.
export class FluidField {
  constructor(width, height) {
    this.width = width; this.height = height;
    this.size = width * height;
    for (const name of ['u','v','uNext','vNext','ink','inkNext','pressure','pressureNext','divergence','curl']) this[name] = new Float32Array(this.size);
  }
  sample(field, x, y) {
    x = Math.max(0, Math.min(this.width - 1.001, x));
    y = Math.max(0, Math.min(this.height - 1.001, y));
    const ix = Math.floor(x), iy = Math.floor(y), sx = x - ix, sy = y - iy, i = iy * this.width + ix;
    return (field[i] * (1-sx) + field[i+1] * sx) * (1-sy) + (field[i+this.width] * (1-sx) + field[i+this.width+1] * sx) * sy;
  }
  splat(x, y, dx, dy, radius) {
    const w = this.width, h = this.height;
    for (let yy = Math.max(1, Math.floor(y-radius*2)); yy < Math.min(h-1, y+radius*2); yy++) {
      for (let xx = Math.max(1, Math.floor(x-radius*2)); xx < Math.min(w-1, x+radius*2); xx++) {
        const r2 = ((xx-x)**2 + (yy-y)**2) / (radius*radius);
        const weight = Math.exp(-r2 * 2.8), i = yy*w+xx;
        this.ink[i] = Math.min(3, this.ink[i] + weight * .9);
        this.u[i] += dx * weight; this.v[i] += dy * weight;
      }
    }
  }
  step(dt) {
    const w=this.width, h=this.height;
    // Semi-Lagrangian advection follows the flow without unstable time steps.
    for (let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=y*w+x, px=x-this.u[i]*dt, py=y-this.v[i]*dt;
      this.uNext[i]=this.sample(this.u,px,py)*Math.exp(-dt*2.5);
      this.vNext[i]=this.sample(this.v,px,py)*Math.exp(-dt*2.5);
    }
    [this.u,this.uNext]=[this.uNext,this.u]; [this.v,this.vNext]=[this.vNext,this.v];
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=y*w+x;
      this.curl[i]=.5*(this.v[i+1]-this.v[i-1]-this.u[i+w]+this.u[i-w]);
    }
    // Vorticity confinement keeps the small curls visible in the fading trail.
    for(let y=2;y<h-2;y++) for(let x=2;x<w-2;x++) {
      const i=y*w+x, gx=Math.abs(this.curl[i+1])-Math.abs(this.curl[i-1]), gy=Math.abs(this.curl[i+w])-Math.abs(this.curl[i-w]);
      const scale=2.4*dt*this.curl[i]/(Math.hypot(gx,gy)+.001);
      this.u[i]=Math.max(-90,Math.min(90,this.u[i]+gy*scale));
      this.v[i]=Math.max(-90,Math.min(90,this.v[i]-gx*scale));
      this.divergence[i]=.5*(this.u[i+1]-this.u[i-1]+this.v[i+w]-this.v[i-w]);
    }
    this.pressure.fill(0);
    for(let pass=0;pass<10;pass++) {
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
        const i=y*w+x;
        this.pressureNext[i]=(this.pressure[i-1]+this.pressure[i+1]+this.pressure[i-w]+this.pressure[i+w]-this.divergence[i])*.25;
      }
      [this.pressure,this.pressureNext]=[this.pressureNext,this.pressure];
    }
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++) {
      const i=y*w+x;
      this.u[i]-=.5*(this.pressure[i+1]-this.pressure[i-1]);
      this.v[i]-=.5*(this.pressure[i+w]-this.pressure[i-w]);
      const px=x-this.u[i]*dt, py=y-this.v[i]*dt;
      const dye=this.sample(this.ink,px,py);
      const blur=(this.ink[i-1]+this.ink[i+1]+this.ink[i-w]+this.ink[i+w])*.25;
      this.inkNext[i]=(dye*.98+blur*.02)*Math.exp(-dt*1.25);
    }
    [this.ink,this.inkNext]=[this.inkNext,this.ink];
  }
}
