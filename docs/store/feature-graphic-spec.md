# QuestOS feature graphic specification

Output: **1024 × 500 px**, opaque **24-bit PNG or JPEG**, one feature graphic.
This is promotional branding, not a fabricated screenshot.

- Background: QuestOS dark navy `#161821`; optional subtle violet `#7C5CFC` accent confined to
  the right third. Do not imply game violence, medical benefits or child-directed content.
- Place the existing QuestOS mark from `docs/store/questos-icon-512.png` at x=72, y=120,
  sized 176×176, preserving its appearance and aspect ratio.
- Text at x=290, y=140: **QuestOS**, Space Grotesk bold, approximately 72 px, white.
- Text at x=294, y=240: **Turn goals into quests.**, Inter medium, approximately 32 px,
  soft white. Keep the whole phrase inside the frame without clipping.
- Optional small gold XP-inspired accent `#E8C46A`; no prices, ranking badges, “unlimited AI”,
  Google Play badges, ratings, subscription terms or fake product controls.
- Keep main content within x=64…960 and y=64…436 to allow surface cropping.
- Export opaque RGB; visually check text, icon edges and contrast at full size and thumbnail size.

Screenshots must be captured separately from the real QuestOS app using clean review/test data.
Finished output: `questos-feature-graphic.png` (1024×500, opaque RGB). Editable vector source:
`questos-feature-graphic.pdf`. `scripts/store-feature-graphic.py` renders the exact geometric mark
and existing licensed fonts. Visually checked at full size and thumbnail size; no app UI fabricated.
