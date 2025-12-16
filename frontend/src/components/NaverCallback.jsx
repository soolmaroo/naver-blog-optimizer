import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export default function NaverCallback() {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // URL 파라미터에서 code와 state 추출
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      setError(`네이버 로그인 오류: ${errorParam}`);
      setStatus('error');
      return;
    }

    if (!code) {
      setError('인증 코드를 받지 못했습니다.');
      setStatus('error');
      return;
    }

    // 백엔드로 코드 전송하여 토큰 받기
    handleCallback(code, state);
  }, []);

  const handleCallback = async (code, state) => {
    try {
      setStatus('processing');
      
      const url = `${API_BASE_URL}/auth/naver/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '알 수 없는 오류' }));
        throw new Error(errorData.detail || '로그인 처리 실패');
      }

      const data = await response.json();
      
      if (data.success) {
        // 로그인 성공 - 토큰 저장
        if (data.access_token) {
          localStorage.setItem('naver_access_token', data.access_token);
        }
        if (data.user) {
          localStorage.setItem('naver_user', JSON.stringify(data.user));
          setUserInfo(data.user);
        }
        
        setStatus('success');
        
        // 2초 후 메인 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error('로그인 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error('콜백 처리 오류:', err);
      setError(err.message || '로그인 처리 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  if (status === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-clinicGreen-600 border-t-transparent"></div>
          <p className="text-lg font-medium text-slate-700">로그인 처리 중...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mb-4 text-4xl">❌</div>
          <h2 className="mb-2 text-xl font-semibold text-red-800">로그인 실패</h2>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="rounded-lg bg-clinicGreen-600 px-6 py-2 text-white hover:bg-clinicGreen-700"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="max-w-md rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="mb-4 text-4xl">✅</div>
          <h2 className="mb-2 text-xl font-semibold text-green-800">로그인 성공!</h2>
          {userInfo && (
            <p className="mb-4 text-green-700">
              {userInfo.name || userInfo.nickname || '사용자'}님 환영합니다.
            </p>
          )}
          <p className="text-sm text-green-600">잠시 후 메인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return null;
}
