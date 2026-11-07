# Typomm ✍️

> **Typora의 감성을 담은 초고속·초경량 실시간 마크다운 에디터**  
> *Ultra-fast, lightweight live-preview Markdown editor built with Tauri v2, Rust, and React.*

<p align="center">
  <img src="./public/tauri.svg" width="80" alt="Typomm Logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2-blue?logo=tauri" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Rust-1.80+-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5+-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-success" alt="Platform" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 🌟 주요 특징 (Key Features)

- **실시간 인라인 위지윅 (Seamless Live Preview)**:
  - 별도의 분할 미리보기 창 없이, `# 제목`, `**볼드**`, `*이탤릭*`, `- [ ] 체크박스`, ` ``` 코드블록`, `| 표 |`, `> 인용구` 입력 즉시 해당 위치에 서식이 렌더링됩니다.
- **Typora 오리지널 감성 테마 4종**:
  - **GitHub**: 깔끔한 순백색 배경과 회색 보더의 공식 기본 테마
  - **Night**: 네온 에메랄드 포인트와 눈이 편안한 공식 다크 테마
  - **Newsprint**: 따뜻한 크림 페이퍼 질감과 우아한 세리프(Serif) 북 스타일 테마
  - **Gothic**: 모던 에디토리얼 고대비 흑백 테마
- **환경설정 (Preferences Modal, `Cmd + ,` / `Ctrl + ,`)**:
  - 글꼴 계열 선택 (Sans-Serif / Serif / Monospace)
  - 글자 크기 (14px, 16px, 18px, 20px) 및 줄 간격 (1.5, 1.7, 1.9)
  - 본문 최대 폭 조절 (720px 집중, 860px 표준, 1080px 넓게, 100% 전체 화면)
  - 타자기 모드 (Typewriter Mode, 커서 화면 중앙 유지)
  - 설정값 로컬 영구 저장 (`localStorage`)
- **소스 코드 모드 (`Cmd + /` / `Ctrl + /`)**:
  - 원본 마크다운 텍스트 편집 모드와 실시간 위지윅 모드를 단축키 하나로 즉시 전환
- **실시간 목차(Outline) 사이드바**:
  - H1 ~ H6 제목을 실시간 분석하여 계층형 트리 제공 및 클릭 시 부드러운 스크롤 이동
- **초경량 & 고성능 (Zero Bloatware)**:
  - Chromium 전체를 번들링하는 무거운 Electron 대신, OS 내장 웹뷰(WebKit / WebView2)와 Rust 백엔드를 사용하여 **설치 용량 4MB, 실행 메모리 40MB 내외, 시작 속도 50ms 미만**을 자랑합니다.

---

## ⌨️ 단축키 안내 (Shortcuts)

| 기능 | macOS | Windows / Linux |
| :--- | :--- | :--- |
| **새 문서** | `Cmd + N` | `Ctrl + N` |
| **파일 열기** | `Cmd + O` | `Ctrl + O` |
| **파일 저장** | `Cmd + S` | `Ctrl + S` |
| **다른 이름으로 저장** | `Cmd + Shift + S` | `Ctrl + Shift + S` |
| **소스 코드 모드 전환** | `Cmd + /` | `Ctrl + /` |
| **환경설정 열기** | `Cmd + ,` | `Ctrl + ,` |

---

## 🛠️ 개발 및 빌드 방법 (Build Guide)

Typomm은 **macOS**와 **Windows** 모두에서 동일한 소스 코드로 네이티브 바이너리를 빌드할 수 있습니다.

### 1. 공통 사전 요구사항 (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 이상 권장)
- [pnpm](https://pnpm.io/) (`corepack enable` 또는 `npm install -g pnpm`)
- [Rust 툴체인](https://rustup.rs/) (최신 stable 채널)

---

### 🍏 macOS 빌드 가이드

#### 1) 사전 준비
macOS Command Line Tools가 필요합니다:
```bash
xcode-select --install
```

#### 2) 의존성 설치
```bash
pnpm install --ignore-scripts
```

#### 3) 로컬 개발 모드 실행
네이티브 macOS 창이 뜨며 실시간 핫 리로딩(HMR)으로 개발할 수 있습니다:
```bash
pnpm tauri dev
```

#### 4) 릴리즈 패키징 (`.app` 및 `.dmg`)
```bash
pnpm tauri build
```
빌드가 완료되면 아래 디렉터리에 설치 파일이 생성됩니다:
- **macOS 앱 번들**: `src-tauri/target/release/bundle/macos/Typomm.app`
- **macOS 설치 파일**: `src-tauri/target/release/bundle/dmg/Typomm_0.1.0_aarch64.dmg`

> 💡 생성된 `Typomm.app`을 `/Applications` 폴더로 드래그하면 바로 응용 프로그램으로 등록됩니다.

---

### 🪟 Windows 빌드 가이드

Windows 환경(Windows 10 / 11)에서도 명령어는 동일합니다.

#### 1) 사전 준비
- **C++ Build Tools 설치**:
  - [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 설치 시 **"C++를 사용한 데스크톱 개발"** 워크로드를 선택하여 설치합니다.
- **WebView2 런타임**:
  - Windows 10/11에는 기본 탑재되어 있습니다. (미설치 시 Microsoft Evergreen 런타임 자동 다운로드)
- **Rust Windows 타깃 확인**:
  ```powershell
  rustup default stable-x86_64-pc-windows-msvc
  ```

#### 2) 의존성 설치
```powershell
pnpm install --ignore-scripts
```

#### 3) 로컬 개발 모드 실행
```powershell
pnpm tauri dev
```

#### 4) 릴리즈 패키징 (`.exe` 및 `.msi`)
```powershell
pnpm tauri build
```
빌드가 완료되면 아래 디렉터리에 배포용 실행 파일이 생성됩니다:
- **NSIS 독립 실행형 인스톨러**: `src-tauri/target/release/bundle/nsis/Typomm_0.1.0_x64-setup.exe`
- **Windows MSI 인스톨러**: `src-tauri/target/release/bundle/msi/Typomm_0.1.0_x64_en-US.msi`

---

## 🚀 GitHub Actions를 통한 멀티 플랫폼 자동 빌드

프로젝트에는 **GitHub Actions 워크플로우([`.github/workflows/release.yml`](.github/workflows/release.yml))**가 포함되어 있습니다.

Mac이나 Windows PC에서 직접 빌드하지 않아도, 새 버전을 Git 태그로 푸시하면 **GitHub 클라우드 가상머신이 macOS(`.dmg`) 및 Windows(`.msi`, `.exe`) 설치 파일을 자동으로 빌드하여 Release 탭에 업로드**합니다:

```bash
# 새 버전 태그 생성 및 푸시
git tag v0.1.0
git push origin v0.1.0
```

GitHub 저장소의 **Releases** 페이지에서 완성된 설치 파일을 직접 다운로드할 수 있습니다.

---

## 📂 프로젝트 구조 (Project Structure)

```
Typomm/
├── .github/workflows/
│   └── release.yml          # GitHub Actions 멀티 플랫폼 자동 릴리즈
├── src-tauri/               # Rust 백엔드 & Tauri 데스크톱 설정
│   ├── Cargo.toml           # Rust 종속성 및 최적화(LTO) 설정
│   ├── tauri.conf.json      # 창 크기, 테마, 번들링 설정
│   └── src/
│       └── lib.rs           # 고속 네이티브 파일 I/O 및 대화상자 커맨드
├── src/                     # React + TypeScript 프론트엔드
│   ├── components/
│   │   ├── Editor.tsx       # ProseMirror/TipTap 인라인 위지윅 에디터 코어
│   │   ├── Outline.tsx      # 실시간 H1~H6 개요 사이드바
│   │   ├── Toolbar.tsx      # Typora 감성 툴바 및 모드 토글
│   │   ├── StatusBar.tsx    # 글자 수/단어 수/읽기 시간 상태바
│   │   └── SettingsModal.tsx# 테마/글꼴/폭 환경설정 모달 (Cmd+,)
│   ├── types.ts             # 전역 타입 및 설정 기본값
│   ├── App.css              # Typora 4종 테마 및 타이포그래피 스타일
│   └── App.tsx              # 전역 단축키 및 상태 관리
└── package.json
```

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용, 수정, 배포할 수 있습니다.
