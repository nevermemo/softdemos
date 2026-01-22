# SOFTDEMOS

This repo contains a small PixiJS (v8) playground with three scenes, each implementing one of the assignment tasks. The project is written in TypeScript and bundled with Webpack.

## Quick links

- [**Demo showcase**](https://nevermemo.github.io/softdemos/)
- [**Local dev server**](`http://localhost:8080`)

## Assignment checklist (what’s implemented)

- **PixiJS v7/v8 + TypeScript**: PixiJS v8 + TS.
- **In‑game menu**: Scene selector UI at the bottom of the screen.
- **Responsive rendering**: Canvas resizes to the window; each scene lays out content on resize.
- **FPS in top-left**: `stats.js` overlay.
- **Fullscreen**: Requests fullscreen on the first user click/tap (browser permitting).

## Running locally

### Requirements

- Node.js 18+ recommended

### Install

```bash
npm install
```

### Development

Starts `webpack-dev-server` on `http://localhost:8080`

```bash
npm run dev
```

### Production build

Outputs to `dist/`

```bash
npm run build
```

To preview the production build locally, serve the `dist/` directory with any static server.

## Controls / UX notes

- Use the **buttons in the bottom menu** to switch scenes.
- The app attempts to enter **fullscreen** on the first click/tap (this is required by many browsers for fullscreen permission).
- The **FPS** counter is displayed in the top-left via `stats.js`.

## Architecture overview

The app is intentionally lightweight and scene-driven:

- **Bootstrap & global resize/update**: `src/app.ts`
	- Initializes Pixi `Application`
	- Loads the asset manifest + demo bundle
	- Runs a single update loop that forwards ticks to scenes
	- Handles canvas resize and forwards it to scenes
- **Scene lifecycle**: `src/scenes/abstract-scene.ts`
	- Scenes implement `reset()`, `resize()`, `update()`
	- `toggle()` manages visibility and play/reset behavior
- **Scene selection UI**: `src/scene-selector-ui.ts`

### Asset loading

Assets are copied from `assets/` into the build output. A small Webpack plugin generates `assets/manifest.json` at build time so Pixi `Assets` can load a bundle without manually maintaining a list.

## Scenes

Each task is implemented as a separate scene. Select a scene from the in-game menu.

### 1) Ace of Shadows

**Goal**: Create **144 sprites** stacked like a deck of cards. Every **1 second**, the **top card** moves to the other stack; the movement animation lasts **2 seconds**.

**Implementation**: `src/scenes/ace-of-shadows/ace-of-shadows-scene.ts`

- Creates 144 `Sprite` instances using the same card texture.
- Maintains two deck containers + a separate container for “flying” cards.
- Uses `@tweenjs/tween.js` grouped tween updates driven by Pixi’s ticker delta.
- The card flight path uses a **parabolic Y lerp** (arc) and a **linear X lerp**.
- The decks themselves rotate continuously for a more “alive” feel; flying cards include extra flips.

**Timing**

- Trigger interval: `1000ms`
- Flight duration: `2000ms`

### 2) Magic Words

**Goal**: Render a dialogue from the endpoint and support **inline “custom emoji”** by mixing text + images.

**Implementation**:

- Scene: `src/scenes/magic-words/magic-words-scene.ts`
- Inline emoji text layout: `src/scenes/magic-words/components/emoji-text.ts`
- Dialogue bubble UI: `src/scenes/magic-words/components/message-box.ts`

**How it works**

- The scene fetches the conversation JSON from the endpoint and loads the referenced emoji + avatar images into a Pixi `Assets` bundle.
- Messages are displayed inside a `@pixi/ui` `ScrollBox`.
- The `EmojiText` component parses tokens in the format `{emoji_name}` and lays out a line by line flow where:
	- **Text** is rendered with Pixi `Text` objects
	- **Emoji** tokens are rendered as `Sprite`s sized relative to the font size
- Text and emoji display objects are pooled for reuse to reduce allocations during re-layout.

**Notes**

- `ScrollBox` currently requires a resize workaround due to a known issue in `@pixi/ui` (see the comment + link in the scene).

### 3) Phoenix Flame

**Goal**: Build a great looking fire / particle demo while keeping **≤ 10 sprites** on screen at the same time.

**Implementation**:

- Scene: `src/scenes/phoenix-flame/phoenix-flame-scene.ts`
- Particle engine: `src/scenes/phoenix-flame/components/particle-emitter.ts`

**How it works**

- Implements a tiny, reusable particle emitter with:
	- pooled particles
	- configurable spawn/update/kill hooks
	- max particle cap
- The flame is composed of two emitters:
	- **Trail emitter** (max 7 particles) using a small texture sequence and tint lerping
	- **Blaze emitter** (max 3 particles) for brighter “pops”
- Both use additive blending and time-based interpolation for scale/alpha/tint.
- Downsides of low particle budget was partially mitigated by using textures that already looks like particle effects.

**Sprite budget**

- Trail max: `7`
- Blaze max: `3`
- Total max on screen: `10`

## Tech stack

- `pixi.js` (v8)
- `@tweenjs/tween.js` for tweens
- `@pixi/ui` for the ScrollBox
- `stats.js` for FPS display
- Webpack + TypeScript
