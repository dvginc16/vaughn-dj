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
    const beat = (t-420.5)*Math.PI*2*120/60;
    const nod = Math.pow(Math.max(0,Math.cos(beat)),3);
    const sway = playing ? Math.sin(beat/8) : Math.sin(now/1400);
    const lean = sway*(1-intensity);
    const returnAccent = playing ? clamp((average(t-1,2)-average(t-6,3)-8)/30) : 0;
    ctx.clearRect(0,0,1135,1386);
    ctx.save();
    ctx.translate(619+lean*12,745+nod*intensity*10);
    ctx.rotate(lean*.019+intensity*Math.sin(beat/2)*.028+returnAccent*.016*nod);
    ctx.drawImage(upper,-619,-745);
    ctx.restore();
    ctx.drawImage(photo,0,774,1135,612,0,774,1135,612);
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
    upper.height = 774;
    cut.drawImage(photo,0,0);
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

