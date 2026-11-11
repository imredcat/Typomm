# Typomm ✍️

> **Typora의 감성을 담은 초고속·초경량 실시간 마크다운 에디터**  
> *Ultra-fast, lightweight live-preview Markdown editor built with Tauri v2, Rust, and React.*

<p align="center">
  <img src="./app-icon.png" width="128" alt="Typomm Logo" />
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
- **Ulysses 스타일 좌측 다중 컬럼 레이아웃 (Multi-Column Workspace)**:
  - 화면 왼쪽에서부터 순서대로 **`[1. 폴더]` → `[2. 문서 탭]` → `[3. 문서내 목차]` → `[4. 편집영역]`** 구조로 배치됩니다.
  - 상단 액션바 좌측의 **`[폴더]` · `[문서 탭]` · `[목차]`** 토글 버튼 및 각 영역 상단의 닫기(`X`) 버튼으로 원하는 영역만 자유롭게 열고 닫을 수 있습니다.
- **시스템 폴더 트리 & 드래그앤드롭 문서 열기 & 즐겨찾기**:
  - **폴더 열기**: 선택한 폴더 내 하위 폴더와 **`.md`(`.markdown`), `.txt`, `.html`(`.htm`) 문서**만 깔끔한 트리 형식으로 필터링하여 표시합니다.
  - **더블클릭·드래그앤드롭 문서 열기**: 폴더 트리의 문서를 더블클릭하거나 에디터 영역으로 드래그앤드롭하면 즉시 문서가 열립니다.
  - **폴더·문서 즐겨찾기 드롭다운**: 폴더 영역과 문서 탭 영역 상단의 즐겨찾기 드롭다운에서 자주 쓰는 폴더와 현재 선택한 폴더의 즐겨찾기 문서를 빠르게 전환할 수 있습니다.
- **HTML 안전 웹뷰 렌더링 (Safe HTML WebView)**:
  - 폴더나 파일에서 `.html`/`.htm` 문서를 열면 `<script>`, `<iframe>`, 인라인 이벤트 등 위험 요소를 완전 차단한 샌드박스 안전 웹뷰로 렌더링되며, 언제든 HTML 원본 소스 코드 보기로 전환할 수 있습니다.
- **세로 문서 탭 관리 & 세션 자동 복원 (Vertical Document Tabs & Session Restore)**:
  - 열려 있는 문서들을 세로 시트 목록 형태로 한눈에 파악하고 전환(`Cmd + T` 새 문서 탭, `Cmd + W` 탭 닫기, 마지막 1개 문서까지 닫기 및 미저장 확인 모달 지원).
  - 앱 종료 후 재실행 시 이전에 작업하던 폴더와 문서 탭(미저장 변경사항 포함)을 그대로 복원하며, 환경설정에서 환영 문서 표시 여부를 끌 수 있습니다.
  - 파일 저장 시 현재 선택한 폴더가 기본 저장 위치로 열립니다.
- **마크다운 문법 치트시트 우측 사이드바 (Markdown Cheatsheet Sidebar)**:
  - 제목, 강조 서식, 목록, 체크리스트, 인용구, 코드 블록, 표, 링크 등 마크다운 주요 문법 안내.
  - 화면을 가리는 모달 대신 우측 도킹 사이드바로 언제든 참고하며 원클릭 **[삽입]** 및 **[복사]** 기능 제공.
- **HTML 변환 및 내보내기 (HTML Export & Conversion)**:
  - 현재 테마 스타일이 완벽히 인라인 임베딩된 독립 실행형 `.html` 파일로 내보내기.
  - 웹 블로그나 이메일에 바로 붙여넣을 수 있는 **HTML 코드 클립보드 복사** 지원.
- **Typora 감성 테마 4종 + 커스텀 배경 테마 + 종이 영역 모드 (5 Themes & Paper Mode)**:
  - **GitHub (종이)**: 깔끔한 순백색 배경과 회색 보더의 공식 기본 테마
  - **Night (야간)**: 네온 에메랄드 포인트와 눈이 편안한 공식 다크 테마
  - **Newsprint (세피아)**: 따뜻한 크림 페이퍼 질감과 우아한 세리프(Serif) 북 스타일 테마
  - **Gothic (미니멀)**: 모던 에디토리얼 고대비 흑백 테마
  - **Custom (커스텀 배경)**: 내 사진/프리셋 배경 이미지를 지정하고 글 작성 영역의 반투명 용지 색상·투명도·블러를 자유롭게 조합하는 OmmWriter 감성 테마 (설정창 등 UI는 불투명 솔리드 카드로 시인성 보장)
  - **종이 영역 모드**: 어떤 테마에서든지 커스텀 테마처럼 글 길이에 맞춰 늘어나거나 줄어드는 플로팅 종이 시트 레이아웃 전환 가능
