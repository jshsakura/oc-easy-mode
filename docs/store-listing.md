# 스토어 등록 문안과 절차 (copy of record)

크롬 웹스토어 대시보드는 문안과 이미지를 API 로 받지 않습니다. 여기 적힌 것이
정본이고, 대시보드에는 여기서 붙여 넣습니다. 바꾸면 여기부터 고칩니다.

첫 등록은 손으로 합니다. 새 항목은 API 로 만들 수 없고, 등록 뒤에 받은 확장 ID 를
시크릿 `CWS_EXTENSION_ID` 로 넣어야 그다음부터 `store.yml` 이 갱신을 올립니다.

## 올릴 패키지

GitHub 릴리스에 붙은 zip 을 그대로 씁니다. 다시 빌드하지 않습니다.

```
https://github.com/jshsakura/renewtube/releases/tag/v0.15.3
renewtube-v0_15_3.zip   117 KB · manifest_version 3 · version 0.15.3
```

검사 결과 (2026-09-05): 권한은 `storage` 하나, 호스트는 `https://*.youtube.com/*`
하나, 예약된 `_` 이름 없음(`_locales` 만), 인라인 스크립트 없음, 원격 코드 없음,
로케일 14개.

## 스토어 항목

| 항목 | 값 |
|---|---|
| 이름 | RenewTube |
| 카테고리 | 엔터테인먼트 (Entertainment) |
| 언어 | 한국어 기본, 영어 추가 (로케일은 패키지가 14개를 들고 있음) |
| 홈페이지 | https://jshsakura.github.io/renewtube/ |
| 지원 | https://github.com/jshsakura/renewtube/issues |
| 개인정보 처리방침 | https://jshsakura.github.io/renewtube/privacy.html |
| 단일 목적 | youtube.com 위에 심플한 재생기 화면을 씌워 음악과 영상을 한자리에서 듣고 보게 합니다 |
| 원격 코드 | 사용하지 않음 |
| 데이터 수집 | 수집하지 않음 (아래 표) |

### 요약 (132자 이내)

한국어 (98자):

> 유튜브 화면을 심플하고 쉬운 재생기로 바꿉니다. 음악과 영상을 한자리에서 다루며, 언제든 원래 화면으로 돌아갑니다.

English (`_locales/en/messages.json` 의 `extDescription` 과 같은 값):

> Turns YouTube into a simple, easy player. Music and video in one place, and one switch back to the usual screen.

### 상세 설명 (한국어)

> RenewTube는 유튜브 화면을 TV처럼 단순한 재생기로 바꿉니다. 유튜브의 재생기와 계정을 그대로 쓰면서 화면만 바꾸는 것이라, 별도의 로그인이나 앱이 필요 없고 언제든 원래 유튜브로 돌아갈 수 있습니다.
>
> 이런 것을 할 수 있습니다.
> - 음악 모드와 영상 모드. 음악 모드에서는 소리만 듣고, 영상 모드에서는 화면을 봅니다.
> - 검색. 입력하는 동안 제안이 뜨고, 결과에는 영상과 함께 재생목록과 채널이 나옵니다. 최근 검색은 기억합니다.
> - 대기열. 검색 결과나 재생목록을 통째로 넣고, 드래그로 순서를 바꾸고, 재생목록으로 저장합니다.
> - 메뉴. 홈, 구독, 시청 기록, 재생목록에 더해 스포츠, 생방송, 게임, 뉴스, 학습, 아동 같은 TV 메뉴를 설정에서 골라 켤 수 있습니다.
> - 재생 속도, 수면 예약, 반복과 셔플, 가사, 키보드 단축키.
> - 휴대전화에서도 같은 화면. 아이폰 Orion 브라우저를 포함합니다.
>
> 하지 않는 것도 있습니다. 쇼츠는 없습니다. 광고를 막지 않습니다. 어떤 정보도 수집하거나 보내지 않으며, 설정은 사용자의 브라우저 안에만 저장됩니다.
>
> 유튜브에 로그인한 상태면 구독, 시청 기록, 내 재생목록이 그대로 보입니다. 로그인하지 않아도 검색과 음악, TV 메뉴는 됩니다.
>
> RenewTube는 YouTube 또는 Google과 관계가 없는 독립 프로젝트입니다. YouTube는 Google LLC의 상표입니다.

### Detailed description (English)

> RenewTube turns youtube.com into a simple, TV-like player. It keeps YouTube's own player and your own account and only changes what you see, so there is nothing to sign up for and you can go back to plain YouTube at any time.
>
> What it does:
> - Music mode and video mode. Listen with the picture out of the way, or watch.
> - Search with suggestions as you type; results include playlists and channels alongside videos, and recent searches are remembered.
> - A queue. Add a whole search result or playlist, reorder by drag, save as a playlist.
> - A menu you choose. Home, Subscriptions, History and Playlists, plus the TV menu lines (Sports, Live, Gaming, News, Learning, Kids) that you switch on in Settings.
> - Playback speed, sleep timer, repeat and shuffle, lyrics, keyboard shortcuts.
> - The same screens on a phone, including Orion on iPhone.
>
> What it does not do: no Shorts, no ad blocking, no data collection of any kind. Settings live only in your browser.
>
> Signed in to YouTube, your subscriptions, history and playlists appear as they are. Signed out, search, music and the TV menu still work.
>
> RenewTube is an independent project, not affiliated with YouTube or Google. YouTube is a trademark of Google LLC.

