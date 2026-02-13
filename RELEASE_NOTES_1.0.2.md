# Tempo Focus 1.0.2 - Release Notes

## Chrome Web Store "What's new" (short)

Authentic ambience audio upgrade:
- Fixed `Crackling Fire`, `Ocean Waves`, and `Night Crickets` playback quality issues.
- Added real recordings for all ambience tracks (Rain, Coffee Shop, Forest Stream, Ocean Waves, Fire, Crickets, Wind Chimes).
- Improved sound switching so only the selected track plays.
- Improved reliability of audio startup/fallback handling.

## Full Notes

### Audio
- Ambience tracks now use authentic recording sources.
- Media loading now tries prioritized source URLs for better reliability.
- Tracks configured as authentic no longer silently fall back to synthetic noise.
- Better cleanup for failed media starts to prevent stuck/overlapping playback.

### UI
- Added consistent `Real` indicator on authentic ambience cards.
- Added `Real recording` subtitle in timer sound cards for authentic ambience tracks.

### Version
- Extension version: `1.0.2`
- App config version: `1.0.2` (build `2`)
