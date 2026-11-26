// Header: light over the dark opener, then solid once the page is scrolled.
const nav = document.querySelector('.nav');
let headerFrame;
const setHeader = () => {
  if (!nav) return;
  nav.classList.toggle('scrolled', scrollY > 16);
};
setHeader();
addEventListener('scroll', () => {
  if (headerFrame) return;
  headerFrame = requestAnimationFrame(() => { headerFrame = 0; setHeader(); });
}, { passive: true });

// Menu
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
if (burger && menu) {
  const set = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    nav?.classList.toggle('menu-open', open);
    setHeader();
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => set(burger.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => e.target.closest('a') && set(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { set(false); burger.focus(); }
  });
  matchMedia('(min-width: 1061px)').addEventListener('change', () => set(false));
}

// Card reader: each payment method shows its own screen
const tabs = [...document.querySelectorAll('.methods [role=tab]')];
const pick = (tab, focus) => {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).classList.toggle('on', on);
  });
  const scr = document.querySelector('.scr');
  if (scr) scr.dataset.mode = tab.id.slice(2);
  if (focus) tab.focus();
};
tabs.forEach((t, i) => {
  t.addEventListener('click', () => pick(t));
  t.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (step) { e.preventDefault(); pick(tabs[(i + step + tabs.length) % tabs.length], true); }
  });
});

// Quote form. Set data-endpoint on the <form> to the address that receives requests.
const form = document.querySelector('form[data-quote]');
if (form) {
  const trade = new URLSearchParams(location.search).get('trade');
  const select = form.elements.trade;
  if (trade && [...select.options].some((o) => o.value === trade)) select.value = trade;

  const status = form.querySelector('.status');
  const say = (text, kind = '') => { status.textContent = text; status.className = 'status ' + kind; };
  const rules = {
    name: (v) => v.trim() ? '' : 'Write your name.',
    business: (v) => v.trim() ? '' : 'Write the name of your business.',
    trade: (v) => v ? '' : 'Choose the kind of business.',
    counters: (v) => /^\d{1,3}$/.test(v.trim()) && +v > 0 ? '' : 'Write the number of counters as a number, such as 2.',
    email: (v) => /^\S+@\S+\.\S+$/.test(v.trim()) ? '' : 'Write an email address with an @, such as you@shop.com.',
  };
  const check = (name) => {
    const field = form.elements[name], message = rules[name](field.value);
    document.getElementById(name + '-error').textContent = message;
    message ? field.setAttribute('aria-invalid', 'true') : field.removeAttribute('aria-invalid');
    return !message;
  };
  Object.keys(rules).forEach((n) => form.elements[n].addEventListener('input', () => form.elements[n].hasAttribute('aria-invalid') && check(n)));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = Object.keys(rules).filter((n) => !check(n));
    if (bad.length) {
      say(bad.length === 1 ? 'One answer needs fixing.' : bad.length + ' answers need fixing.', 'bad');
      form.elements[bad[0]].focus();
      return;
    }
    const url = form.dataset.endpoint;
    if (!url) { say('This form is not connected to an inbox yet, so nothing was sent. Your answers are still here.', 'bad'); return; }
    const button = form.querySelector('button[type=submit]');
    button.disabled = true; say('Sending');
    try {
      const res = await fetch(url, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!res.ok) throw new Error(res.status);
      form.reset(); say('Your quote request is in. We reply by email.', 'good');
    } catch {
      say('The request did not go through. Your answers are still here, so please try again.', 'bad');
    }
    button.disabled = false;
  });
}

// Motion. Nothing is hidden by CSS alone: only parts still below the screen are armed here,
// so the page is complete without script, with reduced motion, and in print.
const calm = matchMedia('(prefers-reduced-motion: reduce)');
if (!calm.matches && 'IntersectionObserver' in window) {
  const below = (el) => el.getBoundingClientRect().top > innerHeight * 0.92;
  const all = (q) => [...document.querySelectorAll(q)];
  const seen = (els, run, margin = '0px 0px -12% 0px') => {
    const io = new IntersectionObserver((list) => list.forEach((e) => {
      if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
    }), { rootMargin: margin });
    els.forEach((el) => io.observe(el));
  };

  // Headings, cards, rows and steps ease in, one after another within their group
  const rise = all('main .head, .strip li, .acc details, .sv, .four li, .faq details, .nums, .rows > div, .two .ticks li, .trade .in, .photo, .sheet, .intro .btn, .band .btn, .band .lead, .band h2, main table tr').filter(below);
  rise.forEach((el) => {
    const peers = [...el.parentElement.children].filter((c) => rise.includes(c));
    el.style.setProperty('--d', Math.min(peers.indexOf(el), 6) * 80 + 'ms');
    el.classList.add('rv');
  });
  seen(rise, (el) => {
    el.classList.add('in');
    setTimeout(() => { el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); }, 1600);
  });

  // Card stacks fan open, the counter assembles, the closing stack slides in
  const open = all('.fan, .scene, .close .corner').filter(below);
  open.forEach((el) => el.classList.add('armed'));
  seen(open, (el) => el.classList.remove('armed'), '0px 0px -22% 0px');

  // The tap card arrives with the payment section
  const scr = document.querySelector('.scr');
  if (scr && below(scr)) { scr.classList.add('armed'); seen([scr], () => setTimeout(() => scr.classList.remove('armed'), 350), '0px 0px -35% 0px'); }

  // Slips print
  const slots = all('.slot').filter(below);
  slots.forEach((el) => el.classList.add('armed'));
  seen(slots, (el) => {
    const row = [...document.querySelectorAll('.slips .slot')].indexOf(el);
    const wait = row < 0 ? 100 : (row % 3) * 220;
    el.style.setProperty('--d', wait + 'ms');
    el.classList.add('print'); el.classList.remove('armed');
    setTimeout(() => { el.classList.remove('print'); el.style.removeProperty('--d'); }, 1800 + wait);
  });

  // Figures count up
  const nums = all('.nums dt').filter(below);
  seen(nums, (el) => {
    const end = +el.textContent; let n = 0; el.textContent = '0';
    const step = () => { el.textContent = ++n; if (n < end) setTimeout(step, 620 / end); };
    setTimeout(step, 300);
  });

  // The floating reader rests off screen, and has a pause button
  const hero = document.querySelector('.hero');
  const still = document.querySelector('.still');
  if (hero && still) {
    new IntersectionObserver(([e]) => hero.classList.toggle('motion-off-screen', !e.isIntersecting)).observe(hero);
    still.hidden = false;
    still.addEventListener('click', () => {
      const off = document.documentElement.classList.toggle('motion-off');
      still.setAttribute('aria-pressed', off);
      still.textContent = off ? 'Play motion' : 'Pause motion';
    });
  }
}
