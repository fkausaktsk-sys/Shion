# 진행 상황 (다른 PC에서 이어서 작업하기)

마지막 갱신: 2026-11-22 (2단계 1차)

## 방향 (사용자 확정)

- 기존 홈페이지(shion.co.kr, 그누보드)의 **내용은 살리고**, 너무 오래된 사이트를 **세련된 최신 느낌**으로 바꾸는 것이 목적.
- **"심플" = 작업 과정을 어렵게 하지 않는다는 뜻.** 디자인·애니메이션은 심플하게 줄이지 않고 공들인다.
- 게시판·관리자 화면·CMS·견적 접수 폼은 만들지 않는다. 정적 사이트(Eleventy).
- 이미지는 사용자가 **다른 AI로 따로 다듬는다.** 이 프로젝트는 원본 이미지를 `images-original/`에 모아 넘기고, 다듬은 이미지를 같은 파일명으로 `images-final/`에 넣으면 반영되게 만든다.
- 컬렉션은 시공실적 하나(옛 시공사진·동영상·사례를 합침). 공지사항은 만들지 않는다.

## 문서

- [docs/프롬프트-개정안.md](docs/프롬프트-개정안.md): 지금 따르는 단계별 프롬프트 (0~4단계)
- [시온건설 홈페이지 리뉴얼 — Claude Code 프롬프트 모음.md](시온건설%20홈페이지%20리뉴얼%20—%20Claude%20Code%20프롬프트%20모음.md): 처음 기획한 원본 (참고용)

## 현재 단계

- [x] 원본 프롬프트 검토, 개정안 작성
- [x] GitHub 저장소 연결 (fkausaktsk-sys/Shion, main)
- [ ] 호스팅 결정 (기본안: Netlify 또는 Cloudflare Pages. 4단계 배포 전까지만 정하면 됨)
- [x] 0단계 — 기존 사이트 백업과 이미지 정리 (2026-11-21). 결과: [docs/0단계-인벤토리.md](docs/0단계-인벤토리.md)
- [x] 1단계 준비 (2026-11-21 밤): 메뉴 구조 제안 [docs/1단계-메뉴구조.md](docs/1단계-메뉴구조.md), 디자인 시안 3안 [mockups/README.md](mockups/README.md)
- [x] **시안 A(모노리스) 확정** (2026-11-22): 어두운 콘크리트 + 안전 주황, 굵은 고딕, 강한 모션. [mockups/a-monolith.html](mockups/a-monolith.html)
- [x] 메뉴 구조 확정 (2026-11-22): 1뎁스 4개(회사소개·사업분야·시공실적·문의하기), 2뎁스는 기존 항목 유지. [docs/1단계-메뉴구조.md](docs/1단계-메뉴구조.md)
- [x] **2단계 사이트 제작 1차 완료** (2026-11-22): Eleventy 3.1.8, 시안 A 디자인, 페이지 18종 + 시공 글 68건, sitemap·robots·404. 데스크톱·모바일 확인
- [ ] **다음 (사용자): 로컬에서 사이트 보고 고칠 점 알려주기** (`npm run dev` → http://localhost:8080)
- [ ] (사용자) 이미지 AI 보정: `images-original/` → 같은 파일명으로 `images-final/`
- [ ] 3단계 다듬은 이미지 교체
- [ ] 4단계 배포

## 열린 질문

- 네이버 동영상 2건(옛 플래시 임베드): **추후 결정** (2026-11-22 사용자). 2단계에서는 유튜브 1건만 넣고, 2건은 자리만 비워 둔다
- 옛 주소 리다이렉트를 메뉴 단위로만 할지, 글 단위까지 할지 (4단계). 대응표는 `src/_data/legacy.json`에 87개 준비됨
- [x] 휴대폰 번호는 010-7773-0895가 맞음 (2026-11-22 사용자 확인. 기존 오시는길 페이지의 010-9908-0895는 옛 번호)
- 시공사례: 기존 페이지에 실적표 167줄(2003~2026)이 있어, 메뉴 확정안과 달리 시공실적 > 시공사례(실적표)로 두고 취급공종은 사업분야에 따로 둠

## 사이트 구조 (2단계)

- `src/_data/site.json`: 회사명·연락처·주소 등 (헤더·푸터·문의하기가 모두 여기서 읽음)
- `src/_data/nav.json`: 메뉴(1·2뎁스)
- `src/_data/records.json`: 시공사례 실적표 (변환 스크립트가 만듦)
- `src/projects/*.md`: 시공 글 한 건 = 파일 하나. `cover`로 대표사진, `methods`로 공법 표시. 새 글은 기존 파일을 복사해 고치면 됨
- `src/company/`, `src/services/`, `src/contact/`, `src/pages/`: 각 페이지
- `src/assets/css/site.css`, `src/assets/js/site.js`: 디자인과 모션
- 사진은 `{% photo "파일명", "설명" %}`로 넣고, `images-final/` → `images-original/` 순서로 찾음
- `node scripts/convert-content.mjs`는 이미 있는 시공 글은 건너뜀(`--force`면 덮어써서 손으로 고친 내용이 사라짐)

## 새 PC에서 시작하기

1. Git, Node.js(LTS) 설치
2. 저장소 받기:
   ```bash
   git clone https://github.com/fkausaktsk-sys/Shion.git C:\mywork\Shion
   ```
3. push 인증이 안 되면:
   ```bash
   git config --local credential.https://github.com.username fkausaktsk-sys
   ```
4. `C:\mywork\Shion`에서 Claude Code를 열고 "PROGRESS.md 읽고 이어서 진행해줘"라고 하면 됩니다.
5. 사이트 보기: `npm install` → `npm run dev` → http://localhost:8080 (첫 빌드는 사진 변환 때문에 몇 분 걸림, 그다음부터는 몇 초)
6. `backup/`(크롤링 원본)과 `images-original/`은 용량이 커서 git에 올리지 않습니다. 새 PC에서는 아래를 실행하면 다시 만들어집니다(약 3분, 이미 받은 파일은 건너뜀).
   ```bash
   node scripts/backup.mjs
   ```
   ```bash
   node scripts/organize-images.mjs
   ```
   AI로 다듬은 `images-final/`은 git에 올립니다.

## 작업 규칙

- 작업 단계가 끝날 때마다 커밋하고 push해서 다른 PC에서 이어갈 수 있게 한다. 단, 커밋·push 전에는 사용자에게 확인한다(전역 설정에서 커밋·push는 확인 받도록 되어 있음).
- 시안 사진은 `mockups/assets/`에 따로 복사해 두어(약 4MB) git으로 옮겨도 시안이 깨지지 않는다.
- 이 파일(PROGRESS.md)의 "현재 단계"를 매번 갱신한다.
