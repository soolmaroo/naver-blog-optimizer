# Git을 사용한 Windows ↔ Mac 프로젝트 공유 가이드

## ✅ 똑같이 받아지는 것들

Git 저장소에 포함되어 있는 모든 파일들은 Windows와 Mac에서 **동일하게** 받아집니다:

- ✅ 모든 소스 코드 (`.py`, `.jsx`, `.js` 파일 등)
- ✅ 설정 파일 (`package.json`, `requirements.txt`, `vite.config.js` 등)
- ✅ 프로젝트 구조 및 폴더
- ✅ `.gitignore`, `README.md` 등 문서 파일

## ❌ 받아지지 않는 것들 (각 환경에서 새로 만들어야 함)

`.gitignore`에 포함되어 있어 Git에 저장되지 않는 파일들:

### 1. `.env` 파일 (환경 변수)
- **Windows에서**: 프로젝트 루트에 `.env` 파일 생성
- **Mac에서**: 프로젝트 루트에 `.env` 파일 생성
- **내용**: API 키는 동일하게 사용 가능

### 2. 가상환경 (`.venv/` 폴더)
- **Windows에서**: `python -m venv .venv` → `.venv\Scripts\activate`
- **Mac에서**: `python3 -m venv .venv` → `source .venv/bin/activate`
- **의존성 설치**: `pip install -r requirements.txt` (양쪽 모두 동일)

### 3. `node_modules/` 폴더
- **Windows에서**: `npm install`
- **Mac에서**: `npm install`
- **명령어는 동일**

### 4. `learning_data.json` (학습 데이터)
- 개인 데이터이므로 Git에 포함하지 않음
- 각 환경에서 새로 학습하거나 수동으로 복사 가능

## 📋 Windows에서 Git 저장소 설정하기

### 1. Git 설치 확인
```bash
git --version
```

### 2. Git 저장소 초기화
```bash
cd naver-blog-optimizer
git init
```

### 3. 첫 커밋
```bash
git add .
git commit -m "Initial commit: 네이버 블로그 최적화 도구"
```

### 4. 원격 저장소 연결 (GitHub/GitLab 등)
```bash
# GitHub 예시
git remote add origin https://github.com/your-username/naver-blog-optimizer.git
git branch -M main
git push -u origin main
```

## 📋 Mac에서 프로젝트 받기

### 1. Git 설치 확인
```bash
git --version
```

### 2. 프로젝트 클론
```bash
git clone https://github.com/your-username/naver-blog-optimizer.git
cd naver-blog-optimizer
```

### 3. 환경 설정 (각 환경에서 새로 해야 함)

#### Backend 설정
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Frontend 설정
```bash
cd frontend
npm install
```

#### 환경 변수 설정
```bash
# 프로젝트 루트로 이동
cd ..

# .env 파일 생성
touch .env

# .env 파일 편집 (에디터 사용)
nano .env
# 또는
code .env
```

`.env` 파일 내용:
```
NAVER_CLIENT_ID=여기에_키_입력
NAVER_CLIENT_SECRET=여기에_시크릿_입력
GOOGLE_API_KEY=여기에_제미나이_키_입력
NAVER_REDIRECT_URI=http://localhost:5173/auth/naver/callback
```

## 🔄 코드 업데이트 방법

### Windows에서 변경사항 푸시
```bash
git add .
git commit -m "변경사항 설명"
git push
```

### Mac에서 최신 코드 받기
```bash
git pull
```

### Mac에서 변경사항 푸시
```bash
git add .
git commit -m "변경사항 설명"
git push
```

### Windows에서 최신 코드 받기
```bash
git pull
```

## ⚠️ 주의사항

### 1. 줄바꿈 문자 차이
- Windows: CRLF (`\r\n`)
- Mac/Linux: LF (`\n`)
- Git이 자동으로 처리하지만, 설정에 따라 다를 수 있음

### 2. 파일 권한
- Mac/Linux는 실행 권한을 유지하지만, Windows는 무시됨
- 대부분의 경우 문제없음

### 3. 경로 구분자
- 코드 내부에서는 상대 경로를 사용하므로 문제없음
- 절대 경로를 사용하는 경우 주의 필요

### 4. API 키 보안
- `.env` 파일은 절대 Git에 커밋하지 마세요
- `.gitignore`에 이미 포함되어 있지만, 확인 필요

## 🎯 실제 사용 시나리오

### 시나리오 1: Windows에서 작업 시작
1. Windows에서 코드 작성 및 테스트
2. `git add .` → `git commit -m "..."` → `git push`
3. Mac에서 `git pull`로 최신 코드 받기
4. Mac에서 `.env` 파일 생성 및 가상환경 설정
5. Mac에서도 동일하게 사용 가능

### 시나리오 2: Mac에서 작업 시작
1. Mac에서 코드 작성 및 테스트
2. `git add .` → `git commit -m "..."` → `git push`
3. Windows에서 `git pull`로 최신 코드 받기
4. Windows에서도 동일하게 사용 가능

## ✅ 확인 체크리스트

### Windows에서 Git 저장소 설정 후
- [ ] `git status`로 파일 상태 확인
- [ ] `.env` 파일이 Git에 포함되지 않았는지 확인 (`git status`에서 보이지 않아야 함)
- [ ] 원격 저장소에 푸시 완료

### Mac에서 프로젝트 받은 후
- [ ] `git pull`로 최신 코드 확인
- [ ] `.env` 파일 생성 및 API 키 입력
- [ ] Backend 가상환경 생성 및 의존성 설치
- [ ] Frontend 의존성 설치
- [ ] 서버 실행 테스트

## 💡 팁

1. **브랜치 사용**: 기능별로 브랜치를 만들어 작업하면 더 안전합니다
   ```bash
   git checkout -b feature/new-feature
   ```

2. **커밋 메시지**: 명확한 커밋 메시지를 작성하면 나중에 이해하기 쉽습니다
   ```bash
   git commit -m "feat: 키워드 추천 기능 추가"
   ```

3. **`.env` 파일 백업**: API 키를 잊어버릴 수 있으니 안전한 곳에 별도로 보관하세요

4. **정기적인 푸시**: 작업한 내용을 정기적으로 푸시하면 데이터 손실을 방지할 수 있습니다

