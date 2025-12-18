import { useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function RelatedKeywords({ onAnalyze }) {
  const [keyword, setKeyword] = useState('');
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [baseKeyword, setBaseKeyword] = useState('');

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    try {
      setLoading(true);
      setRelatedKeywords([]);
      
      const response = await fetch(`${API_BASE_URL}/keywords/related`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          keyword: keyword.trim(),
          max_results: 10
        }),
      });

      if (!response.ok) {
        throw new Error('관련 키워드 조회 실패');
      }

      const data = await response.json();
      setRelatedKeywords(data.related_keywords || []);
      setBaseKeyword(data.base_keyword);
    } catch (error) {
      console.error('관련 키워드 조회 실패:', error);
      alert('관련 키워드 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (keyword) => {
    if (onAnalyze) {
      onAnalyze(keyword);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-clinicGreen-700">
        관련 키워드 검색량 순위
      </h3>
      
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="키워드를 입력하세요 (예: 한의원, 추나요법)"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !keyword.trim()}
          className="rounded-lg bg-clinicGreen-600 px-6 py-2 font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50"
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <div className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-clinicGreen-600 border-t-transparent"></div>
          <p className="text-sm text-slate-600">관련 키워드 검색량을 조회하는 중...</p>
        </div>
      )}

      {relatedKeywords.length > 0 && !loading && (
        <div className="space-y-3">
          <div className="mb-3 rounded-lg bg-clinicGreen-50 p-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-clinicGreen-700">"{baseKeyword}"</span> 관련 키워드 검색량 순위
            </p>
          </div>
          
          {relatedKeywords.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
            >
              {/* 순위 표시 */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                idx === 1 ? 'bg-slate-200 text-slate-700' :
                idx === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {idx + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.keyword}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-600">
                    블로그 발행량: <span className={`font-semibold ${
                      item.blog_count !== null && item.blog_count !== undefined 
                        ? 'text-blue-700' 
                        : 'text-red-500'
                    }`}>
                      {item.blog_count !== null && item.blog_count !== undefined 
                        ? item.blog_count.toLocaleString('ko-KR') 
                        : '조회 실패'}
                    </span>
                  </span>
                  {item.search_volume !== null && item.search_volume !== undefined && item.search_volume > 0 && (
                    <span className="text-slate-600">
                      일주일 검색량: <span className="font-semibold text-clinicGreen-700">{item.search_volume.toLocaleString('ko-KR')}</span>
                    </span>
                  )}
                  {item.competition && (
                    <span className={`px-2 py-0.5 rounded ${
                      item.competition === 'low' ? 'bg-green-100 text-green-700' :
                      item.competition === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.competition === 'low' ? '경쟁 낮음' :
                       item.competition === 'medium' ? '경쟁 보통' : '경쟁 높음'}
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => handleAnalyze(item.keyword)}
                className="ml-auto shrink-0 rounded-lg bg-clinicGreen-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-clinicGreen-700 transition-colors"
              >
                분석
              </button>
            </div>
          ))}
        </div>
      )}

      {relatedKeywords.length === 0 && !loading && baseKeyword && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500">관련 키워드를 찾을 수 없습니다.</p>
        </div>
      )}
    </div>
  );
}

