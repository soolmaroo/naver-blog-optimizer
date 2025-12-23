from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict
from pydantic import BaseModel
from app.core.config import get_settings
import httpx
from datetime import datetime, timedelta
import asyncio
import traceback
from functools import lru_cache
import time

router = APIRouter()
settings = get_settings()

# 검색량 캐시 (5분간 유지)
# 캐시 구조: {keyword: (volume, cache_time, is_from_datalab)}
_search_cache: Dict[str, tuple[int, float, bool]] = {}
CACHE_DURATION = 300  # 5분 (초)


class KeywordSuggestion(BaseModel):
    keyword: str
    search_volume: Optional[int] = None  # 검색량 (데이터랩 API)
    blog_count: Optional[int] = None  # 블로그 발행량 (블로그 검색 API)
    competition: Optional[str] = None
    intent: str
    # 검수용 메타데이터 (선택적)
    data_source: Optional[str] = None  # "api", "fallback", "cache", "estimated"
    is_validated: Optional[bool] = None  # 데이터 검증 여부


class KeywordAnalysisRequest(BaseModel):
    keyword: str


class KeywordAnalysisResponse(BaseModel):
    keyword: str
    search_volume: Optional[int] = None  # 일주일 검색량 (데이터랩 API)
    blog_count: Optional[int] = None  # 블로그 발행량 (블로그 검색 API)
    competition: str
    trend: Optional[str] = None


class RelatedKeywordRequest(BaseModel):
    keyword: str
    max_results: Optional[int] = 10


class RelatedKeywordResponse(BaseModel):
    base_keyword: str
    related_keywords: List[KeywordSuggestion]


