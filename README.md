# 네이버 블로그 최적화 및 자동화 웹 애플리케이션

문정동 한의원을 위한 네이버 블로그 최적화 및 자동화 도구입니다.

## 주요 기능

- **추천 키워드**: 지역 및 날씨 기반 키워드 추천 (검색량 순위)
- **키워드 분석기**: 키워드의 검색량, 블로그 발행량, 경쟁 강도 분석
- **관련 키워드**: 입력한 키워드와 관련된 키워드 검색
- **AI 글쓰기 에디터**: Gemini API를 활용한 블로그 초안 생성 및 퇴고
- **블로그 어투 학습**: 개인적인 글쓰기 스타일 학습 기능
- **의료법 위반 단어 검사**: 의료법을 준수하는 콘텐츠 작성 지원

## 기술 스택

### Frontend
- React 18
- Vite
- Tailwind CSS

### Backend
- Python 3.12+
- FastAPI
- Google Gemini API
- Naver Search API
- Naver Data Lab API

## 설치 및 실행 방법

### 사전 요구사항

- Python 3.12 이상
- Node.js 18 이상
- 네이버 API 키 (Search API, Data Lab API)
- Google Gemini API 키

### Windows 환경

#### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd naver-blog-optimizer
```

#### 2. Backend 설정
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. Frontend 설정
```bash
cd frontend
npm install
```

#### 4. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:
```
NAVER_CLIENT_ID=여기에_키_입력
NAVER_CLIENT_SECRET=여기에_시크릿_입력
GOOGLE_API_KEY=여기에_제미나이_키_입력
NAVER_REDIRECT_URI=http://localhost:5173/auth/naver/callback
```

#### 5. 서버 실행
```bash
# Backend (터미널 1)
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Frontend (터미널 2)
cd frontend
npm run dev
```

### Mac 환경

#### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd naver-blog-optimizer
```

#### 2. Backend 설정
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### 3. Frontend 설정
```bash
cd frontend
npm install
```

#### 4. 환경 변수 설정
프로젝트 루트에 `.env` 파일 생성:
```
NAVER_CLIENT_ID=여기에_키_입력
NAVER_CLIENT_SECRET=여기에_시크릿_입력
GOOGLE_API_KEY=여기에_제미나이_키_입력
NAVER_REDIRECT_URI=http://localhost:5173/auth/naver/callback
```

#### 5. 서버 실행
```bash
# Backend (터미널 1)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (터미널 2)
cd frontend
npm run dev
```

## 프로젝트 구조

```
naver-blog-optimizer/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai.py          # AI 글쓰기, 학습 기능
│   │   │   ├── auth.py         # 네이버 로그인
│   │   │   └── keywords.py     # 키워드 추천, 분석
│   │   ├── core/
│   │   │   └── config.py       # 설정 관리
│   │   └── main.py             # FastAPI 앱 진입점
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIEditor.jsx
│   │   │   ├── KeywordAnalyzer.jsx
│   │   │   ├── KeywordSuggestions.jsx
│   │   │   ├── NaverCallback.jsx
│   │   │   └── RelatedKeywords.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── .env                        # 환경 변수 (git에 포함하지 않음)
├── .gitignore
└── README.md
```

## 주요 기능 설명

### 1. 추천 키워드
- 지역 키워드를 입력하면 해당 지역 기반 키워드 추천
- 검색량과 블로그 발행량을 실시간으로 조회
- 실제 데이터와 추정값을 구분하여 표시
- 매일 오전 9시 자동 업데이트

### 2. 키워드 분석기
- 특정 키워드의 검색량, 블로그 발행량, 경쟁 강도 분석
- 데이터 소스 및 검증 상태 표시

### 3. AI 글쓰기 에디터
- 4가지 글쓰기 스타일 지원 (일기, 블로그, 에세이, 개인)
- 블로그 어투 학습 기능
- 퇴고 기능 (초안 수정)
- 의료법 위반 단어 자동 검사

### 4. 블로그 어투 학습
- 블로그 URL 또는 텍스트를 입력하여 개인적인 글쓰기 스타일 학습
- 학습된 어투는 "종성이가 씀 !" 스타일에서 자동 반영

## API 엔드포인트

### 키워드
- `GET /api/keywords/suggestions?region={region}` - 키워드 추천
- `POST /api/keywords/analyze` - 키워드 분석
- `POST /api/keywords/related` - 관련 키워드 검색

### AI
- `POST /api/ai/draft` - 초안 생성
- `POST /api/ai/revise` - 초안 퇴고
- `POST /api/ai/learn` - 어투 학습
- `GET /api/ai/learning-status` - 학습 상태 조회
- `POST /api/ai/check-violations` - 위반 단어 검사

### 인증
- `GET /api/auth/naver/login` - 네이버 로그인
- `GET /api/auth/naver/callback` - 네이버 로그인 콜백

## 문제 해결

### Backend 서버가 시작되지 않을 때
1. `.env` 파일이 프로젝트 루트에 있는지 확인
2. API 키가 올바르게 설정되었는지 확인
3. 가상환경이 활성화되었는지 확인

### Frontend가 연결되지 않을 때
1. Backend 서버가 `http://127.0.0.1:8000`에서 실행 중인지 확인
2. 브라우저 콘솔에서 CORS 오류 확인

### API 호출 실패
1. 네이버 API 키가 올바른지 확인
2. API 사용량 제한 확인
3. 네트워크 연결 확인

## 라이선스

개인 사용 목적

## 작성자

문정동 한의원
