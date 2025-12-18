# Gemini NanoBanana API 설정 가이드 (초보자용)

## 📚 용어 설명

### 엔드포인트(Endpoint)란?

**엔드포인트**는 쉽게 말해 "API 서버의 주소"입니다.

예를 들어:
- 집 주소: "서울시 강남구 테헤란로 123"
- API 엔드포인트: "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"

**왜 필요한가요?**
- 우리가 이미지를 생성하려면 Google 서버에 "이미지 만들어줘!"라고 요청을 보내야 합니다
- 엔드포인트는 그 요청을 보낼 정확한 주소입니다
- 주소가 틀리면 요청이 실패합니다

---

## 🔍 1단계: Google AI Studio에서 엔드포인트 확인하기

### 방법 1: Google AI Studio 웹사이트에서 확인

1. **Google AI Studio 접속**
   - 브라우저에서 https://aistudio.google.com 접속
   - Google 계정으로 로그인 (유료 구독 계정)

2. **API 문서 찾기**
   - 상단 메뉴에서 "문서" 또는 "Documentation" 클릭
   - 또는 "API Reference" 클릭

3. **이미지 생성 API 찾기**
   - 검색창에 "image generation" 또는 "imagen" 입력
   - 또는 "Image Generation API" 섹션 찾기

4. **엔드포인트 주소 복사**
   - 문서에서 다음과 같은 형식의 주소를 찾습니다:
     ```
     POST https://generativelanguage.googleapis.com/v1beta/models/[모델명]:generateImages
     ```
   - 이 주소 전체를 복사하세요

### 방법 2: Google 공식 문서에서 확인

1. **Google AI 문서 접속**
   - https://ai.google.dev/docs 접속

2. **이미지 생성 섹션 찾기**
   - 왼쪽 메뉴에서 "Image Generation" 또는 "Imagen" 찾기
   - 클릭하여 상세 페이지 열기

3. **REST API 엔드포인트 확인**
   - "REST API" 또는 "API Reference" 섹션 찾기
   - 엔드포인트 URL 확인

---

## 📝 2단계: 현재 코드에서 엔드포인트 위치 찾기

### 파일 열기

1. **파일 탐색기에서 파일 찾기**
   - `backend/app/api/ai.py` 파일 열기
   - 또는 VS Code에서 `Ctrl+P` → `ai.py` 입력

2. **976번 라인 근처 찾기**
   - `Ctrl+G`를 눌러 라인 번호로 이동
   - 976 입력 후 Enter

3. **api_url 찾기**
   - 다음과 같은 코드를 찾으세요:
   ```python
   api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"
   ```

---

## ✏️ 3단계: 엔드포인트 수정하기

### 수정 전 코드 (예시)

```python
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"
```

### 수정 방법

**시나리오 1: 모델명만 다른 경우**

Google 문서에서 확인한 모델명이 `imagen-3.5-generate-002`라면:

```python
# 수정 전
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"

# 수정 후
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.5-generate-002:generateImages"
```

**시나리오 2: 전체 주소가 다른 경우**

Google 문서에서 확인한 주소가 완전히 다르다면:

```python
# 예시: 문서에서 확인한 주소
# POST https://ai.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/imagen-3:generateImages

# 수정 후
api_url = "https://ai.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/imagen-3:generateImages"
```

**시나리오 3: 경로가 다른 경우**

```python
# 수정 전
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"

# 수정 후 (예시)
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generate"
# 또는
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:createImage"
```

---

## 🔧 4단계: 실제 수정 예시

### 현재 코드 위치 확인

`backend/app/api/ai.py` 파일의 약 976번 라인:

```python
# 방법 1: Gemini REST API를 통한 이미지 생성 시도 (NanoBanana)
try:
    print(f"[이미지 생성] Gemini API로 이미지 생성 시도: {image_prompt[:50]}...")
    
    # Gemini API 엔드포인트 (이미지 생성)
    # 참고: 실제 엔드포인트는 Google AI Studio 문서를 확인하세요
    api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"  # 👈 이 부분!
    
    headers = {
        "Content-Type": "application/json",
    }
```

### 수정 예시

**예시 1: 모델 버전만 업데이트**

```python
# 수정 전
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"

# 수정 후 (모델이 3.5로 업데이트된 경우)
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.5-generate-001:generateImages"
```

**예시 2: 전체 주소 변경**

```python
# 수정 전
api_url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"

# 수정 후 (Google 문서에서 확인한 새로운 주소)
api_url = "https://ai.googleapis.com/v1/projects/my-project/locations/us-central1/publishers/google/models/imagen-3:generateImages"
```

---

## ✅ 5단계: 수정 후 확인하기

### 1. 파일 저장
   - `Ctrl+S`로 파일 저장

### 2. 서버 재시작
   - 백엔드 서버를 중지했다가 다시 시작
   - 터미널에서 `Ctrl+C`로 중지 후 다시 실행

### 3. 테스트
   - 프론트엔드에서 이미지 삽입 기능 사용
   - 브라우저 개발자 도구(F12) → Console 탭에서 오류 확인
   - 백엔드 터미널에서 로그 확인

### 4. 오류 확인

**성공한 경우:**
```
[이미지 생성] Gemini API 성공 (base64)
또는
[이미지 생성] Gemini API 성공 (URL)
```

**실패한 경우:**
```
[이미지 생성] Gemini API 오류: 404 - Not Found
또는
[이미지 생성] Gemini API 오류: 403 - Forbidden
```

---

## 🆘 문제 해결

### 오류 1: 404 Not Found
**의미:** 엔드포인트 주소가 잘못되었습니다
**해결:** Google 문서에서 정확한 엔드포인트 확인 후 수정

### 오류 2: 403 Forbidden
**의미:** API 키에 권한이 없거나 잘못되었습니다
**해결:** Google AI Studio에서 API 키 권한 확인

### 오류 3: 400 Bad Request
**의미:** 요청 형식이 잘못되었습니다
**해결:** Google 문서에서 요청 형식(payload) 확인

---

## 📋 체크리스트

수정 전에 확인할 사항:
- [ ] Google AI Studio에 로그인되어 있음
- [ ] 이미지 생성 API 문서를 찾았음
- [ ] 엔드포인트 주소를 복사했음
- [ ] `backend/app/api/ai.py` 파일을 열었음
- [ ] 976번 라인 근처의 `api_url`을 찾았음
- [ ] 주소를 수정했음
- [ ] 파일을 저장했음
- [ ] 서버를 재시작했음

---

## 💡 팁

1. **엔드포인트는 정확히 복사하세요**
   - 공백이나 특수문자 하나라도 틀리면 작동하지 않습니다
   - 따옴표(`"`) 안에 정확히 넣어야 합니다

2. **모델명 확인**
   - `imagen-3.0-generate-001` 부분이 모델명입니다
   - Google에서 새로운 모델을 출시하면 이 부분이 바뀔 수 있습니다

3. **버전 확인**
   - `v1beta`는 API 버전입니다
   - Google이 API를 업데이트하면 `v1` 또는 `v2`로 바뀔 수 있습니다

4. **테스트는 작은 것부터**
   - 먼저 간단한 프롬프트로 테스트하세요
   - 성공하면 복잡한 프롬프트로 시도하세요

---

## 📞 추가 도움

여전히 문제가 있다면:
1. Google AI Studio 고객 지원 문의
2. Google AI 문서의 예제 코드 확인
3. 백엔드 터미널의 오류 메시지 확인

