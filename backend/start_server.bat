@echo off
echo 백엔드 서버를 시작합니다...
echo 현재 디렉토리: %CD%
echo Python 경로 확인...
python --version
echo.
echo 서버 시작 중 (포트 자동 감지)...
python start_server.py
pause

