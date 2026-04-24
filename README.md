# List Diff Tool

A lightweight browser-only utility for comparing up to three line-based lists.

## Current Capabilities

- Compare **List A vs List B**, with optional **List C** support.
- Detect:
  - items only in one list
  - pairwise overlap
  - overlap across all three lists
- De-duplicate entries automatically.
- Live entry counters per list.
- Tabs for **Summary**, **Differences**, and **Common** views.
- Copy any result block to clipboard.
- Export the currently open tab as a `.txt` file.
- Persist list data, list names, and settings in `localStorage`.

## UX Features

- Editable list names.
- Per-list clear actions plus global clear.
- Quick actions:
  - **Swap A/B**
  - **Load Sample**
- Keyboard shortcut: `Ctrl/Cmd + Enter` to compare.
- Optional auto-compare while typing.
- Responsive layout for small screens.

## Comparison Settings

You can toggle normalization behavior:

- Ignore letter case
- Ignore commas
- Normalize extra whitespace

## Privacy

Everything runs in your browser; no server processing is required.

## Running Locally

Open `index.html` in a browser.