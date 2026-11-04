/* Fairy cursor: a small glowing lime-green fairy that follows the mouse,
   with fluttering wings and a sparkly trail. It glows brighter over anything
   clickable. Desktop only (it switches itself off on touch screens), and a
   still version is used for anyone with "reduce motion" turned on.
   The real pointer is still there underneath, hidden, so clicks stay exact. */
(function(){
  'use strict';
  if(!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if(window.__fairyCursor) return; window.__fairyCursor = true;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var GLOW = '213,231,9', WING = '225,240,120', SPARK = '213,231,9', CORE = '#f4ffb0';
  var FOLLOW = 0.35;   // how quickly the fairy catches up with the pointer (1 = instantly)
  var CLICKABLE = 'a,button,[role="button"],label,select,summary,.video-wrap,.video-play-btn,.project-nav-item,.quest,#clickGate,input[type="submit"],input[type="button"]';

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647;';
  var ctx = cv.getContext('2d');
  var css = document.createElement('style');
  css.textContent =
    'html.fairy-on, html.fairy-on * { cursor: none !important; }' +
    'html.fairy-on input:not([type="submit"]):not([type="button"]), html.fairy-on textarea { cursor: text !important; }';

  var dpr = 1, W = 0, H = 0;
  function size(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var mx = -100, my = -100, x = -100, y = -100, inside = false, hot = false, t = 0, trail = [], running = false, last = 0;

  function glow(px, py, r, a){
    var g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(' + GLOW + ',' + a + ')'); g.addColorStop(1, 'rgba(' + GLOW + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
  }
  function wing(px, py, ang, len, wid, a){
    ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(' + WING + ',' + a + ')';
    ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, wid / 2, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  function frame(now){
    var dt = last ? Math.min(3, (now - last) / 16.67) : 1; last = now;
    t += dt / 60;
    if(still){ x = mx; y = my; }
    else { var k = 1 - Math.pow(1 - FOLLOW, dt); x += (mx - x) * k; y += (my - y) * k; }
    var px = x, py = y + (still ? 0 : Math.sin(t * 4) * 2);
    ctx.clearRect(0, 0, W, H);
    if(inside){
      if(!still && Math.random() < 0.6) trail.push({ x: px + (Math.random() - 0.5) * 4, y: py + (Math.random() - 0.5) * 4, a: 1 });
      for(var i = 0; i < trail.length; i++){ trail[i].a -= 0.035 * dt; trail[i].y += 0.25 * dt; }
      trail = trail.filter(function(p){ return p.a > 0; });
      for(var j = 0; j < trail.length; j++){ ctx.fillStyle = 'rgba(' + SPARK + ',' + (trail[j].a * 0.85) + ')'; ctx.fillRect(trail[j].x, trail[j].y, 1.8, 1.8); }
      glow(px, py, hot ? 40 : 28, hot ? 0.6 : 0.4);
      var fl = still ? 0 : Math.sin(t * 30) * 0.35;
      wing(px, py, -2.4 + fl, 12, 6, 0.5); wing(px, py, -0.75 - fl, 12, 6, 0.5);
      wing(px, py, 2.6 - fl, 8, 4, 0.4);  wing(px, py, 0.55 + fl, 8, 4, 0.4);
      glow(px, py, 7, 1);
      ctx.fillStyle = CORE; ctx.beginPath(); ctx.arc(px, py, 3, 0, 7); ctx.fill();
    }
    // Keep animating while the fairy is visible (it flutters even when still);
    // stop entirely when the pointer has left the window, to save power.
    if(inside || trail.length){ requestAnimationFrame(frame); } else { running = false; ctx.clearRect(0, 0, W, H); }
  }
  function start(){ if(!running && !document.hidden){ running = true; last = 0; requestAnimationFrame(frame); } }

  function init(){
    document.head.appendChild(css);
    document.body.appendChild(cv);
    size();
    window.addEventListener('resize', size);
    document.addEventListener('mousemove', function(e){
      mx = e.clientX; my = e.clientY;
      if(!inside){ inside = true; if(x < -50){ x = mx; y = my; } }
      hot = !!(e.target && e.target.closest && e.target.closest(CLICKABLE));
      document.documentElement.classList.add('fairy-on');
      start();
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function(){ inside = false; });
    document.addEventListener('visibilitychange', function(){ if(!document.hidden && inside) start(); });
    // Back button: show the page's own cursor until the mouse moves again
    window.addEventListener('pageshow', function(e){ if(e.persisted){ inside = false; document.documentElement.classList.remove('fairy-on'); } });
  }
  if(document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
