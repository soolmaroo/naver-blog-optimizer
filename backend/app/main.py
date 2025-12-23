from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
import logging

# 로깅 설정 - 콘솔에 명확하게 출력
import sys
import io

# Windows에서 UTF-8 인코딩 설정
if sys.platform == 'win32':
    # stdout과 stderr의 인코딩을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    # io 모듈의 기본 인코딩도 설정
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)

# 강제로 stdout/stderr에 출력하는 함수
def force_print(*args, **kwargs):
    """강제로 stdout과 stderr에 출력"""
    print(*args, **kwargs, file=sys.stdout, flush=True)
    print(*args, **kwargs, file=sys.stderr, flush=True)

settings = get_settings()

app = FastAPI(
    title="Naver Blog Optimizer - Moonjeong Clinic",
    version="0.1.0",
    description="문정역 한의원을 위한 네이버 블로그 최적화 및 자동화 도구"
)

# 로그 파일 경로
from pathlib import Path
# backend/app/main.py -> backend/app -> backend -> 프로젝트 루트
LOG_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "backend_logs.txt"

def log_to_file(message: str):
    """파일과 콘솔 모두에 로그 출력"""
    from datetime import datetime
    import os
    
    # 콘솔에 먼저 출력 (인코딩 문제 없이)
    print(message, flush=True)
    sys.stdout.flush()
    sys.stderr.flush()
    
    # 파일에 쓰기 (UTF-8)
    try:
        # 로그 파일 경로 확인
        log_dir = LOG_FILE_PATH.parent
        if not log_dir.exists():
            log_dir.mkdir(parents=True, exist_ok=True)
            print(f"[로그] 디렉토리 생성: {log_dir}", flush=True)
        
        # 메시지를 UTF-8로 명시적으로 인코딩
        message_bytes = message.encode('utf-8', errors='replace')
        message_safe = message_bytes.decode('utf-8', errors='replace')
        
        # 파일 열기 (없으면 생성)
        with open(LOG_FILE_PATH, 'a', encoding='utf-8', errors='replace') as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] {message_safe}\n")
            f.flush()
            os.fsync(f.fileno())  # 디스크에 즉시 쓰기
    except PermissionError as e:
        print(f"[로그 파일 쓰기 실패 - 권한 오류] {str(e)}", flush=True)
        print(f"[로그 파일 경로] {LOG_FILE_PATH}", flush=True)
    except Exception as e:
        # 파일 로깅 실패해도 콘솔 출력은 계속
        print(f"[로그 파일 쓰기 실패] {type(e).__name__}: {str(e)}", flush=True)
        print(f"[로그 파일 경로] {LOG_FILE_PATH}", flush=True)
        import traceback
        print(f"[로그 파일 쓰기 실패 상세] {traceback.format_exc()}", flush=True)

# 요청 로깅 미들웨어 - 모든 요청을 로깅
# 주의: 미들웨어는 CORS 미들웨어보다 먼저 등록되어야 함
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # 미들웨어 호출 확인용 로그 (즉시 출력)
    import sys
    import time
    print(f"\n{'='*80}", flush=True)
    print(f"[미들웨어 호출 확인] {request.method} {request.url.path}", flush=True)
    print(f"[미들웨어 호출 확인] 클라이언트: {request.client.host if request.client else 'Unknown'}", flush=True)
    sys.stdout.flush()
    sys.stderr.flush()
    
    # 모든 요청을 강제로 출력 (stdout과 stderr 모두)
    start_time = time.time()
    request_path = str(request.url.path)
    request_method = request.method
    
    # 파일과 콘솔 모두에 로그 출력
    log_to_file("\n" + "=" * 80)
    log_to_file(f"[미들웨어] {request_method} {request_path}")
    log_to_file(f"[미들웨어] 클라이언트: {request.client.host if request.client else 'Unknown'}")
    log_to_file(f"[미들웨어] 쿼리: {str(request.url.query)}")
    log_to_file("=" * 80)
    
    logger.info(f"[요청] {request_method} {request_path}")
    
    if "/api/ai/image" in request_path:
        log_to_file("\n" + "!" * 80)
        log_to_file("[미들웨어] [경고] 이미지 생성 요청 감지!")
        log_to_file(f"[미들웨어] 경로: {request_path}")
        log_to_file(f"[미들웨어] 클라이언트: {request.client.host if request.client else 'Unknown'}")
        log_to_file("!" * 80 + "\n")
        logger.info(f"[이미지 생성 요청] 경로: {request_path}")
        logger.info(f"[이미지 생성 요청] 클라이언트: {request.client.host if request.client else 'Unknown'}")
    
    try:
        response = await call_next(request)
        elapsed = time.time() - start_time
        log_to_file(f"[미들웨어] 응답: {request_method} {request_path} - {response.status_code} ({elapsed:.2f}초)")
        logger.info(f"[응답] {request_method} {request_path} - {response.status_code}")
        return response
    except Exception as e:
        elapsed = time.time() - start_time
        log_to_file(f"[미들웨어] 오류 발생: {str(e)} ({elapsed:.2f}초)")
        logger.error(f"[미들웨어] 오류: {str(e)}")
        raise

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",  # 추가 포트 지원
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 임포트
from app.api import keywords, ai, auth

app.include_router(keywords.router, prefix="/api", tags=["keywords"])
app.include_router(ai.router, prefix="/api", tags=["ai"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/", tags=["system"])
async def root():
    """루트 경로 - API 정보 반환"""
    return {
        "message": "Naver Blog Optimizer API",
        "app": app.title,
        "version": app.version,
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["system"])
async def health():
    log_to_file("[시스템] Health check 요청 수신")
    return {
        "status": "ok",
        "app": app.title,
        "version": app.version
    }

@app.get("/api/routes", tags=["system"])
async def get_routes():
    """등록된 모든 라우트 목록 반환"""
    routes = []
    for route in app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods) if route.methods else [],
                "name": getattr(route, "name", "unknown")
            })
    return {
        "routes": routes,
        "total": len(routes)
    }

# 앱 시작 시 로그 기록
@app.on_event("startup")
async def startup_event():
    log_to_file("=" * 80)
    log_to_file("[시스템] 백엔드 서버 시작")
    log_to_file(f"[시스템] 로그 파일 경로: {LOG_FILE_PATH}")
    log_to_file(f"[시스템] 로그 파일 존재 여부: {LOG_FILE_PATH.exists()}")
    log_to_file(f"[시스템] 미들웨어 등록 확인: {len(app.user_middleware)}개 미들웨어 등록됨")
    for i, middleware in enumerate(app.user_middleware):
        log_to_file(f"[시스템] 미들웨어 {i+1}: {middleware}")
    log_to_file("=" * 80)
    # 콘솔에도 강제 출력
    print("\n" + "=" * 80, flush=True)
    print("[시스템] 백엔드 서버 시작 완료", flush=True)
    print(f"[시스템] 미들웨어 개수: {len(app.user_middleware)}", flush=True)
    print("=" * 80 + "\n", flush=True)
