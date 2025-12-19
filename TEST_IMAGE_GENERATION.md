# 이미지 생성 테스트 가이드

## 현재 상태
✅ 로그 파일이 생성되었습니다: `C:\naver-blog-optimizer\backend_logs.txt`
✅ 백엔드가 실행 중입니다

## 이미지 생성 요청 테스트

### 방법 1: Swagger UI에서 테스트 (권장)

1. 브라우저에서 `http://127.0.0.1:8000/docs` 접속
2. `POST /api/ai/image` 엔드포인트 찾기
3. "Try it out" 버튼 클릭
4. Request body에 입력:
   ```json
   {
     "prompt": "손목 통증이 있는 한의사의 일러스트",
     "article_text": "",
     "context": ""
   }
   ```
5. "Execute" 버튼 클릭

### 방법 2: PowerShell에서 테스트

```powershell
$body = @{
    prompt = "손목 통증이 있는 한의사의 일러스트"
    article_text = ""
    context = ""
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/ai/image" -Method POST -Headers $headers -Body $body
    Write-Output "응답 받음:"
    Write-Output ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Output "오류 발생:"
    Write-Output $_.Exception.Message
}
```

### 방법 3: 프론트엔드에서 테스트

1. 프론트엔드가 실행 중인지 확인
2. 글쓰기 에디터에서 우클릭 → 그림 삽입 → 그림 생성해서 삽입하기
3. 프롬프트 입력 후 생성

## 로그 확인

요청을 보낸 후, 다음 명령으로 로그를 확인하세요:

```powershell
# 마지막 50줄 확인
Get-Content backend_logs.txt -Encoding UTF8 -Tail 50

# 실시간 확인 (새 로그가 추가되면 자동으로 표시)
Get-Content backend_logs.txt -Encoding UTF8 -Tail 50 -Wait
```

## 확인할 로그 내용

이미지 생성 요청이 들어오면 다음과 같은 로그가 기록되어야 합니다:

```
[2025-12-19 XX:XX:XX] ================================================================================
[2025-12-19 XX:XX:XX] [미들웨어] POST /api/ai/image
[2025-12-19 XX:XX:XX] [미들웨어] ⚠️⚠️⚠️ 이미지 생성 요청 감지! ⚠️⚠️⚠️
[2025-12-19 XX:XX:XX] [이미지 생성 API] ⚠️⚠️⚠️ 요청 수신! ⚠️⚠️⚠️
[2025-12-19 XX:XX:XX] [이미지 생성 API] 프롬프트: 손목 통증이 있는 한의사의 일러스트
[2025-12-19 XX:XX:XX] [이미지 생성 내부 함수] 시작
[2025-12-19 XX:XX:XX] [이미지 생성] Google API 키 설정 여부: 있음
[2025-12-19 XX:XX:XX] [이미지 생성] Gemini API 설정 완료
[2025-12-19 XX:XX:XX] [이미지 생성] 프롬프트 생성 시작 (타임아웃: 30초)
...
[2025-12-19 XX:XX:XX] [이미지 생성] REST API 실패: HTTP 403 (또는 다른 오류 코드)
[2025-12-19 XX:XX:XX] [이미지 생성] 오류 내용: ... (실패 시)
```

## 문제 해결

### 로그가 기록되지 않는 경우:
1. 백엔드가 재시작되었는지 확인
2. 요청이 실제로 들어왔는지 확인 (Swagger UI에서 응답 확인)
3. 백엔드 터미널에 에러 메시지가 있는지 확인

### 이미지 생성이 실패하는 경우:
- 로그에서 `[이미지 생성] REST API 실패:` 또는 `[이미지 생성] 오류 내용:` 부분을 확인
- HTTP 상태 코드와 오류 메시지를 확인하여 원인 파악

