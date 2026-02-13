# Changelog

All notable changes to this project are documented in this file.

## [1.0.2] - 2026-02-13

### Fixed
- Reworked ambience playback to use authentic recordings for all ambience tracks (`Heavy Rain`, `Coffee Shop`, `Forest Stream`, `Ocean Waves`, `Crackling Fire`, `Night Crickets`, `Wind Chimes`).
- Fixed audio switching race conditions so selecting a new sound reliably replaces the previous sound.
- Prevented incorrect synthetic fallback for tracks marked as authentic recordings.

### Improved
- Added multi-source authentic URL resolution with direct-media first and safe fallback URL handling.
- Improved cleanup of failed media attempts to avoid stale playback state.
- Added consistent `Real` badges and `Real recording` labels in both Timer and Audio screens for authentic ambience tracks.
- Added/kept extension permissions and CSP support for Wikimedia media hosts required by authentic audio playback.

### Versioning
- Chrome extension manifest version updated to `1.0.2`.
- App config version updated to `1.0.2` with build `2`.
- Package version updated to `1.0.2`.