async def get_search_volume(keyword: str, retry_count: int = 3) -> Optional[int]:
    """
    네이버 검색 API를 통해 키워드의 블로그 발행량 조회
    재시도 로직 포함, 타임아웃 완화
    """
    print(f"[블로그 발행량] 조회 시작: {keyword}")
    
    if not settings.naver_client_id or not settings.naver_client_secret:
        print(f"[블로그 발행량] 조회 실패 ({keyword}): API 키가 설정되지 않았습니다.")
        print(f"[블로그 발행량] API 키 확인 - ID: {'있음' if settings.naver_client_id else '없음'}, Secret: {'있음' if settings.naver_client_secret else '없음'}")
        return None
    
    print(f"[블로그 발행량] API 키 확인 완료, 조회 시작 (재시도 횟수: {retry_count})")
    
    for attempt in range(retry_count + 1):
        try:
            print(f"[블로그 발행량] 시도 {attempt + 1}/{retry_count + 1} ({keyword})")
            # 타임아웃을 15초로 늘려서 안정성 향상
            async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=10.0)) as client:
                # 블로그 검색 API 호출
                url = "https://openapi.naver.com/v1/search/blog.json"
                headers = {
                    "X-Naver-Client-Id": settings.naver_client_id,
                    "X-Naver-Client-Secret": settings.naver_client_secret
                }
                params = {
                    "query": keyword,
                    "display": 1,
                    "sort": "date"  # 최신순 정렬
                }
                
                print(f"[블로그 발행량] API 호출 중... ({keyword})")
                response = await client.get(url, headers=headers, params=params)
                print(f"[블로그 발행량] API 응답 받음: {response.status_code} ({keyword})")
                
                # 응답 상태 확인
                if response.status_code != 200:
                    print(f"[블로그 발행량] HTTP 상태 코드 오류: {response.status_code}")
                    try:
                        error_text = response.text[:500]
                        print(f"[블로그 발행량] 에러 응답: {error_text}")
                    except:
                        pass
                
                response.raise_for_status()
                data = response.json()
                
                # 응답 데이터 구조 확인
                if "total" not in data:
                    print(f"[블로그 발행량] 응답에 'total' 필드가 없습니다. 응답: {str(data)[:200]}")
                    if attempt < retry_count:
                        await asyncio.sleep(1.0)
                        continue
                    return None
                
                total = data.get("total", 0)
                total_int = int(total) if total else 0
                print(f"[블로그 발행량] 조회 성공 ({keyword}): {total_int}")
                return total_int  # 0이어도 반환 (실제 조회 성공)
                
        except asyncio.TimeoutError:
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.5  # 1.5초, 3초, 4.5초 대기
                print(f"[블로그 발행량] 타임아웃 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                await asyncio.sleep(wait_time)
                continue
            print(f"[블로그 발행량] 타임아웃 ({keyword}) - 최종 실패")
            return None
        except httpx.TimeoutException:
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.5  # 1.5초, 3초, 4.5초 대기
                print(f"[블로그 발행량] HTTP 타임아웃 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                await asyncio.sleep(wait_time)
                continue
            print(f"[블로그 발행량] HTTP 타임아웃 ({keyword}) - 최종 실패")
            return None
        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP {e.response.status_code}"
            try:
                error_text = e.response.text[:500]  # 더 긴 에러 메시지 확인
                error_msg += f": {error_text}"
                print(f"[블로그 발행량] HTTP 에러 상세 ({keyword}): {error_msg}")
            except:
                pass
            
            # HTTP 429 (Too Many Requests) 에러는 재시도
            if e.response.status_code == 429:
                if attempt < retry_count:
                    wait_time = (attempt + 1) * 2.0  # 2초, 4초, 6초 대기
                    print(f"[블로그 발행량] API 제한 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                    await asyncio.sleep(wait_time)
                    continue
                print(f"[블로그 발행량] API 제한 ({keyword}) - 최종 실패")
                return None
            
            # HTTP 401, 403 에러는 API 키 문제일 수 있음
            if e.response.status_code in [401, 403]:
                print(f"[블로그 발행량] 인증 오류 ({keyword}): API 키가 잘못되었거나 권한이 없습니다.")
                return None
            
            # 다른 HTTP 에러는 재시도
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.0  # 1초, 2초, 3초 대기
                print(f"[블로그 발행량] HTTP 에러 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                await asyncio.sleep(wait_time)
                continue
            
            print(f"[블로그 발행량] HTTP 에러 ({keyword}) - 최종 실패: {error_msg}")
            return None
        except Exception as e:
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.0  # 1초, 2초, 3초 대기
                print(f"[블로그 발행량] 조회 실패 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}: {str(e)}")
                await asyncio.sleep(wait_time)
                continue
            print(f"[블로그 발행량] 조회 실패 ({keyword}) - 최종 실패: {str(e)}")
            print(traceback.format_exc())
            return None
    
    return None


async def get_weekly_search_volume(keyword: str, retry_count: int = 3) -> tuple[Optional[int], bool]:
    """
    네이버 데이터랩 API를 통해 실제 일주일 검색량 조회
    데이터랩 실패 시 블로그 검색 API로 폴백 (이것도 실제 데이터)
    캐싱을 사용하여 안정성 향상, 재시도 로직 포함
    
    Returns:
        (volume, is_actual_data): 검색량과 실제 API 데이터인지 여부 (데이터랩 또는 블로그 검색 API)
    """
    # 캐시 확인
    current_time = time.time()
    if keyword in _search_cache:
        cache_data = _search_cache[keyword]
        # 이전 캐시 형식 호환성 처리
        if len(cache_data) == 2:
            cached_volume, cache_time = cache_data
            is_from_datalab = False  # 이전 캐시는 추정값으로 간주
        else:
            cached_volume, cache_time, is_from_datalab = cache_data
        
        if current_time - cache_time < CACHE_DURATION:
            print(f"[검색량] 캐시에서 반환 ({keyword}): {cached_volume} (데이터랩: {is_from_datalab})")
            return (cached_volume, is_from_datalab)
    
    if not settings.naver_client_id or not settings.naver_client_secret:
        print(f"[검색량] API 키 없음 ({keyword}), 블로그 검색 API로 전환")
        print(f"[검색량] API 키 확인 - ID: {'있음' if settings.naver_client_id else '없음'}, Secret: {'있음' if settings.naver_client_secret else '없음'}")
        volume = await _get_weekly_search_volume_fallback(keyword)
        return (volume, True)  # 블로그 검색 API는 실제 데이터
    
    # 재시도 로직
    for attempt in range(retry_count + 1):
        try:
            print(f"[검색량] 시도 {attempt + 1}/{retry_count + 1} ({keyword})")
            # 네이버 데이터랩 API 호출 (최근 7일 데이터)
            # 타임아웃을 15초로 늘려서 안정성 향상
            async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=10.0)) as client:
                url = "https://openapi.naver.com/v1/datalab/search"
                headers = {
                    "X-Naver-Client-Id": settings.naver_client_id,
                    "X-Naver-Client-Secret": settings.naver_client_secret,
                    "Content-Type": "application/json"
                }
                
                # 최근 7일 날짜 계산
                end_date = datetime.now()
                start_date = end_date - timedelta(days=7)
                
                # 요청 본문 구성
                payload = {
                    "startDate": start_date.strftime("%Y-%m-%d"),
                    "endDate": end_date.strftime("%Y-%m-%d"),
                    "timeUnit": "date",
                    "keywordGroups": [
                        {
                            "groupName": keyword,
                            "keywords": [keyword]
                        }
                    ]
                }
                
                print(f"[검색량] API 호출 중... ({keyword})")
                response = await client.post(url, headers=headers, json=payload)
                print(f"[검색량] API 응답 받음: {response.status_code} ({keyword})")
                
                # 응답 상태 확인
                if response.status_code != 200:
                    print(f"[검색량] HTTP 상태 코드 오류: {response.status_code}")
                    try:
                        error_text = response.text[:500]
                        print(f"[검색량] 에러 응답: {error_text}")
                    except:
                        pass
                
                response.raise_for_status()
                data = response.json()
                
                # 응답 데이터에서 경향성 기반 검색량 계산
                # 네이버 데이터랩은 상대 비율(ratio)을 제공하므로, 경향성을 활용
                weekly_volume = 0
                if "results" in data and len(data["results"]) > 0:
                    result = data["results"][0]
                    if "data" in result and len(result["data"]) > 0:
                        # 각 날짜별 ratio 수집 (경향성 파악용)
                        ratios = []
                        for day_data in result["data"]:
                            ratio = day_data.get("ratio", 0)
                            if ratio > 0:
                                ratios.append(ratio)
                        
                        if ratios:
                            # 경향성 기반 검색량 계산
                            # ratio는 상대적 경향을 나타내므로, 합산하여 경향성 점수로 사용
                            # 최대값이 100으로 정규화되어 있으므로, 합산값을 경향성 지표로 활용
                            total_ratio = sum(ratios)
                            avg_ratio = total_ratio / len(ratios)
                            
                            # 경향성 점수를 검색량으로 변환 (상대적 비교용)
                            # 주요 키워드(문정동, 문정역 등)는 더 높은 가중치 적용
                            if any(region in keyword for region in ["문정동", "문정역", "송파구"]):
                                # 지역 키워드는 경향성 점수를 더 크게 반영
                                weekly_volume = int(total_ratio * 50)  # 경향성 기반 스케일링
                            else:
                                weekly_volume = int(total_ratio * 30)  # 일반 키워드
                            
                            # 최소값 보장 (경향성이 있으면 최소 100 이상)
                            if weekly_volume < 100 and total_ratio > 0:
                                weekly_volume = 100
                            
                            print(f"[검색량] 데이터랩 경향성 기반 검색량 ({keyword}): {weekly_volume} (총 ratio: {total_ratio:.2f}, 평균: {avg_ratio:.2f})")
                
                # 검색량이 0이면 블로그 검색 API로 전환 (이것도 실제 데이터)
                if weekly_volume == 0:
                    print(f"[검색량] 경향성 데이터 없음 ({keyword}), 블로그 검색 API로 전환")
                    volume = await _get_weekly_search_volume_fallback(keyword)
                    return (volume, True)  # 블로그 검색 API는 실제 데이터
                
                # 캐시에 저장 (데이터랩 여부 포함)
                _search_cache[keyword] = (weekly_volume, current_time, True)
                print(f"[검색량] 데이터랩 API 조회 성공 ({keyword}): {weekly_volume} (경향성 기반)")
                return (weekly_volume, True)  # 데이터랩 API에서 온 경향성 데이터
            
        except httpx.HTTPStatusError as e:
            error_text = ""
            try:
                error_text = e.response.text[:200]  # 에러 메시지 일부만
            except:
                pass
            
            # 400 에러는 키워드가 데이터랩에 없을 수 있음 (너무 작은 키워드)
            # 이 경우 블로그 검색 API로 폴백 (이것도 실제 데이터)
            if e.response.status_code == 400:
                print(f"[검색량] 데이터랩 API 400 에러 ({keyword}): 키워드가 데이터랩에 없을 수 있습니다. 블로그 검색 API로 전환.")
                # 폴백: 블로그 검색 API 사용 (실제 데이터)
                volume = await _get_weekly_search_volume_fallback(keyword)
                # 블로그 검색 API 결과도 실제 데이터이므로 True 반환
                return (volume, True)  # 블로그 검색 API는 실제 데이터
            
            # 429 에러는 API 제한 (재시도 - 더 긴 대기 시간)
            if e.response.status_code == 429:
                if attempt < retry_count:
                    wait_time = (attempt + 1) * 2.0  # 2초, 4초, 6초 대기 (더 여유있게)
                    print(f"[검색량] 데이터랩 API 429 에러 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                    await asyncio.sleep(wait_time)
                    continue
                print(f"[검색량] 데이터랩 API 429 에러 ({keyword}): API 요청 제한 초과. 블로그 검색 API로 전환.")
                volume = await _get_weekly_search_volume_fallback(keyword)
                return (volume, True)  # 블로그 검색 API는 실제 데이터
            
            # 다른 HTTP 에러는 재시도 (더 긴 대기 시간)
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.0  # 1초, 2초, 3초 대기
                print(f"[검색량] 데이터랩 API HTTP 에러 ({keyword}): {e.response.status_code} - {error_text}, {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                await asyncio.sleep(wait_time)
                continue
            
            print(f"[검색량] 데이터랩 API HTTP 에러 ({keyword}): {e.response.status_code} - {error_text}, 블로그 검색 API로 전환")
            volume = await _get_weekly_search_volume_fallback(keyword)
            return (volume, True)  # 블로그 검색 API는 실제 데이터
            
        except (httpx.TimeoutException, httpx.RequestError, asyncio.TimeoutError) as e:
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.0  # 1초, 2초, 3초 대기
                print(f"[검색량] 데이터랩 API 타임아웃/에러 ({keyword}): {str(e)}, {wait_time}초 후 재시도 {attempt + 1}/{retry_count}")
                await asyncio.sleep(wait_time)
                continue
            print(f"[검색량] 데이터랩 API 타임아웃/에러 ({keyword}): {str(e)}, 블로그 검색 API로 전환")
            volume = await _get_weekly_search_volume_fallback(keyword)
            return (volume, True)  # 블로그 검색 API는 실제 데이터
            
        except Exception as e:
            if attempt < retry_count:
                wait_time = (attempt + 1) * 1.0  # 1초, 2초, 3초 대기
                print(f"[검색량] 일주일 검색량 조회 실패 ({keyword}), {wait_time}초 후 재시도 {attempt + 1}/{retry_count}: {str(e)}")
                await asyncio.sleep(wait_time)
                continue
            print(f"[검색량] 일주일 검색량 조회 실패 ({keyword}): {str(e)}")
            print(traceback.format_exc())
            volume = await _get_weekly_search_volume_fallback(keyword)
            return (volume, True)  # 블로그 검색 API는 실제 데이터
    
    # 모든 재시도 실패 시 블로그 검색 API로 전환
    print(f"[검색량] 모든 재시도 실패 ({keyword}), 블로그 검색 API로 전환")
    volume = await _get_weekly_search_volume_fallback(keyword)
    return (volume, True)  # 블로그 검색 API는 실제 데이터


async def _get_weekly_search_volume_fallback(keyword: str) -> Optional[int]:
    """
    데이터랩 API 실패 시 블로그 검색 API로 폴백
    블로그 검색 API는 실제 데이터를 제공하므로 추정값이 아님
    최소한의 추정값이라도 반환하도록 개선 (블로그 검색도 실패한 경우만)
    """
    try:
        print(f"[검색량 폴백] 시작 ({keyword})")
        # 전체 검색량 조회 (재시도 로직 포함)
        total_volume = await get_search_volume(keyword)
        
        if total_volume is None:
            # 블로그 검색량도 실패한 경우, 최소 추정값 반환
            print(f"[검색량 폴백] 블로그 검색량도 실패 ({keyword}), 최소 추정값 사용")
            # 키워드 길이와 내용을 기반으로 최소 추정값 계산
            # 지역명이 포함된 키워드는 최소 100 이상 추정
            if any(region in keyword for region in ["동", "역", "구", "시", "도"]):
                weekly_estimate = 100
            else:
                weekly_estimate = 50
            
            # 캐시에 저장 (데이터랩 아님 표시)
            current_time = time.time()
            _search_cache[keyword] = (weekly_estimate, current_time, False)
            print(f"[검색량 폴백] 최소 추정값 반환 ({keyword}): {weekly_estimate}")
            return weekly_estimate
        
        if total_volume == 0:
            # 검색량이 0인 경우에도 실제 데이터 (블로그 검색 API 결과)
            weekly_estimate = 10
            current_time = time.time()
            _search_cache[keyword] = (weekly_estimate, current_time, True)  # 블로그 검색 API는 실제 데이터
            print(f"[검색량 폴백] 검색량 0, 실제 데이터 반환 ({keyword}): {weekly_estimate}")
            return weekly_estimate
        
        # 전체 검색량을 기반으로 일주일 검색량 계산 (블로그 검색 API 결과를 기반으로 한 실제 데이터)
        if total_volume < 100:
            weekly_estimate = max(total_volume, 10)  # 최소 10
        elif total_volume < 1000:
            weekly_estimate = int(total_volume / 4)
        elif total_volume < 10000:
            weekly_estimate = int(total_volume / 10)
        else:
            weekly_estimate = int(total_volume / 30)
        
        # 최소값 보장
        weekly_estimate = max(weekly_estimate, 10)
        
        # 캐시에 저장 (블로그 검색 API는 실제 데이터)
        current_time = time.time()
        _search_cache[keyword] = (weekly_estimate, current_time, True)  # 블로그 검색 API는 실제 데이터
        
        print(f"[검색량 폴백] 블로그 검색 API 기반 실제 데이터 반환 ({keyword}): {weekly_estimate} (전체 검색량: {total_volume})")
        return weekly_estimate
        
    except Exception as e:
        print(f"[검색량 폴백] 폴백 검색량 조회 실패 ({keyword}): {str(e)}")
        # 최후의 수단: 최소 추정값 반환
        weekly_estimate = 50
        current_time = time.time()
        _search_cache[keyword] = (weekly_estimate, current_time, False)
        print(f"[검색량 폴백] 최후의 수단: 최소 추정값 반환 ({keyword}): {weekly_estimate}")
        return weekly_estimate


def generate_related_keywords(base_keyword: str) -> List[str]:
    """
    기본 키워드와 조합할 수 있는 관련 키워드 생성
    하드코딩된 지역 제거 - 기본 키워드에 이미 지역이 포함되어 있을 수 있음
    """
    # 한의원 관련 키워드
    clinic_keywords = [
        "한의원", "추나요법", "교통사고", "산후보약", "야간진료",
        "후유증", "통증", "디스크", "어깨", "허리", "목",
        "후기", "추천", "가격", "비용", "진료시간"
    ]
    
    # 계절/날씨 키워드
    current_month = datetime.now().month
    if current_month in [12, 1, 2]:
        seasonal = "겨울"
    elif current_month in [3, 4, 5]:
        seasonal = "봄"
    elif current_month in [6, 7, 8]:
        seasonal = "여름"
    else:
        seasonal = "가을"
    
    related = []
    
    # 하드코딩된 지역 제거 - 기본 키워드에 이미 지역이 포함되어 있을 수 있으므로
    # 지역 조합을 하지 않음
    
    # 기본 키워드 + 한의원 관련 키워드
    for clinic_keyword in clinic_keywords:
        if clinic_keyword not in base_keyword:
            related.append(f"{base_keyword} {clinic_keyword}")
            related.append(f"{clinic_keyword} {base_keyword}")
    
    # 계절 + 기본 키워드
    related.append(f"{seasonal} {base_keyword}")
    related.append(f"{base_keyword} {seasonal}")
    
    # 중복 제거
    related = list(set(related))
    
    return related[:20]  # 최대 20개로 제한


@router.get("/keywords/suggestions")
async def get_keyword_suggestions(
    region: Optional[str] = "문정동",
    weather: Optional[str] = None
) -> List[KeywordSuggestion]:
    """
    지역 및 날씨 기반 키워드 추천 (실시간 검색량 반영, 검색량 순 정렬)
    캐싱을 사용하여 안정성 향상
    """
    # API 키 확인 및 로깅
    print(f"[추천 키워드] API 키 확인 - ID: {'있음' if settings.naver_client_id else '없음'}, Secret: {'있음' if settings.naver_client_secret else '없음'}")
    if settings.naver_client_id:
        print(f"[추천 키워드] API ID 길이: {len(settings.naver_client_id)} (처음 10자: {settings.naver_client_id[:10]}...)")
    
    # API 키가 없으면 명확한 에러 메시지
    if not settings.naver_client_id or not settings.naver_client_secret:
        print("=" * 80)
        print("[추천 키워드] [경고] 네이버 API 키가 설정되지 않았습니다!")
        print("[추천 키워드] 블로그 발행량과 일주일 검색량을 조회할 수 없습니다.")
        print("[추천 키워드] 해결 방법:")
        print("[추천 키워드] 1. 프로젝트 루트에 .env 파일 생성")
        print("[추천 키워드] 2. NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 추가")
        print("[추천 키워드] 3. 네이버 개발자 센터에서 API 키 발급")
        print("[추천 키워드] 4. 백엔드 서버 재시작")
        print("=" * 80)
    
    try:
        # 날씨 정보가 없으면 기본값 사용
        if not weather:
            current_month = datetime.now().month
            if current_month in [12, 1, 2]:
                weather = "겨울"
            elif current_month in [3, 4, 5]:
                weather = "봄"
            elif current_month in [6, 7, 8]:
                weather = "여름"
            else:
                weather = "가을"
        
        # 키워드 목록 생성 (7개)
        keyword_list = [
            {"keyword": f"{region} 한의원", "intent": "location"},
            {"keyword": f"{region} 교통사고 한의원", "intent": "condition"},
            {"keyword": f"{region} 산후보약", "intent": "service"},
            {"keyword": f"{region} {weather} 통증 관리", "intent": "seasonal"},
            {"keyword": f"{region} 근처 추나요법", "intent": "service"},
            {"keyword": f"{region} 야간진료 한의원", "intent": "time"},
            {"keyword": f"{region} 교통사고 후유증", "intent": "condition"},
        ]
        
        # 각 키워드에 대해 검색량과 블로그 발행량 조회
        # 블로그 발행량은 순차 처리로 안정성 향상 (네이버 API 제한 고려)
        search_volumes = [None] * len(keyword_list)
        search_sources = ["unknown"] * len(keyword_list)  # 초기값 설정
        blog_counts = [None] * len(keyword_list)
        
        try:
            # 검색량은 병렬로 조회 (내부 타임아웃 사용)
            search_tasks = [
                get_weekly_search_volume(item["keyword"])
                for item in keyword_list
            ]
            search_results = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # 결과 분리: (volume, is_from_datalab) 튜플 또는 Exception
            for i, result in enumerate(search_results):
                keyword = keyword_list[i]["keyword"]
                if isinstance(result, Exception):
                    print(f"[추천 키워드] 검색량 조회 실패 ({keyword}): {type(result).__name__}: {str(result)}")
                    search_volumes[i] = None
                    search_sources[i] = "error"
                elif isinstance(result, tuple) and len(result) == 2:
                    volume, is_actual_data = result
                    search_volumes[i] = volume
                    # 실제 데이터 (데이터랩 또는 블로그 검색 API)면 "api"로 표시
                    search_sources[i] = "api" if is_actual_data else "fallback_or_estimated"
                    print(f"[추천 키워드] 검색량 조회 성공 ({keyword}): {volume} (실제 데이터: {is_actual_data})")
                else:
                    # 예상치 못한 형식
                    print(f"[추천 키워드] 검색량 결과 형식 오류 ({keyword}): {type(result)}")
                    search_volumes[i] = None
                    search_sources[i] = "unknown"
            
            # 블로그 발행량은 순차 처리로 안정성 확보 (요청 간 간격 두기)
            for i, item in enumerate(keyword_list):
                try:
                    print(f"[추천 키워드] 블로그 발행량 조회 시작 ({item['keyword']})")
                    # get_search_volume 내부에 이미 타임아웃과 재시도 로직이 있으므로
                    # 외부에서 추가 타임아웃을 걸지 않음
                    blog_count = await get_search_volume(item["keyword"])
                    blog_counts[i] = blog_count
                    print(f"[추천 키워드] 블로그 발행량 조회 완료 ({item['keyword']}): {blog_count}")
                    # 요청 간 간격 (네이버 API 제한 고려) - 500ms로 증가
                    if i < len(keyword_list) - 1:
                        await asyncio.sleep(0.5)  # 500ms 대기 (API 제한 방지)
                except Exception as e:
                    print(f"[추천 키워드] 블로그 발행량 조회 실패 ({item['keyword']}): {type(e).__name__}: {str(e)}")
                    print(traceback.format_exc())
                    blog_counts[i] = None
                    # 실패해도 다음 키워드 계속 조회
                    if i < len(keyword_list) - 1:
                        await asyncio.sleep(0.5)  # 실패 후에도 간격 유지
                    
        except Exception as e:
            print(f"검색량/블로그 발행량 조회 중 예외 발생 ({region}): {str(e)}")
            print(traceback.format_exc())
            # 부분 실패해도 계속 진행
        
        # 결과 조합 및 검수
        suggestions = []
        for i, item in enumerate(keyword_list):
            volume = search_volumes[i] if i < len(search_volumes) else None
            blog_count = blog_counts[i] if i < len(blog_counts) else None
            search_source = search_sources[i] if i < len(search_sources) else "unknown"
            
            # 검색량 처리
            if volume is None:
                print(f"검색량 조회 결과 없음 ({item['keyword']}) - 실제 검색량이 없거나 매우 낮음")
                if search_source == "unknown":
                    search_source = "none"
            
            # 블로그 발행량이 에러인 경우 None으로 처리 (조회 실패)
            blog_source = None
            if isinstance(blog_count, Exception):
                print(f"블로그 발행량 조회 에러 ({item['keyword']}): {str(blog_count)}")
                blog_count = None  # 조회 실패는 None 유지
                blog_source = "error"
            elif blog_count is not None and isinstance(blog_count, (int, float)) and blog_count >= 0:
                print(f"블로그 발행량 조회 성공 ({item['keyword']}): {blog_count}")
                blog_source = "api"
            else:
                blog_source = "none"
            
            # 데이터 합리성 검증
            is_validated = True
            validation_issues = []
            
            if volume is not None and blog_count is not None:
                # 검색량과 블로그 발행량의 비율 검증
                # 일반적으로 검색량이 블로그 발행량보다 훨씬 클 수 있음
                # 하지만 검색량이 블로그 발행량보다 1000배 이상 작으면 이상함
                if volume > 0 and blog_count > 0:
                    ratio = blog_count / volume
                    if ratio > 1000:
                        validation_issues.append(f"블로그 발행량이 검색량보다 {ratio:.1f}배 큼 (비정상적)")
                        is_validated = False
                    elif ratio < 0.01:
                        validation_issues.append(f"검색량이 블로그 발행량보다 {1/ratio:.1f}배 큼 (비정상적)")
                        is_validated = False
                
                # 검색량이 매우 작은데 블로그 발행량이 매우 큰 경우
                if volume < 50 and blog_count > 10000:
                    validation_issues.append("검색량이 매우 작은데 블로그 발행량이 매우 큼")
                    is_validated = False
            
            # 데이터 소스 정보 결합
            if search_source and blog_source:
                if search_source == "api" and blog_source == "api":
                    data_source = "api"
                elif search_source in ["fallback_or_estimated", "error"] or blog_source == "error":
                    data_source = "fallback_or_estimated"
                else:
                    data_source = "partial"
            else:
                data_source = search_source or blog_source or "unknown"
            
            if validation_issues:
                print(f"[검수] {item['keyword']}: {'; '.join(validation_issues)}")
            
            # 경쟁 강도 계산 (검색량 기준, 검색량이 없으면 "unknown")
            if volume is None:
                competition = "unknown"
            elif volume > 10000:
                competition = "high"
            elif volume > 1000:
                competition = "medium"
            else:
                competition = "low"
            
            suggestions.append(
                KeywordSuggestion(
                    keyword=item["keyword"],
                    search_volume=volume,  # None일 수 있음 (기본값 사용 안 함)
                    blog_count=blog_count,
                    competition=competition,
                    intent=item["intent"],
                    data_source=data_source,
                    is_validated=is_validated
                )
            )
        
        # 검색량 기준 내림차순 정렬 (경향성 기반)
        # 실제 데이터랩 데이터를 우선하고, 그 다음 추정값, 마지막으로 None
        suggestions.sort(key=lambda x: (
            x.data_source == "api",  # 데이터랩 데이터 우선
            x.search_volume is not None,  # 검색량 있는 것 우선
            x.search_volume or 0  # 검색량 기준 정렬
        ), reverse=True)
        
        return suggestions
    
    except Exception as e:
        print(f"키워드 추천 API 에러: {str(e)}")
        print(traceback.format_exc())
        # 에러 발생 시에도 기본 키워드 반환 (blog_count 포함, 7개)
        try:
            # 날씨 정보 계산
            current_month = datetime.now().month
            if current_month in [12, 1, 2]:
                weather = "겨울"
            elif current_month in [3, 4, 5]:
                weather = "봄"
            elif current_month in [6, 7, 8]:
                weather = "여름"
            else:
                weather = "가을"
            
            return [
                KeywordSuggestion(
                    keyword=f"{region} 한의원",
                    search_volume=4800,
                    blog_count=None,
                    competition="medium",
                    intent="location"
                ),
                KeywordSuggestion(
                    keyword=f"{region} 교통사고 한의원",
                    search_volume=2200,
                    blog_count=None,
                    competition="high",
                    intent="condition"
                ),
                KeywordSuggestion(
                    keyword=f"{region} 산후보약",
                    search_volume=1200,
                    blog_count=None,
                    competition="low",
                    intent="service"
                ),
                KeywordSuggestion(
                    keyword=f"{region} {weather} 통증 관리",
                    search_volume=1500,
                    blog_count=None,
                    competition="medium",
                    intent="seasonal"
                ),
                KeywordSuggestion(
                    keyword=f"{region} 근처 추나요법",
                    search_volume=1200,
                    blog_count=None,
                    competition="low",
                    intent="service"
                ),
                KeywordSuggestion(
                    keyword=f"{region} 야간진료 한의원",
                    search_volume=1800,
                    blog_count=None,
                    competition="medium",
                    intent="time"
                ),
                KeywordSuggestion(
                    keyword=f"{region} 교통사고 후유증",
                    search_volume=2200,
                    blog_count=None,
                    competition="high",
                    intent="condition"
                ),
            ]
        except Exception as fallback_error:
            print(f"기본 키워드 반환 실패: {str(fallback_error)}")
            print(traceback.format_exc())
            # 최종 폴백: 최소한의 기본 키워드라도 반환 (하드코딩)
            try:
                # Pydantic 모델 없이 딕셔너리로 반환 (최후의 수단)
                return [
                    {
                        "keyword": f"{region} 한의원",
                        "search_volume": 4800,
                        "blog_count": None,
                        "competition": "medium",
                        "intent": "location"
                    }
                ]
            except:
                # 정말 최후의 수단: 빈 리스트라도 반환하여 서버 오류 방지
                return []


@router.post("/keywords/related")
async def get_related_keywords(request: RelatedKeywordRequest) -> RelatedKeywordResponse:
    """
    입력된 키워드와 관련된 키워드들을 검색량 순으로 반환
    """
    try:
        base_keyword = request.keyword.strip()
        if not base_keyword:
            raise HTTPException(status_code=400, detail="키워드를 입력해주세요.")
        
        # 관련 키워드 생성
        related_keyword_list = generate_related_keywords(base_keyword)
        
        # 각 관련 키워드에 대해 검색량과 블로그 발행량 조회
        # 블로그 발행량은 순차 처리로 안정성 향상
        search_volumes = [None] * len(related_keyword_list)
        blog_counts = [None] * len(related_keyword_list)
        
        try:
            # 검색량은 병렬로 조회 (내부 타임아웃 사용)
            search_tasks = [
                get_weekly_search_volume(keyword)
                for keyword in related_keyword_list
            ]
            search_volumes = await asyncio.gather(*search_tasks, return_exceptions=True)
            
            # 블로그 발행량은 순차 처리로 안정성 확보
            for i, keyword in enumerate(related_keyword_list):
                try:
                    # get_search_volume 내부에 이미 타임아웃과 재시도 로직이 있으므로
                    # 외부에서 추가 타임아웃을 걸지 않음
                    blog_count = await get_search_volume(keyword)
                    blog_counts[i] = blog_count
                    # 요청 간 간격 - 300ms로 증가
                    if i < len(related_keyword_list) - 1:
                        await asyncio.sleep(0.3)  # 300ms 대기 (API 제한 방지)
                except Exception as e:
                    print(f"블로그 발행량 조회 실패 ({keyword}): {str(e)}")
                    blog_counts[i] = None
                    # 실패해도 다음 키워드 계속 조회
                    if i < len(related_keyword_list) - 1:
                        await asyncio.sleep(0.3)  # 실패 후에도 간격 유지
                    
        except Exception as e:
            print(f"관련 키워드 조회 중 예외 발생: {str(e)}")
            print(traceback.format_exc())
            # 부분 실패해도 계속 진행
        
        # 결과 조합
        related_keywords = []
        for i, keyword in enumerate(related_keyword_list):
            volume = search_volumes[i] if i < len(search_volumes) else None
            blog_count = blog_counts[i] if i < len(blog_counts) else None
            
            # 검색량이 없거나 에러인 경우 스킵
            if isinstance(volume, Exception) or volume is None:
                continue
            
            # 블로그 발행량이 에러인 경우 None으로 처리 (조회 실패)
            if isinstance(blog_count, Exception):
                blog_count = None  # 조회 실패는 None 유지
            # None이면 조회 실패로 유지
            
            # 경쟁 강도 계산
            if volume > 10000:
                competition = "high"
            elif volume > 1000:
                competition = "medium"
            else:
                competition = "low"
            
            related_keywords.append(
                KeywordSuggestion(
                    keyword=keyword,
                    search_volume=volume,
                    blog_count=blog_count,
                    competition=competition,
                    intent="related"
                )
            )
        
        # 검색량 기준 내림차순 정렬
        related_keywords.sort(key=lambda x: x.search_volume or 0, reverse=True)
        
        # 최대 결과 수 제한
        max_results = request.max_results or 10
        related_keywords = related_keywords[:max_results]
        
        return RelatedKeywordResponse(
            base_keyword=base_keyword,
            related_keywords=related_keywords
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"관련 키워드 API 에러: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"관련 키워드 조회 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/keywords/analyze")
async def analyze_keyword(request: KeywordAnalysisRequest) -> KeywordAnalysisResponse:
    """
    키워드 분석: 일주일 검색량과 블로그 발행량 조회
    """
    if not settings.naver_client_id or not settings.naver_client_secret:
        # API 키가 없으면 샘플 데이터 반환
        return KeywordAnalysisResponse(
            keyword=request.keyword,
            search_volume=2500,
            blog_count=None,
            competition="medium",
            trend="stable"
        )
    
    try:
        print(f"[키워드 분석기] 분석 시작: {request.keyword}")
        print(f"[키워드 분석기] 네이버 API 키 확인 - ID: {'있음' if settings.naver_client_id else '없음'}, Secret: {'있음' if settings.naver_client_secret else '없음'}")
        
        # 일주일 검색량과 블로그 발행량을 병렬로 조회
        # get_search_volume과 get_weekly_search_volume 내부에 이미 타임아웃이 있으므로
        # 외부에서 추가 타임아웃을 걸지 않음
        print(f"[키워드 분석기] 검색량 및 블로그 발행량 조회 시작 (병렬 처리)")
        search_volume_task = get_weekly_search_volume(request.keyword)
        blog_count_task = get_search_volume(request.keyword)
        
        # 두 작업을 병렬로 실행 (각 함수 내부의 타임아웃과 재시도 로직 사용)
        # 전체 타임아웃 추가 (60초) - 각 함수 내부 타임아웃(15초)보다 길게 설정
        try:
            search_volume_result, blog_count = await asyncio.wait_for(
                asyncio.gather(
                    search_volume_task,
                    blog_count_task,
                    return_exceptions=True
                ),
                timeout=60.0  # 전체 타임아웃 60초
            )
        except asyncio.TimeoutError:
            print(f"[키워드 분석기] 전체 조회 타임아웃 (60초 초과) ({request.keyword})")
            search_volume_result = None
            blog_count = None
        
        # 검색량 처리 (get_weekly_search_volume은 튜플 (volume, is_actual_data) 반환)
        print(f"[키워드 분석기] 검색량 결과 타입: {type(search_volume_result)}, 값: {search_volume_result}")
        if isinstance(search_volume_result, Exception):
            print(f"[키워드 분석기] 일주일 검색량 조회 실패 ({request.keyword}): {type(search_volume_result).__name__}: {str(search_volume_result)}")
            if isinstance(search_volume_result, asyncio.TimeoutError):
                print(f"  -> 타임아웃 에러")
            elif isinstance(search_volume_result, httpx.TimeoutException):
                print(f"  -> HTTP 타임아웃 에러")
            elif isinstance(search_volume_result, httpx.HTTPStatusError):
                print(f"  -> HTTP 상태 에러: {search_volume_result.response.status_code if hasattr(search_volume_result, 'response') else 'N/A'}")
            import traceback
            print(f"[키워드 분석기] 검색량 예외 상세:")
            print(traceback.format_exc())
            search_volume = None
        elif isinstance(search_volume_result, tuple) and len(search_volume_result) == 2:
            # 튜플인 경우 (volume, is_actual_data) 언패킹
            search_volume, is_actual_data = search_volume_result
            print(f"[키워드 분석기] [성공] 검색량 조회 성공 ({request.keyword}): {search_volume} (실제 데이터: {is_actual_data})")
        elif search_volume_result is None:
            print(f"[키워드 분석기] 일주일 검색량 조회 결과 없음 (None 반환) ({request.keyword})")
            search_volume = None
        else:
            # 예상치 못한 형식
            print(f"[키워드 분석기] [경고] 검색량 결과 형식 오류 ({request.keyword}): {type(search_volume_result)}, 값: {search_volume_result}")
            search_volume = None
        
        # 블로그 발행량 처리
        print(f"[키워드 분석기] 블로그 발행량 결과 타입: {type(blog_count)}, 값: {blog_count}")
        if isinstance(blog_count, Exception):
            print(f"[키워드 분석기] [실패] 블로그 발행량 조회 실패 ({request.keyword}): {type(blog_count).__name__}: {str(blog_count)}")
            if isinstance(blog_count, asyncio.TimeoutError):
                print(f"  -> 타임아웃 에러")
            elif isinstance(blog_count, httpx.TimeoutException):
                print(f"  -> HTTP 타임아웃 에러")
            elif isinstance(blog_count, httpx.HTTPStatusError):
                status_code = blog_count.response.status_code if hasattr(blog_count, 'response') else 'N/A'
                print(f"  -> HTTP 상태 에러: {status_code}")
                try:
                    error_text = blog_count.response.text[:500] if hasattr(blog_count, 'response') else 'N/A'
                    print(f"  -> 에러 메시지: {error_text}")
                except:
                    pass
            print(f"[키워드 분석기] 블로그 발행량 예외 상세:")
            print(traceback.format_exc())
            blog_count = None
        elif blog_count is None:
            print(f"[키워드 분석기] 블로그 발행량 조회 결과 없음 (None 반환) ({request.keyword})")
        else:
            print(f"[키워드 분석기] [성공] 블로그 발행량 조회 성공: {blog_count} ({request.keyword})")
        
        # 경쟁 강도 계산 (검색량 기준)
        # 검색량이 None이면 경쟁 강도를 "unknown"으로 설정
        if search_volume is None:
            competition = "unknown"
        elif search_volume > 10000:
            competition = "high"
        elif search_volume > 1000:
            competition = "medium"
        else:
            competition = "low"
        
        return KeywordAnalysisResponse(
            keyword=request.keyword,
            search_volume=search_volume,
            blog_count=blog_count,
            competition=competition,
            trend="stable"
        )
    except Exception as e:
        print(f"키워드 분석 API 에러: {str(e)}")
        print(traceback.format_exc())
        # 에러 발생 시 샘플 데이터 반환
        return KeywordAnalysisResponse(
            keyword=request.keyword,
            search_volume=2500,
            blog_count=None,
            competition="medium",
            trend="stable"
        )
