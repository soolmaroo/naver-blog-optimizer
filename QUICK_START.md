# 빠른 시작 가이드 - Git 저장소 설정

## 🚀 3단계로 끝내기

### 1단계: 프로젝트 폴더에서 Git Bash 열기
1. Windows 탐색기에서 `naver-blog-optimizer` 폴더 열기
2. 폴더에서 **우클릭** → **"Git Bash Here"** 선택

### 2단계: Git 저장소 초기화
```bash
git init
```
출력: `Initialized empty Git repository in ...`

### 3단계: 상태 확인
```bash
git status
```
이제 프로젝트 파일들이 보여야 합니다!

## 📋 전체 명령어 순서

```bash
# 1. 현재 위치 확인 (프로젝트 폴더인지 확인)
pwd
# 출력: /c/naver-blog-optimizer (또는 비슷한 경로)

# 2. 파일 목록 확인
ls
# 출력: backend/ frontend/ .gitignore README.md ...

# 3. Git 저장소 초기화
git init

# 4. 상태 확인
git status
# 이제 프로젝트 파일들이 보여야 함!

# 5. 파일 추가
git add .

# 6. 상태 확인 (초록색으로 표시됨)
git status

# 7. 첫 커밋
git commit -m "Initial commit: 네이버 블로그 최적화 도구"

# 8. 원격 저장소 연결 (GitHub/GitLab)
git remote add origin https://github.com/your-username/naver-blog-optimizer.git
git branch -M main
git push -u origin main
```

## ⚠️ "fatal: not a git repository" 오류 해결

이 오류는 아직 `git init`을 실행하지 않았을 때 발생합니다.

### 해결 방법:
```bash
# 1. 프로젝트 폴더로 이동 (아직 안 했다면)
cd /c/naver-blog-optimizer

# 2. Git 저장소 초기화
git init

# 3. 다시 상태 확인
git status
```

## ✅ 확인 체크리스트

- [ ] 프로젝트 폴더(`naver-blog-optimizer`)에서 Git Bash 실행
- [ ] `pwd` 명령어로 위치 확인
- [ ] `ls` 명령어로 프로젝트 파일들 확인
- [ ] `git init` 실행 완료
- [ ] `git status`에서 프로젝트 파일들만 보임
- [ ] `.env` 파일이 보이지 않음 (정상)

## 🎯 다음 단계

Git 저장소가 초기화되면:
1. `git add .` - 파일 추가
2. `git commit -m "..."` - 첫 커밋
3. GitHub/GitLab에 저장소 생성
4. `git remote add origin ...` - 원격 저장소 연결
5. `git push -u origin main` - 푸시

