# "Repository not found" 오류 해결

## 🔴 문제 원인

이 오류는 다음 중 하나일 수 있습니다:

1. **GitHub에 저장소를 아직 생성하지 않았음**
2. **원격 저장소 URL에 잘못된 사용자명이나 저장소 이름이 들어가 있음**
3. **저장소가 Private인데 인증이 안 되었음**

## ✅ 해결 방법

### 1단계: 현재 원격 저장소 URL 확인

```bash
git remote -v
```

출력 예:
```
origin  https://github.com/your-username/naver-blog-optimizer.git (fetch)
origin  https://github.com/your-username/naver-blog-optimizer.git (push)
```

⚠️ **`your-username`이 그대로 있다면** 실제 GitHub 사용자명으로 변경해야 합니다!

### 2단계: GitHub 저장소 생성

1. **GitHub 로그인**
   - https://github.com 에서 로그인

2. **새 저장소 생성**
   - 우측 상단 **"+"** 버튼 클릭 → **"New repository"**
   - 또는 직접 링크: https://github.com/new

3. **저장소 설정**
   - **Repository name**: `naver-blog-optimizer`
   - **Description**: (선택사항) 설명 입력
   - **Public / Private**: 선택
   - ⚠️ **"Initialize this repository with a README" 체크 해제** (이미 README 있음)
   - ⚠️ **"Add .gitignore" 선택 안 함** (이미 있음)
   - ⚠️ **"Choose a license" 선택 안 함**

4. **"Create repository" 클릭**

5. **저장소 URL 확인**
   - 생성된 저장소 페이지에서 URL 확인
   - 예: `https://github.com/실제사용자명/naver-blog-optimizer.git`

### 3단계: 원격 저장소 URL 수정

#### 실제 사용자명과 저장소 이름으로 변경

```bash
# 기존 원격 저장소 삭제
git remote remove origin

# 실제 URL로 다시 추가 (실제사용자명을 본인의 GitHub 사용자명으로 변경!)
git remote add origin https://github.com/실제사용자명/naver-blog-optimizer.git

# 확인
git remote -v
```

**예시:**
```bash
# 사용자명이 "john-doe"라면
git remote add origin https://github.com/john-doe/naver-blog-optimizer.git
```

### 4단계: 푸시 시도

```bash
git push -u origin main
```

## 🔍 사용자명 확인 방법

GitHub에서 본인의 사용자명을 확인하려면:

1. GitHub 로그인 후 우측 상단 프로필 이미지 클릭
2. 사용자명이 표시됨 (예: `@username`)
3. 이 사용자명을 URL에 사용

## 📋 전체 명령어 순서

```bash
# 1. 현재 원격 저장소 확인
git remote -v

# 2. 기존 원격 저장소 삭제
git remote remove origin

# 3. GitHub에서 저장소 생성 (웹 브라우저에서)
# https://github.com/new 에서 저장소 생성

# 4. 실제 URL로 원격 저장소 추가 (실제사용자명으로 변경!)
git remote add origin https://github.com/실제사용자명/naver-blog-optimizer.git

# 5. 확인
git remote -v

# 6. 푸시
git push -u origin main

# 7. Username: GitHub 사용자명 입력
# 8. Password: Personal Access Token 입력
```

## ⚠️ 주의사항

1. **저장소 이름 정확히 일치**: `naver-blog-optimizer` (대소문자 구분)
2. **사용자명 정확히 일치**: GitHub 사용자명 정확히 입력
3. **저장소 생성 확인**: GitHub에서 저장소가 실제로 생성되었는지 확인
4. **README 초기화 체크 해제**: GitHub에서 저장소 생성 시 "Initialize with README" 체크하지 않기

## 🆘 여전히 안 되는 경우

### "Permission denied" 오류가 나는 경우
- Personal Access Token 권한 확인
- 저장소가 Private인 경우 토큰에 repo 권한 확인

### "Authentication failed" 오류가 나는 경우
- 사용자명이 올바른지 확인
- Personal Access Token이 올바른지 확인
- 토큰이 만료되지 않았는지 확인

### 저장소 이름이 다른 경우
- GitHub에서 저장소 이름 확인
- 원격 저장소 URL의 저장소 이름도 동일하게 맞추기

## ✅ 성공 확인

푸시가 성공하면:

```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XX.XX KiB | XX.XX MiB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/실제사용자명/naver-blog-optimizer.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

그리고 GitHub 웹사이트에서 저장소를 확인하면 파일들이 업로드된 것을 볼 수 있습니다!

