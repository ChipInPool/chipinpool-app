# ChipIn Scripts

## Overview

Build and utility scripts for the ChipIn project.

## Files

| Script              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `github-setup.ts`   | GitHub repository setup and configuration for the ChipIn organization. |

Additionally, the production build script is located at `script/build.ts` in the project root. It compiles the server with esbuild and builds the client with Vite.

## Running

Scripts are invoked via npm scripts defined in the root `package.json`:

```bash
# Production build
npm run build
```
