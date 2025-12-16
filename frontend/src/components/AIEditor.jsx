import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function AIEditor() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [writingInstruction, setWritingInstruction] = useState(''); // 글쓰기 지시사항
  const [draft, setDraft] = useState('');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [writingStyle, setWritingStyle] = useState('blog'); // 'diary', 'blog', 'essay', 'personal'
  
  // 퇴고 관련 상태
  const [revisionInstruction, setRevisionInstruction] = useState('');
  const [revisedDraft, setRevisedDraft] = useState('');
  const [revising, setRevising] = useState(false);
  
  // 학습 관련 상태
  const [showLearning, setShowLearning] = useState(false);
  const [blogUrls, setBlogUrls] = useState('');
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
          writing_instruction: writingInstruction.trim() || undefined, // 글쓰기 지시사항
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
      setWordCount(data.word_count || data.revised_draft.length);
      
      // 퇴고된 버전을 메인 초안으로 교체할지 선택
      const useRevised = confirm('퇴고된 버전을 사용하시겠습니까? (확인: 교체, 취소: 유지)');
      if (useRevised) {
        setDraft(data.revised_draft);
        setRevisedDraft('');
        setRevisionInstruction('');
      }
    } catch (error) {
      console.error('퇴고 실패:', error);
      alert(error.message || '퇴고 중 오류가 발생했습니다.');
    } finally {
      setRevising(false);
    }
  };

  const handleLearn = async () => {
    if (!blogUrls.trim() && !blogTexts.trim() && !personalInfo.trim() && !clinicInfo.trim()) {
      alert('학습할 내용을 입력해주세요. (블로그 URL 또는 텍스트)');
      return;
    }

    try {
      setLearningLoading(true);
      
      // URL 목록 파싱 (줄바꿈 또는 쉼표로 구분)
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
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">학습된 텍스트</p>
                    <p className="text-xl font-bold text-clinicGreen-700">{learningStatus.blog_texts_count}개</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs text-slate-500 mb-1">학습 정보</p>
                    <div className="flex flex-wrap gap-1">
                      {learningStatus.has_personal_info && (
                        <span className="inline-flex items-center gap-1 rounded bg-clinicGreen-100 px-2 py-1 text-xs font-medium text-clinicGreen-700">
                          ✓ 개인 정보
                        </span>
                      )}
                      {learningStatus.has_clinic_info && (
                        <span className="inline-flex items-center gap-1 rounded bg-clinicGreen-100 px-2 py-1 text-xs font-medium text-clinicGreen-700">
                          ✓ 한의원 정보
                        </span>
                      )}
                      {!learningStatus.has_personal_info && !learningStatus.has_clinic_info && (
                        <span className="text-xs text-slate-400">없음</span>
                      )}
                    </div>
                  </div>
                </div>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                블로그 URL (자동 크롤링) - 한 줄에 하나씩 또는 쉼표로 구분
              </label>
              <textarea
                value={blogUrls}
                onChange={(e) => setBlogUrls(e.target.value)}
                placeholder="https://blog.naver.com/username/123456789&#10;https://blog.naver.com/username/987654321"
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
              <p className="mt-1 text-xs text-slate-500">
                네이버 블로그, 티스토리 등 지원. URL만 입력하면 자동으로 텍스트를 추출합니다.
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
            글쓰기 지시사항 (선택사항)
          </label>
          <textarea
            value={writingInstruction}
            onChange={(e) => setWritingInstruction(e.target.value)}
            placeholder="예: 내가 지금 어깨가 아픈데 환자들한테 내가 아픈 부위를 설명하고, 치료 방식도 설명할거야. 아픈 부위는 승모근이고, 팔을 들 때 아프며, 치료 방법은 추나요법이야."
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
          />
          <p className="mt-1 text-xs text-slate-500">
            글의 구체적인 내용, 구조, 설명 방식을 자유롭게 지시해주세요.
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
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">생성된 초안</h4>
            <div className="flex gap-2 text-sm text-slate-600">
              <span>글자 수: {wordCount}</span>
              <button
                onClick={handleCheckViolations}
                className="text-clinicGreen-600 hover:text-clinicGreen-700"
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
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
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

          {/* 퇴고 섹션 */}
          <div className="mt-4 rounded-lg border border-clinicGreen-200 bg-clinicGreen-50 p-4">
            <h5 className="mb-2 text-sm font-semibold text-clinicGreen-700">✏️ 퇴고하기</h5>
            <p className="mb-3 text-xs text-slate-600">
              초안을 수정하고 싶으시면 아래에 수정 지시사항을 입력해주세요. 예: "더 친근하게 써줘", "첫 문단을 더 강하게 시작해줘"
            </p>
            <textarea
              value={revisionInstruction}
              onChange={(e) => setRevisionInstruction(e.target.value)}
              placeholder="예: 더 친근한 어투로 바꿔줘, 첫 문단을 더 강하게 시작해줘, 전문 용어를 쉽게 풀어써줘"
              rows={3}
              className="mb-3 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
            />
            <button
              onClick={handleRevise}
              disabled={revising || !revisionInstruction.trim()}
              className="w-full rounded-lg bg-clinicGreen-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
            >
              {revising ? '퇴고 중...' : '퇴고하기'}
            </button>
          </div>

          {/* 퇴고된 버전 표시 */}
          {revisedDraft && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-clinicGreen-700">✨ 퇴고된 버전</h4>
                <div className="flex gap-2 text-sm text-slate-600">
                  <span>글자 수: {revisedDraft.length}</span>
                  <button
                    onClick={() => {
                      setDraft(revisedDraft);
                      setRevisedDraft('');
                      setRevisionInstruction('');
                    }}
                    className="text-clinicGreen-600 hover:text-clinicGreen-700"
                  >
                    이 버전 사용
                  </button>
                </div>
              </div>
              <textarea
                value={revisedDraft}
                onChange={(e) => setRevisedDraft(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-clinicGreen-300 bg-clinicGreen-50 px-4 py-3 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
              />
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

