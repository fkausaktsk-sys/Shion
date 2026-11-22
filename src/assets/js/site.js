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
  const to = +el.dataset.count;
  if (reduce) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
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
