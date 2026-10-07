# 매일공수대장

현장 근무자의 공수, 현장, 메모와 월 예상 급여를 한 화면에서 관리하는 설치형 모바일 웹앱(PWA)입니다.

## 휴대폰 설치

- Android Chrome: 왼쪽 위 메뉴 → `홈 화면에 앱 설치`
- iPhone Safari: 공유 → `홈 화면에 추가`
- 설치 후 전체화면으로 실행되며, 한 번 연 페이지는 오프라인에서도 다시 열 수 있습니다.

## 실행

`dist` 폴더를 정적 웹 서버로 열면 됩니다.

```powershell
npx serve dist
```

데이터는 브라우저의 `localStorage`에 저장됩니다.

## GitHub Pages

`main` 브랜치를 GitHub 원격 저장소에 올리면 `.github/workflows/pages.yml`이 `dist` 폴더를 자동 배포합니다.
