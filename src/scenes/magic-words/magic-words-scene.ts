import { Assets, UnresolvedAsset, Texture } from 'pixi.js';
import { ScrollBox, ScrollBoxOptions } from '@pixi/ui';

import { AbstractScene } from '../abstract-scene';
import { MessageBox } from './components/message-box';

interface MessageInfo {
  name: string;
  text: string;
}
interface EmojiSource {
  name: string;
  url: string;
}
interface AvatarInfo {
  name: string;
  url: string;
  position: 'left' | 'right';
}
interface ConversationData {
  dialogue: MessageInfo[];
  emojies: EmojiSource[];
  avatars: AvatarInfo[];
}

const messageMargin = 10;
const backgroundColor = 0x0d0b14;
const maxWidth = 700;

const conversationUrl = 'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords';
const bundleName = 'magic-words';
const emojiAliasPrefix = 'emoji-';
const avatarAliasPrefix = 'avatar-';

export class MagicWordsScene extends AbstractScene {
  label = 'magic-words';
  public readonly title = 'Magic Words';

  private _lastWidth = 500;
  private _lastHeight = 500;

  private _conversation: ConversationData | undefined;
  private readonly _emojis: Map<string, Texture> = new Map();
  private readonly _avatars: Map<string, { texture: Texture; position: 'left' | 'right' }> = new Map();

  private readonly _scrollBoxOptions: ScrollBoxOptions;
  private readonly _scrollBox: ScrollBox;
  private readonly _messageBoxes: MessageBox[] = [];

  constructor() {
    super();

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
    this.addChild(this._scrollBox);

    this.loadAssetsFromConversation().then(conversation => this.onAssetsLoaded(conversation));
  }

  reset(): void {
    // Nothing to do
  }

  resize(width: number, height: number): void {
    const targetWidth = Math.min(width, maxWidth);
    const targetHeight = height - messageMargin;

    this._lastWidth = width;
    this._lastHeight = height;

    this.position.set((width - targetWidth) / 2, 0);
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

    this.resize(this._lastWidth, this._lastHeight);
  }

  private async loadConversationData(): Promise<ConversationData> {
    const res = await fetch(conversationUrl, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load ${conversationUrl} (${res.status})`);
    }
    const conversation = await res.json();
    return conversation;
  }

  private async loadAssetsFromConversation(): Promise<ConversationData> {
    const conversation = await this.loadConversationData();
    const { dialogue, emojies, avatars } = conversation;

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
}
