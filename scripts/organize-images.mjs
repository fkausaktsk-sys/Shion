// backup/ 의 이미지를 AI 보정용으로 images-original/ 에 모으고 목록(list.csv)을 만드는 스크립트
// 사용법: node scripts/backup.mjs 실행 후 node scripts/organize-images.mjs
// - 같은 이미지가 여러 번 쓰인 경우(PC용·모바일용 중복 등)는 한 번만 복사한다.
// - 다듬은 이미지는 같은 파일명으로 images-final/ 에 넣는다.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BACKUP = path.resolve('backup');
const OUT = path.resolve('images-original');

// 게시판 → 파일명 앞부분과 구분
const NAMES = {
  yp_introduction01: ['company-greeting', '회사'],
  yp_introduction02: ['company-history', '회사'],
  yp_introduction03: ['company-license', '회사'],
  yp_introduction04: ['company-career', '회사'],
  yp_introduction05: ['company-motto', '회사'],
  yp_introduction06: ['company-equipment', '회사'],
  yp_map01: ['company-map', '회사'],
  yp_product01: ['business', '사업분야'],
  yp_album01: ['project-a01', '시공'],
  yp_album02: ['project-a02', '시공'],
  yp_album06: ['project-v06', '시공'],
  yp_album11: ['project-c11', '시공'],
};
// 내용이 바뀌면 안 되는 이미지(증명서·등록증·지도)
const CAREFUL = new Set(['yp_introduction03', 'yp_introduction04', 'yp_map01']);

// 외부 패키지 없이 JPEG/PNG/GIF 크기를 읽는다
function imageSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.slice(0, 3).toString() === 'GIF') return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      i += 2 + len;
    }
  }
  return [0, 0];
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const seen = new Map();
  const rows = [['file', 'group', 'board', 'wr_id', 'title', 'date', 'width', 'height', 'kb', 'role', 'note', 'same_as']];
  for (const [bo, [prefix, group]] of Object.entries(NAMES)) {
    const dir = path.join(BACKUP, bo);
    let ids = [];
    try { ids = (await fs.readdir(dir)).filter((x) => /^\d+$/.test(x)).map(Number).sort((a, b) => a - b); } catch { continue; }
    for (const id of ids) {
      const post = JSON.parse(await fs.readFile(path.join(dir, String(id), 'post.json'), 'utf8'));
      let n = 0;
      for (const img of post.images) {
        const src = path.join(dir, String(id), img.file);
        const buf = await fs.readFile(src);
        const hash = crypto.createHash('sha1').update(buf).digest('hex');
        if (seen.has(hash)) continue; // 같은 이미지는 한 번만
        n++;
        const name = group === '시공'
          ? `${prefix}-${String(id).padStart(3, '0')}-${String(n).padStart(2, '0')}${path.extname(img.file)}`
          : `${prefix}-${String(n).padStart(2, '0')}${path.extname(img.file)}`;
        seen.set(hash, name);
        await fs.copyFile(src, path.join(OUT, name));
        const [w, h] = imageSize(buf);
        const role = group === '시공' ? (n === 1 ? '대표사진' : '본문') : '회사소개';
        rows.push([name, group, bo, id, post.title, post.date.slice(0, 10), w, h, Math.round(buf.length / 1024), role, CAREFUL.has(bo) ? '보정 주의(내용 변경 금지)' : '', '']);
      }
    }
  }
  // 엑셀에서 한글이 깨지지 않도록 BOM을 붙인다
  await fs.writeFile(path.join(OUT, 'list.csv'), '﻿' + rows.map((r) => r.map(csv).join(',')).join('\r\n'));
  const total = rows.length - 1;
  console.log(`이미지 ${total}장을 images-original/ 에 정리했습니다.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
