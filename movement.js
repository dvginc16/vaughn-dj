// Move the upper body as a rigid cutout. The original console pixels are
// composited last, at their original coordinates, on every frame.
(function () {
  const rig = document.querySelector(".performer");
  const photo = rig.querySelector("img");
  const canvas = rig.querySelector("canvas");
  const control = document.querySelector(".motion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const upper = document.createElement("canvas");
  const cut = upper.getContext("2d");
  const booth = document.createElement("canvas");
  const fixed = booth.getContext("2d");
  let paused = reduced.matches, visible = true, playing = false, frame;
  let position = Number(document.querySelector('#preview').dataset.cueSeconds), reported = 0, intensity = 0, last = 0;
  const clamp = n => Math.max(0, Math.min(1,n));
  function average(seconds, window) {
    const start = Math.max(0,Math.floor(seconds*mixLevels.length/3052.146));
    const end = Math.min(mixLevels.length, start+window);
    return mixLevels.slice(start,end).reduce((sum,n)=>sum+n,0)/Math.max(1,end-start);
  }
  window.addEventListener("vaughn:transport", ({detail}) => {
    position = detail.position/1000;
    reported = performance.now();
    playing = detail.playing;
  });
  function draw(now) {
    if (paused || !visible || document.hidden) return;
    frame = requestAnimationFrame(draw);
    if (now-last<29) return;
    last = now;
    const t = position + Math.min(.45,(now-reported)/1000);
    const recent = average(t-4,4);
    const localReference = average(t-17,21);
    const groove = clamp((recent-84+(recent-localReference)*.45)/37);
    intensity += ((playing ? groove : 0)-intensity)*.13;
    const beats = playing ? (t-420.5)*2 : now/510;
    const beat = beats*Math.PI*2;
    const nod = Math.pow(Math.max(0,Math.cos(beat)),3);
    const sway = playing ? Math.sin(beat/8) : Math.sin(now/1400);
    const lean = sway*(1-intensity);
    const returnAccent = playing ? clamp((average(t-1,2)-average(t-6,3)-8)/30) : 0;
    // Crossfade poses at the end of each musical phrase.
    const poses = [
      [13*Math.sin(beat/4), 0, .035*Math.sin(beat/4)],
      [0, 15*nod, .017*Math.sin(beat)],
      [-18, 4+3*nod, -.035+.012*Math.sin(beat/4)],
      [17*Math.sin(beat/2), 8*nod, -.032*Math.sin(beat/2)],
      [7*Math.sin(beat), 12*nod+4*Math.sin(beat/4), .025*Math.sin(beat/2)]
    ];
    const phrase = ((beats/8)%5+5)%5;
    const index = Math.floor(phrase);
    const blend = clamp((phrase-index-.75)*4);
    const pose = poses[index].map((value,i) => value+(poses[(index+1)%5][i]-value)*blend);
    const drive = playing ? .44+.56*intensity : .94;
    ctx.clearRect(0,0,1135,1386);
    ctx.save();
    ctx.translate(619+pose[0]*drive+lean*5,690+pose[1]*drive+returnAccent*8*nod);
    ctx.rotate(pose[2]*drive);
    ctx.drawImage(upper,-619,-690);
    ctx.restore();
    ctx.drawImage(booth,0,0);
    canvas.hidden = false;
    photo.style.visibility = "hidden";
  }
  function sync() {
    cancelAnimationFrame(frame);
    canvas.hidden = true;
    photo.style.visibility = "";
    document.body.classList.toggle("still",paused);
    control.textContent = paused ? "Enable motion" : "Pause motion";
    control.setAttribute("aria-pressed",String(paused));
    if (!paused && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function prepare() {
    if (!photo.naturalWidth) return;
    canvas.width = upper.width = 1135;
    canvas.height = 1386;
    upper.height = 741;
    cut.drawImage(photo,0,0);
    booth.width = 1135;
    booth.height = 1386;
    fixed.drawImage(photo,0,0);
    const edge = fixed.createLinearGradient(0,625,0,716);
    edge.addColorStop(0,"transparent");
    edge.addColorStop(1,"black");
    fixed.globalCompositeOperation = "destination-in";
    fixed.fillStyle = edge;
    fixed.fillRect(0,0,1135,1386);
    control.hidden = false;
    control.onclick = () => { paused = !paused; sync(); };
    reduced.addEventListener("change",() => { paused = reduced.matches; sync(); });
    document.addEventListener("visibilitychange",sync);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(rig);
    sync();
  }
  if (photo.complete) prepare();
  else photo.addEventListener("load",prepare,{once:true});
})();

