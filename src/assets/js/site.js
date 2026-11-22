// 시온건설 홈페이지 동작: 헤더 배경, 모바일 메뉴, 스크롤 등장, 숫자 올라가기, 이메일 복사
document.documentElement.classList.remove('no-js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 헤더: 스크롤하면 배경
const hd = document.querySelector('.site-header');
if (hd) {
  const onScroll = () => hd.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 모바일 메뉴 열고 닫기
const btn = document.querySelector('.menu-btn');
if (btn) {
  btn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) btn.click();
  });
}

// 숫자 올라가기
function countUp(el) {
  const to = +el.dataset.count, from = +(el.dataset.from || 0);
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// 스크롤 등장: 같은 묶음 안에서 순서대로 조금씩 늦게
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  e.target.querySelectorAll('[data-count]').forEach(countUp);
  io.unobserve(e.target);
}), { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => {
  const sib = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.transitionDelay = Math.min(sib.indexOf(el), 6) * 90 + 'ms';
  io.observe(el);
});

// 이메일 복사 버튼
document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const label = b.textContent;
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '복사했습니다'; }
  catch { b.textContent = '직접 복사해 주세요'; }
  setTimeout(() => (b.textContent = label), 1800);
}));


// 메인 첫 화면: 마우스를 따라 사진과 글자가 살짝 반대로 움직임 (터치 기기·움직임 줄이기 설정에서는 끔)
const hero = document.querySelector('.hero');
if (hero && !reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const bg = hero.querySelector('.hero-img');
  const txt = hero.querySelector('.wrap');
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const loop = () => {
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    bg.style.transform = `translate3d(${cx * -18}px, ${cy * -12}px, 0)`;
    txt.style.transform = `translate3d(${cx * 8}px, ${cy * 6}px, 0)`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
  };
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - 0.5;
    ty = (e.clientY - r.top) / r.height - 0.5;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  hero.addEventListener('mouseleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
}

// 메인 첫 화면 사진 넘김: 7초마다 다음 사진으로 서서히 바뀜
const slides = [...document.querySelectorAll('.hero .slide')];
if (slides.length > 1 && !reduce) {
  let i = 0;
  setInterval(() => {
    const prev = slides[i];
    i = (i + 1) % slides.length;
    const next = slides[i];
    slides.forEach((s) => s.classList.remove('is-leaving'));
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');           // 나가는 사진은 확대 상태를 유지한 채 사라짐
    next.querySelector('img')?.getAnimations?.().forEach((a) => a.cancel());
    next.classList.add('is-active');            // 들어오는 사진은 처음부터 다시 확대
    setTimeout(() => prev.classList.remove('is-leaving'), 2000);
  }, 7000);
}

// 첫 화면 숫자 띠는 화면에 바로 보이므로 글자 등장 뒤 바로 카운트
document.querySelectorAll('.hero-facts [data-count]').forEach((el) => setTimeout(() => countUp(el), 900));
