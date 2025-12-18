import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function KeywordAnalyzer({ initialKeyword = '' }) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // initialKeyword가 변경되면 자동으로 분석 실행
  useEffect(() => {
    if (initialKeyword && initialKeyword.trim()) {
      setKeyword(initialKeyword);
      handleAnalyze(initialKeyword);
    }
  }, [initialKeyword]);

  const handleAnalyze = async (keywordToAnalyze = null) => {
    const targetKeyword = keywordToAnalyze || keyword.trim();
    if (!targetKeyword) return;

    try {
      setLoading(true);
      setAnalysis(null); // 이전 결과 초기화
      
      const response = await fetch(`${API_BASE_URL}/keywords/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: targetKeyword }),
      });

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const data = await response.json();
      setAnalysis(data);
      
      // 분석 결과가 나오면 해당 영역으로 스크롤
      setTimeout(() => {
        const element = document.getElementById('keyword-analysis-result');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (error) {
      console.error('키워드 분석 실패:', error);
      alert('키워드 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-clinicGreen-700">키워드 분석기</h3>
      
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          placeholder="분석할 키워드를 입력하세요"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
        />
        <button
          onClick={() => handleAnalyze()}
          disabled={loading || !keyword.trim()}
          className="rounded-lg bg-clinicGreen-600 px-6 py-2 font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
        >
          {loading ? '분석 중...' : '분석'}
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">분석 중...</p>
        </div>
      )}

      {analysis && !loading && (
        <div id="keyword-analysis-result" className="rounded-lg border border-clinicGreen-100 bg-clinicGreen-50 p-4">
          <h4 className="mb-3 font-semibold text-clinicGreen-800">{analysis.keyword}</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">블로그 발행량</p>
                <p className={`text-lg font-bold ${
                  analysis.blog_count !== null && analysis.blog_count !== undefined
                    ? 'text-blue-700'
                    : 'text-red-500'
                }`}>
                  {analysis.blog_count !== null && analysis.blog_count !== undefined
                    ? analysis.blog_count.toLocaleString()
                    : '조회 실패'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">일주일 검색량</p>
                <p className="text-lg font-bold text-clinicGreen-700">
                  {analysis.search_volume !== null && analysis.search_volume !== undefined
                    ? analysis.search_volume.toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-600">경쟁 강도</p>
              <p className={`text-lg font-bold ${
                analysis.competition === 'low' ? 'text-green-700' :
                analysis.competition === 'medium' ? 'text-yellow-700' :
                'text-red-700'
              }`}>
                {analysis.competition === 'low' ? '낮음' :
                 analysis.competition === 'medium' ? '보통' : '높음'}
              </p>
            </div>
          </div>
          {analysis.trend && (
            <div className="mt-3 pt-3 border-t border-clinicGreen-200">
              <p className="text-xs text-slate-600">트렌드</p>
              <p className="text-sm font-medium text-slate-700">{analysis.trend}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
