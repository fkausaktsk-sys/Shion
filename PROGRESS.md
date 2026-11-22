# 진행 상황 (다른 PC에서 이어서 작업하기)

마지막 갱신: 2026-11-22

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
- [ ] **다음: 2단계 사이트 제작** (시안 A 기준, [docs/프롬프트-개정안.md](docs/프롬프트-개정안.md)의 2단계 프롬프트). 메뉴 구조(4개 메뉴)는 아직 사용자 확인 전이므로 시작할 때 한 번 확인
- [ ] (사용자) 이미지 AI 보정: `images-original/` → 같은 파일명으로 `images-final/`
- [ ] 2단계 사이트 제작
- [ ] 3단계 다듬은 이미지 교체
- [ ] 4단계 배포

## 열린 질문

- 네이버 동영상 2건(옛 플래시 임베드): **추후 결정** (2026-11-22 사용자). 2단계에서는 유튜브 1건만 넣고, 2건은 자리만 비워 둔다
- 옛 주소 리다이렉트를 메뉴 단위로만 할지, 글 단위까지 할지 (4단계)

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
5. 사이트 코드가 생긴 뒤에는 `npm install` → `npm run dev`.
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
