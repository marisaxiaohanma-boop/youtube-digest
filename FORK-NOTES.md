# Personal learning improvements

This fork adds five changes to YouTube Digest:

- Selected excerpts exclude transcript timestamp labels and retain one starting timestamp. Long selections are no longer silently cut at 3,000 characters; the limit is 30,000 with an explicit error.
- **Edit / My thoughts** edits the note and adds separate personal thoughts or questions. Save changes explicitly; the original quotation and source link remain stored.
- **Export notes (.md)** downloads the active Notes filter: **This Video** or **All Notes**. The Markdown includes source links, note text, and personal thoughts. It exports the currently stored notes; upstream still retains only the latest 100 notes.
- A collapsible question box stays below the scrolling Transcript. Select text before focusing it to use that paragraph; otherwise it uses the first visible paragraph. Context includes the chosen paragraph plus three displayed paragraphs before and after, bounded by the transcript edges. Scrolling refreshes context for the next question. Questions use the existing DeepSeek settings. **Save to Notes** saves the question and AI answer with its source timestamp; this is a single-question tool, without chat history.
- **Follow playback** reads the current video's time on each click, scrolls even if the paragraph is already highlighted, and resumes following. If the video is unavailable, it displays a retry message. The button sits above the question box.

## Load this version

Download the feature branch or clone this fork and check out `feat/notes-and-context-qa`. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the folder containing `manifest.json`. Enter your own API keys in the extension Settings.

An extension loaded from a new folder can have a different extension ID and separate storage. Existing settings and notes do not automatically transfer. To retain the existing extension's storage, back up its installation folder, update that same folder with this version's extension files, and reload its existing Chrome extension card. Keep your original installation until you verify the new version.

## Validation

- `npm run check`: syntax, unit/regression tests, release references, and credential scan.
- `npm run package`: produces a ZIP in `dist/`.
- Optional browser smoke test: with Playwright available, run `node tests/ui-smoke.cjs`. Uses a separate headless Chrome, mocked extension messaging, mock notes and mock AI; it makes no provider request and does not use a personal browser profile. Preview screenshots go to `/tmp/ytd-qa-preview.png` and `/tmp/ytd-notes-preview.png`.

The browser smoke test covers multi-row selection, anchored Q&A context, answer saving, note edits and thoughts, Markdown download, current-time follow/scroll, transcript-edge context, and playback failure feedback. Real YouTube caption retrieval, extension messaging in the installed extension, and DeepSeek connectivity still require a live check after loading.
