# Mac 환경 설정 가이드

Mac에서 프로젝트를 설정하는 방법입니다.

## 1. Git 설치 (아직 설치하지 않은 경우)

### Homebrew를 사용한 설치 (권장)
```bash
# Homebrew가 없다면 먼저 설치
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Git 설치
brew install git
```

### 또는 Xcode Command Line Tools 설치
```bash
xcode-select --install
```

## 2. 프로젝트 클론 또는 이동

### 방법 1: Git 저장소로 관리하는 경우
```bash
# Windows에서 Git 저장소 초기화 및 원격 저장소 연결 후
git clone <repository-url>
cd naver-blog-optimizer
```

### 방법 2: 파일을 직접 복사하는 경우
1. Windows에서 프로젝트 폴더를 USB나 클라우드로 복사
2. Mac에서 원하는 위치에 붙여넣기

## 3. Python 가상환경 설정

```bash
cd naver-blog-optimizer/backend

# Python 3.12 이상이 설치되어 있는지 확인
python3 --version

# 가상환경 생성 (Mac/Linux)
python3 -m venv .venv

# 가상환경 활성화
source .venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

## 4. Node.js 설치 확인

```bash
# Node.js 버전 확인
node --version

# 18 이상이 아니면 설치
brew install node
```

## 5. Frontend 설정

```bash
cd naver-blog-optimizer/frontend

# 의존성 설치
npm install
```

## 6. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성:

```bash
cd naver-blog-optimizer
touch .env
```

`.env` 파일 내용:
```
NAVER_CLIENT_ID=여기에_키_입력
NAVER_CLIENT_SECRET=여기에_시크릿_입력
GOOGLE_API_KEY=여기에_제미나이_키_입력
NAVER_REDIRECT_URI=http://localhost:5173/auth/naver/callback
```

## 7. 서버 실행

### 터미널 1: Backend
```bash
cd naver-blog-optimizer/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 터미널 2: Frontend
```bash
cd naver-blog-optimizer/frontend
npm run dev
```

## 8. 접속

- Frontend: http://localhost:5173
- Backend API 문서: http://127.0.0.1:8000/docs

## Windows와 Mac 간 차이점

### 가상환경 활성화
- **Windows**: `.venv\Scripts\activate`
- **Mac/Linux**: `source .venv/bin/activate`

### Python 명령어
- **Windows**: `python` 또는 `py`
- **Mac/Linux**: `python3`

### 경로 구분자
- **Windows**: `\` (백슬래시)
- **Mac/Linux**: `/` (슬래시)

## 문제 해결

### Python이 설치되지 않은 경우
```bash
brew install python@3.12
```

### pip가 없는 경우
```bash
python3 -m ensurepip --upgrade
```

### 포트가 이미 사용 중인 경우
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :8000
lsof -i :5173

# 프로세스 종료
kill -9 <PID>
```

## Git 저장소 설정 (선택사항)

프로젝트를 Git으로 관리하려면:

```bash
# Git 저장소 초기화
git init

# 원격 저장소 추가 (GitHub, GitLab 등)
git remote add origin <repository-url>

# 첫 커밋
git add .
git commit -m "Initial commit"

# 원격 저장소에 푸시
git push -u origin main
```

## 주의사항

1. `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
2. `learning_data.json`도 개인 데이터이므로 Git에 포함하지 않는 것이 좋습니다
3. Windows와 Mac 간 파일을 옮길 때 줄바꿈 문자 차이(CRLF vs LF)가 있을 수 있지만, 대부분 자동으로 처리됩니다

