# Gemini NanoBanana 이미지 생성 설정 (간단 버전)

## ✅ 좋은 소식!

**엔드포인트를 찾을 필요가 없습니다!**

코드를 수정해서 `google-generativeai` 라이브러리를 직접 사용하도록 변경했습니다.
이제 복잡한 REST API 엔드포인트를 찾을 필요 없이 바로 사용할 수 있습니다.

---

## 📦 필요한 패키지 설치

터미널에서 다음 명령어 실행:

```bash
cd backend
pip install Pillow
```

또는 `requirements.txt`에 이미 추가되어 있으니:

```bash
cd backend
pip install -r requirements.txt
```

---

## 🔧 코드 변경 사항

### 변경 전 (복잡함)
- REST API 엔드포인트를 직접 찾아야 함
- 복잡한 HTTP 요청 코드
- 엔드포인트 주소를 수정해야 할 수도 있음

### 변경 후 (간단함) ✅
- `google-generativeai` 라이브러리 직접 사용
- 엔드포인트 찾을 필요 없음
- 이미 사용 중인 `GOOGLE_API_KEY` 그대로 사용

---

## 🚀 사용 방법

1. **패키지 설치 확인**
   ```bash
   pip install Pillow
   ```

2. **서버 재시작**
   - 백엔드 서버를 중지했다가 다시 시작

3. **테스트**
   - 프론트엔드에서 이미지 삽입 기능 사용
   - 우클릭 → "그림 삽입" → 설명 입력 → 생성

---

## 📝 코드 위치

`backend/app/api/ai.py` 파일의 약 960번 라인부터:

```python
# ImageGenerationModel 사용 (엔드포인트를 직접 찾을 필요 없음!)
imagen_model = genai.ImageGenerationModel("imagen-3.0-generate-001")

# 이미지 생성
result = imagen_model.generate_images(
    prompt=image_prompt,
    number_of_images=1,
    aspect_ratio="16:9"
)
```

---

## ⚙️ 모델 변경 (선택사항)

다른 모델을 사용하고 싶다면:

```python
# 현재
imagen_model = genai.ImageGenerationModel("imagen-3.0-generate-001")

# 다른 모델로 변경 (예시)
imagen_model = genai.ImageGenerationModel("imagen-3.0-generate-002")
```

사용 가능한 모델은 Google AI Studio에서 확인하세요.

---

## 🆘 문제 해결

### 오류 1: "ImageGenerationModel"을 찾을 수 없음
**해결:** `google-generativeai` 라이브러리 버전 확인
```bash
pip install --upgrade google-generativeai
```

### 오류 2: "PIL" 또는 "Pillow" 관련 오류
**해결:** Pillow 설치
```bash
pip install Pillow
```

### 오류 3: API 키 오류
**해결:** `.env` 파일에 `GOOGLE_API_KEY`가 올바르게 설정되어 있는지 확인

---

## ✅ 완료!

이제 엔드포인트를 찾을 필요 없이 바로 사용할 수 있습니다!

테스트해보시고 문제가 있으면 알려주세요.

