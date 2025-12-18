# localhost 연결 거부 오류 해결 가이드

## 🔴 오류 메시지

```
Failed to fetch
ERR_CONNECTION_REFUSED
localhost에서 연결을 거부했습니다
```

## 🔍 원인 분석

이 오류는 **프론트엔드가 백엔드 서버에 연결할 수 없을 때** 발생합니다.

### 주요 원인들

1. **백엔드 서버가 실행되지 않음** (가장 흔함)
2. **서버가 다른 포트에서 실행 중**
3. **서버가 시작 중이거나 재시작 중** (reload 모드)
4. **포트 8000이 다른 프로그램에 의해 사용 중**
5. **서버가 오류로 종료됨**
6. **방화벽이나 보안 소프트웨어가 차단**

---

## ✅ 해결 방법 (단계별)

### 1단계: 백엔드 서버가 실행 중인지 확인

**터미널에서 확인:**

1. 백엔드 서버를 실행한 터미널 창을 찾으세요
2. 다음과 같은 메시지가 보여야 합니다:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   INFO:     Started reloader process
   INFO:     Started server process
   ```

**보이지 않는다면:**
- 서버가 실행되지 않은 것입니다
- 아래 "2단계: 백엔드 서버 시작하기"를 따라하세요

---

### 2단계: 백엔드 서버 시작하기

**Windows PowerShell에서:**

```powershell
# 1. 프로젝트 폴더로 이동
cd C:\naver-blog-optimizer\backend

# 2. 가상환경 활성화
.venv\Scripts\Activate.ps1

# 3. 서버 시작
uvicorn app.main:app --reload --port 8000
```

**성공하면 다음과 같은 메시지가 나타납니다:**
```
INFO:     Will watch for changes in these directories: ['C:\\naver-blog-optimizer\\backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345] using WatchFiles
INFO:     Started server process [12346]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

---

### 3단계: 포트 8000이 사용 중인지 확인

**다른 프로그램이 포트 8000을 사용 중일 수 있습니다.**

**확인 방법 (PowerShell):**

```powershell
# 포트 8000을 사용하는 프로세스 확인
netstat -ano | findstr :8000
```

**결과가 나온다면:**
- 다른 프로그램이 포트 8000을 사용 중입니다
- 해결 방법:
  1. 해당 프로세스를 종료하거나
  2. 다른 포트 사용 (예: 8001)

**다른 포트 사용하기:**

```powershell
# 포트 8001로 서버 시작
uvicorn app.main:app --reload --port 8001
```

그리고 프론트엔드 코드도 수정:
- `frontend/src/components/AIEditor.jsx`의 3번 라인:
  ```javascript
  const API_BASE_URL = 'http://127.0.0.1:8001/api';  // 8000 → 8001로 변경
  ```

---

### 4단계: 서버가 정상 작동하는지 테스트

**브라우저에서 직접 확인:**

1. 브라우저 주소창에 입력:
   ```
   http://127.0.0.1:8000/health
   ```

2. 다음과 같은 JSON이 나타나야 합니다:
   ```json
   {
     "status": "ok",
     "app": "Naver Blog Optimizer - Moonjeong Clinic",
     "version": "0.1.0"
   }
   ```

**나타나지 않는다면:**
- 서버가 제대로 시작되지 않은 것입니다
- 터미널의 오류 메시지를 확인하세요

---

### 5단계: 서버 로그 확인

**터미널에서 오류 메시지 확인:**

서버를 시작할 때 다음과 같은 오류가 나타날 수 있습니다:

**오류 1: 모듈을 찾을 수 없음**
```
ModuleNotFoundError: No module named 'app'
```
**해결:** `backend` 폴더에서 실행했는지 확인

**오류 2: 포트가 이미 사용 중**
```
ERROR:    [Errno 48] Address already in use
```
**해결:** 포트 8000을 사용하는 프로세스 종료 또는 다른 포트 사용

**오류 3: 가상환경이 활성화되지 않음**
```
ModuleNotFoundError: No module named 'fastapi'
```
**해결:** 가상환경 활성화 확인

---

## 🔄 자주 발생하는 상황

### 상황 1: 서버를 시작했는데도 연결 거부

**가능한 원인:**
- 서버가 시작 중입니다 (몇 초 기다려보세요)
- 서버가 오류로 즉시 종료되었습니다

**해결:**
1. 터미널의 오류 메시지 확인
2. 서버가 완전히 시작될 때까지 5-10초 대기
3. `http://127.0.0.1:8000/health`로 직접 테스트

---

### 상황 2: 가끔 연결이 안 될 때

**가능한 원인:**
- 서버가 `--reload` 모드로 실행 중일 때 파일 변경으로 재시작 중
- 서버가 일시적으로 응답하지 않음

**해결:**
1. 몇 초 기다렸다가 다시 시도
2. 서버 터미널에서 재시작 메시지 확인:
   ```
   INFO:     Detected file change in 'app/api/ai.py'. Reloading...
   INFO:     Shutting down
   INFO:     Waiting for application shutdown.
   INFO:     Application shutdown complete.
   INFO:     Finished server process [12346]
   INFO:     Started server process [12347]
   ```

---

### 상황 3: 서버가 계속 종료됨

**가능한 원인:**
- 코드에 오류가 있어서 서버가 시작하자마자 종료
- 환경 변수(.env) 문제

**해결:**
1. 터미널의 오류 메시지 전체 확인
2. `.env` 파일이 올바른지 확인
3. 코드 문법 오류 확인

---

## 🛠️ 빠른 해결 체크리스트

문제가 발생했을 때 다음을 순서대로 확인하세요:

- [ ] 백엔드 서버가 실행 중인가?
- [ ] 터미널에 오류 메시지가 있는가?
- [ ] `http://127.0.0.1:8000/health`가 작동하는가?
- [ ] 포트 8000이 다른 프로그램에 의해 사용 중인가?
- [ ] 가상환경이 활성화되어 있는가?
- [ ] `.env` 파일이 올바른가?
- [ ] 최근에 코드를 수정했는가? (오류가 있을 수 있음)

---

## 💡 예방 방법

### 1. 서버를 항상 실행 상태로 유지

개발 중에는 백엔드 서버를 항상 실행 상태로 두세요.

### 2. 두 개의 터미널 사용

- **터미널 1:** 백엔드 서버 실행
- **터미널 2:** 프론트엔드 실행

### 3. 서버 상태 확인 스크립트 만들기

간단한 배치 파일을 만들어서 서버를 쉽게 시작할 수 있습니다:

**`backend/start-server.bat` (Windows):**
```batch
@echo off
cd /d %~dp0
call .venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000
pause
```

사용 방법:
- `start-server.bat` 파일을 더블클릭하면 서버가 시작됩니다

---

## 🆘 여전히 해결되지 않는다면

1. **서버 터미널의 전체 오류 메시지를 복사해서 확인**
2. **브라우저 개발자 도구(F12) → Console 탭에서 오류 확인**
3. **서버와 프론트엔드를 모두 재시작**

---

## 📝 요약

**가장 흔한 원인:**
- 백엔드 서버가 실행되지 않음

**가장 빠른 해결:**
1. `backend` 폴더로 이동
2. 가상환경 활성화
3. `uvicorn app.main:app --reload --port 8000` 실행
4. `http://127.0.0.1:8000/health`로 테스트

**"가끔" 연결이 안 될 때:**
- 서버가 재시작 중일 수 있음 (몇 초 기다리기)
- 파일 변경으로 인한 자동 재시작 대기