### 권한 사유 (Permission justifications)

| 권한 | 사유 |
|---|---|
| `storage` | 재생 모드, 대기열, 테마, 메뉴 선택 같은 설정을 사용자의 브라우저에만 저장하는 데 씁니다. 외부로 보내지 않습니다. |
| `https://*.youtube.com/*` (host) | 확장은 유튜브 페이지 위에서만 동작합니다. 유튜브의 재생기와 페이지 자체의 API 를 같은 페이지 안에서 쓰기 위해 이 호스트가 필요합니다. music.youtube.com 은 제외합니다. |
| 콘텐츠 스크립트 (`world: MAIN`) | 유튜브의 재생기 API(`#movie_player`)는 페이지의 메인 월드에서만 닿습니다. 재생, 대기열, 배속 제어가 여기서 이루어집니다. |

원격 코드: 없음. 모든 코드는 패키지 안에 있고, 외부 스크립트를 내려받거나 `eval` 하지 않습니다.

### 데이터 사용 공개 (Data usage)

| 질문 | 답 |
|---|---|
| 개인 식별 정보, 건강, 금융, 인증, 개인 통신, 위치, 웹 기록, 사용자 활동, 웹사이트 콘텐츠 | 모두 수집하지 않음 |
| 데이터 판매·전송 | 없음 |
| 승인된 목적 외 사용 | 없음 |
| 신용도 평가 사용 | 없음 |

유튜브와의 통신은 페이지 자신의 요청과 같은 origin 으로 나가며, 확장이 운영하는 서버는 없습니다. 근거는 `PRIVACY.md` 와 위 처리방침 URL.

## 이미지

`docs/store/` 에 있습니다. 스토어 규격대로 만들어 둔 것이라 그대로 올립니다.

| 파일 | 규격 | 용도 |
|---|---|---|
| `screenshot-1-music.png` | 1280×800 | 음악 화면 (첫 장) |
| `screenshot-2-search.png` | 1280×800 | 검색: 제안과 재생목록·채널 결과 |
| `screenshot-3-queue.png` | 1280×800 | 대기열과 재생 중 카드 |
| `screenshot-4-gaming.png` | 1280×800 | TV 메뉴의 장르 화면 |
| `screenshot-5-settings.png` | 1280×800 | 설정: 메뉴 스위치 |
| `promo-small-440x280.png` | 440×280 | 작은 프로모 타일 (필수) |
| `promo-marquee-1400x560.png` | 1400×560 | 마키 (선택) |
| `../site/icon-128.png` | 128×128 | 스토어 아이콘 |

이미지는 실제 화면을 찍은 것이고 합성하지 않았습니다. 다시 찍으려면
`scratch/store/shots.spec.ts` 를 만들었던 방식대로 1280×800 뷰포트에서 찍습니다.

## 대시보드에서 할 일 (첫 등록)

1. https://chrome.google.com/webstore/devconsole 에 로그인합니다. 개발자 등록비 5달러가 한 번 듭니다.
2. 새 항목 → `renewtube-v0_15_3.zip` 업로드.
3. 스토어 등록정보 탭: 위 요약·상세 설명·카테고리·언어·이미지를 붙여 넣습니다. 한국어를 기본으로 두고 영어를 추가합니다.
4. 개인정보 탭: 단일 목적, 권한 사유, 원격 코드 없음, 데이터 사용 공개를 위 표대로 답하고 처리방침 URL 을 넣습니다.
5. 배포 탭: 공개 범위는 공개, 지역은 전체.
6. **제출 전에 패키지 탭에서 올라간 버전이 0.15.3 인지 확인합니다.** 그다음 심사 제출.
7. 항목 ID(32자)를 받아 시크릿으로 넣습니다. 그 뒤부터는 태그마다 `store.yml` 로 올립니다.

## 등록 뒤: 갱신 자동화

시크릿 넷을 저장소에 넣습니다.

```
CWS_EXTENSION_ID     대시보드의 항목 ID
CWS_CLIENT_ID        Google Cloud 의 OAuth 클라이언트 (데스크톱 앱 유형)
CWS_CLIENT_SECRET
CWS_REFRESH_TOKEN    scope https://www.googleapis.com/auth/chromewebstore 로 받은 것
```

Google Cloud 프로젝트에서 **Chrome Web Store API 를 켜야** 합니다. 다른 확장에서
이걸 빠뜨려 업로드가 403 으로 두 번 조용히 실패한 적이 있습니다.

그다음부터의 갱신:

```
gh workflow run store.yml -f tag=vX.Y.Z              # 올리고 심사 제출
gh workflow run store.yml -f tag=vX.Y.Z -f publish=false   # 초안까지만
```

실패가 `ITEM_NOT_UPDATABLE` 이면 API 로는 원인을 못 가립니다. 대시보드를 열어
버튼을 읽습니다. `게시` 면 심사가 끝나 게시 대기, `심사 취소` 면 심사 중,
`제출하여 검토받기` 면 초안에 이전 패키지가 남은 것이라 패키지 탭에서 손으로
올린 뒤 제출합니다. 제출 전에 어느 버전이 올라가 있는지 반드시 봅니다.
