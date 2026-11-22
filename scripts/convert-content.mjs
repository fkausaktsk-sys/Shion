// backup/ 의 기존 글을 새 사이트 콘텐츠로 변환하는 스크립트
// 사용법: node scripts/backup.mjs → node scripts/organize-images.mjs → node scripts/convert-content.mjs
// 결과:
//  - src/projects/<id>.md        시공사진·시공동영상 글 (사진은 {% photo %} 숏코드로)
//  - src/_data/records.json      시공사례 페이지의 실적표(년/월, 발주사, 공사명)
//  - src/_data/legacy.json       옛 주소 → 새 주소 대응표 (배포 때 리다이렉트용)
// 이미 사람이 고친 파일을 덮어쓰지 않도록, src/projects/ 에 같은 파일이 있으면 건너뛴다(--force 로 덮어쓰기).
import fs from 'node:fs/promises';
import path from 'node:path';

const BACKUP = path.resolve('backup');
const OUT_PROJECTS = path.resolve('src/projects');
const OUT_DATA = path.resolve('src/_data');
const FORCE = process.argv.includes('--force');
const map = JSON.parse(await fs.readFile('images-original/map.json', 'utf8'));
const exists = async (p) => fs.access(p).then(() => true, () => false);

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");
const clean = (s) => decode(s.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/[​﻿]/g, '').replace(/\s+/g, ' ').trim();
const yaml = (s) => JSON.stringify(String(s ?? ''));

// 공법 태그: 제목·본문에 나온 단어로 분류
const TAGS = [
  ['숏크리트', /숏크리트|shot ?crete|shotcrete/i],
  ['사면보강', /사면|법면|석축|옹벽/],
  ['그라우팅', /그라우팅|보링/],
  ['록볼트·소일네일링', /록볼트|락볼트|rock ?bolt|소일네일|soil ?nail/i],
  ['가시설·토공', /가시설|토공|흙막이|굴착|암파쇄|할암|지반/],
];
const tagsOf = (text) => TAGS.filter(([, re]) => re.test(text)).map(([t]) => t);

