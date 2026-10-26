/* Chrome (or gold) logo with a light that moves as you scroll.
   Choose the metal with window.JCC_METAL = 'chrome' | 'gold' | 'champagne' | 'lime' | 'orange'
   (before this script loads), or data-metal="gold" on <html>. Default is champagne.
   Replaces the logo <img> with a small WebGL canvas that shades the logo live from a
   surface map (JCC_LOGO_CHROME_NORMALS.png). If anything is unavailable (no WebGL,
   image fails to load), the normal chrome PNG stays in place. */
(function(){
  'use strict';

  var NORMALS_URL = 'JCC_LOGO_CHROME_NORMALS.png';
  var ANGLE_PER_PX = 0.0016;   // how far the light travels per pixel scrolled (radians)
  var EASE = 0.14;             // 0 to 1: lower is a lazier, smoother follow
  var ASPECT = 1200 / 195;     // width / height of the logo

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var VERT = '#version 300 es\n' +
    'in vec2 aPos; out vec2 vUv;\n' +
    'void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

  var FRAG = '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vUv; out vec4 outColor;\n' +
    'uniform sampler2D uTex; uniform float uAngle; uniform float uShift; uniform int uMetal;\n' +
    'float sstep(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }\n' +
    'float bump(float x, float c, float w){ float z = (x - c) / w; return exp(-z * z); }\n' +
    'vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }\n' +
    'vec3 ramp(float x, int m){\n' +
    '  vec3 c0, c1, c2, c3, c4, c5;\n' +
    '  if(m == 1){ c0 = vec3(0.05, 0.03, 0.008); c1 = vec3(0.30, 0.17, 0.035); c2 = vec3(0.64, 0.42, 0.09); c3 = vec3(0.86, 0.65, 0.21); c4 = vec3(0.98, 0.84, 0.46); c5 = vec3(1.0, 0.95, 0.74); }\n' +
    '  else if(m == 3){ c0 = vec3(0.045, 0.055, 0.005); c1 = vec3(0.22, 0.29, 0.015); c2 = vec3(0.53, 0.64, 0.03); c3 = vec3(0.835, 0.906, 0.04); c4 = vec3(0.95, 0.98, 0.42); c5 = vec3(0.99, 1.0, 0.78); }\n' +
    '  else if(m == 4){ c0 = vec3(0.07, 0.02, 0.0); c1 = vec3(0.36, 0.12, 0.0); c2 = vec3(0.74, 0.31, 0.0); c3 = vec3(1.0, 0.537, 0.01); c4 = vec3(1.0, 0.77, 0.36); c5 = vec3(1.0, 0.93, 0.72); }\n' +
    '  else { c0 = vec3(0.07, 0.055, 0.035); c1 = vec3(0.34, 0.27, 0.16); c2 = vec3(0.66, 0.54, 0.32); c3 = vec3(0.86, 0.75, 0.52); c4 = vec3(0.97, 0.91, 0.75); c5 = vec3(1.0, 0.985, 0.90); }\n' +
    '  vec3 c = mix(c0, c1, clamp(x / 0.2, 0.0, 1.0));\n' +
    '  c = mix(c, c2, clamp((x - 0.2) / 0.25, 0.0, 1.0));\n' +
    '  c = mix(c, c3, clamp((x - 0.45) / 0.2, 0.0, 1.0));\n' +
    '  c = mix(c, c4, clamp((x - 0.65) / 0.2, 0.0, 1.0));\n' +
    '  c = mix(c, c5, clamp((x - 0.85) / 0.15, 0.0, 1.0));\n' +
    '  return c;\n' +
    '}\n' +
    'void main(){\n' +
    '  vec3 s = texture(uTex, vec2(vUv.x, 1.0 - vUv.y)).rgb;\n' +
    '  float a = s.b;\n' +
    '  if(a < 0.004){ outColor = vec4(0.0); return; }\n' +
    '  vec2 nxy = s.rg * 2.0 - 1.0;\n' +
    '  float nz = sqrt(max(0.0, 1.0 - dot(nxy, nxy)));\n' +
    '  vec3 n = vec3(nxy, nz);\n' +
    '  vec3 v = vec3(0.0, 0.0, 1.0);\n' +
    '  vec3 r = 2.0 * nz * n - v;\n' +
    '  vec2 rr = rot(r.xy, uAngle);\n' +
    '  float u = rr.y + uShift;\n' +
    '  float w = rr.x;\n' +
    '  float env = 0.22 + 0.42 * sstep(-0.9, 0.9, u);\n' +
    '  env += 0.75 * bump(u, 0.55, 0.16);\n' +
    '  env += 0.55 * bump(u, -0.12, 0.07);\n' +
    '  env -= 0.28 * bump(u, 0.18, 0.10);\n' +
    '  env += 0.45 * bump(w, 0.55, 0.13) * sstep(-0.2, 0.5, u);\n' +
    '  env -= 0.18 * bump(w, -0.6, 0.2);\n' +
    '  env += 0.35 * bump(u, -0.62, 0.12);\n' +
    '  float b = clamp(env, 0.0, 1.0);\n' +
    '  vec3 col = vec3(b * 0.99 + 0.01, b * 0.995 + 0.012, b + 0.02);\n' +
    '  vec3 tint = vec3(1.0);\n' +
    '  if(uMetal == 1){ col = ramp(b, 1); tint = vec3(1.0, 0.94, 0.78); }\n' +
    '  if(uMetal == 2){ col = ramp(b, 2); tint = vec3(1.0, 0.97, 0.88); }\n' +
    '  if(uMetal == 3){ col = ramp(b, 3); tint = vec3(1.0, 1.0, 0.86); }\n' +
    '  if(uMetal == 4){ col = ramp(b, 4); tint = vec3(1.0, 0.93, 0.76); }\n' +
    '  vec3 L1 = normalize(vec3(-0.45, -0.6, 0.66)); L1 = vec3(rot(L1.xy, uAngle), L1.z);\n' +
    '  vec3 H1 = normalize(L1 + v);\n' +
    '  col += vec3(pow(clamp(dot(n, H1), 0.0, 1.0), 90.0) * 0.9) * tint;\n' +
    '  vec3 L2 = normalize(vec3(0.5, 0.55, 0.6)); L2 = vec3(rot(L2.xy, uAngle), L2.z);\n' +
    '  vec3 H2 = normalize(L2 + v);\n' +
    '  col += vec3(pow(clamp(dot(n, H2), 0.0, 1.0), 60.0) * 0.45) * tint;\n' +
    '  float edge = pow(clamp(1.0 - nz, 0.0, 1.0), 2.2);\n' +
    '  col *= 1.0 - 0.35 * edge;\n' +
    '  col = clamp(col, 0.0, 1.0);\n' +
    '  col = clamp((col - 0.5) * 1.12 + 0.5, 0.0, 1.0);\n' +
    '  outColor = vec4(col * a, a);\n' +
    '}';

  var METALS = { chrome: 0, gold: 1, champagne: 2, lime: 3, orange: 4 };
  var metal = METALS[window.JCC_METAL || document.documentElement.getAttribute('data-metal') || 'champagne'] || 0;

  var instances = [];
  var current = 0;
  var started = false;
  var dirty = true;

  function compile(gl, type, src){
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    return sh;
  }

  function setup(img){
    var canvas = document.createElement('canvas');
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
    } catch(e){ gl = null; }
    if(!gl) return;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if(!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    // Size the canvas from the logo's CSS height so the page layout does not change
    var cssH = parseFloat(window.getComputedStyle(img).height) || 48;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.height = Math.round(cssH * dpr);
    canvas.width = Math.round(cssH * dpr * ASPECT);

    // Keep everything the page's own scripts and styles rely on
    if(img.id) canvas.id = img.id;
    canvas.className = img.className;
    canvas.setAttribute('style', img.getAttribute('style') || '');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', img.getAttribute('alt') || 'Joshua Crossley Creative');
    var fallback = img.getAttribute('src');
    canvas.style.background = 'url("' + fallback + '") center / 100% 100% no-repeat';

    img.parentNode.replaceChild(canvas, img);

    var inst = { canvas: canvas, gl: gl, prog: prog, ready: false, fallback: fallback };
    instances.push(inst);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    inst.uAngle = gl.getUniformLocation(prog, 'uAngle');
    inst.uShift = gl.getUniformLocation(prog, 'uShift');
    inst.uMetal = gl.getUniformLocation(prog, 'uMetal');

    canvas.addEventListener('webglcontextlost', function(e){
      e.preventDefault();
      inst.ready = false;
      canvas.style.background = 'url("' + fallback + '") center / 100% 100% no-repeat';
    });

    var tex = new Image();
    tex.onload = function(){
      try {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.useProgram(prog);
        gl.uniform1i(gl.getUniformLocation(prog, 'uTex'), 0);
        inst.ready = true;
        draw(inst);
        canvas.style.background = 'none';
      } catch(e){
        inst.ready = false;   // e.g. page opened straight from disk: the static logo stays
      }
    };
    tex.onerror = function(){ inst.ready = false; };
    tex.src = NORMALS_URL;
  }

  function draw(inst){
    if(!inst.ready) return;
    var gl = inst.gl;
    gl.viewport(0, 0, inst.canvas.width, inst.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(inst.prog);
    gl.uniform1f(inst.uAngle, current);
    gl.uniform1f(inst.uShift, 0.3 * Math.sin(current));
    gl.uniform1i(inst.uMetal, metal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Switch metal at any time, e.g. jccSetMetal('gold')
  window.jccSetMetal = function(name){
    metal = METALS[name] || 0;
    dirty = true;
  };

  function scrollPos(){
    // The portals page publishes its own camera position, since that page never scrolls
    if(typeof window.jccLightPos === 'number') return window.jccLightPos;
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function tick(){
    var target = reduceMotion ? 0 : scrollPos() * ANGLE_PER_PX;
    if(!started){ current = target; started = true; dirty = true; }
    var diff = target - current;
    if(Math.abs(diff) > 0.0004){ current += diff * EASE; dirty = true; }
    if(dirty){
      for(var i = 0; i < instances.length; i++) draw(instances[i]);
      dirty = false;
    }
    window.requestAnimationFrame(tick);
  }

  function init(){
    var imgs = document.querySelectorAll('.top-bar-logo, #gameplayLogo, img[data-chrome-light]');
    for(var i = 0; i < imgs.length; i++){
      if(imgs[i].tagName === 'IMG') setup(imgs[i]);
    }
    if(instances.length) window.requestAnimationFrame(tick);
  }

  init();
})();