- **3가지 타자기 모드 & 맑은 행 끝 차임벨 (Triple Typewriter Modes & Chime Bell)**:
  - **모드 1 (중앙 고정)**: 커서가 항상 정중앙에 고정되고 종이가 상하좌우로 움직이는 클래식 타자기의 감성 모드 (한글 음절 조합 완료 시점 및 소프트 줄바꿈 완벽 대응).
  - **모드 2 (60% 줄 고정)**: 종이가 올라가 듯 입력 지점을 화면 상단 60% 위치에 고정하는 안정형 타자기 모드.
  - **모드 3 (집중 모드)**: 커서 줄을 세로 50%에 고정하고 가운데 줄은 가장 진하게, 위·아래 각 4줄(총 약 9줄)은 그라데이션처럼 옅어지도록 비추는 스포트라이트 집중 모드.
  - **행 끝 차임벨**: 옛 타자기의 감성으로 오른쪽 끝에 커서가 도달할 때만 맑고 청아한 차임벨(`딩~`) 울림.
- **전체 화면 몰입 UI (Fullscreen Distraction-Free Mode)**:
  - 전체 화면 진입 시 툴바·상태표시줄·사이드바를 숨겨 글쓰기에만 집중할 수 있으며, 좌측 상단 **둥근 앱 아이콘 메뉴버튼**(또는 `Cmd + Shift + H` / `F10`)으로 툴바를 토글하고, 화면 좌측 끝 마우스 호버로 활성화된 폴더·문서탭·목차를 즉시 꺼내볼 수 있습니다.
  - 환경설정에서 **앱 시작 시 전체 화면으로 시작** 옵션을 지원합니다.
- **Web Audio 합성 타이핑 사운드 (0. 무음 + 11 Typing Sounds)**:
  - 외부 오디오 에셋 없이 Web Audio API로 실시간 합성되는 11가지 정교한 타자 소리(1950s 클래식 타자기, 포터블 타자기, 전동 타자기, 청축·갈축·적축 기계식, 조약돌 도각, 무접점 빗방울, 옴 맑은 물방울, 우드 키캡, 1920s 언더우드 타자기) 및 0번 무음 모드 제공.
  - 스크롤 없이 한눈에 들어오는 2열 좌측 정렬 칩 팝업 메뉴.
- **OmmWriter 스타일 미니멀 상단 툴바 & 창 제어**:
  - 아이콘 중심의 직관적이고 심플한 상단 툴바 (튀는 파란색 없이 기본 텍스트 색상으로 일체화된 미니멀 디자인).
  - 좌측 상단 macOS 트래픽 라이트 버튼과 창 제목의 정밀한 수평 라인 정렬.
  - 마우스 드래그로 자유로운 창 이동 및 클릭 한 번으로 모니터 가로 중앙 정렬 + 화면 최대 세로 높이 확장.
- **에디터 전용 글꼴 분리 & 간결한 환경설정 (`Cmd + ,` / `Ctrl + ,`)**:
  - 선택한 글꼴(무료 오픈소스 타자기 폰트 Special Elite / Courier Prime, 고딕, 명조, 고정폭)은 에디터 본문에만 적용되며, 창 제목 및 메뉴 등 UI는 macOS 시스템 폰트를 유지.
  - 테마, 타자기 모드(1/2), 행 끝 차임벨, 타이핑 소리(12종), 글꼴·크기·줄간격·문서 너비를 군더더기 없는 심플한 UI로 설정 및 로컬 영구 저장 (`localStorage`).
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
| **새 문서 / 새 탭** | `Cmd + N` / `Cmd + T` | `Ctrl + N` / `Ctrl + T` |
| **현재 탭 닫기** | `Cmd + W` | `Ctrl + W` |
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
- **macOS 설치 파일**: `src-tauri/target/release/bundle/dmg/Typomm_0.2.0_aarch64.dmg`

> 💡 생성된 `Typomm.app`을 `/Applications` 폴더로 드래그하면 바로 응용 프로그램으로 등록됩니다.

---

### 🪟 Windows 빌드 가이드 (Windows 10 / 11 상세 매뉴얼)

Windows 환경(PowerShell 또는 Windows Terminal)에서 처음부터 빌드하는 전체 과정입니다.

#### 1) 필수 개발 도구 설치 (최초 1회)

