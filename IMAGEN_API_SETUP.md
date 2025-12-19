# Google Imagen API 설정 가이드

## 현재 상황
현재 코드는 `google-generativeai` 라이브러리의 `ImageGenerationModel`을 사용하려고 시도하고 있지만, 이 기능이 실제로 작동하는지 확인이 필요합니다.

## 방법 1: Vertex AI Imagen 사용 (권장)

### 1. Google Cloud 프로젝트 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **결제 계정 연결** (Imagen API는 유료 서비스)

### 2. Vertex AI API 활성화
1. Cloud Console에서 "API 및 서비스" > "라이브러리"로 이동
2. "Vertex AI API" 검색 후 활성화
3. "Imagen API" 검색 후 활성화

### 3. 서비스 계정 생성 및 인증
```bash
# Google Cloud SDK 설치 (이미 설치되어 있다면 생략)
# macOS: brew install google-cloud-sdk

# 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID

# 서비스 계정 생성
gcloud iam service-accounts create imagen-service \
    --display-name="Imagen API Service Account"

# 서비스 계정에 권한 부여
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:imagen-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# 키 파일 생성
gcloud iam service-accounts keys create ~/imagen-key.json \
    --iam-account=imagen-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. 환경 변수 설정
`.env` 파일에 추가:
```
GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=/Users/parkjongseong/imagen-key.json
```

### 5. Python 패키지 설치
```bash
cd backend
source .venv/bin/activate
pip install google-cloud-aiplatform
```

### 6. 코드 수정
`backend/app/api/ai.py`의 이미지 생성 부분을 Vertex AI로 변경

---

## 방법 2: REST API 직접 호출 (간단)

Google의 Imagen API를 REST API로 직접 호출하는 방법입니다.

### 1. API 키 확인
현재 사용 중인 `GOOGLE_API_KEY`가 Imagen API 접근 권한이 있는지 확인

### 2. REST API 엔드포인트 사용
```python
import httpx
import base64

async def generate_image_via_rest(prompt: str):
    url = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.google_api_key
    }
    payload = {
        "prompt": prompt,
        "number_of_images": 1,
        "aspect_ratio": "16:9"
    }
    
    async with httpx.AsyncClient(timeout=240.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        # 응답 처리...
```

---

## 방법 3: 대안 이미지 생성 서비스 사용

### 옵션 A: OpenAI DALL-E
- API 키만 필요 (더 간단)
- `openai` 패키지 설치 필요
- 유료 (이미지당 $0.04)

### 옵션 B: Stability AI (Stable Diffusion)
- API 키 필요
- `stability-sdk` 패키지 설치
- 무료 티어 제공

### 옵션 C: 플레이스홀더 이미지 (현재 폴백)
- 무료
- 실제 이미지 생성 없음
- 빠른 응답

---

## 추천 방법

**현재 상황에서는:**
1. 먼저 현재 `ImageGenerationModel`이 작동하는지 테스트
2. 작동하지 않으면 **방법 2 (REST API)** 시도 (가장 간단)
3. 그것도 안 되면 **방법 3-A (DALL-E)** 고려 (설정이 가장 쉬움)

**장기적으로는:**
- Vertex AI Imagen (방법 1)이 가장 안정적이지만 설정이 복잡함

---

## 테스트 방법

현재 코드가 작동하는지 확인:
```bash
# 백엔드 서버 실행 후
# 프론트엔드에서 이미지 생성 요청
# 백엔드 터미널 로그 확인
```

로그에서 다음을 확인:
- `[이미지 생성] ImageGenerationModel 성공!` → 작동함
- `[이미지 생성] ImageGenerationModel 오류: ...` → 작동하지 않음, 다른 방법 필요

