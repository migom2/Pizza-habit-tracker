# 🍕 습관 피자 트래커

매일 습관을 최대 8개까지 등록하고, 하나씩 완료할 때마다 피자 조각이 채워지는 습관 트래커입니다.
8개를 모두 완료하면 피자가 완성되고 주변에 반짝이는 장식이 나타납니다.

빌드 도구 없이 순수 HTML/CSS/JS로 만들어졌습니다.

## 실행 방법

`index.html`을 브라우저로 바로 열거나, 로컬 서버로 실행할 수 있습니다.

```bash
python3 -m http.server 8080
# 또는
npx serve .
```

## 배포

`main` 브랜치에 푸시되면 GitHub Actions가 자동으로 GitHub Pages에 배포합니다
(`.github/workflows/pages.yml`). 저장소 설정에서 **Settings → Pages → Source:
GitHub Actions**를 한 번 선택해야 동작합니다.

## 구성 파일

- `index.html` — 페이지 구조
- `style.css` — 스타일
- `app.js` — 습관 목록, 피자 SVG 생성, 완료 애니메이션, 기록 저장 로직

진행 상황은 브라우저 `localStorage`에 저장됩니다.
