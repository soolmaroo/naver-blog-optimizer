import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function AIEditor() {
  const [topic, setTopic] = useState('손목통증');
  const [keywords, setKeywords] = useState('문정역 한의원, 문정역 교통사고 한의원');
  const [writingInstruction, setWritingInstruction] = useState('글의 구조는 서론 - 본론 - 결론으로 자연스럽게 이어지면서 키워드를 넣을 수 있게. 추나 하다가 손목이 나가서 부원장에게 치료 받았는데, 이걸 앞뒤 살을 잘 붙여서 이런저런 이야기가 조금 더 들어가게 꾸며줘. 손목 통증에 대한 전문 자료 하나 넣고, 손목 통증에 대한 자료에서 나온 걸 표로 하나 넣고, 사진이나 일러스트도 하나 넣어줘. 사진이나 일러스트는 못찾으면 적당히 생성해서 넣어줘.'); // 글쓰기 지시사항 (구조, 길이, 타겟, 키워드 배치 등)
  const [contentInstruction, setContentInstruction] = useState('박원장이 추나하다가 손목 다친 이야기'); // 글의 내용 지시사항 (구체적인 사건, 경험 등)
  const [draft, setDraft] = useState('');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [writingStyle, setWritingStyle] = useState('personal'); // 'diary', 'blog', 'essay', 'personal' - 기본값: 'personal' (종성이가 씀 !)
  
  // 퇴고 관련 상태
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [revisedDraft, setRevisedDraft] = useState('');
  const [revisedViolations, setRevisedViolations] = useState([]); // 퇴고된 버전의 의료법 위반 사항
  const [revising, setRevising] = useState(false);
  const [finalDraft, setFinalDraft] = useState(''); // 최종 결정된 버전
  
  // 학습 관련 상태
  const [showLearning, setShowLearning] = useState(false);
  const [blogMainUrl, setBlogMainUrl] = useState(''); // 블로그 메인 URL
  const [blogUrls, setBlogUrls] = useState(''); // 개별 포스트 URL
  const [blogTexts, setBlogTexts] = useState('');
  const [personalInfo, setPersonalInfo] = useState('');
  const [clinicInfo, setClinicInfo] = useState('');
  const [cookies, setCookies] = useState(''); // 네이버 로그인 쿠키
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState(null);
  
  // 우클릭 컨텍스트 메뉴 관련 상태
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTarget, setContextMenuTarget] = useState(null); // 'draft', 'revised', 'final'
  const [contextMenuCursorPos, setContextMenuCursorPos] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [tableType, setTableType] = useState('statistics');
  const [insertingImage, setInsertingImage] = useState(false);
  const [insertingTable, setInsertingTable] = useState(false);
  
  // 이미지 관련 상태
  const [uploadedImages, setUploadedImages] = useState({ draft: [], revised: [], final: [] }); // 각 에디터별 이미지 목록
  
  // 프리뷰 모드 상태 (텍스트/프리뷰 전환)
  const [previewMode, setPreviewMode] = useState({ draft: true, revised: true, final: true }); // 기본값을 프리뷰 모드로 설정
  // 편집 모드 상태 (포커스 중일 때만 텍스트 모드)
  const [editingMode, setEditingMode] = useState({ draft: false, revised: false, final: false });
  
  // 마크다운을 HTML로 변환하는 함수
  const markdownToHtml = (text) => {
    if (!text) return '';
    
    let html = text;
    
    // HTML 특수문자 이스케이프 (XSS 방지)
    const escapeHtml = (str) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return str.replace(/[&<>"']/g, (m) => map[m]);
    };
    
    // 이미지 마크다운 변환: ![alt](url) -> <img src="url" alt="alt" />
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      const escapedUrl = escapeHtml(url);
      const escapedAlt = escapeHtml(alt || '이미지');
      return `<div class="my-4 flex justify-center"><img src="${escapedUrl}" alt="${escapedAlt}" class="max-w-full h-auto rounded-lg border border-slate-300 shadow-sm cursor-pointer hover:opacity-90 transition-opacity" style="max-width: 100%; height: auto; max-height: 500px;" onclick="window.open('${escapedUrl}', '_blank')" onerror="this.onerror=null; this.src='https://placehold.co/400x300/cccccc/666666?text=이미지+로드+실패'" /></div>`;
    });
    
    // 링크 마크다운 변환: [text](url) -> <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      const escapedUrl = escapeHtml(url);
      const escapedText = escapeHtml(text);
      return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-clinicGreen-600 hover:text-clinicGreen-700 underline">${escapedText}</a>`;
    });
    
    // 강조 표시: **text** -> <strong>text</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // 줄바꿈 처리 (연속된 줄바꿈은 단락 구분)
    html = html.replace(/\n\n+/g, '</p><p class="my-2">');
    html = html.replace(/\n/g, '<br />');
    html = '<p class="my-2">' + html + '</p>';
    
    return html;
  };

  const handleGenerate = async (style = writingStyle) => {
    if (!topic.trim()) return;

    try {
      setLoading(true);
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      // 타임아웃 설정 (120초 = 2분)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      const response = await fetch(`${API_BASE_URL}/ai/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          keywords: keywordList.length > 0 ? keywordList : undefined,
          writing_instruction: writingInstruction.trim() || undefined, // 글쓰기 지시사항 (구조, 길이, 타겟 등)
          content_instruction: contentInstruction.trim() || undefined, // 글의 내용 지시사항 (구체적인 사건, 경험 등)
          tone: style, // 'diary', 'blog', 'essay', 'personal'
          length: 'medium'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '초안 생성 실패');
      }

      const data = await response.json();
      setDraft(data.draft);
      setViolations(data.medical_violations || []);
      setWordCount(data.word_count || 0);
      
      // 초안에서 이미지 마크다운 파싱하여 이미지 목록에 추가
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const foundImages = [];
      let match;
      while ((match = imageRegex.exec(data.draft)) !== null) {
        foundImages.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url: match[2],
          alt: match[1] || '이미지',
          markdown: match[0]
        });
      }
      
      // 이미지가 포함되어 있으면 로그만 출력 (이제 항상 이미지가 표시됨)
      if (foundImages.length > 0) {
        console.log(`[프론트엔드] 이미지 ${foundImages.length}개가 포함되어 있습니다.`);
      }
      
      // 초안 생성 시 퇴고 관련 상태 초기화
      setRevisedDraft('');
      setRevisedViolations([]);
      setRevisionInstruction('');
      setFinalDraft('');
      // 이미지 목록 초기화 후 파싱된 이미지 추가
      setUploadedImages({ 
        draft: foundImages, 
        revised: [], 
        final: [] 
      });
      // 편집 모드 해제, 프리뷰 모드 활성화 (이미지가 바로 보이도록)
      setEditingMode({ draft: false, revised: false, final: false });
      setPreviewMode({ draft: true, revised: true, final: true });
      // 내용 지시사항은 유지 (재사용 가능)
    } catch (error) {
      console.error('초안 생성 실패:', error);
      if (error.name === 'AbortError') {
        alert('초안 생성 시간이 초과되었습니다 (2분). 이미지 생성 요청이 포함되어 있으면 제거하고 다시 시도해주세요.');
      } else {
        alert(error.message || '초안 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckViolations = async () => {
    if (!draft.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/ai/check-violations?text=${encodeURIComponent(draft)}`);
      const data = await response.json();
      setViolations(data.violations || []);
    } catch (error) {
      console.error('위반 단어 검사 실패:', error);
    }
  };

  const handleRevise = async (useRevisedDraft = false) => {
    // 퇴고할 텍스트 선택: revisedDraft가 있고 useRevisedDraft가 true이면 revisedDraft 사용, 아니면 draft 사용
    const textToRevise = (useRevisedDraft && revisedDraft.trim()) ? revisedDraft : draft;
    
    if (!textToRevise.trim() || !revisionInstruction.trim()) {
      alert('퇴고할 텍스트와 퇴고 지시사항을 모두 입력해주세요.');
      return;
    }

    try {
      setRevising(true);
      // 새로운 퇴고 결과를 위해 기존 revisedDraft는 유지 (이전 버전 보존)
      // 새로운 퇴고 결과는 revisedDraft에 덮어쓰기
      
      const response = await fetch(`${API_BASE_URL}/ai/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_draft: textToRevise,
          revision_instruction: revisionInstruction.trim(),
          save_for_learning: true,  // 모든 퇴고를 학습 패턴에 반영
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '퇴고 실패');
      }

      const data = await response.json();
      setRevisedDraft(data.revised_draft);
      setRevisedViolations(data.medical_violations || []); // 퇴고된 버전의 위반 사항 저장
      
      // 학습 저장 여부 표시
      if (data.learning_saved) {
        console.log('퇴고 패턴이 학습 데이터에 저장되었습니다.');
        // 학습 상태 새로고침
        loadLearningStatus();
      }
      
      // 위반 사항이 있으면 알림
      if (data.medical_violations && data.medical_violations.length > 0) {
        console.warn('퇴고된 버전에 의료법 위반 소지가 있습니다:', data.medical_violations);
      }
    } catch (error) {
      console.error('퇴고 실패:', error);
      alert(error.message || '퇴고 중 오류가 발생했습니다.');
    } finally {
      setRevising(false);
    }
  };

  const handleLearn = async () => {
    if (!blogMainUrl.trim() && !blogUrls.trim() && !blogTexts.trim() && !personalInfo.trim() && !clinicInfo.trim()) {
      alert('학습할 내용을 입력해주세요. (블로그 메인 URL, 개별 URL 또는 텍스트)');
      return;
    }

    try {
      setLearningLoading(true);
      
      // 블로그 메인 URL 처리
      const mainUrl = blogMainUrl.trim() || undefined;
      
      // 개별 URL 목록 파싱 (줄바꿈 또는 쉼표로 구분)
      const urlList = blogUrls
        .split(/[,\n]/)
        .map(url => url.trim())
        .filter(url => url && (url.startsWith('http://') || url.startsWith('https://')));
      
      // 텍스트를 통으로 하나로 처리 (빈 줄로 나누지 않음)
      const textToLearn = blogTexts.trim() || undefined;
      
      const response = await fetch(`${API_BASE_URL}/ai/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blog_main_url: mainUrl,
          blog_urls: urlList.length > 0 ? urlList : undefined,
          blog_texts: textToLearn ? [textToLearn] : undefined,
          personal_info: personalInfo.trim() || undefined,
          clinic_info: clinicInfo.trim() || undefined,
          cookies: cookies.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '학습 실패');
      }

      const data = await response.json();
      
      // 학습 결과를 상세히 표시
      let resultMessage = data.message || '학습이 완료되었습니다!';
      if (data.extracted_count > 0) {
        resultMessage += `\n\n이번에 추출된 텍스트: ${data.extracted_count}개`;
        resultMessage += `\n전체 학습된 텍스트: ${data.learned_count}개`;
      }
      
      // 미리보기 텍스트가 있으면 표시
      if (data.preview_texts && data.preview_texts.length > 0) {
        resultMessage += '\n\n[추출된 텍스트 미리보기]';
        data.preview_texts.forEach((preview, idx) => {
          resultMessage += `\n\n${idx + 1}. ${preview}`;
        });
      }
      
      alert(resultMessage);
      setBlogMainUrl('');
      setBlogUrls('');
      setBlogTexts('');
      setPersonalInfo('');
      setClinicInfo('');
      setCookies(''); // 쿠키는 유지하지 않고 초기화 (보안상의 이유)
      loadLearningStatus();
    } catch (error) {
      console.error('학습 실패:', error);
      alert(error.message || '학습 중 오류가 발생했습니다.');
    } finally {
      setLearningLoading(false);
    }
  };

  const loadLearningStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/learning-status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setLearningStatus(data);
    } catch (error) {
      console.error('학습 상태 조회 실패:', error);
      // 에러 발생 시 기본값 설정 (로딩 상태가 계속 표시되지 않도록)
      setLearningStatus({
        has_learning_data: false,
        blog_texts_count: 0,
        revision_patterns_count: 0,
        style_rules_count: 0,
        style_rules: [],
        revision_summary: [],
        preview_texts: [],
        updated_at: null,
        personal_info_preview: '',
        clinic_info_preview: ''
      });
    }
  };

  // 컴포넌트 마운트 시 학습 상태 조회
  useEffect(() => {
    loadLearningStatus();
  }, []);

  // 우클릭 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // textarea에서 우클릭 이벤트 처리
  const handleContextMenu = (e, target) => {
    e.preventDefault();
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    
    setContextMenuTarget(target);
    setContextMenuCursorPos(cursorPos);
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  };

  // 이미지 붙여넣기 처리
  const handlePaste = async (e, target) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 이미지 파일인 경우
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await insertImage(file, target);
          alert('이미지가 붙여넣어졌습니다!');
        }
        return;
      }
    }
  };

  // 드래그앤드롭 처리
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        await insertImage(file, target);
      }
      alert(`${imageFiles.length}개의 이미지가 삽입되었습니다!`);
    }
  };

  // 커서 위치에 텍스트 삽입
  const insertTextAtCursor = (text, target) => {
    let currentText = '';
    let setter = null;
    
    if (target === 'draft') {
      currentText = draft;
      setter = setDraft;
    } else if (target === 'revised') {
      currentText = revisedDraft;
      setter = setRevisedDraft;
    } else if (target === 'final') {
      currentText = finalDraft;
      setter = setFinalDraft;
    }
    
    if (setter) {
      const before = currentText.substring(0, contextMenuCursorPos);
      const after = currentText.substring(contextMenuCursorPos);
      const newText = before + '\n\n' + text + '\n\n' + after;
      setter(newText);
      
      // 글자 수 업데이트
      if (target === 'draft') {
        setWordCount(newText.length);
      }
    }
  };

  // 이미지 파일을 base64로 변환
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 이미지 삽입 (파일 또는 URL)
  const insertImage = async (imageSource, target) => {
    let imageUrl = '';
    let imageAlt = '삽입된 이미지';

    // 이미지 소스가 파일인지 URL인지 확인
    if (imageSource instanceof File) {
      // 파일인 경우 base64로 변환
      imageUrl = await fileToBase64(imageSource);
      imageAlt = imageSource.name;
    } else if (typeof imageSource === 'string') {
      // URL인 경우
      imageUrl = imageSource;
    } else {
      console.error('잘못된 이미지 소스:', imageSource);
      return;
    }

    // 마크다운 형식으로 삽입
    const markdown = `![${imageAlt}](${imageUrl})`;
    insertTextAtCursor(markdown, target);

    // 이미지 목록에 추가 (미리보기용)
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newImage = {
      id: imageId,
      url: imageUrl,
      alt: imageAlt,
      markdown: markdown
    };
    
    setUploadedImages(prev => ({
      ...prev,
      [target]: [...prev[target], newImage]
    }));
  };

  // 이미지 삭제
  const removeImage = (imageId, target) => {
    setUploadedImages(prev => ({
      ...prev,
      [target]: prev[target].filter(img => img.id !== imageId)
    }));
    
    // 마크다운에서도 제거
    let currentText = '';
    let setter = null;
    
    if (target === 'draft') {
      currentText = draft;
      setter = setDraft;
    } else if (target === 'revised') {
      currentText = revisedDraft;
      setter = setRevisedDraft;
    } else if (target === 'final') {
      currentText = finalDraft;
      setter = setFinalDraft;
    }
    
    if (setter) {
      const image = uploadedImages[target].find(img => img.id === imageId);
      if (image) {
        const newText = currentText.replace(image.markdown, '');
        setter(newText);
        if (target === 'draft') {
          setWordCount(newText.length);
        }
      }
    }
  };

  // 이미지 생성 및 삽입
  const handleInsertImage = async () => {
    if (!imagePrompt.trim()) {
      alert('이미지 설명을 입력해주세요.');
      return;
    }

    try {
      setInsertingImage(true);
      
      // 현재 글 내용 가져오기
      let articleText = '';
      if (contextMenuTarget === 'draft') {
        articleText = draft;
      } else if (contextMenuTarget === 'revised') {
        articleText = revisedDraft;
      } else if (contextMenuTarget === 'final') {
        articleText = finalDraft;
      }
      
      // 이미지 생성은 시간이 오래 걸릴 수 있으므로 타임아웃을 5분으로 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5분
      
      console.log('[프론트엔드] 이미지 생성 요청 시작');
      console.log('[프론트엔드] API URL:', `${API_BASE_URL}/ai/image`);
      console.log('[프론트엔드] 프롬프트:', imagePrompt.trim());
      console.log('[프론트엔드] 글 내용 길이:', articleText.length);
      
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/ai/image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: imagePrompt.trim(),
            article_text: articleText,
          }),
          signal: controller.signal
        });
        console.log('[프론트엔드] 응답 수신:', response.status, response.statusText);
      } catch (fetchError) {
        console.error('[프론트엔드] 요청 실패:', fetchError);
        console.error('[프론트엔드] 오류 타입:', fetchError.name);
        console.error('[프론트엔드] 오류 메시지:', fetchError.message);
        throw fetchError;
      }
      
      console.log('[프론트엔드] 응답 상태:', response.status, response.statusText);
      console.log('[프론트엔드] 응답 헤더:', Object.fromEntries(response.headers.entries()));

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = '이미지 생성 실패';
        try {
          const errorText = await response.text();
          console.error('[프론트엔드] 오류 응답 본문:', errorText);
          try {
            const error = JSON.parse(errorText);
            errorMessage = error.detail || error.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          console.error('[프론트엔드] 오류 응답 파싱 실패:', e);
        }
        throw new Error(errorMessage);
      }

      // 응답 본문 확인
      const responseText = await response.text();
      console.log('[프론트엔드] 응답 본문 (원본):', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[프론트엔드] JSON 파싱 실패:', parseError);
        console.error('[프론트엔드] 파싱 실패한 본문:', responseText);
        throw new Error('서버 응답을 파싱할 수 없습니다. 응답 형식을 확인해주세요.');
      }
      
      console.log('[프론트엔드] 응답 데이터:', data);
      console.log('[프론트엔드] image_url:', data.image_url);
      console.log('[프론트엔드] preview_url:', data.preview_url);
      console.log('[프론트엔드] markdown:', data.markdown);
      
      // 이미지 삽입 처리 (마크다운 우선 사용)
      if (data.markdown) {
        // 마크다운이 있으면 마크다운을 직접 사용 (가장 정확함)
        console.log('[프론트엔드] 마크다운 형식으로 삽입:', data.markdown);
        console.log('[프론트엔드] 삽입 대상:', contextMenuTarget);
        console.log('[프론트엔드] 커서 위치:', contextMenuCursorPos);
        
        insertTextAtCursor(data.markdown, contextMenuTarget);
        console.log('[프론트엔드] 텍스트 삽입 완료');
        
        // 이미지 URL 추출하여 이미지 목록에 추가
        const imageUrl = data.image_url || data.preview_url;
        console.log('[프론트엔드] 이미지 URL:', imageUrl);
        
        if (imageUrl) {
          // 마크다운에서 alt 텍스트 추출
          const markdownMatch = data.markdown.match(/!\[([^\]]*)\]\(([^)]+)\)/);
          const imageAlt = markdownMatch ? markdownMatch[1] : '이미지';
          console.log('[프론트엔드] 추출된 alt 텍스트:', imageAlt);
          
          const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newImage = {
            id: imageId,
            url: imageUrl,
            alt: imageAlt,
            markdown: data.markdown
          };
          console.log('[프론트엔드] 새 이미지 객체:', newImage);
          
          setUploadedImages(prev => {
            const updated = {
              ...prev,
              [contextMenuTarget]: [...prev[contextMenuTarget], newImage]
            };
            console.log('[프론트엔드] 업데이트된 이미지 목록:', updated);
            return updated;
          });
          console.log('[프론트엔드] 이미지 목록 업데이트 완료');
        }
        
        // 플레이스홀더 이미지인지 확인
        if (imageUrl && imageUrl.includes('placehold.co')) {
          console.warn('[프론트엔드] ⚠️ 플레이스홀더 이미지가 반환되었습니다. 실제 이미지 생성이 실패한 것 같습니다.');
          alert('이미지 생성이 실패하여 플레이스홀더 이미지가 삽입되었습니다. 백엔드 로그를 확인해주세요.');
        } else {
          alert('이미지가 삽입되었습니다!');
        }
        
        console.log('[프론트엔드] 모달 닫기 및 상태 초기화');
        setShowImageModal(false);
        setImagePrompt('');
        setContextMenu(null);
        console.log('[프론트엔드] 이미지 삽입 프로세스 완료');
      } else if (data.image_url || data.preview_url) {
        // 마크다운이 없으면 URL만 사용
        const imageUrl = data.image_url || data.preview_url;
        console.log('[프론트엔드] URL만 사용하여 삽입:', imageUrl);
        await insertImage(imageUrl, contextMenuTarget);
        
        // 플레이스홀더 이미지인지 확인
        if (imageUrl.includes('placehold.co')) {
          console.warn('[프론트엔드] ⚠️ 플레이스홀더 이미지가 반환되었습니다. 실제 이미지 생성이 실패한 것 같습니다.');
          alert('이미지 생성이 실패하여 플레이스홀더 이미지가 삽입되었습니다. 백엔드 로그를 확인해주세요.');
        } else {
          alert('이미지가 삽입되었습니다!');
        }
        
        setShowImageModal(false);
        setImagePrompt('');
        setContextMenu(null);
      } else {
        console.error('[프론트엔드] 응답에 이미지 데이터가 없습니다:', data);
        throw new Error('이미지 URL을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('이미지 생성 실패:', error);
      if (error.name === 'AbortError') {
        alert('이미지 생성 시간이 초과되었습니다 (5분). 이미지 생성은 시간이 오래 걸릴 수 있습니다. 다시 시도해주세요.');
      } else {
        alert(error.message || '이미지 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setInsertingImage(false);
    }
  };

  // 표 생성 및 삽입
  const handleInsertTable = async () => {
    if (!tableDescription.trim()) {
      alert('표 내용 설명을 입력해주세요.');
      return;
    }

    try {
      setInsertingTable(true);
      
      // 현재 글 내용 가져오기
      let articleText = '';
      if (contextMenuTarget === 'draft') {
        articleText = draft;
      } else if (contextMenuTarget === 'revised') {
        articleText = revisedDraft;
      } else if (contextMenuTarget === 'final') {
        articleText = finalDraft;
      }
      
      const response = await fetch(`${API_BASE_URL}/ai/table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: tableDescription.trim(),
          context: articleText,
          table_type: tableType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '표 생성 실패');
      }

      const data = await response.json();
      
      // 커서 위치에 마크다운 삽입
      insertTextAtCursor(data.markdown, contextMenuTarget);
      
      setShowTableModal(false);
      setTableDescription('');
      setContextMenu(null);
      alert('표가 삽입되었습니다!');
    } catch (error) {
      console.error('표 생성 실패:', error);
      alert(error.message || '표 생성 중 오류가 발생했습니다.');
    } finally {
      setInsertingTable(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 학습 섹션 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-clinicGreen-700">블로그 어투 학습</h3>
          <button
            onClick={() => setShowLearning(!showLearning)}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            {showLearning ? '접기' : '학습하기'}
          </button>
        </div>
        
        {/* 학습 상태 섹션 - 항상 표시 */}
        <div className="mb-4 space-y-3">
          {learningStatus ? (
            <>
              {/* 학습 통계 */}
              <div className="rounded-lg border-2 border-clinicGreen-200 bg-clinicGreen-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h4 className="font-semibold text-clinicGreen-800">학습 상태</h4>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">학습된 텍스트</p>
                    <p className="text-xl font-bold text-clinicGreen-700">{learningStatus.blog_texts_count || 0}개</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">퇴고 패턴</p>
                    <p className="text-xl font-bold text-blue-700">{learningStatus.revision_patterns_count || 0}개</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">스타일 규칙</p>
                    <p className="text-xl font-bold text-purple-700">{learningStatus.style_rules_count || 0}개</p>
                  </div>
                </div>
                
                {/* 학습된 스타일 규칙 표시 */}
                {learningStatus.style_rules && learningStatus.style_rules.length > 0 && (
                  <div className="mt-3 rounded-lg border-2 border-purple-200 bg-purple-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <h4 className="font-semibold text-purple-800">학습된 스타일 규칙 (영구 적용)</h4>
                    </div>
                    <p className="mb-2 text-xs text-slate-600">
                      퇴고를 통해 설정한 스타일 규칙이 초안 생성 시 자동으로 반영됩니다.
                    </p>
                    <div className="space-y-2">
                      {learningStatus.style_rules.map((rule, idx) => (
                        <div key={idx} className="rounded-lg border border-purple-200 bg-white p-2">
                          <div className="flex items-start gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                              {idx + 1}
                            </span>
                            <p className="flex-1 text-sm text-purple-900">{rule}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 퇴고 패턴 요약 표시 */}
                {learningStatus.revision_summary && learningStatus.revision_summary.length > 0 && (
                  <div className="mt-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-lg">✏️</span>
                      <h4 className="font-semibold text-blue-800">학습된 퇴고 패턴</h4>
                    </div>
                    <p className="mb-2 text-xs text-slate-600">
                      자주 요청하는 수정 사항이 초안 생성 시 자동으로 반영됩니다.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {learningStatus.revision_summary.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {learningStatus.updated_at && (
                  <p className="mt-2 text-xs text-slate-500">
                    최종 업데이트: {new Date(learningStatus.updated_at).toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
              
              {/* 학습된 텍스트 미리보기 */}
              {learningStatus.preview_texts && learningStatus.preview_texts.length > 0 ? (
                <div className="rounded-lg border-2 border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xl">📝</span>
                    <h4 className="font-semibold text-slate-800">최근 학습된 텍스트 미리보기</h4>
                    <span className="ml-auto text-xs text-slate-500">(최근 {learningStatus.preview_texts.length}개)</span>
                  </div>
                  <div className="space-y-3">
                    {learningStatus.preview_texts.map((preview, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition-colors">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-clinicGreen-100 text-xs font-bold text-clinicGreen-700">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium text-slate-600">텍스트 {learningStatus.blog_texts_count - learningStatus.preview_texts.length + idx + 1}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{preview}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">아직 학습된 텍스트가 없습니다.</p>
                  <p className="mt-1 text-xs text-slate-400">블로그 URL이나 텍스트를 입력하여 학습을 시작하세요.</p>
                </div>
              )}
              
              {/* 개인 정보 미리보기 */}
              {learningStatus.personal_info_preview && (
                <div className="rounded-lg border-2 border-clinicGreen-200 bg-clinicGreen-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">👤</span>
                    <h4 className="font-semibold text-clinicGreen-800">개인 정보</h4>
                  </div>
                  <p className="text-sm text-clinicGreen-700 leading-relaxed">{learningStatus.personal_info_preview}</p>
                </div>
              )}
              
              {/* 한의원 정보 미리보기 */}
              {learningStatus.clinic_info_preview && (
                <div className="rounded-lg border-2 border-clinicGreen-200 bg-clinicGreen-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">🏥</span>
                    <h4 className="font-semibold text-clinicGreen-800">한의원 정보</h4>
                  </div>
                  <p className="text-sm text-clinicGreen-700 leading-relaxed">{learningStatus.clinic_info_preview}</p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">학습 상태를 불러오는 중...</p>
            </div>
          )}
        </div>
        
        {showLearning && (
          <div className="space-y-4">
            {/* 블로그 메인 URL 섹션 - 별도로 강조 */}
            <div className="rounded-lg border-2 border-clinicGreen-300 bg-clinicGreen-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">🔗</span>
                <h4 className="font-semibold text-clinicGreen-800">블로그 메인 URL (모든 포스트 자동 추출)</h4>
              </div>
              <input
                type="text"
                value={blogMainUrl}
                onChange={(e) => setBlogMainUrl(e.target.value)}
                placeholder="https://blog.naver.com/username"
                className="mb-2 w-full rounded-lg border-2 border-clinicGreen-400 bg-white px-4 py-3 text-sm font-medium focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
              <p className="text-xs text-slate-600">
                네이버 블로그 메인 URL을 입력하면 모든 포스트를 자동으로 찾아서 학습합니다.
              </p>
            </div>
            
            {/* 네이버 로그인 쿠키 섹션 - 비공개 글 접근용 */}
            <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">🔐</span>
                <h4 className="font-semibold text-blue-800">네이버 로그인 쿠키 (선택사항 - 비공개 글 접근용)</h4>
              </div>
              <textarea
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                placeholder="NID_AUT=xxx; NID_SES=yyy; ... (아래 방법 참고)"
                rows={3}
                className="mb-2 w-full rounded-lg border-2 border-blue-400 bg-white px-4 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <details className="text-xs text-blue-700">
                <summary className="mb-2 cursor-pointer font-medium hover:text-blue-800">
                  📋 쿠키 복사 방법 (클릭하여 펼치기)
                </summary>
                <div className="ml-2 space-y-2 rounded-lg bg-blue-100 p-3">
                  <p className="font-semibold">방법 1: Network 탭 사용 (추천)</p>
                  <ol className="ml-4 list-decimal space-y-1">
                    <li>크롬에서 네이버 블로그에 로그인한 상태로 블로그 페이지 열기</li>
                    <li>F12 키를 눌러 개발자 도구 열기</li>
                    <li><strong>Network 탭</strong> 클릭</li>
                    <li>페이지 새로고침 (F5)</li>
                    <li>아무 요청 하나 클릭 (예: blog.naver.com)</li>
                    <li>오른쪽 패널에서 <strong>Headers</strong> 탭 선택</li>
                    <li><strong>Request Headers</strong> 섹션에서 <strong>Cookie:</strong> 항목 찾기</li>
                    <li>Cookie 값 전체를 <strong>마우스로 드래그해서 복사</strong> (Ctrl+C 또는 우클릭 → 복사)</li>
                    <li>위 필드에 붙여넣기</li>
                  </ol>
                  <p className="mt-2 font-semibold">방법 2: Application 탭 사용</p>
                  <ol className="ml-4 list-decimal space-y-1">
                    <li>Application 탭 → Cookies → https://blog.naver.com 선택</li>
                    <li>표에서 각 쿠키의 Name과 Value를 확인</li>
                    <li>수동으로 복사: <code>Name1=Value1; Name2=Value2; ...</code> 형식으로 입력</li>
                  </ol>
                  <p className="mt-2 rounded bg-yellow-100 p-2 text-yellow-800">
                    ⚠️ 비공개 글이 포함되어 있다면 쿠키를 입력해주세요. 공개 글만 학습하려면 비워두셔도 됩니다.
                  </p>
                </div>
              </details>
            </div>
            
            {/* 개별 포스트 URL 섹션 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                또는 개별 포스트 URL (한 줄에 하나씩 또는 쉼표로 구분)
              </label>
              <textarea
                value={blogUrls}
                onChange={(e) => setBlogUrls(e.target.value)}
                placeholder="https://blog.naver.com/username/123456789&#10;https://blog.naver.com/username/987654321"
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                특정 포스트만 학습하려면 개별 URL을 입력하세요.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                또는 직접 텍스트 입력 (통으로 하나의 글 전체)
              </label>
              <textarea
                value={blogTexts}
                onChange={(e) => setBlogTexts(e.target.value)}
                placeholder="블로그 글 전체를 통으로 붙여넣으세요. 글의 흐름, 어투, 문장 구조 등을 전체적으로 학습합니다."
                rows={8}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                💡 통으로 입력하면 글의 전체적인 흐름, 어투 변화, 문장 구조 등을 더 정확하게 학습할 수 있습니다.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                개인 정보 (선택사항)
              </label>
              <textarea
                value={personalInfo}
                onChange={(e) => setPersonalInfo(e.target.value)}
                placeholder="예: 나이, 취미, 가족 구성, 성격 등"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                한의원 정보 (선택사항)
              </label>
              <textarea
                value={clinicInfo}
                onChange={(e) => setClinicInfo(e.target.value)}
                placeholder="예: 한의원 위치, 특화 분야, 진료 철학 등"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
            </div>
            <button
              onClick={handleLearn}
              disabled={learningLoading}
              className="w-full rounded-lg bg-clinicGreen-600 px-6 py-2 font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
            >
              {learningLoading ? '학습 중...' : '학습하기'}
            </button>
          </div>
        )}
      </div>

      {/* 글쓰기 에디터 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-clinicGreen-700">AI 글쓰기 에디터</h3>
          <button
            onClick={() => {
              if (confirm('모든 입력 내용을 초기화하시겠습니까?')) {
                setTopic('');
                setKeywords('');
                setWritingInstruction('');
                setContentInstruction('');
                setDraft('');
                setRevisedDraft('');
                setFinalDraft('');
                setRevisionInstruction('');
                setViolations([]);
                setRevisedViolations([]);
                setWordCount(0);
                setContextMenu(null);
                setContextMenuTarget(null);
              }
            }}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            title="모든 입력 내용 초기화"
          >
            🔄 초기화
          </button>
        </div>
        
        <div className="mb-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">주제</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="블로그 포스팅 주제를 입력하세요"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">키워드 (쉼표로 구분)</label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="문정역 한의원, 추나요법, 산후보약"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            글의 내용 (선택사항)
          </label>
          <textarea
            value={contentInstruction}
            onChange={(e) => setContentInstruction(e.target.value)}
            placeholder="예: 내가 추나하다가 어깨가 다쳤어. 그리고 쉬는 날 부원장에게 치료 받았어"
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            구체적인 사건, 경험, 내용을 간단히 입력하세요. 종성이 스타일로 전후 사정, 치료 방식 등을 길게 늘려 꾸며서 작성됩니다.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            글쓰기 지시사항 (선택사항)
          </label>
          <textarea
            value={writingInstruction}
            onChange={(e) => setWritingInstruction(e.target.value)}
            placeholder="예: 글의 구조는 서론-본론-결론으로, 길이는 800자 정도, 타겟은 30-40대 여성, 키워드는 자연스럽게 3-5회 배치"
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            글의 구조, 길이, 타겟 독자, 키워드 배치 등 전체 짜임새를 지시해주세요.
          </p>
        </div>
        
        {/* 글쓰기 스타일 선택 */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">글쓰기 스타일</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setWritingStyle('diary')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                writingStyle === 'diary'
                  ? 'bg-clinicGreen-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📔 일기 스타일
            </button>
            <button
              onClick={() => setWritingStyle('blog')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                writingStyle === 'blog'
                  ? 'bg-clinicGreen-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📝 블로그 스타일
            </button>
            <button
              onClick={() => setWritingStyle('essay')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                writingStyle === 'essay'
                  ? 'bg-clinicGreen-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ✍️ 에세이 스타일
            </button>
            <button
              onClick={() => setWritingStyle('personal')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                writingStyle === 'personal'
                  ? 'bg-clinicGreen-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              ✨ 종성이가 씀 !
            </button>
          </div>
        </div>
        
        <button
          onClick={() => handleGenerate(writingStyle)}
          disabled={loading || !topic.trim()}
          className="w-full rounded-lg bg-clinicGreen-600 px-6 py-2 font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
        >
          {loading ? '생성 중...' : '초안 생성'}
        </button>
        </div>

        {draft && (
        <div className="mt-4 space-y-4">
          {/* 생성된 초안 섹션 */}
          <div className="rounded-lg border-2 border-slate-300 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900">📝 생성된 초안</h4>
              <div className="flex gap-2 items-center text-sm">
                <span className="text-slate-600">글자 수: {wordCount}</span>
                <button
                  onClick={handleCheckViolations}
                  className="text-clinicGreen-600 hover:text-clinicGreen-700 font-medium"
                >
                  위반 단어 검사
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {/* 편집 모드와 프리뷰 모드 분리 */}
              {editingMode.draft ? (
                // 편집 모드: 텍스트만 표시 (마크다운 코드)
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setWordCount(e.target.value.length);
                    
                    // 텍스트 변경 시 이미지 마크다운 파싱하여 이미지 목록 업데이트
                    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                    const foundImages = [];
                    const seenMarkdowns = new Set();
                    let match;
                    while ((match = imageRegex.exec(e.target.value)) !== null) {
                      if (!seenMarkdowns.has(match[0])) {
                        seenMarkdowns.add(match[0]);
                        const existingImage = uploadedImages.draft.find(img => img.markdown === match[0]);
                        if (existingImage) {
                          foundImages.push(existingImage);
                        } else {
                          foundImages.push({
                            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            url: match[2],
                            alt: match[1] || '이미지',
                            markdown: match[0]
                          });
                        }
                      }
                    }
                    setUploadedImages(prev => ({
                      ...prev,
                      draft: foundImages
                    }));
                  }}
                  onBlur={() => {
                    // 포커스를 잃으면 자동으로 프리뷰 모드로 전환
                    setEditingMode(prev => ({ ...prev, draft: false }));
                    setPreviewMode(prev => ({ ...prev, draft: true }));
                  }}
                  onContextMenu={(e) => handleContextMenu(e, 'draft')}
                  onPaste={(e) => handlePaste(e, 'draft')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'draft')}
                  rows={12}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
                  placeholder="여기에 글을 작성하세요. 이미지는 복사 붙여넣기(Ctrl+V) 또는 드래그앤드롭으로 추가할 수 있습니다."
                  autoFocus
                />
              ) : (
                // 프리뷰 모드: 마크다운을 HTML로 렌더링 (이미지 포함)
                <div 
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 bg-white min-h-[300px] prose prose-sm max-w-none cursor-text"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(draft) }}
                  onClick={() => {
                    // 클릭하면 편집 모드로 전환
                    setEditingMode(prev => ({ ...prev, draft: true }));
                    setPreviewMode(prev => ({ ...prev, draft: false }));
                  }}
                  style={{ 
                    lineHeight: '1.6',
                    fontSize: '14px',
                    color: '#334155',
                    minHeight: '300px'
                  }}
                />
              )}
              
              {/* 이미지 미리보기 */}
              {uploadedImages.draft.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">삽입된 이미지 ({uploadedImages.draft.length}개)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.draft.map((img) => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.url}
                          alt={img.alt}
                          className="w-full h-24 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // 이미지 클릭 시 새 창에서 크게 보기
                            window.open(img.url, '_blank');
                          }}
                          onError={(e) => {
                            // 이미지 로드 실패 시 플레이스홀더 표시
                            e.target.src = 'https://placehold.co/400x300/cccccc/666666?text=이미지+로드+실패';
                          }}
                        />
                        <button
                          onClick={() => removeImage(img.id, 'draft')}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="이미지 삭제"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {violations.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm font-semibold text-red-800">의료법 위반 단어 감지:</p>
                <div className="flex flex-wrap gap-2">
                  {violations.map((word, idx) => (
                    <span key={idx} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 퇴고하기 섹션 - 별도 섹션으로 분리 */}
          <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">✏️</span>
              <h4 className="font-semibold text-blue-800">퇴고하기</h4>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              {revisedDraft 
                ? '퇴고된 버전을 다시 수정하거나, 초안을 기준으로 퇴고할 수 있습니다. 아래에 수정 지시사항을 입력해주세요.'
                : '초안을 수정하고 싶으시면 아래에 수정 지시사항을 입력해주세요. 학습된 어투가 자동으로 반영됩니다.'}
            </p>
            <textarea
              value={revisionInstruction}
              onChange={(e) => setRevisionInstruction(e.target.value)}
              placeholder="예: 더 친근한 어투로 바꿔줘, 첫 문단을 더 강하게 시작해줘, 전문 용어를 쉽게 풀어써줘"
              rows={3}
              className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex gap-2">
              {revisedDraft && (
                <button
                  onClick={() => handleRevise(true)}
                  disabled={revising || !revisionInstruction.trim()}
                  className="flex-1 rounded-lg bg-clinicGreen-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
                  title="퇴고된 버전을 기준으로 다시 퇴고합니다"
                >
                  {revising ? '퇴고 중...' : '퇴고된 버전 다시 퇴고'}
                </button>
              )}
              <button
                onClick={() => handleRevise(false)}
                disabled={revising || !revisionInstruction.trim()}
                className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 ${revisedDraft ? 'flex-1' : 'w-full'}`}
                title={revisedDraft ? "초안을 기준으로 퇴고합니다" : "초안을 퇴고합니다"}
              >
                {revising ? '퇴고 중...' : revisedDraft ? '초안 기준 퇴고' : '퇴고하기'}
              </button>
            </div>
          </div>

          {/* 퇴고된 버전 표시 */}
          {revisedDraft && (
            <div className="rounded-lg border-2 border-clinicGreen-300 bg-clinicGreen-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h4 className="font-semibold text-clinicGreen-700">퇴고된 버전</h4>
                </div>
                <div className="flex gap-2 items-center text-sm">
                  <span className="text-slate-600">글자 수: {revisedDraft.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {editingMode.revised ? (
                  // 편집 모드: 텍스트만 표시 (마크다운 코드)
                  <textarea
                    value={revisedDraft}
                    onChange={(e) => {
                      setRevisedDraft(e.target.value);
                      // 이미지 파싱
                      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                      const foundImages = [];
                      const seenMarkdowns = new Set();
                      let match;
                      while ((match = imageRegex.exec(e.target.value)) !== null) {
                        if (!seenMarkdowns.has(match[0])) {
                          seenMarkdowns.add(match[0]);
                          const existingImage = uploadedImages.revised.find(img => img.markdown === match[0]);
                          if (existingImage) {
                            foundImages.push(existingImage);
                          } else {
                            foundImages.push({
                              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              url: match[2],
                              alt: match[1] || '이미지',
                              markdown: match[0]
                            });
                          }
                        }
                      }
                      setUploadedImages(prev => ({
                        ...prev,
                        revised: foundImages
                      }));
                    }}
                    onBlur={() => {
                      setEditingMode(prev => ({ ...prev, revised: false }));
                      setPreviewMode(prev => ({ ...prev, revised: true }));
                    }}
                    onContextMenu={(e) => handleContextMenu(e, 'revised')}
                    onPaste={(e) => handlePaste(e, 'revised')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'revised')}
                    rows={12}
                    className="mb-3 w-full rounded-lg border border-clinicGreen-300 bg-white px-4 py-3 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
                    placeholder="여기에 글을 작성하세요. 이미지는 복사 붙여넣기(Ctrl+V) 또는 드래그앤드롭으로 추가할 수 있습니다."
                    autoFocus
                  />
                ) : (
                  // 프리뷰 모드: 마크다운을 HTML로 렌더링 (이미지 포함)
                  <div 
                    className="w-full rounded-lg border border-clinicGreen-300 bg-white px-4 py-3 min-h-[300px] prose prose-sm max-w-none cursor-text"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(revisedDraft) }}
                    onClick={() => {
                      setEditingMode(prev => ({ ...prev, revised: true }));
                      setPreviewMode(prev => ({ ...prev, revised: false }));
                    }}
                    style={{ 
                      lineHeight: '1.6',
                      fontSize: '14px',
                      color: '#334155',
                      minHeight: '300px'
                    }}
                  />
                )}
                
                {/* 이미지 미리보기 */}
                {uploadedImages.revised.length > 0 && (
                  <div className="rounded-lg border border-clinicGreen-200 bg-clinicGreen-50 p-3">
                    <p className="mb-2 text-xs font-medium text-clinicGreen-700">삽입된 이미지 ({uploadedImages.revised.length}개)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.revised.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-24 object-cover rounded border border-clinicGreen-300"
                          />
                          <button
                            onClick={() => removeImage(img.id, 'revised')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="이미지 삭제"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 퇴고된 버전의 의료법 위반 검사 결과 */}
              {revisedViolations.length > 0 && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-sm font-semibold text-red-800">⚠️ 의료법 위반 소지 감지:</p>
                  <div className="space-y-1">
                    {revisedViolations.map((violation, idx) => (
                      <div key={idx} className="text-xs text-red-700">
                        • {violation}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-red-600">
                    위 항목들을 검토하여 의료법 위반 여부를 확인하시기 바랍니다.
                  </p>
                </div>
              )}
              
              {revisedViolations.length === 0 && (
                <div className="mb-2 text-xs text-green-600">
                  ✅ 의료법 위반 사항이 없는 것으로 확인되었습니다.
                </div>
              )}
              
              <p className="text-xs text-clinicGreen-600 mb-2">
                💡 이 버전을 다시 퇴고하려면 위의 "퇴고된 버전 다시 퇴고" 버튼을 사용하세요.
              </p>
            </div>
          )}

          {/* 최종 결정 버튼 */}
          <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xl">✅</span>
              <h4 className="font-semibold text-purple-800">최종 결정</h4>
            </div>
            <p className="mb-3 text-sm text-slate-700">
              사용할 버전을 선택하고 최종 결정하세요. 최종 결정된 버전은 별도로 저장됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFinalDraft(draft);
                  alert('초안 버전이 최종 결정되었습니다!');
                }}
                className="flex-1 rounded-lg bg-slate-600 px-4 py-3 font-medium text-white hover:bg-slate-700"
              >
                초안 버전 선택
              </button>
              {revisedDraft && (
                <button
                  onClick={() => {
                    setFinalDraft(revisedDraft);
                    alert('퇴고된 버전이 최종 결정되었습니다!');
                  }}
                  className="flex-1 rounded-lg bg-clinicGreen-600 px-4 py-3 font-medium text-white hover:bg-clinicGreen-700"
                >
                  퇴고된 버전 선택
                </button>
              )}
            </div>
          </div>

          {/* 최종 결정된 버전 표시 */}
          {finalDraft && (
            <div className="rounded-lg border-2 border-purple-400 bg-purple-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h4 className="font-semibold text-purple-900">최종 결정된 버전</h4>
                </div>
                <div className="flex gap-2 items-center text-sm">
                  <span className="text-purple-700">글자 수: {finalDraft.length}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(finalDraft);
                      alert('최종 버전이 클립보드에 복사되었습니다!');
                    }}
                    className="font-medium text-purple-700 hover:text-purple-900"
                  >
                    복사하기
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {editingMode.final ? (
                  // 편집 모드: 텍스트만 표시 (마크다운 코드)
                  <textarea
                    value={finalDraft}
                    onChange={(e) => {
                      setFinalDraft(e.target.value);
                      // 이미지 파싱
                      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                      const foundImages = [];
                      const seenMarkdowns = new Set();
                      let match;
                      while ((match = imageRegex.exec(e.target.value)) !== null) {
                        if (!seenMarkdowns.has(match[0])) {
                          seenMarkdowns.add(match[0]);
                          const existingImage = uploadedImages.final.find(img => img.markdown === match[0]);
                          if (existingImage) {
                            foundImages.push(existingImage);
                          } else {
                            foundImages.push({
                              id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              url: match[2],
                              alt: match[1] || '이미지',
                              markdown: match[0]
                            });
                          }
                        }
                      }
                      setUploadedImages(prev => ({
                        ...prev,
                        final: foundImages
                      }));
                    }}
                    onBlur={() => {
                      setEditingMode(prev => ({ ...prev, final: false }));
                      setPreviewMode(prev => ({ ...prev, final: true }));
                    }}
                    onContextMenu={(e) => handleContextMenu(e, 'final')}
                    onPaste={(e) => handlePaste(e, 'final')}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'final')}
                    rows={12}
                    className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    placeholder="여기에 글을 작성하세요. 이미지는 복사 붙여넣기(Ctrl+V) 또는 드래그앤드롭으로 추가할 수 있습니다."
                    autoFocus
                  />
                ) : (
                  // 프리뷰 모드: 마크다운을 HTML로 렌더링 (이미지 포함)
                  <div 
                    className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 min-h-[300px] prose prose-sm max-w-none cursor-text"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(finalDraft) }}
                    onClick={() => {
                      setEditingMode(prev => ({ ...prev, final: true }));
                      setPreviewMode(prev => ({ ...prev, final: false }));
                    }}
                    style={{ 
                      lineHeight: '1.6',
                      fontSize: '14px',
                      color: '#334155',
                      minHeight: '300px'
                    }}
                  />
                )}
                
                {/* 이미지 미리보기 */}
                {uploadedImages.final.length > 0 && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <p className="mb-2 text-xs font-medium text-purple-700">삽입된 이미지 ({uploadedImages.final.length}개)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedImages.final.map((img) => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-24 object-cover rounded border border-purple-300"
                          />
                          <button
                            onClick={() => removeImage(img.id, 'final')}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="이미지 삭제"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg border border-slate-300 bg-white shadow-lg"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setShowImageModal(true);
              setContextMenu(null);
            }}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
          >
            🖼️ 그림 삽입
          </button>
          <button
            onClick={() => {
              setShowTableModal(true);
              setContextMenu(null);
            }}
            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 first:rounded-t-lg last:rounded-b-lg"
          >
            📊 표 삽입
          </button>
        </div>
      )}

      {/* 이미지 삽입 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">그림 삽입</h3>
            
            {/* 탭: AI 생성 / 직접 업로드 */}
            <div className="mb-4 flex gap-2 border-b border-slate-200">
              <button
                onClick={() => {}}
                className="flex-1 border-b-2 border-clinicGreen-600 px-4 py-2 text-sm font-medium text-clinicGreen-600"
              >
                🤖 AI로 생성
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      await insertImage(file, contextMenuTarget);
                      setShowImageModal(false);
                      setContextMenu(null);
                      alert('이미지가 삽입되었습니다!');
                    }
                  };
                  input.click();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                📁 파일 선택
              </button>
            </div>
            
            <p className="mb-3 text-sm text-slate-600">
              삽입할 그림에 대한 설명을 입력해주세요. AI가 적절한 그림을 생성합니다.
            </p>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="예: 한의원에서 추나요법을 받는 모습, 건강한 척추 모습, 문정역 한의원 외관"
              rows={4}
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImagePrompt('');
                }}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                취소
              </button>
              <button
                onClick={handleInsertImage}
                disabled={insertingImage || !imagePrompt.trim()}
                className="flex-1 rounded-lg bg-clinicGreen-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
              >
                {insertingImage ? '생성 중...' : '생성 및 삽입'}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              💡 팁: 이미지 파일을 복사(Ctrl+C)한 후 에디터에 붙여넣기(Ctrl+V)하거나, 드래그앤드롭으로도 추가할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      {/* 표 삽입 모달 */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">표 삽입</h3>
            <p className="mb-3 text-sm text-slate-600">
              삽입할 표의 내용을 설명해주세요. AI가 적절한 표를 생성합니다.
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                표 타입
              </label>
              <select
                value={tableType}
                onChange={(e) => setTableType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              >
                <option value="statistics">통계 자료</option>
                <option value="anatomy">해부학 설명</option>
                <option value="comparison">비교 표</option>
                <option value="treatment">치료 방법 비교</option>
                <option value="symptom">증상별 설명</option>
              </select>
            </div>
            <textarea
              value={tableDescription}
              onChange={(e) => setTableDescription(e.target.value)}
              placeholder="예: 추나요법의 효과를 보여주는 통계 자료, 척추 질환별 증상과 치료법 비교"
              rows={4}
              className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowTableModal(false);
                  setTableDescription('');
                }}
                className="flex-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                취소
              </button>
              <button
                onClick={handleInsertTable}
                disabled={insertingTable || !tableDescription.trim()}
                className="flex-1 rounded-lg bg-clinicGreen-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
              >
                {insertingTable ? '생성 중...' : '생성 및 삽입'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
