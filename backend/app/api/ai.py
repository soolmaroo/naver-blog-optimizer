from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.core.config import get_settings
import google.generativeai as genai
import json
from pathlib import Path
from datetime import datetime
import httpx
from bs4 import BeautifulSoup
import re

router = APIRouter()

# 학습 데이터 저장 경로
LEARNING_DATA_PATH = Path(__file__).resolve().parent.parent.parent.parent / "learning_data.json"

# 학습 데이터 로드 함수
def load_learning_data() -> dict:
    """학습 데이터를 로드합니다."""
    if LEARNING_DATA_PATH.exists():
        try:
            with open(LEARNING_DATA_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[학습] 데이터 로드 실패: {str(e)}")
            return {}
    return {}

# 학습 데이터 저장 함수
def save_learning_data(data: dict):
    """학습 데이터를 저장합니다."""
    try:
        with open(LEARNING_DATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[학습] 데이터 저장 완료")
    except Exception as e:
        print(f"[학습] 데이터 저장 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"학습 데이터 저장 실패: {str(e)}")


async def extract_blog_post_urls(blog_url: str, max_pages: int = 50) -> List[str]:
    """
    네이버 블로그에서 모든 포스트 URL을 추출합니다.
    페이지네이션을 통해 모든 페이지를 순회합니다.
    
    Args:
        blog_url: 블로그 메인 URL (예: https://blog.naver.com/username)
        max_pages: 최대 페이지 수 (기본값: 50)
    
    Returns:
        포스트 URL 목록
    """
    post_urls = set()  # 중복 방지를 위해 set 사용
    
    try:
        print(f"[블로그 URL 추출] 시작: {blog_url}")
        
        # User-Agent 설정
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://blog.naver.com/'
        }
        
        # 블로그 ID 추출
        blog_id_match = re.search(r'blog\.naver\.com/([^/?]+)', blog_url)
        if not blog_id_match:
            print(f"[블로그 URL 추출] 블로그 ID를 찾을 수 없습니다: {blog_url}")
            return []
        
        blog_id = blog_id_match.group(1)
        print(f"[블로그 URL 추출] 블로그 ID: {blog_id}")
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), follow_redirects=True) as client:
            # 먼저 메인 페이지에서 iframe 확인
            try:
                main_response = await client.get(blog_url, headers=headers)
                if main_response.status_code == 200:
                    main_soup = BeautifulSoup(main_response.text, 'html.parser')
                    # 메인 페이지의 iframe에서도 포스트 링크 찾기
                    for link in main_soup.find_all('a', href=True):
                        href = link.get('href', '')
                        if 'PostView.naver' in href and 'logNo=' in href:
                            full_url = href if href.startswith('http') else f'https://blog.naver.com{href}'
                            post_urls.add(full_url)
                        elif re.search(r'blog\.naver\.com/[^/]+/\d+$', href):
                            full_url = href if href.startswith('http') else f'https://blog.naver.com{href}'
                            post_urls.add(full_url)
            except Exception as e:
                print(f"[블로그 URL 추출] 메인 페이지 크롤링 실패: {str(e)}")
            
            # 페이지네이션을 통해 모든 포스트 수집
            page = 1
            consecutive_empty_pages = 0  # 연속으로 빈 페이지가 나오면 중단
            
            while page <= max_pages and consecutive_empty_pages < 3:
                # 네이버 블로그 포스트 목록 페이지 URL (여러 형식 시도)
                post_list_urls = [
                    f'https://blog.naver.com/PostList.naver?blogId={blog_id}&currentPage={page}',
                    f'https://blog.naver.com/PostList.naver?blogId={blog_id}&categoryNo=0&listStyle=blog&from=postList&userSelectMenu=true&currentPage={page}',
                ]
                
                page_post_count = 0
                
                for post_list_url in post_list_urls:
                    try:
                        print(f"[블로그 URL 추출] 페이지 {page} 크롤링 중... ({post_list_url})")
                        response = await client.get(post_list_url, headers=headers)
                        
                        if response.status_code != 200:
                            continue
                        
                        html = response.text
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # 방법 1: 모든 a 태그에서 PostView 링크 찾기
                        for link in soup.find_all('a', href=True):
                            href = link.get('href', '')
                            
                            # PostView.naver 형식 (상대/절대 경로 모두 처리)
                            if 'PostView.naver' in href or 'PostView' in href:
                                if 'logNo=' in href or 'logNo' in href:
                                    # 상대 경로 처리
                                    if href.startswith('/'):
                                        full_url = f'https://blog.naver.com{href}'
                                    elif href.startswith('http'):
                                        full_url = href
                                    else:
                                        full_url = f'https://blog.naver.com/{href}'
                                    
                                    # URL 정규화 (blogId와 logNo 추출)
                                    if 'blogId=' in full_url and 'logNo=' in full_url:
                                        if full_url not in post_urls:
                                            post_urls.add(full_url)
                                            page_post_count += 1
                            
                            # /username/postId 형식
                            elif re.search(r'blog\.naver\.com/[^/]+/\d+', href) or re.search(r'^/\d+$', href):
                                if href.startswith('/'):
                                    full_url = f'https://blog.naver.com/{blog_id}{href}'
                                elif href.startswith('http'):
                                    full_url = href
                                else:
                                    full_url = f'https://blog.naver.com/{blog_id}/{href}'
                                
                                if full_url not in post_urls:
                                    post_urls.add(full_url)
                                    page_post_count += 1
                        
                        # 방법 2: data-log-no, data-post-no 등 속성에서 포스트 번호 추출
                        for attr_name in ['data-log-no', 'data-post-no', 'data-logno', 'logNo', 'postNo']:
                            for element in soup.find_all(attrs={attr_name: True}):
                                log_no = element.get(attr_name) or element.get(attr_name.replace('-', ''))
                                if log_no:
                                    post_url = f'https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}'
                                    if post_url not in post_urls:
                                        post_urls.add(post_url)
                                        page_post_count += 1
                        
                        # 방법 3: onclick 속성에서 logNo 추출
                        for element in soup.find_all(attrs={'onclick': True}):
                            onclick = element.get('onclick', '')
                            log_no_match = re.search(r'logNo[=:](\d+)', onclick)
                            if log_no_match:
                                log_no = log_no_match.group(1)
                                post_url = f'https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}'
                                if post_url not in post_urls:
                                    post_urls.add(post_url)
                                    page_post_count += 1
                        
                        # 방법 4: iframe 내부 확인 (PostList 페이지도 iframe 사용 가능)
                        iframes = soup.find_all('iframe')
                        for iframe in iframes:
                            iframe_src = iframe.get('src') or iframe.get('data-src')
                            if iframe_src:
                                if not iframe_src.startswith('http'):
                                    iframe_src = 'https://blog.naver.com' + iframe_src
                                
                                try:
                                    iframe_response = await client.get(iframe_src, headers=headers)
                                    if iframe_response.status_code == 200:
                                        iframe_html = iframe_response.text
                                        iframe_soup = BeautifulSoup(iframe_html, 'html.parser')
                                        
                                        for link in iframe_soup.find_all('a', href=True):
                                            href = link.get('href', '')
                                            if 'PostView.naver' in href and 'logNo=' in href:
                                                full_url = href if href.startswith('http') else f'https://blog.naver.com{href}'
                                                if full_url not in post_urls:
                                                    post_urls.add(full_url)
                                                    page_post_count += 1
                                            elif re.search(r'blog\.naver\.com/[^/]+/\d+', href):
                                                full_url = href if href.startswith('http') else f'https://blog.naver.com{href}'
                                                if full_url not in post_urls:
                                                    post_urls.add(full_url)
                                                    page_post_count += 1
                                except Exception as e:
                                    pass  # iframe 실패해도 계속 진행
                        
                        # 방법 5: JavaScript 변수에서 logNo 추출
                        scripts = soup.find_all('script')
                        for script in scripts:
                            if script.string:
                                # logNo 패턴 찾기
                                log_no_matches = re.findall(r'logNo["\']?\s*[:=]\s*["\']?(\d+)', script.string)
                                for log_no in log_no_matches:
                                    post_url = f'https://blog.naver.com/PostView.naver?blogId={blog_id}&logNo={log_no}'
                                    if post_url not in post_urls:
                                        post_urls.add(post_url)
                                        page_post_count += 1
                        
                        # 한 URL에서 포스트를 찾았으면 다른 URL은 시도하지 않음
                        if page_post_count > 0:
                            break
                    
                    except httpx.TimeoutException:
                        print(f"[블로그 URL 추출] 페이지 {page} 타임아웃")
                        continue
                    except Exception as e:
                        print(f"[블로그 URL 추출] 페이지 {page} 오류: {str(e)}")
                        continue
                
                print(f"[블로그 URL 추출] 페이지 {page}: {page_post_count}개 포스트 발견 (총 {len(post_urls)}개)")
                
                # 이 페이지에서 포스트를 찾지 못했으면 연속 빈 페이지 카운트 증가
                if page_post_count == 0:
                    consecutive_empty_pages += 1
                else:
                    consecutive_empty_pages = 0  # 포스트를 찾았으면 리셋
                
                # 다음 페이지로
                page += 1
                
                # 요청 간 딜레이 (너무 빠르게 요청하면 차단될 수 있음)
                import asyncio
                await asyncio.sleep(1.0)  # 딜레이 증가
            
            print(f"[블로그 URL 추출] 완료: 총 {len(post_urls)}개의 포스트 URL 발견")
            
            # set을 list로 변환하고 정렬 (최신순으로)
            result = sorted(list(post_urls), reverse=True)
            return result
        
    except Exception as e:
        print(f"[블로그 URL 추출] 오류: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return list(post_urls) if post_urls else []


async def crawl_blog(url: str) -> str:
    """
    블로그 URL에서 텍스트를 크롤링합니다.
    네이버 블로그, 티스토리 등 지원
    """
    try:
        print(f"[크롤링] 시작: {url}")
        
        # User-Agent 설정 (봇 차단 방지)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        async with httpx.AsyncClient(timeout=httpx.Timeout(10.0), follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            html = response.text
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # 네이버 블로그 처리
        if 'blog.naver.com' in url or 'm.blog.naver.com' in url:
            # 네이버 블로그는 iframe 구조이므로 직접 본문 찾기
            # 여러 가능한 선택자 시도
            content_selectors = [
                '#postViewArea',  # 일반적인 본문 영역
                '.se-main-container',  # 스마트에디터
                '.post-view',  # 구버전
                '#postView',  # 다른 버전
                '.post_ct',  # 또 다른 버전
            ]
            
            content_text = ""
            for selector in content_selectors:
                content = soup.select_one(selector)
                if content:
                    # 스크립트와 스타일 태그 제거
                    for script in content(['script', 'style', 'noscript']):
                        script.decompose()
                    content_text = content.get_text(separator='\n', strip=True)
                    if len(content_text) > 100:  # 충분한 텍스트가 있으면 사용
                        break
            
            # iframe 내부 내용이 있는 경우 (모바일 버전)
            if not content_text or len(content_text) < 100:
                iframe = soup.find('iframe', id='mainFrame')
                if iframe and iframe.get('src'):
                    iframe_url = iframe['src']
                    if not iframe_url.startswith('http'):
                        iframe_url = 'https://blog.naver.com' + iframe_url
                    
                    print(f"[크롤링] iframe URL 발견: {iframe_url}")
                    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as iframe_client:
                        iframe_response = await iframe_client.get(iframe_url, headers=headers)
                        iframe_response.raise_for_status()
                        iframe_html = iframe_response.text
                        iframe_soup = BeautifulSoup(iframe_html, 'html.parser')
                        
                        for selector in content_selectors:
                            content = iframe_soup.select_one(selector)
                            if content:
                                for script in content(['script', 'style', 'noscript']):
                                    script.decompose()
                                content_text = content.get_text(separator='\n', strip=True)
                                if len(content_text) > 100:
                                    break
            
            if content_text and len(content_text) > 50:
                print(f"[크롤링] 성공: {len(content_text)}자 추출")
                return content_text
            else:
                # 전체 본문에서 텍스트 추출 시도
                body = soup.find('body')
                if body:
                    for script in body(['script', 'style', 'noscript', 'header', 'footer', 'nav']):
                        script.decompose()
                    content_text = body.get_text(separator='\n', strip=True)
                    # 너무 짧은 줄 제거
                    lines = [line for line in content_text.split('\n') if len(line.strip()) > 10]
                    content_text = '\n'.join(lines)
                    if len(content_text) > 100:
                        print(f"[크롤링] 성공 (전체 본문): {len(content_text)}자 추출")
                        return content_text
        
        # 티스토리 블로그 처리
        elif 'tistory.com' in url:
            content = soup.select_one('.entry-content, .article-content, #content')
            if content:
                for script in content(['script', 'style', 'noscript']):
                    script.decompose()
                content_text = content.get_text(separator='\n', strip=True)
                if len(content_text) > 50:
                    print(f"[크롤링] 성공 (티스토리): {len(content_text)}자 추출")
                    return content_text
        
        # 일반적인 블로그 처리 (article, main 태그 등)
        article = soup.find('article') or soup.find('main') or soup.find(class_=re.compile(r'content|post|article', re.I))
        if article:
            for script in article(['script', 'style', 'noscript']):
                script.decompose()
            content_text = article.get_text(separator='\n', strip=True)
            if len(content_text) > 100:
                print(f"[크롤링] 성공 (일반): {len(content_text)}자 추출")
                return content_text
        
        # 최후의 수단: body 전체에서 텍스트 추출
        body = soup.find('body')
        if body:
            for script in body(['script', 'style', 'noscript', 'header', 'footer', 'nav', 'aside']):
                script.decompose()
            content_text = body.get_text(separator='\n', strip=True)
            lines = [line for line in content_text.split('\n') if len(line.strip()) > 10]
            content_text = '\n'.join(lines)
            if len(content_text) > 100:
                print(f"[크롤링] 성공 (body 전체): {len(content_text)}자 추출")
                return content_text
        
        raise Exception("블로그 본문을 찾을 수 없습니다.")
        
    except httpx.HTTPStatusError as e:
        print(f"[크롤링] HTTP 오류: {e.response.status_code}")
        raise Exception(f"블로그를 불러올 수 없습니다. (HTTP {e.response.status_code})")
    except httpx.TimeoutException:
        print(f"[크롤링] 타임아웃")
        raise Exception("블로그 로딩 시간이 초과되었습니다.")
    except Exception as e:
        print(f"[크롤링] 오류: {str(e)}")
        raise Exception(f"블로그 크롤링 실패: {str(e)}")

# Gemini API 설정은 요청 시마다 확인
def configure_gemini():
    """Gemini API 설정 (요청 시마다 최신 설정 로드)"""
    settings = get_settings()
    if settings.google_api_key:
        genai.configure(api_key=settings.google_api_key)
        return True
    return False


class DraftRequest(BaseModel):
    topic: str
    keywords: Optional[list[str]] = None
    writing_instruction: Optional[str] = None  # 글쓰기 지시사항 (구조, 길이, 타겟, 키워드 배치 등)
    content_instruction: Optional[str] = None  # 글의 내용 지시사항 (구체적인 사건, 경험 등)
    tone: Optional[str] = "informative"
    length: Optional[str] = "medium"


class DraftResponse(BaseModel):
    topic: str
    draft: str
    word_count: int
    medical_violations: list[str] = []


class ImageRequest(BaseModel):
    prompt: str
    context: Optional[str] = None


class ImageResponse(BaseModel):
    prompt: str
    image_url: Optional[str] = None
    preview_url: Optional[str] = None


class BlogCrawlRequest(BaseModel):
    blog_url: str  # 블로그 메인 URL
    max_posts: Optional[int] = 20  # 최대 포스트 수


class BlogCrawlResponse(BaseModel):
    success: bool
    message: str
    post_urls: List[str]  # 추출된 포스트 URL 목록
    total_count: int  # 총 포스트 수


class LearningDataRequest(BaseModel):
    blog_texts: Optional[List[str]] = None  # 블로그 텍스트 목록
    blog_urls: Optional[List[str]] = None  # 블로그 URL 목록
    blog_main_url: Optional[str] = None  # 블로그 메인 URL (모든 포스트 자동 추출)
    personal_info: Optional[str] = None  # 개인 정보
    clinic_info: Optional[str] = None  # 한의원 정보


class LearningDataResponse(BaseModel):
    success: bool
    message: str
    learned_count: int  # 학습된 텍스트 개수
    extracted_count: int  # 이번에 추출된 텍스트 개수
    preview_texts: Optional[List[str]] = None  # 추출된 텍스트 미리보기 (각각 처음 200자)


class RevisionRequest(BaseModel):
    original_draft: str  # 원본 초안
    revision_instruction: str  # 퇴고 지시사항
    save_for_learning: Optional[bool] = True  # 학습 데이터에 저장할지 여부


class RevisionResponse(BaseModel):
    revised_draft: str  # 퇴고된 초안
    word_count: int  # 글자 수
    learning_saved: bool  # 학습 데이터에 저장되었는지 여부


# 의료법 위반 단어 목록
MEDICAL_VIOLATION_WORDS = [
    "완치", "치료", "100%", "보장", "확실", "무조건",
    "최고", "최강", "유일", "독점", "비밀", "특허",
    "당장", "지금", "급하게", "즉시", "당일"
]


def check_medical_violations(text: str) -> list[str]:
    """의료법 위반 단어 검사"""
    violations = []
    text_lower = text.lower()
    for word in MEDICAL_VIOLATION_WORDS:
        if word in text_lower:
            violations.append(word)
    return violations


@router.post("/ai/draft", response_model=DraftResponse)
async def generate_draft(request: DraftRequest) -> DraftResponse:
    """
    Gemini API를 사용한 블로그 초안 생성
    """
    # 매번 최신 설정 로드
    settings = get_settings()
    print(f"[AI] generate_draft 호출 - google_api_key 설정 여부: {'있음' if settings.google_api_key else '없음'}")
    
    if not settings.google_api_key:
        raise HTTPException(
            status_code=501,
            detail="Gemini API key가 설정되지 않았습니다. .env 파일에 GOOGLE_API_KEY를 추가해주세요."
        )
    
    # Gemini API 설정
    configure_gemini()
    
    try:
        # 사용 가능한 모델 목록 확인
        try:
            available_models = genai.list_models()
            print(f"[AI] 사용 가능한 모델 목록:")
            model_names_found = []
            for model_info in available_models:
                if 'generateContent' in model_info.supported_generation_methods:
                    model_name = model_info.name.replace('models/', '')
                    model_names_found.append(model_name)
                    print(f"  - {model_name}")
            
            # 사용 가능한 모델이 있으면 첫 번째 모델 사용
            if model_names_found:
                model_name = model_names_found[0]
                print(f"[AI] 선택된 모델: {model_name}")
                model = genai.GenerativeModel(model_name)
            else:
                # 기본 모델 시도
                model_names = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                ]
                model = None
                for model_name in model_names:
                    try:
                        print(f"[AI] 모델 시도: {model_name}")
                        model = genai.GenerativeModel(model_name)
                        print(f"[AI] 모델 성공: {model_name}")
                        break
                    except Exception as e:
                        print(f"[AI] 모델 실패 ({model_name}): {str(e)}")
                        continue
                
                if model is None:
                    raise HTTPException(
                        status_code=500,
                        detail="사용 가능한 Gemini 모델을 찾을 수 없습니다. API 키를 확인하거나 다른 모델을 시도해주세요."
                    )
        except Exception as e:
            print(f"[AI] 모델 목록 조회 실패, 기본 모델 시도: {str(e)}")
            # 모델 목록 조회 실패 시 기본 모델 시도
            model = genai.GenerativeModel('gemini-1.5-flash')
        
        # 프롬프트 구성 (스타일별)
        keywords_text = ", ".join(request.keywords) if request.keywords else ""
        
        # 학습 데이터 로드
        learning_data = load_learning_data()
        learning_context = ""
        has_learning_data = False
        
        if learning_data:
            # "종성이가 씀 !" 스타일(박원장 스타일)일 때만 학습된 어투 강력하게 반영
            if request.tone == 'personal' and learning_data.get('blog_texts'):
                has_learning_data = True
                learning_context += f"\n\n=== [학습된 블로그 어투 예시 - 반드시 이 어투를 따라야 함] ===\n"
                # 최근 5개 텍스트 사용 (더 많은 예시 제공)
                sample_texts = learning_data['blog_texts'][-5:]
                for i, text in enumerate(sample_texts, 1):
                    # 각 텍스트의 충분한 부분 제공 (800자)
                    text_preview = text[:800] + "..." if len(text) > 800 else text
                    learning_context += f"\n[예시 {i} - 학습된 어투]\n{text_preview}\n"
                learning_context += "\n=== 위 예시들의 어투, 문장 구조, 표현 방식을 정확히 따라야 합니다 ===\n"
            
            # 스타일 규칙 반영 (영구적으로 저장된 스타일 규칙)
            style_rules = learning_data.get('style_rules', [])
            if style_rules:
                learning_context += f"\n\n=== [학습된 스타일 규칙 - 반드시 준수해야 함] ===\n"
                for i, rule in enumerate(style_rules, 1):
                    learning_context += f"{i}. {rule}\n"
                learning_context += "\n⚠️ 매우 중요: 위의 스타일 규칙을 반드시 준수하여 작성하세요. 이 규칙들은 사용자가 퇴고를 통해 영구적으로 설정한 것이므로 절대 위반하지 마세요.\n"
            
            # 퇴고 패턴에서 학습된 선호사항 반영
            revision_patterns = learning_data.get('revision_patterns', [])
            if revision_patterns:
                # 최근 퇴고 패턴들의 지시사항 분석
                recent_instructions = [p.get('revision_instruction', '') for p in revision_patterns[-10:]]
                if recent_instructions:
                    learning_context += f"\n\n=== [퇴고 패턴에서 학습된 선호사항] ===\n"
                    learning_context += "사용자가 자주 요청하는 수정 사항:\n"
                    for i, instruction in enumerate(recent_instructions[-5:], 1):  # 최근 5개
                        learning_context += f"{i}. {instruction}\n"
                    learning_context += "\n위의 선호사항을 참고하여 초안을 작성하세요.\n"
            
            # 개인 정보와 한의원 정보는 모든 스타일에서 활용
            if learning_data.get('personal_info'):
                learning_context += f"\n[개인 정보 - 글에 자연스럽게 반영]\n{learning_data['personal_info']}\n"
            
            if learning_data.get('clinic_info'):
                learning_context += f"\n[한의원 정보 - 글에 자연스럽게 반영]\n{learning_data['clinic_info']}\n"
        
        # 스타일별 프롬프트 설정
        style_prompts = {
            'diary': """문정역 한의원을 운영하는 원장으로서, 실생활 일기 스타일로 다음 주제에 대해 작성해주세요.
일기 스타일 요구사항:
- 일상적인 경험과 느낌을 솔직하고 자연스럽게 표현
- "오늘", "어제", "요즘" 같은 시간 표현 사용
- 개인적인 감정과 생각을 포함
- 대화체에 가까운 편안한 문체
- 약 500-800자 정도의 분량""",
            
            'blog': """문정역 한의원을 운영하는 원장으로서, 정보 전달 중심의 블로그 스타일로 다음 주제에 대해 작성해주세요.
블로그 스타일 요구사항:
- 독자에게 유용한 정보를 명확하게 전달
- 구조화된 내용 (소제목, 목록 등 활용 가능)
- 전문적이면서도 이해하기 쉬운 문체
- 객관적이고 신뢰감 있는 톤
- 약 500-800자 정도의 분량""",
            
            'essay': """문정역 한의원을 운영하는 원장으로서, 에세이 스타일로 다음 주제에 대해 작성해주세요.
에세이 스타일 요구사항:
- 깊이 있는 사고와 통찰을 담은 문체
- 서정적이고 감성적인 표현
- 개인적인 경험과 철학적 사고의 조화
- 문학적이고 세련된 문장 구성
- 약 500-800자 정도의 분량""",
            
            'personal': """문정역 한의원을 운영하는 박원장으로서, 개인적이고 친근하지만 존댓말로 다음 주제에 대해 작성해주세요.
"종성이가 씀 !" 스타일 요구사항:
- 개인적이고 친근한 어투이지만 반말은 절대 사용하지 않음 (무조건 존댓말)
- "~거든요", "~지요", "~네요", "~어요" 같은 친근한 존댓말 표현 사용
- ㅋㅋㅋ 같은 웃음 표현이나 이모티콘은 절대 사용하지 않음
- 마치 친한 지인에게 말하듯 편안하고 자연스러운 문체이지만 존댓말 유지
- "박원장"으로 지칭하며, "종성이"라는 표현은 절대 사용하지 않음
- 약 500-800자 정도의 분량"""
        }
        
        # 기본 스타일은 블로그
        style_instruction = style_prompts.get(request.tone, style_prompts['blog'])
        
        # "종성이가 씀 !" 스타일이고 학습 데이터가 있으면 강력한 지시사항 추가
        if request.tone == 'personal' and has_learning_data:
            style_instruction += """

⚠️ 매우 중요: 위의 "학습된 블로그 어투 예시"를 반드시 참고하여 작성하세요.
- 학습된 예시들의 문장 구조, 어투, 표현 방식을 정확히 따라야 합니다
- 예시에서 사용하는 존댓말 표현, 문장 끝맺음 방식을 그대로 사용하세요
- 예시의 톤과 느낌을 최대한 비슷하게 재현해야 합니다
- 반말, ㅋㅋㅋ, 이모티콘은 절대 사용하지 않으며, 무조건 존댓말로 작성하세요
- "종성이"라는 표현은 절대 사용하지 않고 "박원장"으로 지칭하세요
- 학습된 어투가 없다면 기본 "종성이가 씀 !" 스타일을 사용하세요 (단, 반말/이모티콘/종성이 지칭 금지)"""
        
        # 프롬프트 구성
        prompt_parts = [style_instruction]
        
        # 학습된 어투가 있으면 프롬프트 앞부분에 배치 (더 강조)
        if learning_context:
            prompt_parts.append(learning_context)
        
        # 글의 내용 지시사항이 있으면 프롬프트에 포함 (구체적인 사건, 경험을 박원장 스타일로 확장)
        content_instruction_text = ""
        if request.content_instruction:
            content_instruction_text = f"""
[글의 내용 - 반드시 이 내용을 중심으로 작성해야 함]
{request.content_instruction}

⚠️ 매우 중요: 위의 내용을 박원장의 개인적이고 친근한 스타일로 길게 늘려서 꾸며서 작성하세요.
- 간단히 언급된 사건이나 경험을 전후 사정, 배경, 감정, 치료 방식 등을 자세히 설명하며 확장하세요
- 구체적인 상황 묘사, 대화, 느낌 등을 추가하여 생생하게 표현하세요
- 박원장의 개인적이고 친근한 어투로 자연스럽게 풀어서 작성하세요 (단, 반말은 절대 사용하지 않고 존댓말로만 작성)
- ㅋㅋㅋ 같은 웃음 표현이나 이모티콘은 절대 사용하지 않습니다
- "종성이"라는 표현은 절대 사용하지 않고 "박원장"으로 지칭하세요
- 원래 내용의 핵심은 유지하되, 주변 상황과 배경을 풍부하게 추가하세요
"""
        
        # 글쓰기 지시사항이 있으면 프롬프트에 포함 (구조, 길이, 타겟, 키워드 배치 등)
        writing_instruction_text = ""
        if request.writing_instruction:
            writing_instruction_text = f"""
[글쓰기 지시사항 - 글의 구조, 길이, 타겟, 키워드 배치 등]
{request.writing_instruction}

⚠️ 중요: 위의 글쓰기 지시사항을 반드시 반영하여 작성하세요. 지시사항에 명시된 구조, 길이, 타겟, 키워드 배치 등을 정확히 따라야 합니다.
"""
        
        prompt_parts.append(f"""
주제: {request.topic}
키워드: {keywords_text if keywords_text else "없음"}
{content_instruction_text}
{writing_instruction_text}
공통 요구사항:
1. 의료법을 준수하며, 과장된 표현을 사용하지 않습니다.
2. 지역(문정역, 송파구) 정보를 자연스럽게 포함합니다.
3. 한의원의 서비스(추나요법, 산후보약, 교통사고 후유증 등)를 소개합니다.""")
        
        if request.tone == 'personal' and has_learning_data:
            prompt_parts.append("""
4. ⚠️ 가장 중요: 위의 "학습된 블로그 어투 예시"를 정확히 따라야 합니다.
   - 예시의 문장 구조, 어투, 표현 방식을 그대로 재현하세요
   - 예시에서 사용하는 구어체, 감탄사, 문장 끝맺음을 그대로 사용하세요
   - 예시의 톤과 느낌을 최대한 비슷하게 맞추세요""")
        
        prompt_parts.append("\n초안:")
        
        prompt = "\n".join(prompt_parts)
        
        response = model.generate_content(prompt)
        draft_text = response.text
        
        # 의료법 위반 단어 검사
        violations = check_medical_violations(draft_text)
        
        return DraftResponse(
            topic=request.topic,
            draft=draft_text,
            word_count=len(draft_text),
            medical_violations=violations
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"초안 생성 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/ai/image", response_model=ImageResponse)
async def generate_image(request: ImageRequest) -> ImageResponse:
    """
    Gemini API를 사용한 이미지 생성 (향후 구현)
    현재는 플레이스홀더 반환
    """
    # 매번 최신 설정 로드
    settings = get_settings()
    if not settings.google_api_key:
        raise HTTPException(
            status_code=501,
            detail="Gemini API key가 설정되지 않았습니다."
        )
    
    # Gemini는 현재 이미지 생성 기능이 제한적이므로
    # 향후 이미지 생성 API 연동 시 구현
    return ImageResponse(
        prompt=request.prompt,
        preview_url=f"https://placehold.co/800x450/46875a/ffffff?text={request.prompt.replace(' ', '+')}"
    )


