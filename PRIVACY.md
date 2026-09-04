# RenewTube 개인정보 처리방침 (Privacy Policy)

최종 업데이트: 2026년 9월 4일 (Last updated: September 4, 2026)

---

## 한국어 (Korean)

### 요약 (TL;DR)
**RenewTube는 사용자의 어떤 개인정보도 수집하지 않습니다.**  
별도의 회원가입이나 계정 시스템이 없으며, 분석(Analytics) 도구나 원격 추적기(Telemetry/Tracker)도 일절 포함되어 있지 않습니다.  
모든 설정과 상태는 **사용자의 기기(로컬 브라우저 저장소)에만 저장**되며, 외부 서버로 전송되지 않습니다.

---

### 1. 수집하는 정보
**없습니다.**  
RenewTube는 사용자의 개인 식별 정보, 시청 기록, 검색 기록, IP 주소 또는 기기 정보를 수집, 저장, 전송하거나 제3자에게 판매하지 않습니다.

### 2. 사용자 기기에만 보관되는 데이터 (로컬 저장)
확장 프로그램을 편리하게 사용하기 위한 최소한의 환경설정 값은 오직 사용자의 웹 브라우저 로컬 저장소(`chrome.storage.local` 및 `localStorage`)에만 저장됩니다.
- 재생 모드 설정 (음악 모드 / 영상 모드)
- 반복 재생 및 무작위(셔플) 재생 상태
- 현재 재생 대기열(Queue) 상태
- 플레이어 음량 및 가사 표시 설정
- 화면 테마 설정 (다크 모드 / 라이트 모드)
- 배터리 절약 모드 설정

사용자가 브라우저 캐시 또는 확장 프로그램 데이터를 삭제하면 이 모든 설정은 기기에서 즉시 완전히 삭제됩니다.

### 3. 네트워크 통신 방식
RenewTube는 자체적인 백엔드 서버를 운영하지 않습니다.
- **유튜브와의 직접 통신:** 확장이 동작하는 동안 발생하는 모든 영상 탐색, 검색, 스트리밍 요청은 브라우저에서 유튜브 공식 서버(`youtube.com`, `googlevideo.com`)로 직접 전송됩니다. 이는 사용자가 일반 웹 브라우저로 유튜브를 이용할 때와 완전히 동일하며, RenewTube가 중간에서 가로채거나 중계하지 않습니다.
- **가사 조회(`lrclib.net`):** 가사를 켜면 지금 재생 중인 곡의 **제목과 아티스트명**이 공개 가사 데이터베이스인 `lrclib.net` 으로 전송됩니다. 가사를 켤 때만 요청하며 계정 정보나 식별자는 함께 보내지 않습니다. 유튜브 자막에서 가사를 찾은 경우에는 이 요청이 발생하지 않습니다.
- **썸네일 이미지(`i.ytimg.com`):** 목록과 재생 막대의 앨범 그림은 유튜브의 이미지 서버에서 직접 내려받습니다.
- **외부 추적 차단:** 광고 서버, 마케팅 분석 도구, 외부 통계 수집 서버로의 어떠한 네트워크 요청도 발생하지 않습니다.

### 4. 요청 권한 및 필요 이유
확장 프로그램 매니페스트(`manifest.json`)에 정의된 권한의 용도는 다음과 같습니다.
- `storage`: 사용자의 플레이어 설정(재생 모드, 음량, 테마 등)을 기기 로컬에 저장하고 유지하기 위해 사용합니다.
- 호스트 권한 (`https://*.youtube.com/*`): 유튜브 웹사이트 화면 위에서 RenewTube 전용 플레이어 셸 인터페이스를 렌더링하고 조작하기 위해 필요합니다. 유튜브 이외의 웹페이지에서는 이 확장이 실행되지 않습니다. 다만 가사를 켜면 위의 `lrclib.net` 요청이 발생합니다.

