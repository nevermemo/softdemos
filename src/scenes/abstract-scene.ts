import { Container, Ticker } from 'pixi.js';

import { SceneLike } from '../types';

export abstract class AbstractScene extends Container implements SceneLike {
  public abstract readonly title: string;

  protected _isPlaying = false;

  constructor() {
    super();
  }

  abstract reset(): void;

  abstract resize(width: number, height: number): void;

  update(ticker: Ticker): boolean {
    if (!this.visible || !this._isPlaying) {
      return false;
    }
    return true;
  }

  toggle(visible: boolean, autoPlayOrReset: boolean = true): void {
    this.visible = visible;

    if (visible) {
      autoPlayOrReset && this.play();
    } else {
      this.stop();
      autoPlayOrReset && this.reset();
    }
  }

  play(): void {
    this._isPlaying = true;
  }

  stop(): void {
    this._isPlaying = false;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
}
