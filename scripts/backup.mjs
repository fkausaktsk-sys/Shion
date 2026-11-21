// 기존 shion.co.kr(그누보드) 사이트의 글과 이미지를 backup/ 에 모으는 스크립트
// 사용법: node scripts/backup.mjs
// - 이미 받은 파일은 건너뛰므로 중간에 멈춰도 다시 실행하면 이어서 받는다.
// - 요청 사이에 지연을 두어 서버에 부담을 주지 않는다.
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://www.shion.co.kr';
const OUT = path.resolve('backup');
const DELAY_MS = 400;
const UA = 'Mozilla/5.0 (shion-renewal-backup)';

// 백업할 게시판: kind는 single(한 페이지짜리) 또는 board(글 목록)
const BOARDS = [
  { bo: 'yp_introduction01', label: '인사말', kind: 'single', group: 'company' },
  { bo: 'yp_introduction02', label: '회사연혁', kind: 'single', group: 'company' },
  { bo: 'yp_introduction03', label: '회사등록증', kind: 'single', group: 'company' },
  { bo: 'yp_introduction04', label: '기술경력증', kind: 'single', group: 'company' },
  { bo: 'yp_introduction05', label: '사훈', kind: 'single', group: 'company' },
  { bo: 'yp_introduction06', label: '보유장비', kind: 'single', group: 'company' },
  { bo: 'yp_map01', label: '오시는길', kind: 'single', group: 'company' },
  { bo: 'yp_product01', label: '주요사업', kind: 'single', group: 'company' },
  { bo: 'yp_album01', label: '시공사진(메뉴)', kind: 'board', group: 'project' },
  { bo: 'yp_album02', label: '시공사진(메인 최신글)', kind: 'board', group: 'project' },
  { bo: 'yp_album06', label: '시공동영상', kind: 'board', group: 'project' },
  { bo: 'yp_album11', label: '시공사례', kind: 'board', group: 'project' },
  // 아래 둘은 글 수만 센다(본문은 이전하지 않음)
  { bo: 'yp_board01', label: '공지사항', kind: 'count', group: 'skip' },
  { bo: 'yp_inquiry01', label: '견적문의', kind: 'count', group: 'skip' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = async (p) => fs.access(p).then(() => true, () => false);

async function fetchText(url) {
  await sleep(DELAY_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function fetchFile(url, dest) {
  if (await exists(dest)) return 'skip';
  await sleep(DELAY_MS);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

// 캐시: 이미 받은 HTML은 다시 받지 않는다
async function getPage(url, cacheFile) {
  if (await exists(cacheFile)) return fs.readFile(cacheFile, 'utf8');
  const html = await fetchText(url);
  await fs.mkdir(path.dirname(cacheFile), { recursive: true });
  await fs.writeFile(cacheFile, html);
  return html;
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');

// 목록 페이지를 넘기며 글 번호를 모은다
async function listPosts(bo) {
  const ids = new Set();
  for (let page = 1; page < 50; page++) {
    const html = await getPage(`${BASE}/bbs/board.php?bo_table=${bo}&page=${page}`, path.join(OUT, '_lists', `${bo}-p${page}.html`));
    const re = new RegExp(`bo_table=${bo}&(?:amp;)?wr_id=(\\d+)`, 'g');
    const before = ids.size;
    for (const m of html.matchAll(re)) ids.add(Number(m[1]));
    if (ids.size === before) break;
  }
  return [...ids].sort((a, b) => a - b);
}

// 단일 페이지형 게시판은 목록 대신 첫 글 번호를 찾는다
async function singleId(bo) {
  const html = await getPage(`${BASE}/bbs/board.php?bo_table=${bo}`, path.join(OUT, '_lists', `${bo}-p1.html`));
  const m = html.match(new RegExp(`bo_table=${bo}&(?:amp;)?wr_id=(\\d+)`));
  return m ? [Number(m[1])] : [1];
}

function between(html, startRe, endMarker) {
  const s = html.search(startRe);
  if (s < 0) return '';
  const e = html.indexOf(endMarker, s);
  return html.slice(s, e < 0 ? undefined : e);
}

function parsePost(html) {
  // 게시판 스킨이 두 종류라 제목·날짜를 두 가지 방식으로 찾는다
  const titleHtml = (html.match(/class="ttl_sbj">([\s\S]*?)<\/div>/) || html.match(/id="bo_v_title">([\s\S]*?)<\/h1>/) || [, ''])[1];
  const title = decode(titleHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  const info = between(html, /<section id="bo_v_info"/, '</section>');
  const dateRaw = (info.match(/(\d\d-\d\d-\d\d \d\d:\d\d)/) || [, ''])[1];
  let date = '';
  if (dateRaw) {
    const [d, t] = dateRaw.split(' ');
    const [yy, mm, dd] = d.split('-');
    date = `20${yy}-${mm}-${dd}T${t}:00+09:00`;
  }
  // 첨부 이미지 영역(bo_v_img)과 본문(bo_v_con)
  const atc = between(html, /<section id="bo_v_atc"/, '</section>');
  const conStart = atc.indexOf('<div id="bo_v_con">');
  const body = conStart >= 0 ? atc.slice(conStart) : atc;
  const text = decode(body.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n').map((l) => l.replace(/[​\s]+/g, ' ').trim()).filter(Boolean).join('\n');
  const images = [...new Set([...atc.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => decode(m[1])))]
    .filter((src) => src.includes('/data/'));
  const videos = [...atc.matchAll(/<(?:iframe|source|video|embed)[^>]+src="([^"]+)"/g)].map((m) => decode(m[1]));
  const links = [...html.matchAll(/download\.php\?[^"']+/g)].map((m) => decode(m[0]));
  return { title, date, text, images, videos, attachments: [...new Set(links)], bodyHtml: body };
}

const absUrl = (src) => (src.startsWith('http') ? src : BASE + (src.startsWith('/') ? '' : '/') + src);

// 회사소개 등 단일 페이지는 페이지 빌더로 만들어져 편집 도구 글자(위・아래, 12px 등)가 본문에 섞여 있다.
// 여러 페이지에 공통으로 반복되는 줄을 편집 도구로 보고 지운 content.txt를 따로 만든다.
async function cleanBuilderText(inventory) {
  const pages = [];
  for (const row of inventory) {
    if (row.kind === 'count') continue;
    for (const id of row.ids) {
      const file = path.join(OUT, row.bo, String(id), 'text.txt');
      if (await exists(file)) pages.push({ file, lines: (await fs.readFile(file, 'utf8')).split('\n') });
    }
  }
  const builder = pages.filter((p) => p.lines.includes('PC+MOBILE'));
  const freq = new Map();
  for (const p of builder) for (const l of new Set(p.lines)) freq.set(l, (freq.get(l) || 0) + 1);
  const junk = (l) => (freq.get(l) || 0) >= 4 || /^[\d.]+(px|em|%)?$/.test(l) || /^(all|top|right|bottom|left)$/.test(l);
  for (const p of pages) {
    const out = builder.includes(p) ? p.lines.filter((l) => !junk(l)) : p.lines;
    await fs.writeFile(p.file.replace('text.txt', 'content.txt'), out.join('\n'));
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const inventory = [];
  const urls = [];
  const failures = [];

  for (const b of BOARDS) {
    const ids = b.kind === 'single' ? await singleId(b.bo) : await listPosts(b.bo);
    const row = { bo: b.bo, label: b.label, kind: b.kind, group: b.group, count: ids.length, ids, latest: '', images: 0, videos: 0 };
    inventory.push(row);
    console.log(`${b.label}(${b.bo}): ${ids.length}건`);
    if (b.kind === 'count') continue;

    for (const id of ids) {
      const dir = path.join(OUT, b.bo, String(id));
      const url = `${BASE}/bbs/board.php?bo_table=${b.bo}&wr_id=${id}`;
      urls.push({ old: `/bbs/board.php?bo_table=${b.bo}&wr_id=${id}`, bo: b.bo, wr_id: id, label: b.label });
      let html;
      try {
        html = await getPage(url, path.join(dir, 'page.html'));
      } catch (e) {
        failures.push({ url, error: String(e.message) });
        continue;
      }
      const post = parsePost(html);
      const imgs = [];
      for (const [i, src] of post.images.entries()) {
        const ext = (path.extname(src.split('?')[0]) || '.jpg').toLowerCase();
        const file = `img-${String(i + 1).padStart(2, '0')}${ext}`;
        try {
          await fetchFile(absUrl(src), path.join(dir, file));
          imgs.push({ file, src });
        } catch (e) {
          failures.push({ url: absUrl(src), post: url, error: String(e.message) });
        }
      }
      row.images += imgs.length;
      row.videos += post.videos.length;
      if (post.date > row.latest) row.latest = post.date;
      const meta = { bo: b.bo, label: b.label, wr_id: id, url, title: post.title, date: post.date, images: imgs, videos: post.videos, attachments: post.attachments };
      await fs.writeFile(path.join(dir, 'post.json'), JSON.stringify(meta, null, 2));
      await fs.writeFile(path.join(dir, 'text.txt'), post.text);
      await fs.writeFile(path.join(dir, 'body.html'), post.bodyHtml);
      process.stdout.write('.');
    }
    process.stdout.write('\n');
  }

  await cleanBuilderText(inventory);
  await fs.writeFile(path.join(OUT, 'inventory.json'), JSON.stringify(inventory, null, 2));
  await fs.writeFile(path.join(OUT, 'urls.json'), JSON.stringify(urls, null, 2));
  await fs.writeFile(path.join(OUT, 'failures.json'), JSON.stringify(failures, null, 2));
  console.log(`완료. 실패 ${failures.length}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
