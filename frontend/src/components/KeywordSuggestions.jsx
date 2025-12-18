import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';
const FETCH_TIMEOUT = 15000; // 15초 타임아웃 (백엔드 타임아웃보다 길게)

export default function KeywordSuggestions({ onAnalyze }) {
  const [regions, setRegions] = useState(['문정동', '문정역']); // 기본값
  const [regionInput, setRegionInput] = useState('');
  const [suggestionsByRegion, setSuggestionsByRegion] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [nextAutoUpdate, setNextAutoUpdate] = useState(null);
  const intervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef({}); // 지역별 재시도 횟수 추적

  // 다음 자동 업데이트 시간 계산 (오전 9시)
  const calculateNextUpdateTime = () => {
    const now = new Date();
    const nextUpdate = new Date();
    nextUpdate.setHours(9, 0, 0, 0); // 오전 9시
    
    // 오늘 9시가 지났으면 내일 9시로 설정
    if (now.getTime() > nextUpdate.getTime()) {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
    }
    
    return nextUpdate;
  };

  // 자동 업데이트 스케줄 설정
  const scheduleNextUpdate = () => {
    const now = new Date();
    const next = calculateNextUpdateTime();
    const msUntilNext = next.getTime() - now.getTime();
    
    setNextAutoUpdate(next);
    
    // 다음 오전 9시까지 대기 후 실행
    const timeoutId = setTimeout(() => {
      fetchSuggestions();
      setNextAutoUpdate(calculateNextUpdateTime());
      
      // 그 이후부터는 24시간마다 실행
      intervalRef.current = setInterval(() => {
        fetchSuggestions();
        setNextAutoUpdate(calculateNextUpdateTime());
      }, 24 * 60 * 60 * 1000); // 24시간마다
    }, msUntilNext);
    
    return timeoutId;
  };

  useEffect(() => {
    // 초기 로드
    fetchSuggestions();
    const timeoutId = scheduleNextUpdate();
    
    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      // 재시도 횟수 초기화
      retryCountRef.current = {};
    };
  }, [regions]);

  const fetchSuggestions = async (isManual = false) => {
    // 지역이 없으면 조회하지 않음
    if (regions.length === 0) {
      setSuggestionsByRegion({});
      setLoading(false);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 타임아웃 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      
      try {
        // 여러 지역의 키워드를 병렬로 가져오기
        const promises = regions.map(region => 
          fetch(`${API_BASE_URL}/keywords/suggestions?region=${region}`, {
            signal: controller.signal
          })
            .then(async res => {
              if (!res.ok) {
                const errorText = await res.text().catch(() => '알 수 없는 오류');
                throw new Error(`HTTP ${res.status}: ${errorText}`);
              }
              return res.json();
            })
            .catch(err => {
              console.error(`${region} 키워드 로드 실패:`, err);
              // 네트워크 에러나 타임아웃인 경우에도 기본 키워드 반환
              // 백엔드가 항상 기본 키워드를 반환하도록 보장하지만,
              // 네트워크 문제로 접근 불가능한 경우를 대비
              // 날씨 정보 계산
              const currentMonth = new Date().getMonth() + 1;
              let weather = '가을';
              if (currentMonth >= 12 || currentMonth <= 2) weather = '겨울';
              else if (currentMonth >= 3 && currentMonth <= 5) weather = '봄';
              else if (currentMonth >= 6 && currentMonth <= 8) weather = '여름';
              
              const fallbackSuggestions = [
                { keyword: `${region} 한의원`, search_volume: 4800, blog_count: null, competition: 'medium', intent: 'location' },
                { keyword: `${region} 교통사고 한의원`, search_volume: 2200, blog_count: null, competition: 'high', intent: 'condition' },
                { keyword: `${region} 산후보약`, search_volume: 1200, blog_count: null, competition: 'low', intent: 'service' },
                { keyword: `${region} ${weather} 통증 관리`, search_volume: 1500, blog_count: null, competition: 'medium', intent: 'seasonal' },
                { keyword: `${region} 근처 추나요법`, search_volume: 1200, blog_count: null, competition: 'low', intent: 'service' },
                { keyword: `${region} 야간진료 한의원`, search_volume: 1800, blog_count: null, competition: 'medium', intent: 'time' },
                { keyword: `${region} 교통사고 후유증`, search_volume: 2200, blog_count: null, competition: 'high', intent: 'condition' }
              ];
              return { region, suggestions: fallbackSuggestions, isFallback: true };
            })
            .then(data => {
              // 디버깅: 받은 데이터 확인
              console.log(`[${region}] 백엔드 응답 데이터:`, data);
              console.log(`[${region}] 데이터 타입:`, typeof data, Array.isArray(data));
              
              // data가 배열인지 확인
              if (data && typeof data === 'object' && 'suggestions' in data) {
                console.log(`[${region}] 객체 형태로 받음 (suggestions 속성 있음)`);
                return data; // 이미 { region, suggestions } 형태
              }
              
              // 백엔드는 배열을 반환하므로 배열로 처리
              let suggestions = [];
              if (Array.isArray(data)) {
                suggestions = data;
                console.log(`[${region}] 배열로 받음:`, suggestions.length, '개');
              } else if (data && typeof data === 'object') {
                // 객체인 경우 배열로 변환 시도
                console.log(`[${region}] 객체를 배열로 변환 시도`);
                suggestions = [data];
              } else {
                console.warn(`[${region}] 예상치 못한 데이터 형식:`, typeof data);
                suggestions = [];
              }
              
              // 각 suggestion이 올바른 형식인지 확인
              suggestions = suggestions.map((item, idx) => {
                if (!item || typeof item !== 'object') {
                  console.warn(`[${region}] 잘못된 suggestion 형식 (인덱스 ${idx}):`, item);
                  return null;
                }
                // 필수 필드 확인
                if (!item.keyword) {
                  console.warn(`[${region}] keyword 필드 없음 (인덱스 ${idx}):`, item);
                  return null;
                }
                return item;
              }).filter(item => item !== null);
              
              console.log(`[${region}] 최종 변환된 suggestions:`, suggestions.length, '개');
              return { region, suggestions, isFallback: false };
            })
        );
        
        const results = await Promise.all(promises);
        clearTimeout(timeoutId);
        
        // 디버깅: 최종 결과 확인
        console.log('모든 지역 결과:', results);
        
        // 지역별로 구분하여 저장
        const grouped = {};
        let hasError = false;
        results.forEach((result) => {
          // result가 올바른 형태인지 확인
          if (!result || typeof result !== 'object') {
            console.error('잘못된 결과 형태:', result);
            return;
          }
          
          const { region, suggestions, isFallback = false } = result;
          console.log(`[${region}] 최종 저장:`, suggestions?.length || 0, '개 키워드');
          grouped[region] = suggestions || [];
          if (isFallback) {
            hasError = true;
          }
        });
        
        console.log('최종 grouped 데이터:', grouped);
        
        // 모든 지역에 데이터가 없으면 빈 상태로 처리 (에러 아님)
        const hasAnyData = Object.values(grouped).some(suggestions => suggestions.length > 0);
        if (!hasAnyData && regions.length > 0) {
          // 실제로 지역이 있는데 데이터가 없을 때만 경고 (에러 아님)
          console.warn('모든 지역의 키워드를 불러올 수 없습니다.');
        }
        
        setSuggestionsByRegion(grouped);
        setLastUpdate(new Date());
        
        // 폴백 데이터 사용 시 경고 메시지 (에러는 아니지만 정보 제공)
        if (hasError) {
          console.warn('일부 지역의 키워드는 기본값을 사용합니다.');
        }
        
        // 블로그 발행량 조회 실패한 키워드가 있는지 확인하고 재시도
        checkAndRetryFailedBlogCounts(grouped, isManual);
        
        // 수동 업데이트가 아니면 다음 자동 업데이트 시간 갱신
        if (!isManual) {
          setNextAutoUpdate(calculateNextUpdateTime());
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
        throw err;
      }
      } catch (error) {
        console.error('키워드 추천 로드 실패:', error);
        
        // 더 자세한 에러 메시지 생성
        let errorMessage = '키워드를 불러오는 중 오류가 발생했습니다.';
        if (error.message) {
          if (error.message.includes('시간이 초과')) {
            errorMessage = '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
          } else if (error.message.includes('HTTP')) {
            errorMessage = `서버 오류: ${error.message}`;
          } else {
            errorMessage = error.message;
          }
        }
        
        setError(errorMessage);
        
        // 에러 발생 시 빈 데이터로 설정하여 UI가 깨지지 않도록
        const emptyGrouped = {};
        regions.forEach(region => {
          emptyGrouped[region] = [];
        });
        setSuggestionsByRegion(emptyGrouped);
      } finally {
        setLoading(false);
      }
  };

  const handleAnalyze = (keyword) => {
    if (onAnalyze) {
      onAnalyze(keyword);
    }
  };

  const handleRefresh = () => {
    fetchSuggestions(true); // 수동 업데이트
  };

  const handleAddRegion = () => {
    const trimmed = regionInput.trim();
    if (!trimmed) return;
    
    // 이미 존재하는 키워드면 추가하지 않음
    if (regions.includes(trimmed)) {
      setRegionInput('');
      return;
    }
    
    // 최대 2개까지만 유지 (FIFO 방식)
    let newRegions;
    if (regions.length >= 2) {
      // 가장 오래된 키워드(첫 번째)를 제거하고 새로운 키워드를 추가
      newRegions = [...regions.slice(1), trimmed];
    } else {
      // 2개 미만이면 그냥 추가
      newRegions = [...regions, trimmed];
    }
    
    setRegions(newRegions);
    setRegionInput('');
  };

  const handleRemoveRegion = (regionToRemove) => {
    setRegions(regions.filter(r => r !== regionToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddRegion();
    }
  };

  // 블로그 발행량 조회 실패한 키워드 확인 및 재시도
  const checkAndRetryFailedBlogCounts = (grouped, isManual) => {
    // 이전 재시도 타이머 정리
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // 블로그 발행량이 None인 키워드가 있는지 확인
    let hasFailedBlogCounts = false;
    Object.values(grouped).forEach(suggestions => {
      if (suggestions && suggestions.some(item => item.blog_count === null || item.blog_count === undefined)) {
        hasFailedBlogCounts = true;
      }
    });

    // 조회 실패한 키워드가 있고, 수동 업데이트가 아니며, 재시도 횟수가 3회 미만이면 재시도
    if (hasFailedBlogCounts && !isManual) {
      const currentRetryKey = regions.join(',');
      const currentRetryCount = retryCountRef.current[currentRetryKey] || 0;
      
      if (currentRetryCount < 3) {
        console.log(`블로그 발행량 조회 실패 감지, ${2}초 후 재시도 (${currentRetryCount + 1}/3)`);
        retryCountRef.current[currentRetryKey] = currentRetryCount + 1;
        
        // 2초 후 재시도
        retryTimeoutRef.current = setTimeout(() => {
          fetchSuggestions(false); // 자동 재시도
        }, 2000);
      } else {
        console.log('블로그 발행량 재시도 횟수 초과 (3회)');
        // 재시도 횟수 초기화
        delete retryCountRef.current[currentRetryKey];
      }
    } else if (!hasFailedBlogCounts) {
      // 성공했으면 재시도 횟수 초기화
      const currentRetryKey = regions.join(',');
      delete retryCountRef.current[currentRetryKey];
    }
  };

  const formatNextUpdateTime = () => {
    if (!nextAutoUpdate) return '';
    const now = new Date();
    const diff = nextAutoUpdate.getTime() - now.getTime();
    
    if (diff < 0) return '곧 업데이트';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 후`;
    } else {
      return `${minutes}분 후`;
    }
  };


  if (loading && Object.keys(suggestionsByRegion).length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-clinicGreen-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500">실시간 검색량을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-clinicGreen-700">
            추천 키워드 - 검색량 순위
          </h3>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-slate-400">
                {lastUpdate.toLocaleTimeString()} 업데이트
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title="새로고침"
            >
              🔄
            </button>
          </div>
        </div>
        
        {/* 지역 입력 UI */}
        <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="지역 키워드 입력 (예: 왕십리, 상왕십리)"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-clinicGreen-500 focus:outline-none focus:ring-2 focus:ring-clinicGreen-200"
            />
            <button
              onClick={handleAddRegion}
              disabled={!regionInput.trim() || regions.includes(regionInput.trim())}
              className="rounded-lg bg-clinicGreen-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-clinicGreen-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
          
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              최대 2개 지역까지 표시됩니다 {regions.length >= 2 && '(새 키워드 추가 시 가장 오래된 키워드가 자동 삭제됩니다)'}
            </p>
            <span className="text-xs text-slate-400">
              {regions.length}/2
            </span>
          </div>
          
          {/* 선택된 지역 태그 */}
          {regions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {regions.map((region, index) => (
                <span
                  key={region}
                  className="inline-flex items-center gap-1 rounded-full bg-clinicGreen-100 px-3 py-1 text-xs font-medium text-clinicGreen-700"
                >
                  {index === 0 && regions.length >= 2 && (
                    <span className="text-xs text-slate-400 mr-1" title="다음 추가 시 삭제됨">⏱</span>
                  )}
                  {region}
                  <button
                    onClick={() => handleRemoveRegion(region)}
                    className="ml-1 text-clinicGreen-600 hover:text-clinicGreen-800"
                    title="제거"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {regions.length === 0 && (
            <p className="text-xs text-slate-500">지역 키워드를 추가해주세요.</p>
          )}
        </div>
      </div>
      
      {nextAutoUpdate && (
        <div className="mb-3 rounded-lg bg-slate-50 p-2 text-center">
          <p className="text-xs text-slate-600">
            다음 자동 업데이트: 오전 9시 ({formatNextUpdateTime()})
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800 mb-1">⚠️ 오류 발생</p>
          <p className="text-xs text-red-600">{error}</p>
          <p className="text-xs text-red-500 mt-2">
            💡 해결 방법: 백엔드 서버가 실행 중인지, .env 파일에 API 키가 올바르게 설정되었는지 확인해주세요.
          </p>
        </div>
      )}
      
      {loading && Object.keys(suggestionsByRegion).length > 0 && (
        <div className="mb-3 rounded-lg bg-blue-50 p-2 text-center">
          <p className="text-xs text-blue-600">검색량 업데이트 중...</p>
        </div>
      )}
      
      {/* 가로 배치: grid 사용 */}
      {regions.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {regions.map((region) => {
          const suggestions = suggestionsByRegion[region] || [];
          
          return (
            <div key={region} className="space-y-3">
              {/* 지역별 헤더 */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <h4 className="font-semibold text-clinicGreen-700">{region}</h4>
                <span className="text-xs text-slate-500">({suggestions.length}개 키워드)</span>
                {/* 검수 통계 */}
                {suggestions.length > 0 && (() => {
                  const apiCount = suggestions.filter(s => s.data_source === 'api').length;
                  const validatedCount = suggestions.filter(s => s.is_validated !== false).length;
                  const totalCount = suggestions.length;
                  return (
                    <span className="text-xs text-slate-400 ml-auto">
                      실제 데이터: {apiCount}/{totalCount} | 검증 통과: {validatedCount}/{totalCount}
                    </span>
                  );
                })()}
              </div>
              
              {/* 키워드 목록 */}
              {suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((item, idx) => (
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
                                ? item.blog_count.toLocaleString() 
                                : '조회 실패'}
                            </span>
                          </span>
                          {item.search_volume !== null && item.search_volume !== undefined && item.search_volume > 0 && (
                            <span className="text-slate-600">
                              일주일 검색량: <span className="font-semibold text-clinicGreen-700">{item.search_volume.toLocaleString()}</span>
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
                          {/* 검수 정보 표시 */}
                          {item.data_source && (
                            <span 
                              className={`px-2 py-0.5 rounded text-xs ${
                                item.data_source === 'api' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : item.data_source === 'fallback_or_estimated'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                              title={
                                item.data_source === 'api' 
                                  ? '실제 API에서 조회한 데이터'
                                  : item.data_source === 'fallback_or_estimated'
                                  ? '폴백 또는 추정값 사용'
                                  : '데이터 소스 불명'
                              }
                            >
                              {item.data_source === 'api' 
                                ? '✓ 실제 데이터' 
                                : item.data_source === 'fallback_or_estimated'
                                ? '⚠ 추정값'
                                : '? 미확인'}
                            </span>
                          )}
                          {item.is_validated === false && (
                            <span 
                              className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs"
                              title="데이터 검증 실패: 검색량과 블로그 발행량의 비율이 비정상적입니다"
                            >
                              ⚠ 검증 실패
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
              ) : (
                <p className="text-center text-sm text-slate-400 py-4">
                  {loading ? '로딩 중...' : '키워드를 불러올 수 없습니다.'}
                </p>
              )}
            </div>
          );
        })}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">지역 키워드를 추가하면 추천 키워드를 확인할 수 있습니다.</p>
        </div>
      )}
      
      {Object.keys(suggestionsByRegion).length === 0 && !loading && !error && regions.length > 0 && (
        <p className="text-center text-sm text-slate-500 py-4">추천 키워드를 불러올 수 없습니다.</p>
      )}
    </div>
  );
}