@router.post("/ai/crawl-blog-urls", response_model=BlogCrawlResponse)
async def crawl_blog_urls(request: BlogCrawlRequest) -> BlogCrawlResponse:
    """
    네이버 블로그에서 모든 포스트 URL을 추출합니다.
    """
    try:
        print(f"[블로그 크롤링] 시작: {request.blog_url}")
        
        # 블로그에서 포스트 URL 추출
        post_urls = await extract_blog_post_urls(request.blog_url, max_pages=10)
        
        # 최대 포스트 수 제한
        if request.max_posts:
            post_urls = post_urls[:request.max_posts]
        
        if not post_urls:
            return BlogCrawlResponse(
                success=False,
                message="포스트 URL을 찾을 수 없습니다. 블로그 URL을 확인해주세요.",
                post_urls=[],
                total_count=0
            )
        
        return BlogCrawlResponse(
            success=True,
            message=f"{len(post_urls)}개의 포스트 URL을 추출했습니다.",
            post_urls=post_urls,
            total_count=len(post_urls)
        )
    
    except Exception as e:
        print(f"[블로그 크롤링] 오류: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"블로그 URL 추출 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/ai/check-violations")
async def check_violations(text: str) -> dict:
    """
    텍스트의 의료법 위반 단어 검사
    """
    violations = check_medical_violations(text)
    return {
        "text": text,
        "violations": violations,
        "has_violations": len(violations) > 0
    }


@router.post("/ai/learn", response_model=LearningDataResponse)
async def learn_writing_style(request: LearningDataRequest) -> LearningDataResponse:
    """
    블로그 텍스트를 학습하여 어투를 저장합니다.
    URL 또는 직접 입력한 텍스트 모두 지원
    블로그 메인 URL을 제공하면 모든 포스트를 자동으로 추출하여 학습합니다.
    """
    try:
        # 기존 학습 데이터 로드
        learning_data = load_learning_data()
        
        # 새로운 데이터 추가
        if 'blog_texts' not in learning_data:
            learning_data['blog_texts'] = []
        
        extracted_texts = []
        all_blog_urls = []
        
        # 블로그 메인 URL에서 모든 포스트 URL 추출
        if request.blog_main_url:
            try:
                print(f"[학습] 블로그 메인 URL에서 포스트 추출 시작: {request.blog_main_url}")
                post_urls = await extract_blog_post_urls(request.blog_main_url.strip(), max_pages=100)
                if post_urls:
                    all_blog_urls.extend(post_urls)
                    print(f"[학습] {len(post_urls)}개의 포스트 URL 추출 완료")
                else:
                    print(f"[학습] 포스트 URL을 찾을 수 없습니다. 메인 URL 자체를 크롤링 시도합니다.")
                    # 포스트 URL을 찾지 못하면 메인 URL 자체를 크롤링 시도
                    all_blog_urls.append(request.blog_main_url.strip())
            except Exception as e:
                print(f"[학습] 블로그 메인 URL 크롤링 실패: {str(e)}")
                # 실패해도 계속 진행
        
        # 기존 블로그 URL 목록 추가
        if request.blog_urls:
            all_blog_urls.extend(request.blog_urls)
        
        # 블로그 URL 크롤링
        if all_blog_urls:
            print(f"[학습] 총 {len(all_blog_urls)}개의 URL 크롤링 시작")
            for i, url in enumerate(all_blog_urls, 1):
                if url.strip():
                    try:
                        print(f"[학습] [{i}/{len(all_blog_urls)}] URL 크롤링 시작: {url}")
                        text = await crawl_blog(url.strip())
                        if text and len(text.strip()) > 50:
                            extracted_texts.append(text.strip())
                            print(f"[학습] URL에서 텍스트 추출 성공: {len(text)}자")
                        else:
                            print(f"[학습] URL에서 추출한 텍스트가 너무 짧음: {len(text) if text else 0}자")
                        # API 제한 방지를 위해 요청 간 간격
                        if i < len(all_blog_urls):
                            await asyncio.sleep(0.5)
                    except Exception as e:
                        print(f"[학습] URL 크롤링 실패 ({url}): {str(e)}")
                        # URL 크롤링 실패해도 계속 진행
        
        # 직접 입력한 블로그 텍스트 추가
        if request.blog_texts:
            for text in request.blog_texts:
                if text.strip():
                    extracted_texts.append(text.strip())
        
        # 추출된 텍스트를 학습 데이터에 추가
        for text in extracted_texts:
            if text.strip() and len(text.strip()) > 50:  # 최소 50자 이상만 저장
                learning_data['blog_texts'].append(text.strip())
        
        # 개인 정보 업데이트
        if request.personal_info:
            learning_data['personal_info'] = request.personal_info.strip()
        
        # 한의원 정보 업데이트
        if request.clinic_info:
            learning_data['clinic_info'] = request.clinic_info.strip()
        
        # 업데이트 시간 기록
        learning_data['updated_at'] = datetime.now().isoformat()
        
        # 저장
        save_learning_data(learning_data)
        
        message_parts = []
        if request.blog_main_url:
            message_parts.append(f"블로그 메인 URL에서 {len(all_blog_urls)}개의 포스트 추출")
        if request.blog_urls:
            message_parts.append(f"{len(request.blog_urls)}개의 개별 포스트 URL")
        if request.blog_texts:
            message_parts.append(f"{len(request.blog_texts)}개의 직접 입력 텍스트")
        
        message = f"{', '.join(message_parts)}가 학습되었습니다. (총 {len(extracted_texts)}개 텍스트 추출)"
        
        # 추출된 텍스트 미리보기 (각각 처음 200자)
        preview_texts = [text[:200] + "..." if len(text) > 200 else text for text in extracted_texts[:5]]  # 최대 5개만
        
        return LearningDataResponse(
            success=True,
            message=message,
            learned_count=len(learning_data['blog_texts']),
            extracted_count=len(extracted_texts),
            preview_texts=preview_texts if preview_texts else None
        )
    except Exception as e:
        print(f"[학습] 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"학습 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/ai/learning-status")
async def get_learning_status() -> dict:
    """
    현재 학습 상태를 조회합니다.
    """
    learning_data = load_learning_data()
    blog_texts = learning_data.get('blog_texts', [])
    revision_patterns = learning_data.get('revision_patterns', [])
    style_rules = learning_data.get('style_rules', [])
    
    # 학습된 텍스트 미리보기 (최근 3개, 각각 처음 150자)
    preview_texts = []
    if blog_texts:
        for text in blog_texts[-3:]:  # 최근 3개
            preview = text[:150] + "..." if len(text) > 150 else text
            preview_texts.append(preview)
    
    # 퇴고 패턴 요약 생성
    revision_summary = []
    if revision_patterns:
        # 최근 퇴고 패턴들의 지시사항을 분석하여 요약
        recent_instructions = [p.get('revision_instruction', '') for p in revision_patterns[-10:]]
        
        # 자주 나타나는 키워드 추출
        common_keywords = {}
        for instruction in recent_instructions:
            words = instruction.split()
            for word in words:
                if len(word) > 2:  # 2글자 이상만
                    common_keywords[word] = common_keywords.get(word, 0) + 1
        
        # 상위 5개 키워드
        top_keywords = sorted(common_keywords.items(), key=lambda x: x[1], reverse=True)[:5]
        if top_keywords:
            revision_summary = [f"{word} ({count}회)" for word, count in top_keywords]
    
    return {
        "has_learning_data": len(learning_data) > 0,
        "blog_texts_count": len(blog_texts),
        "revision_patterns_count": len(revision_patterns),
        "style_rules_count": len(style_rules),
        "style_rules": style_rules,  # 학습된 스타일 규칙 전체 목록
        "has_personal_info": bool(learning_data.get('personal_info')),
        "has_clinic_info": bool(learning_data.get('clinic_info')),
        "updated_at": learning_data.get('updated_at'),
        "preview_texts": preview_texts,  # 최근 학습된 텍스트 미리보기
        "revision_summary": revision_summary,  # 퇴고 패턴 요약
        "personal_info_preview": learning_data.get('personal_info', '')[:100] + "..." if learning_data.get('personal_info') and len(learning_data.get('personal_info', '')) > 100 else learning_data.get('personal_info', ''),
        "clinic_info_preview": learning_data.get('clinic_info', '')[:100] + "..." if learning_data.get('clinic_info') and len(learning_data.get('clinic_info', '')) > 100 else learning_data.get('clinic_info', '')
    }


@router.post("/ai/revise", response_model=RevisionResponse)
async def revise_draft(request: RevisionRequest) -> RevisionResponse:
    """
    초안을 퇴고 지시사항에 따라 수정합니다.
    """
    # 매번 최신 설정 로드
    settings = get_settings()
    print(f"[AI] revise_draft 호출 - google_api_key 설정 여부: {'있음' if settings.google_api_key else '없음'}")
    
    if not settings.google_api_key:
        raise HTTPException(
            status_code=501,
            detail="Gemini API key가 설정되지 않았습니다. .env 파일에 GOOGLE_API_KEY를 추가해주세요."
        )
    
    # Gemini API 설정
    configure_gemini()
    
    try:
        # 사용 가능한 모델 목록 확인
        try:
            available_models = genai.list_models()
            model_names_found = []
            for model_info in available_models:
                if 'generateContent' in model_info.supported_generation_methods:
                    model_name = model_info.name.replace('models/', '')
                    model_names_found.append(model_name)
            
            if model_names_found:
                model_name = model_names_found[0]
                model = genai.GenerativeModel(model_name)
            else:
                model_names = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-pro-latest',
                    'gemini-1.5-flash',
                    'gemini-1.5-pro',
                ]
                model = None
                for model_name in model_names:
                    try:
                        model = genai.GenerativeModel(model_name)
                        break
                    except Exception:
                        continue
                
                if model is None:
                    raise HTTPException(
                        status_code=500,
                        detail="사용 가능한 Gemini 모델을 찾을 수 없습니다."
                    )
        except Exception:
            model = genai.GenerativeModel('gemini-1.5-flash')
        
        # 학습 데이터 로드 (퇴고 시에도 학습된 어투 반영)
        learning_data = load_learning_data()
        learning_context = ""
        if learning_data:
            # 스타일 규칙 반영 (영구적으로 저장된 스타일 규칙)
            style_rules = learning_data.get('style_rules', [])
            if style_rules:
                learning_context += f"\n\n=== [학습된 스타일 규칙 - 반드시 준수해야 함] ===\n"
                for i, rule in enumerate(style_rules, 1):
                    learning_context += f"{i}. {rule}\n"
                learning_context += "\n⚠️ 매우 중요: 위의 스타일 규칙을 반드시 준수하여 퇴고하세요. 이 규칙들은 사용자가 이전 퇴고를 통해 영구적으로 설정한 것이므로 절대 위반하지 마세요.\n"
            
            if learning_data.get('blog_texts'):
                learning_context += f"\n\n[학습된 블로그 어투 예시 - 참고용]\n"
                sample_texts = learning_data['blog_texts'][-3:]
                for i, text in enumerate(sample_texts, 1):
                    text_preview = text[:500] + "..." if len(text) > 500 else text
                    learning_context += f"예시 {i}:\n{text_preview}\n\n"
        
        # 퇴고 프롬프트 구성
        prompt = f"""다음은 블로그 초안입니다. 사용자의 퇴고 지시사항에 따라 수정해주세요.

[원본 초안]
{request.original_draft}

[퇴고 지시사항]
{request.revision_instruction}

요구사항:
1. 퇴고 지시사항을 정확히 반영하여 수정하세요.
2. 원본 초안의 핵심 내용과 구조는 유지하되, 지시사항에 따라 어투, 문장 구조, 표현 방식을 변경하세요.
3. 의료법을 준수하며, 과장된 표현을 사용하지 않습니다.
4. 지역(문정역, 송파구) 정보와 한의원 서비스를 자연스럽게 포함합니다.
{learning_context if learning_context else ""}
5. {"학습된 어투 예시를 참고하여 자연스러운 어투를 사용하세요." if learning_context else ""}

수정된 초안:"""
        
        response = model.generate_content(prompt)
        revised_text = response.text
        
        # 의료법 위반 단어 검사
        violations = check_medical_violations(revised_text)
        if violations:
            print(f"[퇴고] 의료법 위반 단어 감지: {violations}")
        
        # 퇴고 학습 데이터 저장
        learning_saved = False
        if request.save_for_learning:
            try:
                learning_data = load_learning_data()
                
                # revision_patterns 초기화
                if 'revision_patterns' not in learning_data:
                    learning_data['revision_patterns'] = []
                
                # 퇴고 패턴 저장 (원본, 수정본, 지시사항)
                revision_pattern = {
                    'original_draft': request.original_draft,
                    'revised_draft': revised_text,
                    'revision_instruction': request.revision_instruction,
                    'created_at': datetime.now().isoformat()
                }
                
                learning_data['revision_patterns'].append(revision_pattern)
                
                # 최대 50개까지만 저장 (오래된 것부터 삭제)
                if len(learning_data['revision_patterns']) > 50:
                    learning_data['revision_patterns'] = learning_data['revision_patterns'][-50:]
                
                # 스타일 규칙 추출 및 저장 (퇴고 지시사항에서 스타일 관련 규칙 추출)
                style_keywords = ['반말', '존댓말', 'ㅋㅋ', '이모티콘', '종성이', '박원장', '스타일', '어투', '톤']
                if any(keyword in request.revision_instruction for keyword in style_keywords):
                    # 스타일 규칙 저장
                    if 'style_rules' not in learning_data:
                        learning_data['style_rules'] = []
                    
                    # 중복 체크 (같은 규칙이 이미 있으면 추가하지 않음)
                    style_rule = request.revision_instruction.strip()
                    if style_rule not in learning_data['style_rules']:
                        learning_data['style_rules'].append(style_rule)
                        # 최대 20개까지만 저장
                        if len(learning_data['style_rules']) > 20:
                            learning_data['style_rules'] = learning_data['style_rules'][-20:]
                        print(f"[퇴고 학습] 스타일 규칙 저장: {style_rule[:50]}...")
                
                # 업데이트 시간 기록
                learning_data['updated_at'] = datetime.now().isoformat()
                
                # 저장
                save_learning_data(learning_data)
                learning_saved = True
                print(f"[퇴고 학습] 퇴고 패턴 저장 완료 (총 {len(learning_data['revision_patterns'])}개)")
            except Exception as e:
                print(f"[퇴고 학습] 저장 실패: {str(e)}")
                import traceback
                print(traceback.format_exc())
        
        return RevisionResponse(
            revised_draft=revised_text,
            word_count=len(revised_text),
            learning_saved=learning_saved
        )
    
    except Exception as e:
        print(f"[퇴고] 오류 발생: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"퇴고 중 오류가 발생했습니다: {str(e)}"
        )

