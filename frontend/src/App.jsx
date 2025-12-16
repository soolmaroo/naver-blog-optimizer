import { useState, useEffect } from 'react';
import KeywordSuggestions from './components/KeywordSuggestions';
import KeywordAnalyzer from './components/KeywordAnalyzer';
import RelatedKeywords from './components/RelatedKeywords';
import AIEditor from './components/AIEditor';
import NaverCallback from './components/NaverCallback';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedKeyword, setSelectedKeyword] = useState('');

  useEffect(() => {
    // 로그인 상태 확인
    const token = localStorage.getItem('naver_access_token');
    const user = localStorage.getItem('naver_user');
    
    if (token && user) {
      setIsLoggedIn(true);
      try {
        setUserInfo(JSON.parse(user));
      } catch (e) {
        console.error('사용자 정보 파싱 오류:', e);
      }
    }
  }, []);

  // 콜백 페이지인지 확인
  const isCallbackPage = window.location.pathname.includes('/auth/naver/callback');
  
  if (isCallbackPage) {
    return <NaverCallback />;
  }

  const handleNaverLogin = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/naver/login');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류가 발생했습니다.' }));
        alert(`네이버 로그인 오류: ${errorData.detail || response.statusText}\n\n확인 사항:\n1. .env 파일에 NAVER_CLIENT_ID가 올바르게 설정되었는지\n2. 네이버 개발자 센터에서 리다이렉트 URI가 등록되었는지\n3. 백엔드 서버가 재시작되었는지`);
        console.error('네이버 로그인 API 오류:', errorData);
        return;
      }
      
      const data = await response.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        alert('로그인 URL을 받아오지 못했습니다.');
      }
    } catch (error) {
      console.error('네이버 로그인 실패:', error);
      alert(`네이버 로그인 연결 실패: ${error.message}\n\n백엔드 서버가 실행 중인지 확인해주세요.`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('naver_access_token');
    localStorage.removeItem('naver_user');
    setIsLoggedIn(false);
    setUserInfo(null);
  };

  const handleKeywordAnalyze = (keyword) => {
    setSelectedKeyword(keyword);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-clinicGreen-600" />
            <div>
              <p className="text-sm text-slate-500">Moonjeong Clinic</p>
              <h1 className="text-xl font-semibold text-clinicGreen-700">네이버 블로그 도우미</h1>
            </div>
          </div>
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {userInfo?.name || userInfo?.nickname || '사용자'}님
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={handleNaverLogin}
              className="rounded-full bg-clinicGreen-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clinicGreen-700"
            >
              네이버 로그인
            </button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-4">
          <p className="text-sm font-semibold text-clinicGreen-700">문정역 · 송파 한의원</p>
          <div className="flex flex-wrap items-end gap-4">
            <h2 className="text-3xl font-bold leading-tight text-slate-900">
              블로그 최적화와 자동화를 한 곳에서
            </h2>
            <span className="rounded-full bg-clinicGreen-50 px-3 py-1 text-xs font-medium text-clinicGreen-700">
              MVP 준비 완료
            </span>
          </div>
          <p className="max-w-3xl text-base text-slate-600">
            지역·날씨 기반 추천 키워드, 네이버 검색/데이터랩 분석, Gemini 글쓰기, 의료법 필터, 이미지 생성,
            네이버 로그인까지 한 번에 준비된 대시보드입니다.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <KeywordSuggestions onAnalyze={handleKeywordAnalyze} />
          </div>
          <div className="lg:col-span-2">
            <KeywordAnalyzer initialKeyword={selectedKeyword} />
          </div>
        </div>

        <div className="mt-6">
          <RelatedKeywords onAnalyze={handleKeywordAnalyze} />
        </div>

        <div className="mt-6">
          <AIEditor />
        </div>

        <div className="mt-10 rounded-2xl border border-clinicGreen-100 bg-clinicGreen-50 p-6 text-slate-800">
          <h4 className="text-lg font-semibold text-clinicGreen-800">설정 가이드</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>1) 프로젝트 루트에 .env 파일 생성 후 API 키 입력</li>
            <li>2) NAVER_CLIENT_ID, NAVER_CLIENT_SECRET: 네이버 개발자 센터에서 발급</li>
            <li>3) GOOGLE_API_KEY: Google AI Studio에서 Gemini API 키 발급</li>
            <li>4) 백엔드 서버 재시작 후 기능 사용 가능</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default App;
