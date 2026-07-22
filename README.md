# Chat Fiction - Interactive Narrative & Chat Engine

Chat Fiction is a lightweight, privacy-focused Progressive Web App (PWA) designed for creating, editing, and experiencing interactive branching chat stories. Powered by vanilla JavaScript, Web Crypto API, and local-first storage, it allows creators to write immersive chat narratives with visual node maps and secure encrypted sharing.

## Live Demo
Access the hosted application here: **[https://agnezgrace.github.io/Chat-Fiction/]**

## Features
*   **Progressive Web App (PWA)**: Built-in Service Worker with offline support and a custom, non-intrusive SVG installation button.
*   **Encrypted Engine (.LNRC Format)**: AES-GCM (SHA-256) crypto engine for exporting and importing protected character stories with granular permission control (*Play Only*, *Profile Edit*, or *Full Access*).
*   **Visual Node Structure**: Interactive branch map enabling creators to jump between narrative nodes, edit choices, and manage complex story trees effortlessly.
*   **Dual Engine Modes**: Instant switching between **Editor Mode** (for authoring and branching) and **Read Mode** (for interactive reader playback with typing delays).
*   **Simulated Media Calls**: Integrated voice and video call simulation featuring custom durations, call statuses, and visual ringing feedback.
*   **Rich Profile & Aesthetic Customization**: Custom avatars, chat wallpapers, online statuses, image attachments (URL or local gallery upload), and interactive custom modals.
*   **Local-First & Private**: All story data and progress are stored entirely within the client browser (`localStorage`), requiring no backend server.

## File Structure
*   `index.html` - App UI structure, modals, brand panel, and header components.
*   `style.css` - Responsive layout, dark/light interface accents, and mobile view optimizations. 
*   `sw.js` - Service Worker for offline asset caching and PWA functionality.
*   `manifest.json` - Web App Manifest defining installation parameters, icons, and display modes.
*   `logo.png` - Primary app identity icon (512x512 PNG).

## License
Copyright (c) 2026 LUNARICA. All rights reserved.

This software is proprietary. You are permitted to use this application on its officially hosted URL. However, copying, redistribution, modification, or republication of the source code, assets, or any portion of this repository is strictly prohibited without prior written consent from the author.
