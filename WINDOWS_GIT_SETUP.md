# Windows에서 Git 저장소 설정하기

## 🎯 어떤 도구를 사용할까?

### 추천: **Git Bash** (가장 추천 ⭐)
- Mac과 동일한 명령어 사용 가능
- 리눅스/맥 환경과 호환성 좋음
- 터미널에서 바로 사용 가능

### 대안: **PowerShell** 또는 **CMD**
- Windows 네이티브 명령어
- Git 명령어는 동일하게 작동

### Git GUI는?
- 초보자에게는 편하지만, 일반적으로는 명령줄이 더 유연함
- 이 가이드에서는 명령줄 사용을 권장합니다

## 📋 단계별 설정 (Git Bash 사용)

### 1단계: Git Bash 열기
1. 프로젝트 폴더(`naver-blog-optimizer`)에서 **우클릭**
2. **"Git Bash Here"** 선택
   - 또는 시작 메뉴에서 "Git Bash" 검색 후 실행
   - 그 다음 `cd` 명령어로 프로젝트 폴더로 이동

### 2단계: 현재 위치 확인
```bash
pwd
# 출력 예: /c/naver-blog-optimizer
```

### 3단계: Git 저장소 초기화
```bash
git init
```
출력: `Initialized empty Git repository in ...`

### 4단계: Git 사용자 정보 설정 (처음 한 번만)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 5단계: 파일 추가
```bash
git add .
```
- 모든 파일을 스테이징 영역에 추가
- `.gitignore`에 있는 파일들은 자동으로 제외됨

### 6단계: 상태 확인
```bash
git status
```
- 추가된 파일들이 초록색으로 표시됨
- `.env` 파일은 보이지 않아야 함 (정상)

### 7단계: 첫 커밋
```bash
git commit -m "Initial commit: 네이버 블로그 최적화 도구"
```

### 8단계: 원격 저장소 연결 (GitHub/GitLab 등)

#### GitHub 사용하는 경우:
1. GitHub에서 새 저장소 생성 (https://github.com/new)
2. 저장소 이름: `naver-blog-optimizer`
3. Public 또는 Private 선택
4. **"Initialize this repository with a README" 체크 해제** (이미 README 있음)
5. 생성 후 나오는 URL 복사

```bash
# 원격 저장소 추가
git remote add origin https://github.com/your-username/naver-blog-optimizer.git

# 브랜치 이름을 main으로 설정
git branch -M main

# 원격 저장소에 푸시
git push -u origin main
```

#### GitLab 사용하는 경우:
1. GitLab에서 새 프로젝트 생성
2. 저장소 URL 복사
3. 위와 동일하게 `git remote add origin` 사용

## 📋 단계별 설정 (PowerShell 사용)

PowerShell을 사용하는 경우 명령어는 동일하지만, 경로 표기법이 약간 다릅니다:

```powershell
# 프로젝트 폴더로 이동
cd C:\naver-blog-optimizer

# Git 저장소 초기화
git init

# 사용자 정보 설정 (처음 한 번만)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 파일 추가
git add .

# 상태 확인
git status

# 첫 커밋
git commit -m "Initial commit: 네이버 블로그 최적화 도구"

# 원격 저장소 연결
git remote add origin https://github.com/your-username/naver-blog-optimizer.git
git branch -M main
git push -u origin main
```

## ✅ 확인 사항

### `.env` 파일이 Git에 포함되지 않았는지 확인
```bash
git status
```
- `.env` 파일이 목록에 보이지 않아야 함 ✅
- 보인다면 `.gitignore` 확인 필요

### 제대로 추가된 파일 확인
```bash
git ls-files
```
- 소스 코드 파일들이 보여야 함
- `node_modules`, `.venv` 등은 보이지 않아야 함

## 🔄 이후 작업 흐름

### 코드 변경 후 커밋 및 푸시
```bash
# 변경사항 확인
git status

# 변경된 파일 추가
git add .

# 커밋
git commit -m "변경사항 설명"

# 원격 저장소에 푸시
git push
```

## ⚠️ 주의사항

1. **`.env` 파일 절대 커밋하지 마세요**
   - `.gitignore`에 포함되어 있지만, 확인 필요
   - 만약 실수로 커밋했다면:
     ```bash
     git rm --cached .env
     git commit -m "Remove .env from git"
     ```

2. **`learning_data.json`도 커밋하지 마세요**
   - 개인 데이터이므로 Git에 포함하지 않음

3. **첫 푸시 시 인증 필요**
   - GitHub: Personal Access Token 또는 SSH 키 필요
   - GitLab: Personal Access Token 필요

## 🆘 문제 해결

### "fatal: not a git repository" 오류
```bash
# 현재 위치 확인
pwd
# 프로젝트 루트 폴더인지 확인
# 아니라면 이동
cd /c/naver-blog-optimizer
```

### "git: command not found" 오류
- Git이 제대로 설치되지 않았거나 PATH에 없음
- Git 재설치 또는 환경 변수 확인

### 푸시 시 인증 오류
- GitHub: Personal Access Token 생성 필요
- GitLab: Personal Access Token 생성 필요

## 💡 팁

1. **Git Bash 사용 권장**: Mac과 동일한 환경
2. **명확한 커밋 메시지**: 나중에 이해하기 쉬움
3. **정기적인 푸시**: 작업 내용을 자주 백업

