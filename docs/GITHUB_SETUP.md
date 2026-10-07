# today-gongsu GitHub 설정 가이드

## 1. 저장소 생성 화면

첨부 화면에서 다음과 같이 설정합니다.

| 항목 | 설정값 |
| --- | --- |
| Owner | `johnpark236-tech` |
| Repository name | `today-gongsu` |
| Description | `현장 공수와 예상 급여를 함께 기록하는 설치형 모바일 웹앱` |
| Visibility | **Private** |
| Template | `No template` |
| Add README | `Off` |
| Add .gitignore | `No .gitignore` |
| Add license | `No license` |

로컬 저장소에 README와 Git 기록이 이미 있으므로 GitHub에서 파일을 추가하지 않습니다. 설정 후 **Create repository**를 누릅니다.

## 2. 로컬 저장소 연결

GitHub에서 빈 저장소가 생성된 다음 PowerShell에서 실행합니다.

```powershell
cd C:\D\work-money\maeil-gongsu-daegang
git remote add origin https://github.com/johnpark236-tech/today-gongsu.git
git push -u origin main
```

`remote origin already exists`가 나오면 첫 번째 명령 대신 아래 명령을 사용합니다.

```powershell
git remote set-url origin https://github.com/johnpark236-tech/today-gongsu.git
git push -u origin main
```

## 3. 함께 수정할 사람 초대

저장소에서 **Settings → Collaborators → Add people**로 이동해 상대방의 GitHub 아이디나 이메일을 입력합니다. 초대를 수락한 사람은 비공개 저장소를 보고 변경사항을 올릴 수 있습니다.

작업자는 저장소를 처음 받을 때 다음을 실행합니다.

```powershell
git clone https://github.com/johnpark236-tech/today-gongsu.git
cd today-gongsu
```

수정 전에는 최신 내용을 받고, 수정 후 커밋과 푸시를 진행합니다.

```powershell
git pull --rebase origin main
git add .
git commit -m "변경 내용 설명"
git push origin main
```

여러 사람이 동시에 수정한다면 각자 브랜치를 만들고 Pull Request로 합치는 방식을 권장합니다.

```powershell
git switch -c feature/작업이름
git push -u origin feature/작업이름
```

## 4. 앱 공개 범위와 비밀번호

앱의 초기 접속 비밀번호는 `3011`입니다. 비밀번호는 화면에 그대로 저장하지 않고 해시값으로 비교하지만, 정적 웹앱의 클라이언트 잠금은 개발자 도구로 우회할 수 있습니다. 신뢰하는 소규모 구성원이 일반적인 접근을 막는 용도로만 사용하세요.

비공개 저장소는 초대한 사람만 소스 코드를 수정할 수 있게 합니다. 그러나 개인 계정의 일반 GitHub Pages 사이트는 인터넷에 공개되며, GitHub Free 개인 계정에서는 비공개 저장소의 Pages 배포를 사용할 수 없습니다. 사람별 로그인으로 앱 자체를 제한하려면 GitHub Enterprise Cloud의 비공개 Pages나 인증 기능이 있는 별도 호스팅이 필요합니다.

## 5. GitHub Pages 배포

사용 중인 요금제에서 Pages 배포가 가능하다면 저장소의 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 설정합니다. 이후 `main`에 푸시할 때 `.github/workflows/pages.yml`이 앱을 자동 배포합니다.

배포가 끝나면 **Settings → Pages → Visit site**에서 주소를 확인하고, 휴대폰 Chrome 또는 Safari로 열어 홈 화면에 설치합니다.
