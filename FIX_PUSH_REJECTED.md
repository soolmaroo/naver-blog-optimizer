# "Updates were rejected" 오류 해결

## 🔴 문제 원인

이 오류는 원격 저장소(GitHub)에 로컬에 없는 파일이 있을 때 발생합니다.

**일반적인 원인:**
- GitHub에서 저장소 생성 시 "Initialize this repository with a README" 옵션을 체크했을 때
- 다른 컴퓨터나 다른 곳에서 먼저 푸시했을 때

## ✅ 해결 방법

### 방법 1: 원격 변경사항 가져오기 후 푸시 (권장)

#### 1단계: 원격 변경사항 가져오기
```bash
git pull origin main --allow-unrelated-histories
```

`--allow-unrelated-histories` 옵션은 서로 관련 없는 히스토리를 병합할 때 필요합니다.

#### 2단계: 병합 메시지 편집
- Vim이나 다른 에디터가 열릴 수 있습니다
- 기본 메시지를 그대로 사용하려면 저장하고 닫기
  - Vim인 경우: `:wq` 입력 후 Enter
  - Nano인 경우: Ctrl+X → Y → Enter

#### 3단계: 푸시
```bash
git push -u origin main
```

### 방법 2: Rebase 사용

Rebase를 사용하면 히스토리가 더 깔끔합니다:

```bash
# 원격 변경사항을 가져와서 rebase
git pull origin main --rebase --allow-unrelated-histories

# 푸시
git push -u origin main
```

### 방법 3: 강제 푸시 (주의: 원격 변경사항 삭제됨)

⚠️ **주의**: 이 방법은 원격 저장소의 변경사항을 모두 덮어씁니다. 
협업 중이거나 중요한 데이터가 있다면 사용하지 마세요!

```bash
# 강제 푸시 (원격의 README 등이 삭제됨)
git push -u origin main --force
```

**권장하지 않음**: 원격 저장소에 중요한 데이터가 있을 수 있습니다.

## 📋 단계별 상세 가이드

### 1단계: 현재 상태 확인
```bash
git status
```

### 2단계: 원격 변경사항 확인
```bash
git fetch origin
```

### 3단계: 원격과 로컬의 차이 확인
```bash
git log origin/main..main
```

### 4단계: 병합 (방법 1 사용)
```bash
git pull origin main --allow-unrelated-histories
```

### 5단계: 충돌 해결 (필요한 경우)
- 충돌이 발생하면 파일을 열어서 수정
- `<<<<<<<`, `=======`, `>>>>>>>` 표시를 찾아서 해결
- 수정 후:
  ```bash
  git add .
  git commit -m "Merge remote-tracking branch 'origin/main'"
  ```

### 6단계: 푸시
```bash
git push -u origin main
```

## 🎯 가장 간단한 해결 (새 저장소인 경우)

GitHub에서 저장소를 방금 생성했고, "Initialize with README"를 체크했다면:

```bash
# 1. 원격 변경사항 가져오기
git pull origin main --allow-unrelated-histories

# 2. 병합 메시지 저장 (에디터가 열리면 저장하고 닫기)
# Vim: :wq
# Nano: Ctrl+X, Y, Enter

# 3. 푸시
git push -u origin main
```

## ⚠️ 주의사항

1. **충돌 발생 시**: 파일을 열어서 `<<<<<<<`, `=======`, `>>>>>>>` 표시를 찾아 수동으로 해결
2. **강제 푸시 주의**: `--force` 옵션은 원격 데이터를 덮어씁니다
3. **협업 시**: 다른 사람과 함께 작업 중이라면 `--force` 사용하지 마세요

## ✅ 성공 확인

푸시가 성공하면:

```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XX.XX KiB | XX.XX MiB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/soolmaroo/naver-blog-optimizer.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## 🔍 추가 확인

푸시 후 GitHub 웹사이트에서 저장소를 확인하면:
- 모든 파일이 업로드되어 있음
- README.md 파일이 있음 (GitHub에서 생성한 것과 로컬 것이 병합됨)

## 💡 앞으로 저장소 생성 시 팁

GitHub에서 새 저장소 생성 시:
- ❌ "Initialize this repository with a README" 체크하지 않기
- ❌ "Add .gitignore" 선택하지 않기 (이미 있음)
- ✅ 빈 저장소로 생성하고 로컬에서 푸시

이렇게 하면 이 오류가 발생하지 않습니다!

