# .gitignore 예외 추가 가이드

## .gitignore 예외란?

`.gitignore`에 무시 규칙이 있어도, 특정 파일이나 폴더는 **예외로 추가**할 수 있습니다.

## 문법

```
# 무시 규칙
폴더명/
*.확장자

# 예외 추가 (느낌표 ! 사용)
!폴더명/파일명
!*.특정확장자
```

## 예시

### 예시 1: 폴더는 무시하되 특정 파일만 추가

```gitignore
# .vscode 폴더 전체 무시
.vscode/

# 하지만 settings.json은 예외 (추가)
!.vscode/settings.json
```

### 예시 2: 모든 .txt 파일 무시하되 특정 파일만 추가

```gitignore
# 모든 .txt 파일 무시
*.txt

# 하지만 README.txt는 예외 (추가)
!README.txt
```

### 예시 3: 하위 폴더의 특정 파일만 예외

```gitignore
# 모든 __pycache__ 폴더 무시
__pycache__/

# 하지만 특정 폴더의 __pycache__는 예외
!backend/app/__pycache__/
```

## 현재 적용된 예외

`.gitignore` 파일에 다음 예외를 추가했습니다:

```gitignore
# IDE
.vscode/
!.vscode/settings.json  # settings.json은 예외 (팀 공유용)
```

이제 `.vscode/` 폴더는 무시되지만, `settings.json` 파일만 GitHub에 올라갑니다.

## 확인 방법

### 1. 파일이 무시되는지 확인
```bash
git check-ignore -v .vscode/settings.json
```
- 출력이 없으면 → 무시되지 않음 (정상)
- 출력이 있으면 → 여전히 무시됨

### 2. Git 상태 확인
```bash
git status .vscode/settings.json
```
- "Untracked files"에 나타나면 → 추가 가능
- 나타나지 않으면 → 여전히 무시됨

### 3. 강제로 추가하기
만약 여전히 무시된다면:
```bash
git add -f .vscode/settings.json
```
`-f` (force) 옵션으로 강제 추가

## 주의사항

1. **예외 규칙은 무시 규칙 뒤에 와야 함**
   ```gitignore
   # 잘못된 순서
   !.vscode/settings.json
   .vscode/
   
   # 올바른 순서
   .vscode/
   !.vscode/settings.json
   ```

2. **폴더를 무시한 경우, 폴더 자체도 예외로 추가해야 함**
   ```gitignore
   .vscode/
   !.vscode/              # 폴더 자체를 예외로 추가
   !.vscode/settings.json # 그 다음 파일을 예외로 추가
   ```

3. **와일드카드와 예외 조합**
   ```gitignore
   *.txt                  # 모든 .txt 무시
   !important.txt         # important.txt는 예외
   !docs/*.txt            # docs 폴더의 모든 .txt는 예외
   ```

## 실전 예시

### 예시: requirements.txt는 올리되 다른 .txt는 무시

```gitignore
# 모든 .txt 무시
*.txt

# 하지만 requirements.txt는 예외
!requirements.txt
!backend/requirements.txt
!frontend/requirements.txt
```

### 예시: .env는 무시하되 .env.example은 올리기

```gitignore
# 모든 .env 파일 무시
.env
.env.local

# 하지만 .env.example은 예외 (템플릿 파일)
!.env.example
```

## 현재 프로젝트 적용

현재 `.gitignore`에 다음을 추가했습니다:

```gitignore
# IDE
.vscode/
!.vscode/settings.json  # settings.json은 예외 (팀 공유용)
```

이제 `settings.json` 파일이 GitHub에 올라갑니다!

