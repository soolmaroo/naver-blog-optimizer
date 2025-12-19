# 백엔드 재시작 가이드

## 1. 기존 백엔드 종료
- 백엔드가 실행 중인 터미널에서 `Ctrl + C`를 눌러 종료

## 2. 백엔드 재시작 (Python unbuffered 모드 사용)

### PowerShell에서:
```powershell
cd backend
.venv\Scripts\activate
python -u -m uvicorn app.main:app --reload --port 8000
```

**중요**: `-u` 플래그를 사용하면 Python의 출력 버퍼링을 비활성화하여 로그가 즉시 표시됩니다.

## 3. 로그 확인 방법

### 방법 1: 터미널에서 실시간 확인
- 백엔드 터미널에서 로그가 실시간으로 출력되는지 확인

### 방법 2: 로그 파일 확인
- 프로젝트 루트 디렉토리에 `backend_logs.txt` 파일이 생성됩니다
- 이미지 생성 요청을 보낸 후 이 파일을 열어서 확인하세요
- 파일 위치: `C:\naver-blog-optimizer\backend_logs.txt`

## 4. 테스트 방법

### Swagger UI에서 테스트:
1. 브라우저에서 `http://127.0.0.1:8000/docs` 접속
2. `POST /api/ai/image` 찾기
3. "Try it out" 클릭
4. Request body 입력:
   ```json
   {
     "prompt": "손목 통증이 있는 한의사의 일러스트",
     "article_text": "",
     "context": ""
   }
   ```
5. "Execute" 클릭

### 확인 사항:
- 백엔드 터미널에 로그가 출력되는지 확인
- `backend_logs.txt` 파일에 로그가 기록되는지 확인
- 특히 다음 로그들을 찾아보세요:
  - `[미들웨어] ⚠️⚠️⚠️ 이미지 생성 요청 감지! ⚠️⚠️⚠️`
  - `[이미지 생성 API] ⚠️⚠️⚠️ 요청 수신! ⚠️⚠️⚠️`
  - `[이미지 생성] REST API 실패: HTTP ...` (실패 시)
  - `[이미지 생성] 오류 내용: ...` (실패 시)