1. **Microsoft Visual Studio C++ Build Tools 설치** (Rust 컴파일에 필수)
   - [Visual Studio Build Tools 다운로드 페이지](https://visualstudio.microsoft.com/ko/visual-cpp-build-tools/)에서 설치 파일을 받아 실행합니다.
   - 워크로드 탭에서 **"C++를 사용한 데스크톱 개발 (Desktop development with C++)"**을 체크합니다.
   - 우측 설치 세부 정보에서 **MSVC v143 C++ x64/x86 빌드 도구**와 **Windows 10/11 SDK**가 체크되어 있는지 확인 후 설치합니다.
2. **Rust 설치**
   - [rustup.rs](https://rustup.rs/)에서 `rustup-init.exe`를 다운로드하여 실행하고 기본 옵션(`1) Proceed with standard installation`)으로 설치합니다.
   - 설치 후 터미널(PowerShell)을 재시작하고 아래 명령어로 정상 설치 및 MSVC 타깃을 확인합니다:
     ```powershell
     rustc --version
     cargo --version
     rustup default stable-x86_64-pc-windows-msvc
     ```
3. **Node.js 및 pnpm 설치**
   - [Node.js LTS (v20 이상 권장)](https://nodejs.org/)를 설치합니다.
   - PowerShell에서 `pnpm`을 활성화합니다:
     ```powershell
     corepack enable
     # 또는 npm으로 직접 설치:
     npm install -g pnpm
     ```
4. **Microsoft Edge WebView2 런타임**
   - Windows 10(최신 업데이트) 및 Windows 11에는 이미 기본 내장되어 있습니다.

#### 2) 저장소 클론 및 패키지 설치
```powershell
git clone https://github.com/imredcat/Typomm.git
cd Typomm
pnpm install
```

#### 3) 로컬 개발 모드 실행
네이티브 Windows 창이 열리며 코드 수정 시 실시간 반영(HMR)됩니다:
```powershell
pnpm tauri dev
```

#### 4) Windows 배포용 설치 파일 빌드 (`.exe` / `.msi`)
```powershell
pnpm tauri build
```
- 만약 특정 포맷(예: NSIS `.exe` 인스톨러만) 빠르게 빌드하고 싶다면:
  ```powershell
  pnpm tauri build --bundles nsis
  ```
- 빌드가 완료되면 아래 경로에 실행 파일 및 설치 프로그램이 생성됩니다:
  - **포터블 단독 실행 파일 (`.exe`)**: `src-tauri\target\release\typomm.exe`
  - **NSIS 설치 프로그램 (`setup.exe`)**: `src-tauri\target\release\bundle\nsis\Typomm_0.2.0_x64-setup.exe`
  - **Windows MSI 설치 프로그램 (`.msi`)**: `src-tauri\target\release\bundle\msi\Typomm_0.2.0_x64_en-US.msi`

---

## 🚀 GitHub Actions를 통한 멀티 플랫폼 자동 빌드

프로젝트에는 **GitHub Actions 워크플로우([`.github/workflows/release.yml`](.github/workflows/release.yml))**가 포함되어 있습니다.

Mac이나 Windows PC에서 직접 빌드하지 않아도, 새 버전을 Git 태그로 푸시하면 **GitHub 클라우드 가상머신이 macOS(`.dmg`) 및 Windows(`.msi`, `.exe`) 설치 파일을 자동으로 빌드하여 Release 탭에 업로드**합니다:

```bash
# 새 버전 태그 생성 및 푸시
git tag v0.2.0
git push origin v0.2.0
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
│   │   ├── Editor.tsx       # ProseMirror/TipTap 인라인 위지윅 & 타자기 모드(1/2) 코어
│   │   ├── Outline.tsx      # 실시간 H1~H6 목차 좌측 사이드바
│   │   ├── CheatsheetModal.tsx # 마크다운 문법 가이드 우측 도킹 사이드바
│   │   ├── Toolbar.tsx      # OmmWriter 감성 미니멀 아이콘 툴바 및 팝오버
│   │   ├── StatusBar.tsx    # 글자 수/단어 수/읽기 시간 상태바
│   │   └── SettingsModal.tsx# 간소화된 테마/타자기/사운드/글꼴 환경설정 모달 (Cmd+,)
│   ├── utils/
│   │   ├── soundEffects.ts  # Web Audio 실시간 10종 타자음 & 맑은 행 끝 차임벨 합성기
│   │   └── htmlExport.ts    # 테마 인라인 스타일 포함 독립형 HTML 변환기
│   ├── types.ts             # 전역 타입 및 설정 기본값
│   ├── App.css              # 5종 테마(커스텀 배경 포함) 및 레이아웃 스타일
│   └── App.tsx              # 다중 탭, 전역 단축키 및 상태 관리
└── package.json
```

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](LICENSE)에 따라 자유롭게 사용, 수정, 배포할 수 있습니다.
