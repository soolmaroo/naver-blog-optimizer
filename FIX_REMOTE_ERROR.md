# Git 원격 저장소 오류 해결

## 🔴 오류: "remote origin already exists"

이 오류는 이미 원격 저장소가 설정되어 있을 때 발생합니다.

## ✅ 해결 방법

### 방법 1: 기존 원격 저장소 확인 및 수정 (권장)

#### 1단계: 기존 원격 저장소 확인
```bash
git remote -v
```
출력 예:
```
origin  https://github.com/old-username/old-repo.git (fetch)
origin  https://github.com/old-username/old-repo.git (push)
```

#### 2단계: 기존 원격 저장소 삭제
```bash
git remote remove origin
```

#### 3단계: 새로운 원격 저장소 추가
```bash
git remote add origin https://github.com/your-username/naver-blog-optimizer.git
```

#### 4단계: 확인
```bash
git remote -v
```
이제 새로운 URL이 표시되어야 합니다.

### 방법 2: 기존 원격 저장소 URL 변경

기존 원격 저장소를 삭제하지 않고 URL만 변경하려면:

```bash
git remote set-url origin https://github.com/your-username/naver-blog-optimizer.git
```

#### 확인
```bash
git remote -v
```

## 📋 전체 명령어 순서

```bash
# 1. 기존 원격 저장소 확인
git remote -v

# 2-A. 기존 원격 저장소 삭제 후 새로 추가
git remote remove origin
git remote add origin https://github.com/your-username/naver-blog-optimizer.git

# 또는 2-B. 기존 원격 저장소 URL만 변경
git remote set-url origin https://github.com/your-username/naver-blog-optimizer.git

# 3. 확인
git remote -v

# 4. 브랜치 이름을 main으로 변경 (필요한 경우)
git branch -M main

# 5. 원격 저장소에 푸시
git push -u origin main
```

## ⚠️ 주의사항

### GitHub 인증 필요
`git push`를 실행할 때 인증이 필요할 수 있습니다:

1. **Personal Access Token 사용** (권장)
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 새 토큰 생성 (repo 권한 필요)
   - 푸시 시 비밀번호 대신 토큰 입력

2. **SSH 키 사용**
   - SSH 키 생성 및 GitHub에 등록
   - URL을 SSH 형식으로 변경: `git@github.com:username/repo.git`

## 🎯 다음 단계

원격 저장소가 올바르게 설정되면:

```bash
# 브랜치 이름을 main으로 변경
git branch -M main

# 원격 저장소에 푸시
git push -u origin main
```

## 💡 팁

- `git remote -v`로 항상 원격 저장소 URL을 확인하세요
- 잘못된 URL을 설정했다면 `git remote set-url`로 쉽게 변경 가능합니다
- 여러 원격 저장소를 사용하려면 `origin` 대신 다른 이름 사용 가능:
  ```bash
  git remote add upstream https://github.com/other/repo.git
  ```

