/* ═══════════════════════════════════════════════════
   SACHIN DHAKAL — PORTFOLIO  |  script.js
   ═══════════════════════════════════════════════════
   Changes from v2:
   - Flappy: slower speed, clipped to hero section only,
     collision triggers dmg-float popups on character
   - Car: 2 cars, edges-biased Y range, random path (sine
     waves with random freq/amp per car, no direction flip)
   - Battle soldiers: pushed further toward edges
   - Platformer replaced with Road Rash motorbike brawl
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ══════════════════════════════════════════════
     1. CURSOR
  ══════════════════════════════════════════════ */
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursor-ring');
  let mx=0,my=0,rx=0,ry=0;

  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cursor.style.left=mx+'px'; cursor.style.top=my+'px';
  });
  (function animRing(){
    rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  })();
  document.querySelectorAll('a,button,.project-card,.skill-card,.stat-box,.social-link,.chip').forEach(el=>{
    el.addEventListener('mouseenter',()=>{ cursor.classList.add('is-hovered'); ring.classList.add('is-hovered'); });
    el.addEventListener('mouseleave',()=>{ cursor.classList.remove('is-hovered'); ring.classList.remove('is-hovered'); });
  });
  document.addEventListener('mouseleave',()=>{ cursor.style.opacity='0'; ring.style.opacity='0'; });
  document.addEventListener('mouseenter',()=>{ cursor.style.opacity='1'; ring.style.opacity='0.6'; });

  /* ══════════════════════════════════════════════
     2. SCROLL REVEAL
  ══════════════════════════════════════════════ */
  const revealObs = new IntersectionObserver(entries=>{
    entries.forEach((e,i)=>{ if(e.isIntersecting){ setTimeout(()=>e.target.classList.add('visible'),i*60); revealObs.unobserve(e.target); } });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal').forEach(el=>revealObs.observe(el));

  /* ══════════════════════════════════════════════
     3. SMOOTH SCROLL + NAV
  ══════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const t=document.querySelector(a.getAttribute('href'));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
    });
  });
  const navbar=document.getElementById('navbar');
  window.addEventListener('scroll',()=>{
    navbar.style.background=window.scrollY>60?'rgba(5,5,8,0.98)':'';
    navbar.style.borderBottomColor=window.scrollY>60?'rgba(0,255,136,0.15)':'';
  },{passive:true});

  /* ══════════════════════════════════════════════
     4. CONTACT FORM
  ══════════════════════════════════════════════ */
  const form=document.getElementById('contact-form');
  if(form){ form.addEventListener('submit',e=>{ e.preventDefault(); const btn=form.querySelector('.btn--send'); const orig=btn.textContent; btn.textContent='Sent ✓'; btn.style.background='var(--neon-cyan)'; btn.disabled=true; setTimeout(()=>{ btn.textContent=orig; btn.style.background=''; btn.disabled=false; form.reset(); },3000); }); }

  /* ══════════════════════════════════════════════
     5. FLAPPY BIRD — hero section only
        - Slower speed (was 2.2 → now 1.0–1.4)
        - Canvas clipped to hero section rect via CSS
          (position:absolute inside hero)
        - On collision with character → triggers
          the dmg-float popups AND feathers
  ══════════════════════════════════════════════ */
  (function initFlappy(){
    const canvas = document.getElementById('flappy-canvas');
    const ctx    = canvas.getContext('2d');
    const hero   = document.getElementById('hero');

    // Make canvas cover only the hero section
    function resize(){
      const r = hero.getBoundingClientRect();
      canvas.style.position = 'absolute';
      canvas.style.top      = hero.offsetTop + 'px';
      canvas.style.left     = '0';
      canvas.style.width    = '100%';
      canvas.style.height   = hero.offsetHeight + 'px';
      canvas.style.zIndex   = '1';
      canvas.style.pointerEvents = 'none';
      canvas.width  = window.innerWidth;
      canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Collision box — character image relative to viewport
    function getCharRect(){
      const img = document.getElementById('char-img');
      if(!img) return null;
      const r = img.getBoundingClientRect();
      // Convert to canvas-local coords (canvas starts at hero.offsetTop)
      return { x:r.left, y:r.top - hero.offsetTop, w:r.width, h:r.height };
    }

    // Trigger the .dmg-float elements on the character
    const dmgFloats = [
      document.querySelector('.dmg-float--1'),
      document.querySelector('.dmg-float--2'),
      document.querySelector('.dmg-float--3'),
    ];
    let dmgIdx = 0;
    function triggerDmgFloat(){
      const el = dmgFloats[dmgIdx % dmgFloats.length];
      if(!el) return;
      el.classList.remove('pop');
      void el.offsetWidth; // force reflow so animation restarts
      el.classList.add('pop');
      dmgIdx++;
    }

    const BIRD_SIZE = 13;
    const FLAP_AMP  = 7;
    const SPEED_MIN = 0.9;   // much slower than before
    const SPEED_MAX = 1.4;

    const BIRD_COUNT = 4;
    const birds = [];

    function randomBird(xOverride){
      const b = {
        x      : xOverride !== undefined ? xOverride : -Math.random()*600,
        y      : 0,
        baseY  : 80 + Math.random() * (canvas.height * 0.52),
        vx     : SPEED_MIN + Math.random()*(SPEED_MAX-SPEED_MIN),
        flapT  : Math.random()*Math.PI*2,
        dead   : false,
        deadVY : 0,
        deadTimer: 0,
        alpha  : 1,
        wingUp : false,
        wingTimer: 0,
      };
      b.y = b.baseY;
      return b;
    }

    for(let i=0;i<BIRD_COUNT;i++) birds.push(randomBird(-(i*180+Math.random()*100)));

    function drawBird(bx, by, alpha, wingUp){
      const s = BIRD_SIZE;
      ctx.save();
      ctx.globalAlpha = alpha;

      // Wing (behind body)
      ctx.fillStyle = '#ff8800';
      if(wingUp) ctx.fillRect(bx-s/2, by-s/2-s*0.55, s, s*0.38);
      else        ctx.fillRect(bx-s/2, by+s*0.08,     s, s*0.38);

      // Body
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(bx-s/2, by-s/2, s, s*0.88);

      // Belly lighter
      ctx.fillStyle = '#fff8aa';
      ctx.fillRect(bx-s/4, by-s/4, s/2, s*0.4);

      // Beak
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(bx+s/2, by-s*0.08, s*0.38, s*0.22);

      // Eye
      ctx.fillStyle = '#050508';
      ctx.fillRect(bx+s*0.08, by-s*0.22, s*0.2, s*0.2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx+s*0.12, by-s*0.22, s*0.08, s*0.08);

      ctx.restore();
    }

    const feathers = [];
    function spawnFeathers(x,y){
      for(let i=0;i<14;i++){
        feathers.push({
          x, y,
          vx:(Math.random()-0.5)*5,
          vy:-1.5-Math.random()*2.5,
          life:1,
          size:3+Math.random()*4,
          color:['#ffe600','#ff8800','#ffcc00'][i%3],
          rot: Math.random()*Math.PI*2,
          rotV:(Math.random()-0.5)*0.2,
        });
      }
    }

    let frame=0;
    function tick(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      frame++;

      const charRect = getCharRect();

      // Update & draw birds
      birds.forEach((b,bi)=>{
        if(b.dead){
          b.deadVY += 0.35;
          b.y += b.deadVY;
          b.x -= 0.3;
          b.alpha = Math.max(0, b.alpha-0.022);
          b.deadTimer++;
          drawBird(b.x, b.y, b.alpha, false);
          if(b.deadTimer>80 || b.y>canvas.height+50){
            birds[bi] = randomBird(-(40+Math.random()*250));
          }
          return;
        }

        b.flapT   += 0.09;
        b.y        = b.baseY + Math.sin(b.flapT)*FLAP_AMP;
        b.x       += b.vx;
        b.wingTimer++;
        if(b.wingTimer%10===0) b.wingUp=!b.wingUp;

        // Collision with character image
        if(charRect){
          if( b.x > charRect.x + charRect.w*0.15 &&
              b.x < charRect.x + charRect.w*0.85 &&
              b.y > charRect.y + charRect.h*0.05 &&
              b.y < charRect.y + charRect.h*0.9 ){
            b.dead=true; b.deadVY=-2.5;
            spawnFeathers(b.x, b.y);
            triggerDmgFloat();
          }
        }

        // Wrap — reset when past right edge
        if(b.x > canvas.width+30){
          const nb = randomBird(-(30+Math.random()*160));
          birds[bi] = nb;
        }

        drawBird(b.x, b.y, 0.75, b.wingUp);
      });

      // Feather particles
      for(let i=feathers.length-1;i>=0;i--){
        const p=feathers[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; p.life-=0.028; p.rot+=p.rotV;
        ctx.save();
        ctx.globalAlpha=p.life*0.85;
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle=p.color;
        ctx.fillRect(-p.size/2, -p.size*0.2, p.size, p.size*0.4);
        ctx.restore();
        if(p.life<=0) feathers.splice(i,1);
      }

      requestAnimationFrame(tick);
    }
    tick();
  })();

  /* ══════════════════════════════════════════════
     6. RALLY CARS — About section
        - 2 cars instead of 1
        - Each car follows a random sine-wave path
          (independent frequency + amplitude)
        - Y range biased toward edges (top 20% and
          bottom 20% of section, not the center)
        - No simple direction flip — true sine path
  ══════════════════════════════════════════════ */
  (function initCars(){
    const section = document.getElementById('about');
    const canvas  = document.getElementById('car-canvas');
    if(!canvas||!section) return;
    const ctx = canvas.getContext('2d');

    function resize(){ canvas.width=section.offsetWidth; canvas.height=section.offsetHeight; }
    resize();
    new ResizeObserver(resize).observe(section);

    function makeCar(startX, edgeLane){
      const baseY = edgeLane==='top' ? 0.12 : 0.82;
      return {
        x       : startX,
        y       : 0,
        vy      : 0,
        targetY : 0,
        targetTimer: 0,
        speed   : 0.25 + Math.random()*0.25,
        baseY,
        color   : edgeLane==='top' ? '#cc2200' : '#0055cc',
        wingCol : edgeLane==='top' ? '#aa1100' : '#003a99',
        angle   : 0,
        prevY   : 0,
        trails  : [],
      };
    }

    const cars = [
      makeCar(-80,  'top'),
      makeCar(-400, 'bottom'),
    ];

    function initCarY(){ cars.forEach(c=>{ c.y=c.baseY*canvas.height; c.targetY=c.y; c.prevY=c.y; }); }
    initCarY();

    function newTarget(c){
      const H = canvas.height;
      const bandCentre = c.baseY * H;
      const bandHalf   = H * 0.10;
      c.targetY = bandCentre + (Math.random()*2-1)*bandHalf;
      c.targetY = Math.max(H*0.04, Math.min(H*0.96, c.targetY));
      c.targetTimer = 80 + Math.floor(Math.random()*140);
    }
    cars.forEach(c=>newTarget(c));

    const MAX_TRAIL = 200;

    function drawCar(ctx, x, y, angle, bodyCol, roofCol){
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(angle);

      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillRect(-12,5,24,4);

      // Body
      ctx.fillStyle=bodyCol;
      ctx.fillRect(-11,-5,22,10);

      // Roof
      ctx.fillStyle=roofCol;
      ctx.fillRect(-6,-10,14,6);

      // Windscreen
      ctx.fillStyle='rgba(0,240,255,0.55)';
      ctx.fillRect(-5,-9,11,5);

      // Wheels
      ctx.fillStyle='#111';
      ctx.fillRect(-13,-7,4,5);
      ctx.fillRect(-13,2,4,5);
      ctx.fillRect(9,-7,4,5);
      ctx.fillRect(9,2,4,5);

      // Shine
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(-12,-6,2,2);
      ctx.fillRect(10,-6,2,2);

      // Headlights
      ctx.fillStyle='rgba(255,230,0,0.9)';
      ctx.fillRect(11,-4,3,3);
      ctx.fillRect(11,1,3,3);

      ctx.restore();
    }

    let tick=0;
    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      tick++;

      const H=canvas.height, W=canvas.width;

      cars.forEach(c=>{
        // Random path: count down then pick a new target Y
        c.targetTimer--;
        if(c.targetTimer<=0) newTarget(c);

        // Soft-steer toward target
        const dy = c.targetY - c.y;
        c.vy += dy * 0.004;
        c.vy *= 0.92;
        c.y  += c.vy;

        c.x += c.speed;
        c.angle = Math.atan2(c.y - c.prevY, c.speed) * 0.7;
        c.prevY = c.y;

        // Skid trail
        if(tick%2===0){
          const driftAmt=Math.abs(c.angle);
          const skidAlpha=0.12+driftAmt*1.2;
          const skidCol=driftAmt>0.06
            ? `rgba(255,45,120,${Math.min(0.55,skidAlpha)})`
            : `rgba(0,255,136,0.1)`;
          c.trails.push({x:c.x-10,y:c.y+4,life:1,color:skidCol,w:2+driftAmt*10});
          c.trails.push({x:c.x-10,y:c.y-4,life:1,color:skidCol,w:2+driftAmt*10});
          if(driftAmt>0.1&&tick%4===0){
            c.trails.push({x:c.x-14+(Math.random()-0.5)*8,y:c.y+(Math.random()-0.5)*10,life:.7,color:'rgba(255,255,255,0.12)',w:4+Math.random()*4});
          }
        }
        while(c.trails.length>MAX_TRAIL) c.trails.shift();

        c.trails.forEach(tr=>{
          tr.life-=0.01;
          if(tr.life<=0) return;
          ctx.save();
          ctx.globalAlpha=tr.life*0.45;
          ctx.fillStyle=tr.color;
          ctx.fillRect(tr.x,tr.y,tr.w,2);
          ctx.restore();
        });

        drawCar(ctx, c.x, c.y, c.angle, c.color, c.wingCol);

        // Wrap
        if(c.x>W+40){
          c.x=-(30+Math.random()*120);
          c.y=c.baseY*H; c.vy=0;
          c.trails.length=0;
          newTarget(c);
        }
      });

      requestAnimationFrame(loop);
    }
    loop();
  })();

  /* ══════════════════════════════════════════════
     7. BATTLE SOLDIERS — Projects section
        - Pushed further toward edges
          (left side: x < 15%, right side: x > 85%)
  ══════════════════════════════════════════════ */
  (function initBattle(){
    const section=document.getElementById('projects');
    const canvas=document.getElementById('battle-canvas');
    if(!canvas||!section) return;
    const ctx=canvas.getContext('2d');

    function resize(){ canvas.width=section.offsetWidth; canvas.height=section.offsetHeight; }
    resize();
    new ResizeObserver(resize).observe(section);

    const soldiers=[], bullets=[], particles=[];

    function makeSoldier(side){
      const h=canvas.height, w=canvas.width;
      return {
        side,
        // Edge-biased: left 0→14%, right 86→100%
        x: side===0 ? 12+Math.random()*w*0.13 : w*0.87+Math.random()*w*0.11,
        y: 50+Math.random()*(h-100),
        dir: side===0?1:-1,
        shootTimer: Math.floor(Math.random()*80),
        shootInterval: 55+Math.floor(Math.random()*70),
        hp:3,
        dead:false,
        deadTimer:0,
        walkCycle:Math.floor(Math.random()*4),
        walkTimer:0,
        wanderTimer:0,
        wanderMax:50+Math.floor(Math.random()*80),
        wanderVY:(Math.random()-0.5)*0.8,
      };
    }

    for(let i=0;i<4;i++) soldiers.push(makeSoldier(0));
    for(let i=0;i<4;i++) soldiers.push(makeSoldier(1));

    function drawSoldier(s){
      if(s.dead){
        ctx.save();
        ctx.globalAlpha=Math.max(0,1-s.deadTimer/40);
        ctx.translate(s.x,s.y);
        ctx.rotate(s.side===0?Math.PI/2:-Math.PI/2);
        ctx.fillStyle=s.side===0?'#00ff88':'#ff2d78';
        ctx.fillRect(-4,-3,8,6);
        ctx.fillStyle='#f4a460';
        ctx.fillRect(-2,-6,4,4);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(s.x,s.y);
      if(s.side===1) ctx.scale(-1,1);
      const col=s.side===0?'#00ff88':'#ff2d78';
      const dark=s.side===0?'#007744':'#880020';
      const leg=s.walkCycle<2?2:-2;
      ctx.fillStyle=dark;
      ctx.fillRect(-3,4,3,6+leg);
      ctx.fillRect(0,4,3,6-leg);
      ctx.fillStyle='#222';
      ctx.fillRect(-3,10+leg,3,2);
      ctx.fillRect(0,10-leg,3,2);
      ctx.fillStyle=col;
      ctx.fillRect(-4,-2,8,7);
      ctx.fillStyle='#f4a460';
      ctx.fillRect(-3,-8,6,6);
      ctx.fillStyle=dark;
      ctx.fillRect(-4,-10,8,4);
      ctx.fillStyle='#111';
      ctx.fillRect(-1,-6,2,1);
      ctx.fillRect(2,-6,2,1);
      ctx.fillStyle='#444';
      ctx.fillRect(4,-1,8,2);
      ctx.restore();
    }

    function spawnBullet(s){
      const tx=s.side===0?canvas.width:0;
      const ty=s.y+(Math.random()-0.5)*50;
      const dx=tx-s.x, dy=ty-s.y;
      const len=Math.sqrt(dx*dx+dy*dy)||1;
      bullets.push({x:s.x+(s.side===0?12:-12),y:s.y,vx:(dx/len)*7,vy:(dy/len)*1.2,side:s.side,life:1,trail:[]});
    }

    function spawnBlood(x,y,col){
      for(let i=0;i<6;i++) particles.push({x,y,vx:(Math.random()-0.5)*5,vy:-Math.random()*4,life:1,color:col,size:3+Math.random()*3});
    }

    let t=0;
    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      t++;

      soldiers.forEach((s,si)=>{
        if(s.dead){ s.deadTimer++; if(s.deadTimer>80) soldiers[si]=makeSoldier(s.side); drawSoldier(s); return; }
        s.walkTimer++; if(s.walkTimer%12===0) s.walkCycle=(s.walkCycle+1)%4;
        s.wanderTimer++; if(s.wanderTimer>s.wanderMax){ s.wanderVY=(Math.random()-0.5)*1.2; s.wanderMax=40+Math.floor(Math.random()*80); s.wanderTimer=0; }
        s.y+=s.wanderVY;
        s.y=Math.max(20,Math.min(canvas.height-20,s.y));
        // Tiny x advance within their edge zone
        s.x+=s.dir*0.12;
        const minX=s.side===0?8:canvas.width*0.82;
        const maxX=s.side===0?canvas.width*0.18:canvas.width-8;
        if(s.x<minX||s.x>maxX) s.dir*=-1;
        s.shootTimer++; if(s.shootTimer>=s.shootInterval){ spawnBullet(s); s.shootTimer=0; s.shootInterval=50+Math.floor(Math.random()*80); }
        drawSoldier(s);
      });

      for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];
        b.trail.push({x:b.x,y:b.y}); if(b.trail.length>6) b.trail.shift();
        b.x+=b.vx; b.y+=b.vy; b.life-=0.016;
        b.trail.forEach((tp,ti)=>{ ctx.save(); ctx.globalAlpha=(ti/b.trail.length)*0.5*b.life; ctx.fillStyle=b.side===0?'#00ff88':'#ff2d78'; ctx.fillRect(tp.x-1,tp.y-1,3,3); ctx.restore(); });
        ctx.save(); ctx.globalAlpha=b.life; ctx.fillStyle='#ffe600'; ctx.fillRect(b.x-2,b.y-2,5,3); ctx.restore();
        let hit=false;
        soldiers.forEach(s=>{ if(s.dead||s.side===b.side) return; if(Math.abs(b.x-s.x)<10&&Math.abs(b.y-s.y)<12){ s.hp--; spawnBlood(s.x,s.y,b.side===0?'#00ff88':'#ff2d78'); if(s.hp<=0) s.dead=true; hit=true; } });
        if(hit||b.life<=0||b.x<0||b.x>canvas.width) bullets.splice(i,1);
      }

      for(let i=particles.length-1;i>=0;i--){
        const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life-=0.04;
        ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.size,p.size); ctx.restore();
        if(p.life<=0) particles.splice(i,1);
      }

      requestAnimationFrame(loop);
    }
    loop();
  })();

  /* ══════════════════════════════════════════════
     8. ROAD RASH MOTORBIKES — Skills section
        Two pixel motorbikes racing across the
        section, occasionally pulling up alongside
        each other and throwing punches / kicks.
        Rider gets knocked — wobbles, recovers.
  ══════════════════════════════════════════════ */
  (function initRoadRash(){
    const section = document.getElementById('skills');
    const canvas  = document.getElementById('platformer-canvas');
    if(!canvas||!section) return;
    const ctx = canvas.getContext('2d');

    function resize(){ canvas.width=section.offsetWidth; canvas.height=section.offsetHeight; }
    resize();
    new ResizeObserver(resize).observe(section);

    const ROAD_Y   = () => canvas.height * 0.96;
    const SPEED    = 1.8;

    // Road debris / dust particles
    const dust = [];

    function makeBike(xStart, lane, col, helmetCol){
      return {
        x      : xStart,
        y      : 0,         // set to ROAD_Y on init
        lane   : lane,      // y offset relative to road (-10, 0, 10)
        vx     : SPEED + Math.random()*0.4,
        col,
        helmetCol,
        wobble : 0,         // wobble after hit
        wobbleDir: 1,
        hitting: false,
        hitTimer: 0,
        hitType: 'punch',   // punch | kick
        dead   : false,
        deadTimer: 0,
        deadVX : 0,
        deadVY : 0,
        wheelRot: 0,
        exhaustTimer: 0,
      };
    }

    const bikes = [
      makeBike(-60,  -10, '#00ff88', '#007744'),
      makeBike(-300, +10, '#ff2d78', '#880020'),
    ];

    // Shared brawl state
    let brawlTimer   = 0;
    let brawlActive  = false;
    const BRAWL_INTERVAL = 280;
    const BRAWL_DUR      = 90;

    function drawBike(b, isHitting, hitType, t){
      if(b.dead) return;
      const x=b.x, y=b.y + b.wobble;
      ctx.save();
      // Wobble rotation
      if(Math.abs(b.wobble)>1) ctx.rotate(b.wobble*0.04);
      ctx.translate(x,y);

      // Exhaust puff
      b.exhaustTimer++;
      if(b.exhaustTimer%4===0){
        dust.push({x:x-28,y:y+2,vx:-1.5-Math.random(),vy:(Math.random()-0.5)*0.6,life:.7,size:3+Math.random()*4,color:'rgba(180,180,180,0.25)'});
      }

      // Wheel glow
      ctx.fillStyle='rgba(0,255,136,0.07)';
      ctx.beginPath(); ctx.arc(-18,8,14,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(18,8,14,0,Math.PI*2); ctx.fill();

      // Wheels
      ctx.fillStyle='#1a1a1a';
      for(let side of [-18,18]){
        ctx.beginPath(); ctx.arc(side,8,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#333';
        ctx.beginPath(); ctx.arc(side,8,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#555';
        // Spokes
        for(let s=0;s<4;s++){
          const a=t*0.15+s*(Math.PI/2);
          ctx.fillRect(side+Math.cos(a)*2,8+Math.sin(a)*2,4,1.5);
        }
        ctx.fillStyle='#1a1a1a';
      }

      // Frame / body
      ctx.fillStyle=b.col;
      ctx.fillRect(-22,-4,44,10);
      ctx.fillRect(-10,-12,20,9);

      // Fuel tank
      ctx.fillStyle=b.col;
      ctx.fillRect(-8,-14,16,5);

      // Handlebars
      ctx.fillStyle='#888';
      ctx.fillRect(8,-18,3,8);
      ctx.fillRect(4,-18,14,3);

      // Exhaust pipe
      ctx.fillStyle='#555';
      ctx.fillRect(-26,0,8,4);
      ctx.fillRect(-30,2,6,3);

      // Headlight
      ctx.fillStyle='rgba(255,230,0,0.9)';
      ctx.fillRect(22,-4,4,5);

      // Rider body
      ctx.fillStyle='#222';
      ctx.fillRect(-4,-28,10,14);

      // Rider lean forward
      ctx.fillStyle='#333';
      ctx.fillRect(2,-30,10,8);

      // Helmet
      ctx.fillStyle=b.helmetCol;
      ctx.fillRect(-3,-38,10,10);
      ctx.fillStyle='rgba(0,240,255,0.5)';
      ctx.fillRect(-1,-36,8,5);

      // Arms/fist
      if(isHitting){
        if(hitType==='punch'){
          // Punch animation — arm extended sideways
          ctx.fillStyle='#f4a460';
          ctx.fillRect(10,-30,16,4);
          // Fist
          ctx.fillStyle='#cc7733';
          ctx.fillRect(26,-32,6,6);
          // Impact flash
          ctx.fillStyle='rgba(255,230,0,0.8)';
          ctx.fillRect(32,-34,8,8);
        } else {
          // Kick — leg out
          ctx.fillStyle='#222';
          ctx.fillRect(10,-16,18,4);
          ctx.fillStyle='#111';
          ctx.fillRect(28,-17,6,6);
          // Boot impact
          ctx.fillStyle='rgba(255,45,120,0.8)';
          ctx.fillRect(34,-18,8,8);
        }
      } else {
        // Normal arms gripping bars
        ctx.fillStyle='#333';
        ctx.fillRect(4,-26,8,4);
      }

      ctx.restore();
    }

    function spawnCrashParticles(x,y,col){
      for(let i=0;i<16;i++){
        dust.push({x,y,vx:(Math.random()-0.5)*7,vy:-Math.random()*5-1,life:1,size:2+Math.random()*5,color:col});
      }
    }

    const scorePopups=[];

    let frame=0;
    function loop(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      frame++;

      const RY=ROAD_Y();
      const W=canvas.width;

      // Road
      ctx.fillStyle='rgba(10,10,10,0.5)';
      ctx.fillRect(0,RY-4,W,40);
      // Road lines
      ctx.fillStyle='rgba(255,255,255,0.07)';
      for(let lx=0;lx<W;lx+=60){
        const offset=(frame*1.8)%60;
        ctx.fillRect(lx-offset,RY+14,36,3);
      }
      // Road edge lines
      ctx.fillStyle='rgba(255,255,136,0.2)';
      ctx.fillRect(0,RY-4,W,2);
      ctx.fillRect(0,RY+34,W,2);

      // Brawl logic
      brawlTimer++;
      if(!brawlActive && brawlTimer>BRAWL_INTERVAL){
        brawlActive=true; brawlTimer=0;
        // Snap bikes close together
        const b0=bikes[0], b1=bikes[1];
        b1.x=b0.x+50;
        b0.hitType=Math.random()>0.5?'punch':'kick';
        b1.hitType=b0.hitType==='punch'?'kick':'punch';
      }
      if(brawlActive && brawlTimer>BRAWL_DUR){
        brawlActive=false; brawlTimer=0;
        // One bike gets knocked
        const victim=bikes[Math.random()>0.5?0:1];
        victim.wobble=12*victim.wobbleDir;
        victim.wobbleDir*=-1;
        scorePopups.push({x:victim.x,y:RY-60,life:1,text:'SMACK!'});
      }

      // Update bikes
      bikes.forEach((b,bi)=>{
        if(b.dead){
          b.deadTimer++;
          b.x+=b.deadVX; b.y+=b.deadVY; b.deadVY+=0.4;
          if(b.deadTimer>80){ bikes[bi]=makeBike(-(40+Math.random()*200), b.lane, b.col, b.helmetCol); bikes[bi].y=RY+b.lane; }
          return;
        }

        // Wobble decay
        if(Math.abs(b.wobble)>0.2){ b.wobble*=0.88; } else { b.wobble=0; }

        b.wheelRot+=0.18;
        b.x+=b.vx;
        b.y=RY+b.lane;

        // Wrap
        if(b.x>W+60){
          b.x=-(30+Math.random()*150);
          b.vx=SPEED+Math.random()*0.5;
        }

        const hitting=brawlActive&&Math.abs(b.x-bikes[1-bi].x)<80;
        drawBike(b, hitting, b.hitType, frame);
      });

      // Dust / crash particles
      for(let i=dust.length-1;i>=0;i--){
        const p=dust[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; p.life-=0.025;
        ctx.save(); ctx.globalAlpha=p.life*0.7; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.size,p.size); ctx.restore();
        if(p.life<=0) dust.splice(i,1);
      }

      // Score popups
      for(let i=scorePopups.length-1;i>=0;i--){
        const p=scorePopups[i]; p.y-=0.7; p.life-=0.02;
        ctx.save(); ctx.globalAlpha=p.life; ctx.font='8px "Press Start 2P",monospace'; ctx.fillStyle='#ffe600'; ctx.textAlign='center'; ctx.fillText(p.text,p.x,p.y); ctx.restore();
        if(p.life<=0) scorePopups.splice(i,1);
      }

      requestAnimationFrame(loop);
    }

    // Init Y positions
    bikes.forEach(b=>{ b.y=ROAD_Y()+b.lane; });
    loop();
  })();

  /* ══════════════════════════════════════════════
     9. OCEAN SUNSET — Contact section
  ══════════════════════════════════════════════ */
  (function initOcean(){
    const canvas=document.getElementById('ocean-canvas');
    if(!canvas) return;
    const ctx=canvas.getContext('2d');

    function resize(){ canvas.width=canvas.offsetWidth||window.innerWidth; canvas.height=220; }
    resize(); window.addEventListener('resize',resize);

    let t=0;

    const stars=[];
    for(let i=0;i<60;i++) stars.push({x:Math.random(),y:Math.random()*0.55,size:1+Math.random()*1.5,twinkle:Math.random()*Math.PI*2});

    // Pre-generate building window states (avoid per-frame randomness)
    const buildings=[{w:12,h:22},{w:8,h:30},{w:16,h:18},{w:10,h:26},{w:14,h:15},{w:8,h:34},{w:12,h:20}];
    const windowStates=buildings.map(b=>Array.from({length:50},()=>Math.random()>0.5));

    function drawScene(){
      const W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H);

      const sky=ctx.createLinearGradient(0,0,0,H*0.65);
      sky.addColorStop(0,'#050518'); sky.addColorStop(0.5,'#0a0a2e'); sky.addColorStop(1,'#1a0a2e');
      ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.65);

      stars.forEach(s=>{ s.twinkle+=0.04; ctx.save(); ctx.globalAlpha=0.4+Math.sin(s.twinkle)*0.4; ctx.fillStyle='#fff'; ctx.fillRect(s.x*W,s.y*H*0.6,s.size,s.size); ctx.restore(); });

      const sunX=W*0.72,sunY=H*0.48,sunR=22;
      ctx.save();
      const glow=ctx.createRadialGradient(sunX,sunY,sunR,sunX,sunY,sunR*4);
      glow.addColorStop(0,'rgba(255,140,30,0.4)'); glow.addColorStop(1,'rgba(255,80,0,0)');
      ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(sunX,sunY,sunR*4,0,Math.PI*2); ctx.fill(); ctx.restore();
      for(let px=-sunR;px<=sunR;px+=2){ for(let py=-sunR;py<=sunR;py+=2){ if(px*px+py*py<=sunR*sunR){ const b=(1-(px*px+py*py)/(sunR*sunR))*0.4; ctx.fillStyle=`rgba(255,${140+b*80|0},${20+b*30|0},1)`; ctx.fillRect(sunX+px,sunY+py,2,2); } } }

      ctx.save(); ctx.globalAlpha=0.22+Math.sin(t*0.05)*0.08;
      const reflW=60+Math.sin(t*0.03)*20;
      for(let rx=-reflW/2;rx<reflW/2;rx+=4){ const wo=Math.sin(t*0.07+rx*0.2)*3; ctx.fillStyle='rgba(255,140,30,0.6)'; ctx.fillRect(sunX+rx,H*0.62+wo,3,4); }
      ctx.restore();

      const horiz=ctx.createLinearGradient(0,H*0.55,0,H*0.7);
      horiz.addColorStop(0,'rgba(255,80,20,0.25)'); horiz.addColorStop(1,'transparent');
      ctx.fillStyle=horiz; ctx.fillRect(0,H*0.55,W,H*0.15);

      const waterColors=['#0a1a3e','#0c2050','#0e2860','#102870','#123080'];
      const waveH=H*0.65;
      waterColors.forEach((wc,ri)=>{ const wy=waveH+ri*(H-waveH)/waterColors.length; const ny=waveH+(ri+1)*(H-waveH)/waterColors.length; ctx.fillStyle=wc; ctx.fillRect(0,wy,W,ny-wy+1); });

      for(let w=0;w<4;w++){
        const wy=waveH+w*12; const off=Math.sin(t*0.04+w*1.1)*8;
        ctx.save(); ctx.fillStyle=`rgba(0,160,255,${0.15-w*0.02})`;
        for(let wx=0;wx<W;wx+=6){ const h2=Math.sin((wx/W)*Math.PI*8+t*0.06+w*0.8)*4+off; ctx.fillRect(wx,wy+h2,4,2); }
        ctx.fillStyle=`rgba(200,240,255,${0.12-w*0.02})`;
        for(let wx=0;wx<W;wx+=12){ const h2=Math.sin((wx/W)*Math.PI*8+t*0.06+w*0.8+0.2)*4+off; ctx.fillRect(wx,wy+h2-1,2,2); }
        ctx.restore();
      }

      const cliffH=H*0.62;
      ctx.fillStyle='#0e0e16'; ctx.fillRect(0,cliffH,W*0.28,H-cliffH);
      ctx.fillStyle='#141420'; ctx.fillRect(0,cliffH-3,W*0.28,4);
      ctx.fillStyle='#003322';
      for(let gx=0;gx<W*0.28;gx+=4){ ctx.fillRect(gx,cliffH-6+((gx*7)%3),3,4); }

      drawSitter(ctx,W*0.1,cliffH-16,'#00ff88',false);
      drawSitter(ctx,W*0.18,cliffH-18,'#00f0ff',true);

      ctx.fillStyle='#1144aa';
      ctx.fillRect(W*0.085,cliffH-8,5,10); ctx.fillRect(W*0.105,cliffH-8,5,10);
      ctx.fillRect(W*0.165,cliffH-8,5,10); ctx.fillRect(W*0.185,cliffH-8,5,10);
      ctx.fillStyle='#111';
      ctx.fillRect(W*0.082,cliffH+2,6,3); ctx.fillRect(W*0.102,cliffH+2,6,3);
      ctx.fillRect(W*0.162,cliffH+2,6,3); ctx.fillRect(W*0.182,cliffH+2,6,3);

      const bx2=W*0.05, by2=cliffH-46;
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.strokeStyle='rgba(0,255,136,0.5)'; ctx.lineWidth=1;
      ctx.fillRect(bx2,by2,70,18); ctx.strokeRect(bx2,by2,70,18);
      ctx.fillRect(bx2+12,by2+18,4,4);
      ctx.font='5px "Press Start 2P",monospace'; ctx.fillStyle='#00ff88';
      ctx.fillText('nice view :)',bx2+5,by2+12);

      for(let tr=0;tr<3;tr++){ const tx=W*0.22+tr*18,ty=cliffH-22; ctx.fillStyle='#001a0a'; ctx.fillRect(tx+3,ty+8,4,14); ctx.fillStyle='#002a10'; ctx.fillRect(tx,ty,10,10); ctx.fillRect(tx+2,ty-6,6,8); ctx.fillRect(tx+3,ty-12,4,6); }

      ctx.fillStyle='rgba(5,5,20,0.6)';
      let bxb=W*0.35;
      buildings.forEach((b,bi)=>{
        ctx.fillStyle='rgba(5,5,20,0.6)'; ctx.fillRect(bxb,waveH-b.h,b.w,b.h);
        let wi=0;
        for(let wy2=waveH-b.h+4;wy2<waveH-4;wy2+=5){
          for(let wx2=bxb+2;wx2<bxb+b.w-2;wx2+=4){
            if(windowStates[bi][wi%windowStates[bi].length]){ ctx.fillStyle='rgba(255,230,0,0.3)'; ctx.fillRect(wx2,wy2,2,2); } wi++;
          }
        }
        bxb+=b.w+4;
      });

      for(let fl=0;fl<8;fl++){ const fx=(0.05+fl*0.035)*W,fy=cliffH-30-Math.sin(t*0.03+fl*1.3)*15; ctx.save(); ctx.globalAlpha=0.3+Math.sin(t*0.05+fl*2.1)*0.25; ctx.fillStyle=fl%2===0?'#ffe600':'#00ff88'; ctx.fillRect(fx,fy,2,2); ctx.restore(); }
    }

    function drawSitter(ctx,x,y,col,flip){
      ctx.save(); ctx.translate(x,y); if(flip) ctx.scale(-1,1);
      ctx.fillStyle=col; ctx.fillRect(-5,-8,10,8);
      ctx.fillStyle='#f4a460'; ctx.fillRect(-4,-16,8,8);
      ctx.fillStyle='#111'; ctx.fillRect(-5,-18,9,4);
      ctx.fillStyle='#111'; ctx.fillRect(1,-13,2,2);
      ctx.restore();
    }

    function loop(){ t++; drawScene(); requestAnimationFrame(loop); }
    loop();
  })();

}); // end DOMContentLoaded
