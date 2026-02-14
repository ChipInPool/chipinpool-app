# Build Script

This directory contains the production build script for the ChipIn platform.

## Files

| File | Description |
|------|-------------|
| `build.ts` | Production build script that compiles the server with esbuild and builds the client with Vite |

## Usage

Run the build from the project root:

```bash
npm run build
```

This produces a production-ready bundle in the `dist/` directory, which can be started with:

```bash
npm run start
```
