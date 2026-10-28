# Gratos

A collection of simple, free online tools.

- **QRGratos:** turn a link into a QR code and download it as a PNG.
- **MediaGratos:** download video and audio from YouTube, Instagram, and TikTok using your own Yoinku API key.

To use MediaGratos:

1. [Create a Yoinku account](https://yoinku.com/en/account) and generate an API key in the API keys section.
2. Paste your key into MediaGratos. Use **Save key** to remember it in this browser's local storage, or **Forget key** to remove it.
3. Paste a post link, get the available formats, choose video or audio, and prepare your download.

Keys are sent directly to Yoinku, never to a Gratos backend. Yoinku's free plan currently allows 5 downloads per day per account; see the [API documentation](https://yoinku.com/en/api) for current limits. File availability depends on the source and provider. No FFmpeg or WASM download is needed.

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
pnpm test     # Test the media API integration (Node 22.18+)
```
