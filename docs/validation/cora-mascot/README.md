# Cora mascot verification — October 14, 2026

- Built-in image generation produced the original teal mascot and an aligned closed-eyes frame; PNG transparency and matching 1254×1254 dimensions are preserved. [Artwork and prompts](../../../logo/CORA_MASCOT.md).
- The local in-app-browser preview uses the existing synthetic fixture, not hospital records. `home.png` shows the final 64px mascot above navigation; `chat.png` and `coverage.png` show the shared static avatars. No live AI requests were needed. The browser's effective layout width was 400 CSS pixels; these are web previews, not physical-device screenshots.
- Live computed-style sampling over 175 frames observed both blinking and changing head rotation. The visible button opened the Cora chat. Both image layers are explicitly 64×64; without explicit sizes, React Native Web used the source's 1254px intrinsic dimensions, explaining the reported invisible face.
- `npm run test:cora:mascot`: six actual-component lifecycle groups pass, including load gating, nonblocking animation/taps, hidden/background pause, reduced motion, RGBA frames and unmount cleanup. Animation timing is controlled in this unit fixture.
- `npm run test:cora`: eight existing Cora language/conversation groups pass. All 56 mobile unit checks, strict mobile lint/types and iOS/Android Metro exports pass. Physical-device animation/VoiceOver remains a native smoke check.
- Source is local; publication and mobile reload/rebuild are still required. Existing unrelated working changes were preserved; no dependencies/backend/API behavior changed.
