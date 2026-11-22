// Eleventy 설정: 시온건설 홈페이지
import fs from 'node:fs';
import path from 'node:path';
import Image from '@11ty/eleventy-img';

// 사진은 AI로 다듬은 images-final/ 을 먼저 쓰고, 없으면 images-original/ 을 쓴다(파일명이 같으면 자동 교체)
function findPhoto(name) {
  for (const dir of ['images-final', 'images-original']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function photoTag(name, alt = '', opts = {}) {
  const { cls = '', sizes = '(max-width: 860px) 100vw, 860px', eager = false, widths = [480, 960, 1600] } = opts;
  const src = findPhoto(name);
  if (!src) {
    // 새 PC에서 이미지를 아직 받지 않았을 때도 빌드가 멈추지 않게 자리만 표시
    return `<div class="photo-missing ${cls}" role="img" aria-label="${alt}">사진 준비 중 (${name})</div>`;
  }
  const meta = await Image(src, {
    widths: [...widths, 'auto'].filter((w, i, a) => a.indexOf(w) === i),
    formats: ['webp', 'jpeg'], // AVIF는 빌드가 오래 걸려 뺐다
    outputDir: '_site/img/',
    urlPath: '/img/',
    filenameFormat: (id, s, width, format) => `${path.parse(name).name}-${width}.${format}`,
  });
  return Image.generateHTML(meta, {
    alt, sizes, class: cls,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    ...(eager ? { fetchpriority: 'high' } : {}),
  });
}

// OG 이미지 등 하나의 주소만 필요한 경우
async function photoUrl(name, width = 1200) {
  const src = findPhoto(name);
  if (!src) return '';
  const meta = await Image(src, {
    widths: [width], formats: ['jpeg'], outputDir: '_site/img/', urlPath: '/img/',
    filenameFormat: (id, s, w, f) => `${path.parse(name).name}-${w}.${f}`,
  });
  return meta.jpeg[0].url;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addWatchTarget('images-final/');

  // 본문용 사진: {% photo "파일명", "설명" %}
  eleventyConfig.addAsyncShortcode('photo', async (name, alt) => `<figure class="photo">${await photoTag(name, alt)}</figure>`);
  // 레이아웃용 사진: {% img "파일명", "설명", "클래스", "sizes", eager %}
  eleventyConfig.addAsyncShortcode('img', (name, alt, cls, sizes, eager) => photoTag(name, alt, { cls, sizes, eager }));
  eleventyConfig.addAsyncShortcode('photoUrl', photoUrl);

  // 시공실적: 최신순
  const byDate = (a, b) => b.date - a.date;
  eleventyConfig.addCollection('projects', (api) => api.getFilteredByGlob('src/projects/*.md').sort(byDate));
  eleventyConfig.addCollection('photoProjects', (api) => api.getFilteredByGlob('src/projects/*.md').filter((p) => p.data.kind === 'photo' && p.data.photoCount > 0).sort(byDate));
  eleventyConfig.addCollection('videoProjects', (api) => api.getFilteredByGlob('src/projects/*.md').filter((p) => p.data.kind === 'video').sort(byDate));

  // 날짜 표기: 2026.11
  eleventyConfig.addFilter('ym', (d) => { const x = new Date(d); return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}`; });
  eleventyConfig.addFilter('ymd', (d) => { const x = new Date(d); return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`; });
  eleventyConfig.addFilter('iso', (d) => new Date(d).toISOString());
  eleventyConfig.addFilter('limit', (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter('telHref', (s) => 'tel:' + String(s).replace(/[^0-9]/g, ''));
  // 실적표를 연도별로 묶기 (26/10 → 2026)
  eleventyConfig.addFilter('byYear', (records) => {
    const groups = [];
    for (const r of records) {
      const y = 2000 + Number(r.ym.slice(0, 2));
      let g = groups.find((x) => x.year === y);
      if (!g) groups.push((g = { year: y, items: [] }));
      g.items.push(r);
    }
    return groups;
  });
  // 현재 주소가 메뉴 항목에 속하는지
  eleventyConfig.addFilter('isActive', (url, prefix) => url && url.startsWith(prefix));
}

export const config = {
  dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
};
