# GitHub Personal Access Token 인증 가이드

## 🔑 Personal Access Token 생성하기

### 1단계: GitHub에서 토큰 생성

1. **GitHub 로그인**
   - https://github.com 에서 로그인

2. **Settings로 이동**
   - 우측 상단 프로필 이미지 클릭 → **Settings**

3. **Developer settings로 이동**
   - 좌측 메뉴 맨 아래 **Developer settings** 클릭

4. **Personal access tokens로 이동**
   - **Personal access tokens** → **Tokens (classic)** 클릭

5. **새 토큰 생성**
   - **Generate new token** → **Generate new token (classic)** 클릭
   - 또는 직접 링크: https://github.com/settings/tokens/new

6. **토큰 설정**
   - **Note**: 토큰 설명 (예: "naver-blog-optimizer")
   - **Expiration**: 만료 기간 선택 (90 days, 1 year 등)
   - **Select scopes**: 다음 권한 체크
     - ✅ **repo** (전체 체크)
       - repo:status
       - repo_deployment
       - public_repo
       - repo:invite
       - security_events

7. **토큰 생성**
   - 맨 아래 **Generate token** 버튼 클릭

8. **토큰 복사** ⚠️ 중요!
   - 생성된 토큰을 **지금 복사**하세요!
   - `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 형식
   - 이 페이지를 나가면 다시 볼 수 없습니다!

## 🔐 Git Push 시 토큰 사용하기

### 방법 1: 푸시 시 비밀번호 대신 토큰 입력 (권장)

```bash
# 브랜치 이름을 main으로 변경
git branch -M main

# 원격 저장소에 푸시
git push -u origin main
```

**입력 프롬프트가 나타나면:**
- **Username**: GitHub 사용자명 입력
- **Password**: 여기에 **Personal Access Token** 입력 (비밀번호 아님!)

### 방법 2: URL에 토큰 포함 (보안 주의)

토큰을 URL에 포함시키는 방법 (덜 안전하지만 편리함):

```bash
# 원격 저장소 URL을 토큰 포함 형식으로 변경
git remote set-url origin https://토큰@github.com/your-username/naver-blog-optimizer.git

# 예시:
git remote set-url origin https://ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@github.com/your-username/naver-blog-optimizer.git

# 그 다음 푸시
git push -u origin main
```

⚠️ **주의**: 이 방법은 토큰이 Git 설정에 저장되므로 보안상 권장하지 않습니다.

### 방법 3: Git Credential Manager 사용 (Windows)

Windows Git Credential Manager를 사용하면 토큰을 저장할 수 있습니다:

```bash
# 푸시 시도
git push -u origin main

# 인증 창이 나타나면:
# - Username: GitHub 사용자명
# - Password: Personal Access Token

# "자격 증명 저장" 옵션이 있다면 체크하면 다음부터 자동 인증됨
```

## 🔄 토큰 만료 후 갱신

토큰이 만료되면:

1. 새 토큰 생성 (위 1단계 참고)
2. Git Credential Manager에서 기존 자격 증명 삭제:
   ```bash
   # Windows에서 자격 증명 관리자 열기
   # 시작 메뉴 → "자격 증명 관리자" 검색
   # Windows 자격 증명 → github.com 관련 항목 삭제
   ```
3. 다시 푸시하면 새 토큰 입력 프롬프트 표시

## 🛡️ 보안 권장사항

1. **토큰을 절대 공유하지 마세요**
2. **토큰을 Git 저장소에 커밋하지 마세요**
3. **토큰을 코드나 설정 파일에 하드코딩하지 마세요**
4. **토큰 만료 기간을 적절히 설정하세요**
5. **필요한 권한만 부여하세요** (repo 권한만)

## 🔍 현재 설정 확인

```bash
# 원격 저장소 URL 확인
git remote -v

# 자격 증명 확인 (Windows)
# 시작 메뉴 → "자격 증명 관리자" → Windows 자격 증명 → github.com
```

## ✅ 인증 성공 확인

푸시가 성공하면:

```
Enumerating objects: XX, done.
Counting objects: 100% (XX/XX), done.
Delta compression using up to X threads
Compressing objects: 100% (XX/XX), done.
Writing objects: 100% (XX/XX), XX.XX KiB | XX.XX MiB/s, done.
Total XX (delta X), reused 0 (delta 0), pack-reused 0
To https://github.com/your-username/naver-blog-optimizer.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

## 🆘 문제 해결

### "Authentication failed" 오류
- 토큰이 올바른지 확인
- 토큰이 만료되지 않았는지 확인
- Username이 올바른지 확인 (이메일이 아닌 사용자명!)

### "Permission denied" 오류
- 토큰에 `repo` 권한이 있는지 확인
- 저장소가 Private인 경우 토큰 권한 확인

### 토큰을 잊어버린 경우
- GitHub에서 토큰 삭제 후 새로 생성
- 새 토큰으로 다시 인증

## 💡 팁

1. **토큰 이름을 명확하게**: 어떤 프로젝트용인지 명시
2. **토큰 관리 문서화**: 안전한 곳에 토큰 목록 관리
3. **SSH 키 고려**: 더 안전한 방법으로, SSH 키도 고려해볼 수 있습니다

