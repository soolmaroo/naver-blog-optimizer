import os
from pathlib import Path
from functools import lru_cache
from dotenv import load_dotenv

# 프로젝트 루트의 .env 파일 로드
# backend/app/core/config.py -> backend/app/core -> backend/app -> backend -> 프로젝트 루트
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
env_path = BASE_DIR / ".env"
print(f"[Config] .env 파일 경로: {env_path}")
print(f"[Config] .env 파일 존재 여부: {env_path.exists()}")

# .env 파일 로드 (에러 처리 강화)
try:
    load_dotenv(dotenv_path=env_path, override=True, encoding='utf-8')
except Exception as e:
    print(f"[Config] .env 파일 로드 중 오류 발생: {str(e)}")
    print(f"[Config] .env 파일을 확인하고 수정하세요.")
    # 계속 진행 (환경 변수는 이미 설정되어 있을 수 있음)

# 환경 변수 확인 (디버깅용)
google_key = os.getenv("GOOGLE_API_KEY", "")
naver_id = os.getenv("NAVER_CLIENT_ID", "")
naver_secret = os.getenv("NAVER_CLIENT_SECRET", "")
print(f"[Config] GOOGLE_API_KEY 로드 여부: {'있음' if google_key else '없음'}")
if google_key:
    print(f"[Config] GOOGLE_API_KEY 길이: {len(google_key)} (처음 10자: {google_key[:10]}...)")
else:
    print("[Config] GOOGLE_API_KEY가 비어있습니다!")
print(f"[Config] NAVER_CLIENT_ID 로드 여부: {'있음' if naver_id else '없음'}")
if naver_id:
    print(f"[Config] NAVER_CLIENT_ID 길이: {len(naver_id)} (처음 10자: {naver_id[:10]}...)")
print(f"[Config] NAVER_CLIENT_SECRET 로드 여부: {'있음' if naver_secret else '없음'}")
if naver_secret:
    print(f"[Config] NAVER_CLIENT_SECRET 길이: {len(naver_secret)} (처음 10자: {naver_secret[:10]}...)")


class Settings:
    naver_client_id: str = os.getenv("NAVER_CLIENT_ID", "")
    naver_client_secret: str = os.getenv("NAVER_CLIENT_SECRET", "")
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    # Vertex AI 설정 (선택사항 - 설정되면 실제 이미지 생성 사용)
    gcp_project_id: str = os.getenv("GCP_PROJECT_ID", "")
    gcp_location: str = os.getenv("GCP_LOCATION", "us-central1")
    gcp_credentials_path: str = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
    
    def __init__(self):
        # 초기화 시 로깅
        if not self.google_api_key:
            print("[Settings] 경고: GOOGLE_API_KEY가 설정되지 않았습니다!")
        if not self.naver_client_id:
            print("[Settings] 경고: NAVER_CLIENT_ID가 설정되지 않았습니다!")
        if not self.naver_client_secret:
            print("[Settings] 경고: NAVER_CLIENT_SECRET가 설정되지 않았습니다!")
        # Vertex AI 설정 확인
        if self.gcp_project_id:
            print(f"[Settings] GCP_PROJECT_ID: {self.gcp_project_id}")
            print(f"[Settings] GCP_LOCATION: {self.gcp_location}")
            if self.gcp_credentials_path:
                print(f"[Settings] GOOGLE_APPLICATION_CREDENTIALS: {self.gcp_credentials_path}")
            else:
                print("[Settings] 참고: GOOGLE_APPLICATION_CREDENTIALS가 설정되지 않았습니다. gcloud auth를 사용하거나 서비스 계정 키를 설정하세요.")
        else:
            print("[Settings] 참고: GCP_PROJECT_ID가 설정되지 않았습니다. Vertex AI를 사용하려면 설정하세요.")


_settings_cache = None

def get_settings() -> Settings:
    """설정을 가져옵니다. .env 파일이 변경되면 캐시를 무효화합니다."""
    global _settings_cache
    
    # 환경 변수를 다시 로드 (최신 값 확인)
    load_dotenv(dotenv_path=env_path, override=True)
    
    # 캐시가 없거나 환경 변수가 변경되었을 수 있으므로 항상 새로 생성
    settings = Settings()
    print(f"[get_settings] google_api_key 설정 여부: {'있음' if settings.google_api_key else '없음'}")
    if settings.google_api_key:
        print(f"[get_settings] google_api_key 값: {settings.google_api_key[:10]}...")
    print(f"[get_settings] naver_client_id 설정 여부: {'있음' if settings.naver_client_id else '없음'}")
    if settings.naver_client_id:
        print(f"[get_settings] naver_client_id 값: {settings.naver_client_id[:10]}...")
    print(f"[get_settings] naver_client_secret 설정 여부: {'있음' if settings.naver_client_secret else '없음'}")
    
    _settings_cache = settings
    return settings

