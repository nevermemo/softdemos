import { Container, Ticker } from 'pixi.js';

export interface SceneLike extends Container {
  readonly title: string;
  readonly isPlaying: boolean;
  reset(): void;
  resize(width: number, height: number): void;
  update(ticker: Ticker): boolean;
  toggle(visible: boolean, autoStartOrReset?: boolean): void;
  play(): void;
  stop(): void;
  destroy(): void;
}
