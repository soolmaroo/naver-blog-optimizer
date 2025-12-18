# VS Code settings.json 파일 설명

## settings.json이란?

`settings.json`은 **VS Code의 프로젝트별 설정 파일**입니다.

### 위치
- `.vscode/settings.json` - 프로젝트 폴더에 있는 설정 (현재 파일)
- 전역 설정: 사용자 설정 폴더에 있는 `settings.json`

### 역할
이 파일은 VS Code가 **이 프로젝트를 열 때 자동으로 적용되는 설정**을 저장합니다.

## 현재 파일의 내용

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/backend/.venv/Scripts/python.exe",
  "python.languageServer": "Pylance",
  "python.analysis.extraPaths": [
    "${workspaceFolder}/backend"
  ],
  "basedpyright.analysis.extraPaths": [
    "${workspaceFolder}/backend"
  ],
  "python.analysis.typeCheckingMode": "basic",
  "basedpyright.typeCheckingMode": "basic"
}
```

### 각 설정의 의미

1. **`python.defaultInterpreterPath`**
   - Python 인터프리터 경로 지정
   - 이 프로젝트를 열면 자동으로 `backend/.venv/Scripts/python.exe`를 사용

2. **`python.languageServer`**
   - Python 언어 서버를 "Pylance"로 설정
   - 자동완성, 타입 체크 등 제공

3. **`python.analysis.extraPaths`**
   - Python 코드 분석 시 추가로 찾을 경로
   - `backend` 폴더를 추가하여 import 오류 방지

4. **`basedpyright.analysis.extraPaths`**
   - 타입 체커(basedpyright)가 찾을 추가 경로

5. **`python.analysis.typeCheckingMode`**
   - 타입 체크 모드: "basic" (기본)
   - "off", "basic", "strict" 중 선택

6. **`basedpyright.typeCheckingMode`**
   - basedpyright 타입 체크 모드

## 왜 필요한가?

이 파일이 있으면:
- ✅ 프로젝트를 열 때마다 Python 인터프리터를 수동으로 선택할 필요 없음
- ✅ 팀원들이 같은 설정으로 작업 가능
- ✅ import 오류 경고가 줄어듦
- ✅ 자동완성이 더 정확하게 작동

## GitHub에 올려야 하나?

**권장: 올리는 것이 좋습니다**

이유:
- 팀원들이 같은 VS Code 설정을 사용할 수 있음
- 프로젝트 설정이 일관성 있게 유지됨
- 새로운 팀원이 프로젝트를 시작할 때 설정할 필요 없음

단, 개인적인 설정(예: 폰트 크기, 테마 등)은 전역 설정에 두는 것이 좋습니다.

