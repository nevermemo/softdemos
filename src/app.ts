import { Application, Assets, Container, Ticker, AssetsManifest, Text } from 'pixi.js';
import Stats from 'stats.js';

import { SceneLike } from './types';
import { SceneSelectorUI } from './scene-selector-ui';

const bundleName = 'demos';

export class App {
  private readonly _pixiApp: Application;

  private readonly _stats: Stats = new Stats();

  private readonly _backgroundContainer = new Container({ label: 'background-container' });
  private readonly _gameContainer = new Container({ label: 'game-container' });
  private readonly _uiContainer = new Container({ label: 'ui-container' });

  private readonly _sceneSelector: SceneSelectorUI = new SceneSelectorUI();
  private readonly _scenes: SceneLike[] = [];
  private readonly _introText: Text;

  constructor() {
    this._pixiApp = new Application();

    this._sceneSelector.on('sceneselected', scene => this.onSceneButtonClicked(scene));
    this._uiContainer.addChild(this._sceneSelector);
    this._introText = new Text({
      text: 'Select a scene',
      style: { fontFamily: 'Pixeloid', fontSize: 32, fill: 0xffffff }
    });
    this._introText.anchor.set(0.5, 0.5);
    this._gameContainer.addChild(this._introText);
  }

  addNewScene(scene: SceneLike, forceRecalculate: boolean = true): void {
    this._scenes.push(scene);
    this._gameContainer.addChild(scene);
    scene.toggle(false);

    this._sceneSelector.addButton(scene);

    if (forceRecalculate) {
      this._pixiApp.resize();
    }
  }

  removeScene(scene: SceneLike): boolean {
    const index = this._scenes.indexOf(scene);
    if (index < 0) {
      return false;
    }

    this._scenes.splice(index, 1);
    scene.destroy();

    if (!this._scenes.some(s => s.visible)) {
      this._introText.visible = true;
    }

    return true;
  }

  private async loadAssetManifest(): Promise<AssetsManifest> {
    // Use a relative URL so the app works when hosted under a sub-path (e.g. GitHub Pages).
    const res = await fetch('assets/manifest.json', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to fetch assets/manifest.json (${res.status})`);
    }
    const manifest = await res.json();
    return manifest;
  }

  private async loadAssetsFromManifest(): Promise<void> {
    const manifest = await this.loadAssetManifest();
    await Assets.init({
      // Relative basePath is compatible with GitHub Pages (/<repo>/assets/...).
      basePath: 'assets/',
      manifest
    });

    await Assets.loadBundle(bundleName);
  }

  async init(sceneClasses: Array<new () => SceneLike> = []): Promise<void> {
    return this.loadAssetsFromManifest()
      .then(() =>
        this._pixiApp.init({
          resizeTo: window,
          background: '#000000',
          antialias: true
        })
      )
      .then(async () => {
        const { canvas, stage, renderer, ticker } = this._pixiApp;

        document.body.append(canvas);
        document.body.append(this._stats.dom);
        canvas.oncontextmenu = () => false;

        renderer.on('resize', (w, h, r) => this.resize(w, h));
        ticker.add(t => this.update(t));

        stage.addChild(this._backgroundContainer, this._gameContainer, this._uiContainer);
        sceneClasses.forEach(sceneCtor => this.addNewScene(new sceneCtor(), false));

        this._pixiApp.resize();

        document.addEventListener('click', () => this.requestFullScreen());
      })
      .catch(err => console.error(err));
  }

  destroy(): void {
    while (this._scenes.length > 0) {
      this.removeScene(this._scenes[0]);
    }

    this._sceneSelector.destroy({ children: true });

    Assets.unloadBundle(bundleName);
    this._pixiApp.destroy(true, true);
  }

  private resize(width: number, height: number): void {
    console.log(`Resized\nW: ${width}\nH: ${height}`);

    const gameHeight = this._sceneSelector.resize(width, height);

    this._introText.position.set(width / 2, gameHeight / 2);
    // this._introText

    this._scenes.forEach(scene => scene.resize(width, gameHeight));
  }

  private update(ticker: Ticker): void {
    this._stats.update();

    this._scenes.forEach(scene => scene.update(ticker));
  }

  private onSceneButtonClicked(targetScene: SceneLike): void {
    if (!this._scenes.includes(targetScene)) {
      return;
    }

    let activeScene: SceneLike | undefined;

    for (let scene of this._scenes) {
      if (scene.visible) {
        activeScene = scene;
        break;
      }
    }

    this._introText.visible = false;

    this.sceneTransition(activeScene, targetScene);
  }

  private sceneTransition(from: SceneLike | undefined, to: SceneLike): void {
    if (from === undefined) {
      // First scene selection
      to.toggle(true);
    } else if (from === to) {
      // Same scene clicked
      return;
    } else {
      // Another scene selected
      from.toggle(false);
      to.toggle(true);
    }
  }

  private requestFullScreen(): void {
    if (document.fullscreenEnabled && document.fullscreenElement === null) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
        //@ts-ignore
      } else if (document.documentElement.mozRequestFullScreen) {
        //@ts-ignore
        document.documentElement.mozRequestFullScreen();
        //@ts-ignore
      } else if (document.documentElement.webkitRequestFullscreen) {
        //@ts-ignore
        document.documentElement.webkitRequestFullscreen();
        //@ts-ignore
      } else if (document.documentElement.msRequestFullscreen) {
        //@ts-ignore
        document.documentElement.msRequestFullscreen();
      }
    }
  }
}
