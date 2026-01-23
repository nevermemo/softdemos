import { Assets, Circle, Text, Texture, UnresolvedAsset } from 'pixi.js';
import { ScrollBox, ScrollBoxOptions } from '@pixi/ui';

import { AbstractScene } from '../abstract-scene';
import { MessageBox } from './components/message-box';
import { ConversationData, isConversationData } from './api-utils';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const conversationUrl = 'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords';
const bundleName = 'magic-words';
const emojiAliasPrefix = 'emoji-';
const avatarAliasPrefix = 'avatar-';

const messageMargin = 10;
const backgroundColor = 0x0d0b14;
const maxWidth = 700;

export class MagicWordsScene extends AbstractScene {
  label = 'magic-words';
  public readonly title = 'Magic Words';

  private _lastWidth = 500;
  private _lastHeight = 500;

  private _conversation: ConversationData | undefined;
  private readonly _emojis: Map<string, Texture> = new Map();
  private readonly _avatars: Map<string, { texture: Texture; position: 'left' | 'right' }> = new Map();

  private _loadState: LoadState = 'idle';
  private _abortController: AbortController | undefined;
  private readonly _statusText: Text;

  private readonly _scrollBoxOptions: ScrollBoxOptions;
  private readonly _scrollBox: ScrollBox;
  private readonly _messageBoxes: MessageBox[] = [];

  constructor() {
    super();

    this._statusText = new Text({
      text: 'Loading…',
      style: {
        fontFamily: 'Pixeloid',
        fontSize: 22,
        fill: 0xf2efff,
        align: 'center'
      }
    });
    this._statusText.anchor.set(0.5);
    this._statusText.visible = true;
    this._statusText.eventMode = 'static';
    this._statusText.cursor = 'pointer';
    this._statusText.hitArea = new Circle(0, 0, Infinity);
    this._statusText.on('pointertap', () => {
      if (this._loadState === 'error') {
        this.startLoading();
      }
    });

    this._scrollBoxOptions = {
      background: backgroundColor,
      elementsMargin: messageMargin,
      width: this._lastWidth,
      height: this._lastHeight,
      radius: 0,
      type: 'vertical',
      padding: messageMargin,
      globalScroll: false,
      disableProximityCheck: true
    };
    this._scrollBox = new ScrollBox(this._scrollBoxOptions);
    this.addChild(this._statusText);

    // setTimeout(() => this.startLoading(), 5000); // A useful delay for testing loading
    this.startLoading();
  }

  reset(): void {
    this._scrollBox.scrollTop();
  }

  resize(width: number, height: number): void {
    const targetWidth = Math.min(width, maxWidth);
    const targetHeight = height - messageMargin;

    this._lastWidth = width;
    this._lastHeight = height;

    this.position.set((width - targetWidth) / 2, 0);

    this._statusText.position.set(targetWidth / 2, targetHeight / 2);

    this._messageBoxes.forEach(mBox => {
      mBox.setWidth(targetWidth - 2 * messageMargin);
    });

    // Turns out there is a bug in ScrollBox implementation
    // https://github.com/pixijs/ui/issues/227
    this._scrollBoxOptions.width = targetWidth;
    this._scrollBoxOptions.height = targetHeight;
    this._scrollBox.setSize(targetWidth, targetHeight);
    this._scrollBox.resize(true);
  }

  private buildScene(): void {
    if (this._conversation === undefined) {
      return;
    }

    const { dialogue } = this._conversation;
    dialogue.forEach(d => {
      const { name, text } = d;
      const { position, texture } = this._avatars.get(name) ?? { position: 'left', texture: Texture.WHITE };
      const mBox = new MessageBox(name, text, position, texture, this._emojis, this._lastWidth);
      this._messageBoxes.push(mBox);
    });

    this._scrollBox.addItems(this._messageBoxes);

    this._statusText.visible = false;
    this._loadState = 'ready';

    this.addChild(this._scrollBox);
    this.resize(this._lastWidth, this._lastHeight);
  }

  private async loadConversationData(signal: AbortSignal): Promise<ConversationData> {
    const res = await fetch(conversationUrl, { cache: 'no-store', signal });
    if (!res.ok) {
      throw new Error(`Failed to load ${conversationUrl} (${res.status})`);
    }
    const conversation: unknown = await res.json();
    if (!isConversationData(conversation)) {
      throw new Error('Invalid API response shape for Magic Words conversation');
    }
    return conversation;
  }

  private async loadAssetsFromConversation(signal: AbortSignal): Promise<ConversationData> {
    const conversation = await this.loadConversationData(signal);
    const { emojies, avatars } = conversation;

    const bundleAssets: UnresolvedAsset[] = [];
    bundleAssets.push(
      ...emojies.map(eSource => ({
        alias: `${emojiAliasPrefix}${eSource.name}`,
        src: eSource.url,
        parser: 'texture',
        data: {
          scaleMode: 'linear'
        }
      }))
    );
    bundleAssets.push(
      ...avatars.map(aSource => ({
        alias: `${avatarAliasPrefix}${aSource.name}`,
        src: aSource.url,
        parser: 'texture',
        data: {
          scaleMode: 'linear'
        }
      }))
    );

    await Assets.addBundle(bundleName, bundleAssets);
    await Assets.loadBundle(bundleName);

    return conversation;
  }

  private onAssetsLoaded(conversation: ConversationData): void {
    this._conversation = conversation;
    const { emojies, avatars } = conversation;

    emojies.forEach(eSource => {
      const texture = Texture.from(`${emojiAliasPrefix}${eSource.name}`);
      texture.source.autoGenerateMipmaps = true;
      this._emojis.set(eSource.name, texture);
    });
    avatars.forEach(aSource => {
      const texture = Texture.from(`${avatarAliasPrefix}${aSource.name}`);
      texture.source.autoGenerateMipmaps = true;
      this._avatars.set(aSource.name, {
        texture: texture,
        position: aSource.position
      });
    });

    this.buildScene();
  }

  private startLoading(): void {
    if (this._loadState === 'loading' || this._loadState === 'ready') {
      return;
    }

    this._loadState = 'loading';
    this._statusText.text = 'Loading…';
    this._statusText.visible = true;

    if(this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();

    this.loadAssetsFromConversation(this._abortController.signal)
      .then(conversation => this.onAssetsLoaded(conversation))
      .catch(err => this.onLoadError(err));
  }

  private onLoadError(err: unknown): void {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }

    console.error(err);

    this._loadState = 'error';
    this._statusText.text = 'Failed to load.\nTap to retry.';
    this._statusText.visible = true;
  }

  protected override onDestroy(): void {
    if(this._abortController) {
      this._abortController.abort();
    }
    this._abortController = undefined;
    this._emojis.forEach(texture => texture.destroy(true));
    this._avatars.forEach(avatar => avatar.texture.destroy(true));
    Assets.unloadBundle(bundleName);
  }
}
