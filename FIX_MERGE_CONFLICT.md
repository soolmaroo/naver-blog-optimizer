# 병합 충돌 해결 가이드

## 🔴 현재 상황

`(main|MERGING)` 표시는 병합 충돌이 발생한 상태입니다. 충돌을 해결해야 합니다.

## ✅ 해결 방법

### 1단계: 충돌 파일 확인

```bash
git status
```

충돌이 있는 파일들이 빨간색으로 표시됩니다:
```
Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   README.md
```

### 2단계: 충돌 파일 확인 및 해결

#### 충돌 파일 열기
충돌 파일을 텍스트 에디터로 엽니다. 충돌 부분은 다음과 같이 표시됩니다:

```
<<<<<<< HEAD
로컬의 내용
=======
원격의 내용
>>>>>>> origin/main
```

#### 충돌 해결 방법

**옵션 1: 로컬 내용 사용**
- `<<<<<<< HEAD`부터 `=======`까지의 내용만 남기고 나머지 삭제

**옵션 2: 원격 내용 사용**
- `=======`부터 `>>>>>>> origin/main`까지의 내용만 남기고 나머지 삭제

**옵션 3: 둘 다 사용**
- 두 내용을 모두 남기고 `<<<<<<<`, `=======`, `>>>>>>>` 표시만 삭제

**옵션 4: 새로 작성**
- 두 내용을 참고하여 새로운 내용 작성

#### 예시: README.md 충돌 해결

**충돌 전:**
```
<<<<<<< HEAD
# 네이버 블로그 최적화 도구 - 문정 한의원 Edition

문정역 한의원을 위한 네이버 블로그 최적화 및 자동화 웹 애플리케이션입니다.
=======
# naver-blog-optimizer
>>>>>>> origin/main
```

**해결 후 (로컬 내용 사용):**
```
# 네이버 블로그 최적화 도구 - 문정 한의원 Edition

문정역 한의원을 위한 네이버 블로그 최적화 및 자동화 웹 애플리케이션입니다.
```

### 3단계: 충돌 해결 완료 표시

```bash
# 충돌을 해결한 파일들을 스테이징
git add .

# 또는 특정 파일만
git add README.md
```

### 4단계: 병합 커밋 완료

```bash
git commit -m "Merge remote-tracking branch 'origin/main'"
```

또는 기본 메시지 사용:
```bash
git commit
```
에디터가 열리면 저장하고 닫기 (Vim: `:wq`, Nano: `Ctrl+X, Y, Enter`)

### 5단계: 상태 확인

```bash
git status
```

이제 `(main|MERGING)` 표시가 사라지고 `(main)`만 보여야 합니다.

### 6단계: 푸시

```bash
git push -u origin main
```

## 📋 전체 명령어 순서

```bash
# 1. 충돌 파일 확인
git status

# 2. 충돌 파일 열어서 수정
# 텍스트 에디터로 파일 열기
# <<<<<<<, =======, >>>>>>> 표시 제거하고 원하는 내용만 남기기

# 3. 충돌 해결 완료 표시
git add .

# 4. 병합 커밋
git commit -m "Merge remote-tracking branch 'origin/main'"

# 5. 상태 확인
git status

# 6. 푸시
git push -u origin main
```

## 🎯 빠른 해결 (원격 내용 사용)

원격 저장소의 내용을 그대로 사용하고 싶다면:

```bash
# 1. 원격 버전 사용
git checkout --theirs README.md

# 2. 스테이징
git add README.md

# 3. 커밋
git commit -m "Merge: Use remote README"

# 4. 푸시
git push -u origin main
```

## 🎯 빠른 해결 (로컬 내용 사용)

로컬 내용을 그대로 사용하고 싶다면:

```bash
# 1. 로컬 버전 사용
git checkout --ours README.md

# 2. 스테이징
git add README.md

# 3. 커밋
git commit -m "Merge: Use local README"

# 4. 푸시
git push -u origin main
```

## 🔍 충돌 파일 찾기

```bash
# 충돌이 있는 파일 목록
git diff --name-only --diff-filter=U

# 충돌 내용 확인
git diff
```

## ⚠️ 주의사항

1. **충돌 표시 제거**: `<<<<<<<`, `=======`, `>>>>>>>` 표시를 반드시 제거해야 합니다
2. **모든 충돌 해결**: 모든 충돌 파일을 해결해야 커밋할 수 있습니다
3. **스테이징 필수**: 충돌 해결 후 `git add`를 반드시 실행해야 합니다

## 💡 팁

### VSCode 사용하는 경우
- VSCode가 자동으로 충돌을 표시하고 해결 UI를 제공합니다
- "Accept Current Change", "Accept Incoming Change", "Accept Both Changes" 버튼 사용

### 충돌이 많은 경우
- 원격 내용을 모두 사용: `git checkout --theirs .`
- 로컬 내용을 모두 사용: `git checkout --ours .`
- 그 후 `git add .` → `git commit`

## ✅ 성공 확인

병합이 완료되면:
- `git status`에서 `(main|MERGING)` 표시가 사라짐
- `(main)`만 표시됨
- "All conflicts fixed" 메시지 표시

그 다음 `git push -u origin main`으로 푸시하면 됩니다!

