# Git 오류 해결: 잘못된 위치에서 실행

## 🔴 문제 상황

`git status`를 실행했을 때 사용자 홈 디렉토리(`C:\Users\사용자명`)의 파일들이 보이는 경우입니다.

## ✅ 해결 방법

### 1단계: 현재 위치 확인
```bash
pwd
```
출력 예: `/c/Users/사용자명` ← **이게 문제입니다!**

### 2단계: 프로젝트 폴더로 이동
```bash
# 프로젝트 폴더 경로로 이동
cd /c/naver-blog-optimizer

# 또는 전체 경로가 다르다면
cd /c/Users/사용자명/Desktop/naver-blog-optimizer
# 또는
cd /c/Users/사용자명/Documents/naver-blog-optimizer
```

### 3단계: 위치 확인
```bash
pwd
```
출력 예: `/c/naver-blog-optimizer` ← **이렇게 나와야 합니다!**

### 4단계: 파일 목록 확인
```bash
ls
```
출력 예:
```
backend/
frontend/
.gitignore
README.md
env.template
...
```
이렇게 나와야 정상입니다!

### 5단계: Git 저장소 초기화 (아직 안 했다면)
```bash
git init
```

### 6단계: 다시 상태 확인
```bash
git status
```
이제 프로젝트 파일들만 보여야 합니다!

## 🎯 올바른 위치에서 실행하는 방법

### 방법 1: Git Bash에서 직접 이동
```bash
# 프로젝트 폴더로 이동
cd /c/naver-blog-optimizer

# 또는 Windows 경로 형식
cd C:/naver-blog-optimizer
```

### 방법 2: 탐색기에서 Git Bash 열기
1. Windows 탐색기에서 `naver-blog-optimizer` 폴더 열기
2. 폴더에서 **우클릭**
3. **"Git Bash Here"** 선택
4. 자동으로 프로젝트 폴더에서 시작됨 ✅

### 방법 3: Git Bash 시작 위치 변경
Git Bash를 열 때 자동으로 프로젝트 폴더로 이동하려면:
1. Git Bash 아이콘 우클릭 → 속성
2. "시작 위치"를 프로젝트 폴더 경로로 변경
   예: `C:\naver-blog-optimizer`

## ⚠️ 주의사항

### 잘못된 위치에서 `git init`을 했다면
사용자 홈 디렉토리에서 `git init`을 실행했다면:

```bash
# 현재 위치 확인
pwd

# 사용자 홈 디렉토리라면
cd /c/naver-blog-optimizer

# 프로젝트 폴더에서 git init
git init
```

### 이미 잘못된 위치에 Git 저장소가 있다면
```bash
# 사용자 홈 디렉토리로 이동
cd ~

# .git 폴더 삭제 (주의: 이 명령어는 신중하게!)
rm -rf .git
```

## ✅ 올바른 실행 예시

```bash
# 1. 프로젝트 폴더로 이동
cd /c/naver-blog-optimizer

# 2. 현재 위치 확인
pwd
# 출력: /c/naver-blog-optimizer

# 3. 파일 목록 확인
ls
# 출력: backend/ frontend/ .gitignore README.md ...

# 4. Git 저장소 초기화
git init

# 5. 상태 확인
git status
# 출력: 프로젝트 파일들만 보여야 함!

# 6. 파일 추가
git add .

# 7. 상태 확인 (이제 초록색으로 표시됨)
git status
```

## 🎯 체크리스트

- [ ] `pwd` 명령어로 현재 위치 확인
- [ ] 프로젝트 폴더(`naver-blog-optimizer`)로 이동
- [ ] `ls` 명령어로 프로젝트 파일들 확인
- [ ] `git status`에서 프로젝트 파일들만 보임
- [ ] `.env` 파일이 보이지 않음 (정상)

## 💡 팁

**항상 프로젝트 폴더에서 Git 명령어를 실행하세요!**

가장 쉬운 방법:
1. Windows 탐색기에서 프로젝트 폴더 열기
2. 폴더에서 우클릭 → "Git Bash Here"
3. 자동으로 올바른 위치에서 시작됨 ✅

