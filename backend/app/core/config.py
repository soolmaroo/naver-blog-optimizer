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

# .env 파일 로드
load_dotenv(dotenv_path=env_path, override=True)

# 환경 변수 확인 (디버깅용)
google_key = os.getenv("GOOGLE_API_KEY", "")
print(f"[Config] GOOGLE_API_KEY 로드 여부: {'있음' if google_key else '없음'}")
if google_key:
    print(f"[Config] GOOGLE_API_KEY 길이: {len(google_key)} (처음 10자: {google_key[:10]}...)")
else:
    print("[Config] GOOGLE_API_KEY가 비어있습니다!")


class Settings:
    naver_client_id: str = os.getenv("NAVER_CLIENT_ID", "")
    naver_client_secret: str = os.getenv("NAVER_CLIENT_SECRET", "")
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    
    def __init__(self):
        # 초기화 시 로깅
        if not self.google_api_key:
            print("[Settings] 경고: GOOGLE_API_KEY가 설정되지 않았습니다!")


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
    
    _settings_cache = settings
    return settings

