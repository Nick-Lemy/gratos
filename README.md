# Gratos

A collection of simple, free online tools.

- **QRGratos:** turn a link into a QR code and download it as a PNG.
- **MediaGratos:** download direct media links, repack video as MP4, or extract MP3 audio. Local files stay in your browser.

MediaGratos supports files up to 200 MB. Links must point to a media file and allow cross-origin browser requests. YouTube, Instagram, and TikTok page links aren't supported without a backend API.

FFmpeg loads only for conversions, using locally hosted, cacheable assets (about 31 MB on first use). Original downloads skip it entirely. MP4 preserves the original tracks; incompatible formats may need a different converter.

Built with React, TypeScript, Vite, and Tailwind CSS.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the local URL shown in your terminal.

## Other commands

```sh
pnpm build    # Build for production
pnpm preview  # Preview the production build
pnpm lint     # Check code quality
pnpm test     # Build and test media downloads and the WASM worker (Node 22.18+)
```
