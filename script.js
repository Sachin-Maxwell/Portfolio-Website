/* ═══════════════════════════════════════════════════
   SACHIN DHAKAL — PORTFOLIO
   script.js
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ──────────────────────────────────────────────────
     1. CUSTOM CURSOR
  ────────────────────────────────────────────────── */
  const cursor     = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursor-ring');

  // Track raw mouse position (cursor dot follows instantly)
  let mouseX = 0, mouseY = 0;
  // Ring lags behind using lerp
  let ringX  = 0, ringY  = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  // Animate the lagging ring
  function animateCursorRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateCursorRing);
  }
  animateCursorRing();

  // Grow cursor on interactive elements
  const hoverTargets = document.querySelectorAll(
    'a, button, .project-card, .skill-card, .stat-box, .social-link, .chip'
  );

  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('is-hovered');
      cursorRing.classList.add('is-hovered');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('is-hovered');
      cursorRing.classList.remove('is-hovered');
    });
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity  = '0';
    cursorRing.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity  = '1';
    cursorRing.style.opacity = '0.6';
  });


  /* ──────────────────────────────────────────────────
     2. SCROLL REVEAL
     Elements with class "reveal" fade + slide in
     when they enter the viewport.
  ────────────────────────────────────────────────── */
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger multiple reveals that trigger at the same time
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 60);
        revealObserver.unobserve(entry.target); // Only animate once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach((el) => revealObserver.observe(el));


  /* ──────────────────────────────────────────────────
     3. SMOOTH SCROLL (anchor links)
  ────────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });


  /* ──────────────────────────────────────────────────
     4. NAVBAR — add scrolled class for background
  ────────────────────────────────────────────────── */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.style.background = 'rgba(5, 5, 8, 0.98)';
      navbar.style.borderBottomColor = 'rgba(0, 255, 136, 0.15)';
    } else {
      navbar.style.background = '';
      navbar.style.borderBottomColor = '';
    }
  }, { passive: true });


  /* ──────────────────────────────────────────────────
     5. CONTACT FORM — prevent default & show feedback
  ────────────────────────────────────────────────── */
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = contactForm.querySelector('.btn--send');
      const originalText = submitBtn.textContent;

      // Simple visual feedback
      submitBtn.textContent   = 'Message Sent ✓';
      submitBtn.style.background = 'var(--neon-cyan)';
      submitBtn.style.boxShadow  = '0 0 28px var(--neon-cyan)';
      submitBtn.disabled         = true;

      setTimeout(() => {
        submitBtn.textContent      = originalText;
        submitBtn.style.background = '';
        submitBtn.style.boxShadow  = '';
        submitBtn.disabled         = false;
        contactForm.reset();
      }, 3000);
    });
  }

});
