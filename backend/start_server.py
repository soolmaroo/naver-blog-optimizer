#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
백엔드 서버 자동 시작 스크립트
포트 충돌 시 자동으로 다른 포트를 찾아 사용합니다.
"""
import socket
import subprocess
import sys
import os
import io

# Windows에서 UTF-8 인코딩 설정
if sys.platform == 'win32':
    # stdout과 stderr의 인코딩을 UTF-8로 설정
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    else:
        # Python 3.6 이하 호환
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)

def is_port_in_use(port: int) -> bool:
    """포트가 사용 중인지 확인"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', port))
            return False
        except OSError:
            return True

def find_available_port(start_port: int = 8000, max_attempts: int = 10) -> int:
    """사용 가능한 포트 찾기"""
    for i in range(max_attempts):
        port = start_port + i
        if not is_port_in_use(port):
            return port
    raise RuntimeError(f"{max_attempts}개의 포트를 시도했지만 모두 사용 중입니다.")

def start_server(port: int):
    """서버 시작"""
    try:
        print(f"\n{'='*60}")
        print(f"백엔드 서버 시작")
        print(f"{'='*60}")
        print(f"포트: {port}")
        print(f"URL: http://127.0.0.1:{port}")
        print(f"API 문서: http://127.0.0.1:{port}/docs")
        print(f"{'='*60}\n")
    except UnicodeEncodeError:
        # 인코딩 에러 시 ASCII만 사용
        print("\n" + "="*60)
        print("백엔드 서버 시작")
        print("="*60)
        print(f"포트: {port}")
        print(f"URL: http://127.0.0.1:{port}")
        print(f"API 문서: http://127.0.0.1:{port}/docs")
        print("="*60 + "\n")
    
    try:
        # uvicorn 서버 시작
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "app.main:app",
            "--reload",
            "--host", "127.0.0.1",
            "--port", str(port)
        ], cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        print("\n\n서버를 종료합니다...")
        sys.exit(0)

if __name__ == "__main__":
    try:
        # 기본 포트 확인
        default_port = 8000
        if is_port_in_use(default_port):
            print(f"[경고] 포트 {default_port}이(가) 이미 사용 중입니다.")
            print("사용 가능한 포트를 찾는 중...")
            port = find_available_port(default_port)
            print(f"[성공] 포트 {port}을(를) 사용합니다.")
        else:
            port = default_port
            print(f"[성공] 포트 {port}을(를) 사용합니다.")
        
        start_server(port)
    except Exception as e:
        print(f"[오류] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

