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
    writing_instruction: Optional[str] = None  # 글쓰기 지시사항
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


class LearningDataRequest(BaseModel):
    blog_texts: Optional[List[str]] = None  # 블로그 텍스트 목록
    blog_urls: Optional[List[str]] = None  # 블로그 URL 목록
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


class RevisionResponse(BaseModel):
    revised_draft: str  # 퇴고된 초안
    word_count: int  # 글자 수


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
            # "종성이가 씀 !" 스타일일 때만 학습된 어투 강력하게 반영
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
            
            'personal': """문정역 한의원을 운영하는 종성이 원장으로서, 개인적이고 친근한 어투로 다음 주제에 대해 작성해주세요.
"종성이가 씀 !" 스타일 요구사항:
- 매우 개인적이고 친근한 어투
- "~거든", "~지", "~어", "~네" 같은 구어체 표현 사용
- 감탄사나 이모티콘 같은 표현 자연스럽게 사용 가능
- 마치 친구에게 말하듯 편안하고 자연스러운 문체
- "종성이가 씀 !" 같은 개인적 서명 느낌
- 약 500-800자 정도의 분량"""
        }
        
        # 기본 스타일은 블로그
        style_instruction = style_prompts.get(request.tone, style_prompts['blog'])
        
        # "종성이가 씀 !" 스타일이고 학습 데이터가 있으면 강력한 지시사항 추가
        if request.tone == 'personal' and has_learning_data:
            style_instruction += """

⚠️ 매우 중요: 위의 "학습된 블로그 어투 예시"를 반드시 참고하여 작성하세요.
- 학습된 예시들의 문장 구조, 어투, 표현 방식을 정확히 따라야 합니다
- 예시에서 사용하는 구어체 표현, 감탄사, 문장 끝맺음 방식을 그대로 사용하세요
- 예시의 톤과 느낌을 최대한 비슷하게 재현해야 합니다
- 학습된 어투가 없다면 기본 "종성이가 씀 !" 스타일을 사용하세요"""
        
        # 프롬프트 구성
        prompt_parts = [style_instruction]
        
        # 학습된 어투가 있으면 프롬프트 앞부분에 배치 (더 강조)
        if learning_context:
            prompt_parts.append(learning_context)
        
        # 글쓰기 지시사항이 있으면 프롬프트에 포함
        writing_instruction_text = ""
        if request.writing_instruction:
            writing_instruction_text = f"""
[글쓰기 지시사항]
{request.writing_instruction}

⚠️ 중요: 위의 글쓰기 지시사항을 반드시 반영하여 작성하세요. 지시사항에 명시된 내용, 구조, 설명 방식을 정확히 따라야 합니다.
"""
        
        prompt_parts.append(f"""
주제: {request.topic}
키워드: {keywords_text if keywords_text else "없음"}
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
    """
    try:
        # 기존 학습 데이터 로드
        learning_data = load_learning_data()
        
        # 새로운 데이터 추가
        if 'blog_texts' not in learning_data:
            learning_data['blog_texts'] = []
        
        extracted_texts = []
        
        # 블로그 URL 크롤링
        if request.blog_urls:
            for url in request.blog_urls:
                if url.strip():
                    try:
                        print(f"[학습] URL 크롤링 시작: {url}")
                        text = await crawl_blog(url.strip())
                        if text and len(text.strip()) > 50:
                            extracted_texts.append(text.strip())
                            print(f"[학습] URL에서 텍스트 추출 성공: {len(text)}자")
                        else:
                            print(f"[학습] URL에서 추출한 텍스트가 너무 짧음: {len(text) if text else 0}자")
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
        if request.blog_urls:
            success_count = len([url for url in request.blog_urls if url.strip()])
            message_parts.append(f"{success_count}개의 블로그 URL에서 텍스트 추출")
        if request.blog_texts:
            message_parts.append(f"{len(request.blog_texts)}개의 직접 입력 텍스트")
        
        message = f"{', '.join(message_parts)}가 학습되었습니다. (총 {len(extracted_texts)}개)"
        
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
    
    # 학습된 텍스트 미리보기 (최근 3개, 각각 처음 150자)
    preview_texts = []
    if blog_texts:
        for text in blog_texts[-3:]:  # 최근 3개
            preview = text[:150] + "..." if len(text) > 150 else text
            preview_texts.append(preview)
    
    return {
        "has_learning_data": len(learning_data) > 0,
        "blog_texts_count": len(blog_texts),
        "has_personal_info": bool(learning_data.get('personal_info')),
        "has_clinic_info": bool(learning_data.get('clinic_info')),
        "updated_at": learning_data.get('updated_at'),
        "preview_texts": preview_texts,  # 최근 학습된 텍스트 미리보기
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
        
        return RevisionResponse(
            revised_draft=revised_text,
            word_count=len(revised_text)
        )
    
    except Exception as e:
        print(f"[퇴고] 오류 발생: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"퇴고 중 오류가 발생했습니다: {str(e)}"
        )

