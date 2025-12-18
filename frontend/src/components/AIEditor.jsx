import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function AIEditor() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [writingInstruction, setWritingInstruction] = useState(''); // 글쓰기 지시사항 (구조, 길이, 타겟, 키워드 배치 등)
  const [contentInstruction, setContentInstruction] = useState(''); // 글의 내용 지시사항 (구체적인 사건, 경험 등)
  const [draft, setDraft] = useState('');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [writingStyle, setWritingStyle] = useState('personal'); // 'diary', 'blog', 'essay', 'personal' - 기본값: 'personal' (종성이가 씀 !)
  
  // 퇴고 관련 상태
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [revisedDraft, setRevisedDraft] = useState('');
  const [revising, setRevising] = useState(false);
  const [finalDraft, setFinalDraft] = useState(''); // 최종 결정된 버전
  
  // 학습 관련 상태
  const [showLearning, setShowLearning] = useState(false);
  const [blogMainUrl, setBlogMainUrl] = useState(''); // 블로그 메인 URL
  const [blogUrls, setBlogUrls] = useState(''); // 개별 포스트 URL
  const [blogTexts, setBlogTexts] = useState('');
  const [personalInfo, setPersonalInfo] = useState('');
  const [clinicInfo, setClinicInfo] = useState('');
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState(null);

  const handleGenerate = async (style = writingStyle) => {
    if (!topic.trim()) return;

    try {
      setLoading(true);
      const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
      
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
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '초안 생성 실패');
      }

      const data = await response.json();
      setDraft(data.draft);
      setViolations(data.medical_violations || []);
      setWordCount(data.word_count || 0);
      // 초안 생성 시 퇴고 관련 상태 초기화
      setRevisedDraft('');
      setRevisionInstruction('');
      setFinalDraft('');
      // 내용 지시사항은 유지 (재사용 가능)
    } catch (error) {
      console.error('초안 생성 실패:', error);
      alert(error.message || '초안 생성 중 오류가 발생했습니다.');
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

  const handleRevise = async () => {
    if (!draft.trim() || !revisionInstruction.trim()) {
      alert('초안과 퇴고 지시사항을 모두 입력해주세요.');
      return;
    }

    try {
      setRevising(true);
      setRevisedDraft('');
      
      const response = await fetch(`${API_BASE_URL}/ai/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_draft: draft,
          revision_instruction: revisionInstruction.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '퇴고 실패');
      }

      const data = await response.json();
      setRevisedDraft(data.revised_draft);
      
      // 학습 저장 여부 표시
      if (data.learning_saved) {
        console.log('퇴고 패턴이 학습 데이터에 저장되었습니다.');
        // 학습 상태 새로고침
        loadLearningStatus();
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
      
      // 텍스트 목록 파싱 (빈 줄로 구분)
      const textList = blogTexts.split('\n\n').map(t => t.trim()).filter(t => t);
      
      const response = await fetch(`${API_BASE_URL}/ai/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blog_main_url: mainUrl,
          blog_urls: urlList.length > 0 ? urlList : undefined,
          blog_texts: textList.length > 0 ? textList : undefined,
          personal_info: personalInfo.trim() || undefined,
          clinic_info: clinicInfo.trim() || undefined,
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
      const data = await response.json();
      setLearningStatus(data);
    } catch (error) {
      console.error('학습 상태 조회 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 학습 상태 조회
  useEffect(() => {
    loadLearningStatus();
  }, []);

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
                또는 직접 텍스트 입력 (여러 개는 빈 줄로 구분)
              </label>
              <textarea
                value={blogTexts}
                onChange={(e) => setBlogTexts(e.target.value)}
                placeholder="일상, 여행 블로그 텍스트를 붙여넣으세요. 여러 개의 글은 빈 줄로 구분하세요."
                rows={6}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
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
        <h3 className="mb-4 text-lg font-semibold text-clinicGreen-700">AI 글쓰기 에디터</h3>
        
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
              <div className="flex gap-2 text-sm text-slate-600">
                <span>글자 수: {wordCount}</span>
                <button
                  onClick={handleCheckViolations}
                  className="text-clinicGreen-600 hover:text-clinicGreen-700 font-medium"
                >
                  위반 단어 검사
                </button>
              </div>
            </div>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setWordCount(e.target.value.length);
              }}
              rows={12}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
            />
            
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
              초안을 수정하고 싶으시면 아래에 수정 지시사항을 입력해주세요. 학습된 어투가 자동으로 반영됩니다.
            </p>
            <textarea
              value={revisionInstruction}
              onChange={(e) => setRevisionInstruction(e.target.value)}
              placeholder="예: 더 친근한 어투로 바꿔줘, 첫 문단을 더 강하게 시작해줘, 전문 용어를 쉽게 풀어써줘"
              rows={3}
              className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              onClick={handleRevise}
              disabled={revising || !revisionInstruction.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {revising ? '퇴고 중...' : '퇴고하기'}
            </button>
          </div>

          {/* 퇴고된 버전 표시 */}
          {revisedDraft && (
            <div className="rounded-lg border-2 border-clinicGreen-300 bg-clinicGreen-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h4 className="font-semibold text-clinicGreen-700">퇴고된 버전</h4>
                </div>
                <div className="text-sm text-slate-600">
                  <span>글자 수: {revisedDraft.length}</span>
                </div>
              </div>
              <textarea
                value={revisedDraft}
                onChange={(e) => setRevisedDraft(e.target.value)}
                rows={12}
                className="mb-3 w-full rounded-lg border border-clinicGreen-300 bg-white px-4 py-3 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
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
                <div className="flex gap-2 text-sm text-purple-700">
                  <span>글자 수: {finalDraft.length}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(finalDraft);
                      alert('최종 버전이 클립보드에 복사되었습니다!');
                    }}
                    className="font-medium hover:text-purple-900"
                  >
                    복사하기
                  </button>
                </div>
              </div>
              <textarea
                value={finalDraft}
                onChange={(e) => setFinalDraft(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

