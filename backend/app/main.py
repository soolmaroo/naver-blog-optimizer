from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Naver Blog Optimizer - Moonjeong Clinic",
    version="0.1.0",
    description="문정역 한의원을 위한 네이버 블로그 최적화 및 자동화 도구"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 임포트
from app.api import keywords, ai, auth

app.include_router(keywords.router, prefix="/api", tags=["keywords"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/health", tags=["system"])
async def health():
    return {
        "status": "ok",
        "app": app.title,
        "version": app.version
    }
