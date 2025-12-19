# Vertex AI 이미지 생성 설정 가이드

실제 이미지 생성을 위해 Google Vertex AI를 설정하는 방법입니다.

## 1. Google Cloud Platform (GCP) 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 ID 확인 (예: `my-project-12345`)

## 2. Vertex AI API 활성화

1. GCP Console에서 "API 및 서비스" > "라이브러리"로 이동
2. "Vertex AI API" 검색
3. "사용 설정" 클릭

## 3. 인증 설정 (두 가지 방법 중 하나 선택)

### 방법 1: gcloud CLI 사용 (권장)

```powershell
# gcloud CLI 설치 (없는 경우)
# https://cloud.google.com/sdk/docs/install

# 로그인
gcloud auth login

# 애플리케이션 기본 인증 설정
gcloud auth application-default login

# 프로젝트 설정
gcloud config set project YOUR_PROJECT_ID
```

### 방법 2: 서비스 계정 키 파일 사용

1. GCP Console에서 "IAM 및 관리자" > "서비스 계정"으로 이동
2. "서비스 계정 만들기" 클릭
3. 서비스 계정 이름 입력 (예: `imagen-service`)
4. 역할: "Vertex AI User" 선택
5. "키 만들기" > "JSON" 선택하여 키 파일 다운로드
6. 키 파일을 안전한 위치에 저장 (예: `C:\gcp\service-account-key.json`)

## 4. 환경 변수 설정

`.env` 파일에 다음 변수 추가:

```env
# 기존 변수들...
GOOGLE_API_KEY=여기에_제미나이_키_입력

# Vertex AI 설정
GCP_PROJECT_ID=your-project-id-12345
GCP_LOCATION=us-central1

# 서비스 계정 키 파일 사용하는 경우 (방법 2)
# GOOGLE_APPLICATION_CREDENTIALS=C:\gcp\service-account-key.json
```

## 5. 패키지 설치

```powershell
cd backend
.venv\Scripts\activate
pip install google-cloud-aiplatform
```

## 6. 백엔드 재시작

설정 완료 후 백엔드 서버를 재시작하세요.

## 확인 방법

1. 이미지 생성 요청 시도
2. 백엔드 로그에서 다음 메시지 확인:
   - `[이미지 생성] Vertex AI 초기화 성공`
   - `[이미지 생성] ✅ Vertex AI 성공!`

## 문제 해결

### "Vertex AI SDK가 설치되지 않았습니다"
```powershell
pip install google-cloud-aiplatform
```

### "Vertex AI 초기화 실패"
- GCP 인증 확인: `gcloud auth application-default login`
- 프로젝트 ID 확인: `.env` 파일의 `GCP_PROJECT_ID` 확인

### "Vertex AI API가 활성화되지 않았습니다"
- GCP Console에서 Vertex AI API 활성화 확인

### "권한이 없습니다"
- 서비스 계정에 "Vertex AI User" 역할이 있는지 확인