// 본문 HTML을 순서대로 글/사진 조각으로 나눈다
function tokens(body) {
  const out = [];
  const re = /<img[^>]+src="([^"]+)"[^>]*>|<iframe[^>]+src="([^"]+)"[^>]*>|<\/(?:p|div|h\d|li|tr)>|<br\s*\/?>/gi;
  let last = 0;
  let buf = '';
  const flush = () => { const t = clean(buf); if (t) out.push({ text: t }); buf = ''; };
  for (const m of body.matchAll(re)) {
    buf += body.slice(last, m.index);
    last = m.index + m[0].length;
    if (m[1]) { flush(); out.push({ img: decode(m[1]) }); }
    else if (m[2]) { flush(); out.push({ video: decode(m[2]) }); }
    else flush();
  }
  buf += body.slice(last);
  flush();
  return out;
}

async function readPost(bo, id) {
  const dir = path.join(BACKUP, bo, String(id));
  const post = JSON.parse(await fs.readFile(path.join(dir, 'post.json'), 'utf8'));
  const body = await fs.readFile(path.join(dir, 'body.html'), 'utf8');
  return { dir, post, body };
}

async function listIds(bo) {
  try {
    return (await fs.readdir(path.join(BACKUP, bo))).filter((x) => /^\d+$/.test(x)).map(Number).sort((a, b) => b - a);
  } catch { return []; }
}

// 설명 글(실적이 아님)은 사업분야 페이지로 보낸다
const EXPLAINERS = new Set(['yp_album02/57', 'yp_album02/62']);
const SHORT = { yp_album01: 'a01', yp_album02: 'a02', yp_album06: 'v06' };

async function convertProjects() {
  await fs.mkdir(OUT_PROJECTS, { recursive: true });
  const legacy = [];
  const titles = new Set();
  let written = 0;
  for (const bo of ['yp_album02', 'yp_album06', 'yp_album01']) {
    for (const id of await listIds(bo)) {
      const key = `${bo}/${id}`;
      const oldUrl = `/bbs/board.php?bo_table=${bo}&wr_id=${id}`;
      if (EXPLAINERS.has(key)) { legacy.push({ old: oldUrl, new: '/services/shotcrete/' }); continue; }
      const { post, body } = await readPost(bo, id);
      const year = post.date.slice(0, 4);
      const slug = `${year}-${SHORT[bo]}-${String(id).padStart(3, '0')}`;
      // 메뉴 시공사진(yp_album01)과 최신 시공사진(yp_album02)에 같은 제목이 있으면 하나만 쓴다
      if (titles.has(post.title)) { legacy.push({ old: oldUrl, new: `/projects/` }); continue; }
      titles.add(post.title);
      legacy.push({ old: oldUrl, new: `/projects/${slug}/` });

      const lines = [];
      const photos = [];
      const videos = [];
      for (const t of tokens(body)) {
        if (t.img) {
          const i = post.images.findIndex((x) => x.src === t.img);
          const name = i >= 0 ? map[`${bo}/${id}/${post.images[i].file}`] : null;
          if (name && !photos.includes(name)) { photos.push(name); lines.push(`{% photo "${name}", ${yaml(post.title)} %}`); }
        } else if (t.video) {
          videos.push(t.video);
        } else {
          // "1. 장비 셋팅"처럼 짧은 소제목은 제목으로
          lines.push(t.text.length <= 40 && /^\d+[.)]/.test(t.text) ? `### ${t.text}` : t.text);
        }
      }
      // 본문에 없고 첨부로만 있던 사진
      for (const img of post.images) {
        const name = map[`${bo}/${id}/${img.file}`];
        if (name && !photos.includes(name)) { photos.push(name); lines.push(`{% photo "${name}", ${yaml(post.title)} %}`); }
      }
      const youtube = videos.find((v) => /youtube\.com\/embed\//.test(v)) || '';
      const legacyVideo = videos.find((v) => /naver\.com/.test(v)) || '';
      const text = `${post.title} ${lines.join(' ')}`;
      const fm = [
        '---',
        `title: ${yaml(post.title)}`,
        `date: ${post.date}`,
        `kind: ${bo === 'yp_album06' ? 'video' : 'photo'}`,
        bo === 'yp_album06' ? 'activeSub: /projects/videos/' : null,
        `methods: [${tagsOf(text).map(yaml).join(', ')}]`,
        `cover: ${yaml(photos[0] || '')}`,
        `photoCount: ${photos.length}`,
        youtube ? `youtube: ${yaml(youtube)}` : null,
        legacyVideo ? `legacyVideo: ${yaml(legacyVideo)}  # 옛 네이버 동영상(재생 불가 가능성). 처리 방법은 추후 결정` : null,
        `oldUrl: ${yaml(oldUrl)}`,
        '---',
      ].filter(Boolean);
      const file = path.join(OUT_PROJECTS, `${slug}.md`);
      if (!FORCE && (await exists(file))) continue;
      await fs.writeFile(file, fm.join('\n') + '\n\n' + lines.join('\n\n') + '\n');
      written++;
    }
  }
  return { legacy, written };
}

// 시공사례 페이지의 실적표 (년/월, 원수급사, 하수급사, 공사명)
async function convertRecords() {
  const { body } = await readPost('yp_album11', 1);
  const tables = [...body.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const table = tables.find((t) => t.includes('공사명'));
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => clean(c[1])));
  const records = [];
  let ym = '';
  for (const r of rows.slice(1)) {
    if (r.every((c) => !c)) continue;
    // 같은 달 두 번째 줄부터는 년/월 칸이 합쳐져 빠져 있다
    const cells = r.length >= 4 ? r : ['', ...r];
    if (cells[0]) ym = cells[0];
    records.push({ ym, client: cells[1], contractor: cells[2], name: cells[3] });
  }
  await fs.writeFile(path.join(OUT_DATA, 'records.json'), JSON.stringify(records, null, 2));
  return records.length;
}

const { legacy, written } = await convertProjects();
await fs.mkdir(OUT_DATA, { recursive: true });
const records = await convertRecords();
// 단일 페이지 옛 주소
const pages = {
  yp_introduction01: '/company/greeting/', yp_introduction02: '/company/history/', yp_introduction03: '/company/licenses/',
  yp_introduction04: '/company/licenses/', yp_introduction05: '/company/motto/', yp_introduction06: '/company/equipment/',
  yp_map01: '/company/location/', yp_product01: '/services/', yp_album11: '/projects/records/', yp_album01: '/projects/',
  yp_album02: '/projects/', yp_album06: '/projects/videos/', yp_inquiry01: '/contact/', yp_board01: '/',
};
for (const [bo, url] of Object.entries(pages)) legacy.push({ old: `/bbs/board.php?bo_table=${bo}`, new: url });
await fs.writeFile(path.join(OUT_DATA, 'legacy.json'), JSON.stringify(legacy, null, 2));
console.log(`시공 글 ${written}건 작성, 실적표 ${records}줄, 옛 주소 ${legacy.length}개`);
