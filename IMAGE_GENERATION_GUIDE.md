# 이미지 생성 API 연동 가이드

## 플레이스홀더란?

**플레이스홀더(Placeholder)**는 실제 이미지 대신 임시로 보여주는 이미지입니다.

현재 코드에서는 `placehold.co` 서비스를 사용하여 다음과 같은 이미지를 생성합니다:
- 회색 배경에 텍스트가 적힌 간단한 이미지
- 실제 이미지 생성 API를 연동하기 전까지 개발/테스트용으로 사용
- 예: `https://placehold.co/800x450/46875a/ffffff?text=한의원+추나요법`

## 실제 이미지 생성 API 연동 방법

`backend/app/api/ai.py`의 `generate_image` 함수에서 실제 이미지 생성 API를 연동할 수 있습니다.

### 옵션 0: Gemini NanoBanana (유료 구독자용) ⭐

**현재 코드에 이미 구현되어 있습니다!**

**장점:**
- 이미 사용 중인 GOOGLE_API_KEY로 바로 사용 가능
- Google 생태계와 통합
- 유료 구독 시 고품질 이미지 생성

**사용 방법:**

1. **코드 확인:**
   - `backend/app/api/ai.py`의 `generate_image` 함수를 확인하세요
   - 이미 Gemini NanoBanana API 연동 코드가 포함되어 있습니다

2. **API 엔드포인트 확인:**
   - Google AI Studio에서 최신 API 엔드포인트를 확인하세요
   - 현재 코드는 `imagen-3.0-generate-001` 모델을 사용합니다
   - 실제 엔드포인트가 다를 수 있으니 Google 공식 문서를 확인하세요

3. **테스트:**
   - 프론트엔드에서 이미지 삽입 기능을 사용해보세요
   - API가 정상 작동하면 실제 이미지가 생성됩니다
   - 실패하면 플레이스홀더로 자동 폴백됩니다

**문제 해결:**

만약 API 호출이 실패한다면:
1. Google AI Studio에서 이미지 생성 기능이 활성화되어 있는지 확인
2. API 키에 이미지 생성 권한이 있는지 확인
3. 최신 API 엔드포인트와 요청 형식 확인
4. Google 공식 문서: https://ai.google.dev/docs

**현재 구현된 기능:**
- ✅ Gemini REST API를 통한 이미지 생성 시도
- ✅ 실패 시 플레이스홀더로 자동 폴백
- ✅ base64 및 URL 형식 모두 지원

---

### 옵션 1: OpenAI DALL-E

**장점:**
- 설정이 간단하고 안정적
- 고품질 이미지 생성
- 널리 사용되는 API

**설정 방법:**

1. **패키지 설치:**
```bash
pip install openai
```

2. **.env 파일에 API 키 추가:**
```
OPENAI_API_KEY=sk-...
```

3. **config.py 수정:**
```python
class Settings:
    # ... 기존 코드 ...
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
```

4. **ai.py의 generate_image 함수 수정:**
```python
import openai

# 이미지 생성 부분을 다음과 같이 수정:
openai.api_key = settings.openai_api_key
response = openai.Image.create(
    prompt=image_prompt,
    n=1,
    size="1024x1024"
)
image_url = response['data'][0]['url']
```

**비용:** 이미지당 약 $0.02-0.04

---

### 옵션 2: Stability AI

**장점:**
- 오픈소스 기반
- 다양한 모델 선택 가능

**설정 방법:**

1. **패키지 설치:**
```bash
pip install stability-sdk
```

2. **.env 파일에 API 키 추가:**
```
STABILITY_API_KEY=sk-...
```

3. **ai.py 수정:**
```python
import requests

response = requests.post(
    "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
    headers={"Authorization": f"Bearer {settings.stability_api_key}"},
    json={"text_prompts": [{"text": image_prompt}]}
)
image_data = response.json()["artifacts"][0]
# base64로 반환되므로 변환 필요
import base64
from io import BytesIO
from PIL import Image

image_bytes = base64.b64decode(image_data["base64"])
# 이미지를 저장하거나 URL로 변환
```

**비용:** 무료 티어 제공 (제한적)

---

### 옵션 3: Google Vertex AI Imagen

**장점:**
- Google 생태계와 통합
- 고품질 이미지 생성

**단점:**
- 설정이 복잡함
- Google Cloud 프로젝트 필요

**설정 방법:**

1. **패키지 설치:**
```bash
pip install google-cloud-aiplatform
```

2. **Google Cloud 설정:**
- Google Cloud 프로젝트 생성
- Vertex AI API 활성화
- 서비스 계정 생성 및 인증

3. **ai.py 수정:**
```python
from google.cloud import aiplatform
from vertexai.preview import imaging

aiplatform.init(project="your-project-id", location="us-central1")
model = imaging.ImagenModel.from_pretrained("imagegeneration@006")
response = model.generate_images(
    prompt=image_prompt,
    number_of_images=1,
    aspect_ratio="16:9"
)
image_url = response.images[0]._image_bytes  # base64 변환 필요
```

**비용:** 이미지당 약 $0.02

---

### 옵션 4: 사용자 직접 이미지 URL 입력

이미지 생성 API를 사용하지 않고, 사용자가 직접 이미지 URL을 입력하도록 할 수도 있습니다.

**프론트엔드 수정 필요:**
- 이미지 삽입 모달에 "이미지 URL 직접 입력" 옵션 추가
- URL을 받아서 바로 마크다운으로 삽입

---

## 추천 방법

**개발 단계:**
- 현재처럼 플레이스홀더 사용 (빠른 개발)

**프로덕션:**
- **OpenAI DALL-E** 추천 (설정 간단, 안정적)
- 또는 **Stability AI** (무료 티어 활용)

---

## 현재 코드 수정 예시 (DALL-E 사용)

`backend/app/api/ai.py`의 `generate_image` 함수에서:

```python
# 옵션 1: 플레이스홀더 사용 (현재)
image_url = f"https://placehold.co/800x450/46875a/ffffff?text={image_prompt.replace(' ', '+')[:50]}"

# 옵션 2: DALL-E 사용 (주석 해제하고 사용)
import openai
openai.api_key = settings.openai_api_key
try:
    response = openai.Image.create(
        prompt=image_prompt,
        n=1,
        size="1024x1024"
    )
    image_url = response['data'][0]['url']
except Exception as e:
    print(f"[이미지 생성] DALL-E 실패, 플레이스홀더 사용: {str(e)}")
    image_url = f"https://placehold.co/800x450/46875a/ffffff?text={image_prompt.replace(' ', '+')[:50]}"
```

---

## 주의사항

1. **API 비용:** 이미지 생성은 비용이 발생합니다. 사용량을 모니터링하세요.
2. **이미지 저장:** 생성된 이미지는 임시 URL일 수 있습니다. 영구 저장이 필요하면 별도 스토리지(예: S3, Cloud Storage)에 저장하세요.
3. **의료법 준수:** 생성된 이미지가 의료법을 위반하지 않도록 프롬프트를 신중하게 작성하세요.

