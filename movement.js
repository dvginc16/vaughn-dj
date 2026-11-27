// Displace a fine mesh of the artist's artwork. The mixer and table keep their
// original coordinates while the shoulders, headphone hand and ears move.
(function animatePerformer() {
  const rig = document.querySelector(".performer");
  const photo = rig.querySelector("img");
  const canvas = rig.querySelector("canvas");
  const control = document.querySelector(".motion");
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let gl;
  try { gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" }); }
  catch { return; }
  if (!gl) return;

  const vertex = `
    attribute vec2 uv;
    varying vec2 imagePoint;
    uniform float phase;
    uniform float energy;
    uniform float rise;
    uniform float quiet;
    float region(vec2 p, vec2 center, vec2 size) {
      vec2 d = (p-center)/size;
      return exp(-dot(d,d));
    }
    void main(){
      vec2 p = uv;
      float roll = sin(phase*.5);
      float beat = sin(phase);
      float shoulder = 1.0-smoothstep(.35,.565,p.y);
      float head = region(p,vec2(.61,.23),vec2(.26,.23));
      float ear = (1.0-smoothstep(.06,.22,p.y)) * smoothstep(.40,.55,p.x);
      float hand = region(p,vec2(.61,.535),vec2(.075,.062));
      float foot = region(p,vec2(.72,.80),vec2(.09,.068));
      float angle = (.038*roll+.023*beat)*head*energy;
      vec2 d = p-vec2(.59,.365);
      // Headphone lean in the breakdown, shoulder recoil as the kick returns.
      p.x += shoulder*(quiet*.028*sin(phase*.125)+rise*.027*beat);
      p.y -= head*quiet*.012 + shoulder*rise*.018*max(0.0,cos(phase));
      p.y += hand*.016*rise*sin(phase);
      p += vec2(-d.y*angle,d.x*angle);
      p.x += energy*(shoulder*.019*roll + ear*.013*sin(phase-.65));
      p.y += energy*(shoulder*.010*(1.0-cos(phase)) + head*.004*beat);
      p.x += energy*hand*.007*sin(phase*.5+.7);
      p.y -= energy*(.008*hand+.012*foot)*max(0.0,beat);
      gl_Position = vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.0,1.0);
      imagePoint = uv;
    }`;
  const fragment = `
    precision mediump float;
    uniform sampler2D photo;
    varying vec2 imagePoint;
    void main(){ gl_FragColor=texture2D(photo,imagePoint); }`;
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    gl.attachShader(program,shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) return;
  gl.useProgram(program);
  const vertices = [];
  const cells = 52;
  for(let y=0;y<cells;y++) for(let x=0;x<cells;x++) {
    for(const [dx,dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]])
      vertices.push((x+dx)/cells,(y+dy)/cells);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const attr = gl.getAttribLocation(program,"uv");
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const phase = gl.getUniformLocation(program,"phase");
  const energy = gl.getUniformLocation(program,"energy");
  const quiet = gl.getUniformLocation(program,"quiet");
  const rise = gl.getUniformLocation(program,"rise");
  let trackMs = 560000, lastReport = 0, playing = false;
  window.addEventListener("vaughn:transport", ({detail}) => {
    trackMs = detail.position;
    lastReport = performance.now();
    playing = detail.playing;
  });
  function level(seconds) {
    const sample = Math.max(0, Math.min(mixLevels.length-1, seconds*mixLevels.length/2984.716));
    const left = Math.floor(sample);
    return mixLevels[left]+(sample-left)*(mixLevels[Math.min(left+1,mixLevels.length-1)]-mixLevels[left]);
  }
  const unit = value => Math.max(0,Math.min(1,value));
  let paused = preference.matches;
  let visible = true;
  let loaded = false;
  let frame = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let strength = .78;
  function draw(now) {
    frame = 0;
    if (!loaded || paused || !visible || document.hidden) return;
    const delta = now-lastFrame;
    if (delta >= 32) {
      const seconds = (trackMs+Math.min(now-lastReport,450))/1000;
      const volume = level(seconds)*.55+level(seconds-.7)*.45;
      const drive = unit((volume-82)/43);
      const accent = unit((volume-level(seconds-3.2)-5)/29);
      if (playing) elapsed = (seconds-.1655)*Math.PI*2*119.8/60;
      else elapsed += Math.min(delta,70)*.0032;
      strength += ((playing ? .38+drive*1.65+accent*.65 : .55)-strength)*.18;
      gl.uniform1f(quiet,playing ? 1-drive : 0);
      gl.uniform1f(rise,playing ? accent : 0);
      lastFrame = now;
      gl.uniform1f(phase,elapsed);
      gl.uniform1f(energy,strength);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);
      canvas.hidden = false;
      photo.style.visibility = "hidden";
    }
    frame = requestAnimationFrame(draw);
  }
  function sync() {
    cancelAnimationFrame(frame);
    control.textContent = paused ? "Enable motion" : "Pause motion";
    control.setAttribute("aria-pressed",String(paused));
    document.body.classList.toggle("still",paused);
    if (paused) { canvas.hidden = true; photo.style.visibility = ""; }
    lastFrame = performance.now();
    frame = requestAnimationFrame(draw);
  }
  function prepare() {
    if (!photo.naturalWidth) return;
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);
    for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
    for(const filter of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,filter,gl.LINEAR);
    function resize() {
      canvas.width = Math.max(1,Math.round(Math.min(1000,rig.clientWidth*Math.min(devicePixelRatio,1.5))));
      canvas.height = Math.round(canvas.width*1386/1135);
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    resize();
    new ResizeObserver(resize).observe(rig);
    loaded = true;
    control.hidden = false;
    sync();
  }
  control.addEventListener("click",()=>{ paused=!paused; sync(); });
  preference.addEventListener("change",()=>{ paused=preference.matches; sync(); });
  document.addEventListener("visibilitychange",sync);
  new IntersectionObserver(([entry])=>{ visible=entry.isIntersecting; sync(); }).observe(rig);
  canvas.addEventListener("webglcontextlost",()=>{
    loaded=false; canvas.hidden=true; photo.style.visibility=""; control.hidden=true; cancelAnimationFrame(frame);
  });
  if (photo.complete) prepare(); else photo.addEventListener("load",prepare,{once:true});
})();