### 5. 제3자 서비스
- **YouTube (Google LLC):** RenewTube는 유튜브의 공식 웹 인터페이스 위에서 동작하는 확장 프로그램입니다. 따라서 영상 재생 및 유튜브 계정 로그인 정보는 Google/YouTube의 자체 개인정보 처리방침을 따릅니다. 확장은 사용자의 구글 계정 비밀번호나 민감한 로그인 정보에 절대 접근할 수 없습니다.

### 6. 아동의 개인정보 보호
RenewTube는 만 13세 미만 아동을 포함하여 어떠한 사용자의 데이터도 수집하지 않습니다.

### 7. 오픈소스 검증
RenewTube는 오픈소스 소프트웨어(MIT 라이선스)로 투명하게 공개되어 있습니다. 모든 소스 코드와 동작 메커니즘은 GitHub 저장소에서 누구나 직접 확인하고 검증하실 수 있습니다:  
👉 [https://github.com/jshsakura/renewtube](https://github.com/jshsakura/renewtube)

### 8. 문의처
개인정보 처리방침에 관한 질문이나 의견이 있으신 경우:
- 이메일: [support@opencourse.kr](mailto:support@opencourse.kr)
- GitHub 저장소: [Issues 및 Discussions](https://github.com/jshsakura/renewtube/issues)

---

## English

### Summary (TL;DR)
**RenewTube collects zero personal data.**  
There are no user accounts, no analytics libraries, and no telemetry tracking of any kind.  
All user preferences and playback settings are **stored strictly on your local device**, and never leave your browser.

---

### 1. Information We Collect
**None.**  
RenewTube does not collect, track, store, transmit, or sell any personally identifiable information, browsing history, playback history, or device information.

### 2. Data Stored Locally on Your Device
To ensure a smooth user experience, minimal preferences are saved exclusively in your browser's local storage (`chrome.storage.local` and `localStorage`):
- Playback mode (Music mode vs Video mode)
- Repeat and shuffle playback toggles
- Local playback queue state
- Volume and lyric visibility settings
- Interface theme (Dark / Light mode)
- Battery saver settings

Clearing your browser cache or removing the extension completely deletes this data from your device.

### 3. Network Communications
RenewTube does not operate any backend server.
- **Direct YouTube Communication:** All video browsing, searching, and media streaming requests are sent directly from your browser to official YouTube servers (`youtube.com`, `googlevideo.com`). This behavior is identical to browsing YouTube normally. RenewTube never proxies or intercepts your requests.
- **Lyrics lookup (`lrclib.net`):** With lyrics turned on, the **title and artist** of the track being played are sent to `lrclib.net`, a public lyrics database. The request is made only while lyrics are open and carries no account information or identifier. No request is made when the words are found in YouTube's own captions.
- **Thumbnails (`i.ytimg.com`):** Artwork in the lists and in the player bar is loaded directly from YouTube's image servers.
- **Zero Third-Party Telemetry:** The extension makes no calls to analytics providers, advertisers, or third-party tracking services.

### 4. Permissions and Justifications
RenewTube requests only the permissions strictly required to operate:
- `storage`: Used solely to save and retrieve your preferences (theme, volume, mode) locally on your device.
- Host permissions (`https://*.youtube.com/*`): Required to inject and display RenewTube's clean player interface on YouTube web pages. The extension runs on no other web page; lyrics, when turned on, make the `lrclib.net` request described above.

### 5. Third-Party Services
- **YouTube (Google LLC):** Because RenewTube operates directly on YouTube web pages, video playback and authentication are subject to Google/YouTube's privacy policy. The extension cannot access your Google password or credentials.

### 6. Children's Privacy
RenewTube does not target children and collects no personal information from anyone, regardless of age.

### 7. Open Source
RenewTube is open-source software licensed under the MIT License. Anyone can independently audit and verify every single line of code at:  
👉 [https://github.com/jshsakura/renewtube](https://github.com/jshsakura/renewtube)

### 8. Contact
If you have any questions or feedback regarding this policy:
- Email: [support@opencourse.kr](mailto:support@opencourse.kr)
- GitHub: [Issues & Discussions](https://github.com/jshsakura/renewtube/issues)
