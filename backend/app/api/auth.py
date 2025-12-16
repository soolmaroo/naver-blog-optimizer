from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from typing import Optional
from app.core.config import get_settings
import httpx
import os
from urllib.parse import quote

router = APIRouter()
settings = get_settings()


@router.get("/naver/login")
async def naver_login():
    """
    네이버 OAuth 로그인 URL 생성
    """
    if not settings.naver_client_id:
        raise HTTPException(
            status_code=501,
            detail="네이버 클라이언트 ID가 설정되지 않았습니다. .env 파일에 NAVER_CLIENT_ID를 추가해주세요."
        )
    
    redirect_uri = os.getenv("NAVER_REDIRECT_URI", "http://localhost:5173/auth/naver/callback")
    state = "naver_state_12345"  # 실제로는 세션 기반 랜덤 값 사용
    
    # URL 인코딩
    encoded_redirect_uri = quote(redirect_uri, safe='')
    
    auth_url = (
        "https://nid.naver.com/oauth2.0/authorize"
        f"?response_type=code"
        f"&client_id={settings.naver_client_id}"
        f"&redirect_uri={encoded_redirect_uri}"
        f"&state={state}"
    )
    
    return {"auth_url": auth_url}


@router.get("/naver/callback")
async def naver_callback(code: str, state: Optional[str] = None):
    """
    네이버 OAuth 콜백 처리
    """
    if not settings.naver_client_id or not settings.naver_client_secret:
        raise HTTPException(
            status_code=501,
            detail="네이버 OAuth 설정이 완료되지 않았습니다."
        )
    
    redirect_uri = os.getenv("NAVER_REDIRECT_URI", "http://localhost:5173/auth/naver/callback")
    
    try:
        # 액세스 토큰 요청
        async with httpx.AsyncClient() as client:
            token_url = "https://nid.naver.com/oauth2.0/token"
            params = {
                "grant_type": "authorization_code",
                "client_id": settings.naver_client_id,
                "client_secret": settings.naver_client_secret,
                "code": code,
                "state": state
            }
            
            response = await client.post(token_url, params=params)
            
            if response.status_code != 200:
                error_text = response.text
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"네이버 토큰 요청 실패: {error_text}"
                )
            
            token_data = response.json()
            
            # 에러 응답 체크
            if "error" in token_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"네이버 인증 오류: {token_data.get('error_description', token_data.get('error', '알 수 없는 오류'))}"
                )
            
            access_token = token_data.get("access_token")
            
            if not access_token:
                raise HTTPException(
                    status_code=400,
                    detail="액세스 토큰을 받아오지 못했습니다."
                )
            
            # 사용자 정보 가져오기
            user_info_url = "https://openapi.naver.com/v1/nid/me"
            headers = {"Authorization": f"Bearer {access_token}"}
            
            user_response = await client.get(user_info_url, headers=headers)
            user_response.raise_for_status()
            user_data = user_response.json()
            
            return {
                "success": True,
                "access_token": access_token,
                "user": user_data.get("response", {})
            }
    
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"네이버 API 호출 실패: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"네이버 로그인 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/naver/check")
async def check_naver_config():
    """
    네이버 OAuth 설정 상태 확인
    """
    return {
        "client_id_set": bool(settings.naver_client_id),
        "client_secret_set": bool(settings.naver_client_secret),
        "redirect_uri": os.getenv("NAVER_REDIRECT_URI", "http://localhost:5173/auth/naver/callback"),
        "message": "네이버 OAuth 설정이 완료되었습니다." if (settings.naver_client_id and settings.naver_client_secret) else "네이버 OAuth 설정이 필요합니다."
    }
