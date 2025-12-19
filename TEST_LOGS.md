# 로그 파일 테스트 가이드

## 1. 백엔드 재시작 (필수!)

현재 백엔드가 실행 중이지만, 새로운 로깅 코드가 적용되려면 **반드시 재시작**해야 합니다.

### 재시작 방법:
1. 백엔드가 실행 중인 터미널에서 `Ctrl + C`를 눌러 종료
2. 다음 명령으로 재시작:

```powershell
cd backend
.venv\Scripts\activate
python -u -m uvicorn app.main:app --reload --port 8000
```

**중요**: `-u` 플래그를 사용하면 출력 버퍼링이 비활성화되어 로그가 즉시 표시됩니다.

## 2. 로그 파일 확인 방법

### 방법 1: PowerShell에서 실시간 확인
```powershell
# 파일이 생성될 때까지 대기하면서 확인
while (-not (Test-Path backend_logs.txt)) {
    Start-Sleep -Seconds 1
    Write-Output "로그 파일 대기 중..."
}
Write-Output "로그 파일 생성됨!"
Get-Content backend_logs.txt -Encoding UTF8 -Tail 50 -Wait
```

### 방법 2: VS Code에서 확인
- VS Code에서 `backend_logs.txt` 파일을 열기
- 파일이 없으면 백엔드가 재시작되고 요청이 들어온 후 생성됩니다

### 방법 3: 간단한 확인
```powershell
# 파일 존재 여부 확인
Test-Path backend_logs.txt

# 파일이 있으면 마지막 20줄 보기
if (Test-Path backend_logs.txt) {
    Get-Content backend_logs.txt -Encoding UTF8 -Tail 20
}
```

## 3. 테스트 요청 보내기

### Swagger UI에서:
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

### PowerShell에서:
```powershell
$body = @{
    prompt = "손목 통증이 있는 한의사의 일러스트"
    article_text = ""
    context = ""
} | ConvertTo-Json -Compress

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/ai/image" -Method POST -Headers $headers -Body $body
    Write-Output "응답: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Output "오류: $_"
}
```

## 4. 확인할 로그

로그 파일에 다음 내용이 나타나야 합니다:

```
[2025-12-19 XX:XX:XX] ================================================================================
[2025-12-19 XX:XX:XX] [미들웨어] POST /api/ai/image
[2025-12-19 XX:XX:XX] [미들웨어] ⚠️⚠️⚠️ 이미지 생성 요청 감지! ⚠️⚠️⚠️
[2025-12-19 XX:XX:XX] [이미지 생성 API] ⚠️⚠️⚠️ 요청 수신! ⚠️⚠️⚠️
[2025-12-19 XX:XX:XX] [이미지 생성] Google API 키 설정 여부: ...
[2025-12-19 XX:XX:XX] [이미지 생성] REST API 실패: HTTP ... (실패 시)
[2025-12-19 XX:XX:XX] [이미지 생성] 오류 내용: ... (실패 시)
```

## 5. 문제 해결

### 로그 파일이 생성되지 않는 경우:
1. 백엔드가 재시작되었는지 확인
2. 요청이 실제로 들어왔는지 확인 (Swagger UI 또는 브라우저 개발자 도구)
3. 백엔드 터미널에 에러 메시지가 있는지 확인

### 한글이 깨지는 경우:
- VS Code에서 파일을 열면 자동으로 UTF-8로 인식됩니다
- PowerShell에서는 `-Encoding UTF8` 옵션을 사용하세요

