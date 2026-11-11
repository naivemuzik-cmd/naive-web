// Fondo animado: dos luces (azul y roja, como las de la foto) que se mueven
// sobre humo generado con ruido. WebGL puro, sin librerías.
(() => {
  const canvas = document.getElementById("fx");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power" });
  if (!gl) {
    canvas.remove();
    document.documentElement.classList.add("no-webgl");
    return;
  }

  const vert = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  const frag = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
  return v;
}
float light(vec2 uv, vec2 pos, float aspect, float size){
  vec2 d = (uv - pos) * vec2(aspect, 1.);
  return exp(-dot(d, d) / size);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = uv * vec2(aspect, 1.);
  float t = uTime * .05 + uScroll * .6;

  vec2 q = vec2(fbm(p * 1.3 + vec2(0., t)), fbm(p * 1.3 + vec2(5.2, -t * .8)));
  float smoke = fbm(p * 1.8 + 2.4 * q + vec2(t * .6, -t * .4));

  vec2 m = (uMouse - .5) * .18;
  vec2 bluePos = vec2(.32 + .14 * sin(t * 1.3), .72 + .12 * cos(t * 1.1)) + m;
  vec2 redPos  = vec2(.12 + .12 * cos(t * 1.2), .22 + .14 * sin(t * 1.5)) - m;
  float b = light(uv, bluePos, aspect, .16);
  float r = light(uv, redPos, aspect, .11);

  vec3 blue = vec3(.04, .30, 1.);
  vec3 red  = vec3(1., .06, .24);
  float s2 = smoke * smoke;
  vec3 col = blue * b * (.25 + 1.3 * s2) + red * r * (.2 + 1.4 * s2);
  col += vec3(.16, .18, .32) * smoothstep(.55, .95, smoke) * .18;

  col *= .62;
  gl_FragColor = vec4(col, 1.);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    canvas.remove();
    document.documentElement.classList.add("no-webgl");
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uMouse = gl.getUniformLocation(prog, "uMouse");
  const uScroll = gl.getUniformLocation(prog, "uScroll");

  // Media resolución: el humo es suave, no hace falta más y ahorra batería
  const SCALE = 0.5;
  function resize() {
    const w = Math.max(1, Math.round(window.innerWidth * SCALE));
    const h = Math.max(1, Math.round(window.innerHeight * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, w, h);
  }
  window.addEventListener("resize", resize);
  resize();

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener("pointermove", (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  let last = 0;
  let running = true;

  function draw(now) {
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uScroll, window.scrollY / Math.max(1, document.documentElement.scrollHeight));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (now - last < 33) return; // ~30 cuadros por segundo alcanzan
    last = now;
    draw(now);
  }

  if (reduceMotion) {
    draw(start + 20000);
    window.addEventListener("resize", () => draw(start + 20000));
  } else {
    requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(loop);
    });
  }
})();
