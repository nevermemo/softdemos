import { Container, Sprite, Texture, Text, Graphics, TextStyleOptions, Assets } from 'pixi.js';

import { EmojiText } from './emoji-text';

const config = {};

const minBoxWidth = 350;
const borderThickness = 3;
const borderColor = 0x00ffff;
const backgroundCornerRadius = 16;
const backgroundColors = {
  right: 0x00ff00,
  left: 0x00aa00
};
const avatarBgColor = 0x888888;
const avatarSize = 80;
const nameBgColor = 0xffff00;
const nameBgHeight = 20;
const messagePadding = 16;
const defaultTextStyle: TextStyleOptions = {
  fontFamily: 'Pixeloid',
  fontSize: 18
};

export class MessageBox extends Container {
  private readonly _background: Graphics = new Graphics();

  private readonly _avatarContainer: Container = new Container();
  private readonly _avatarSprite: Sprite;
  private readonly _avatarBg: Graphics = new Graphics();
  private readonly _nameText: Text;
  private readonly _nameBg: Graphics = new Graphics();

  private readonly _messageText: EmojiText;

  constructor(
    person: string,
    message: string,
    private _side: 'left' | 'right',
    avatarTexture: Texture,
    emojis: Map<string, Texture>,
    startWidth: number = minBoxWidth
  ) {
    super();

    this._avatarSprite = new Sprite(avatarTexture);
    this._nameText = new Text({ text: person, style: defaultTextStyle });
    this._messageText = new EmojiText({ text: message, style: defaultTextStyle }, emojis);

    this._avatarBg
      .setFillStyle({ color: avatarBgColor })
      .rect(0, 0, avatarSize, avatarSize + nameBgHeight + borderThickness)
      .fill({ color: avatarBgColor })
      .stroke({
        alignment: 0,
        cap: 'square',
        width: borderThickness,
        color: borderColor
      });
    this._nameBg
      .setFillStyle({ color: avatarBgColor })
      .rect(0, 0, avatarSize, nameBgHeight)
      .fill({ color: nameBgColor })
      .stroke({
        alignment: 0,
        cap: 'square',
        width: borderThickness,
        color: borderColor
      });

    this._background.position.set(borderThickness);
    this._messageText.position.y = borderThickness + messagePadding;
    this._avatarContainer.position.y = borderThickness;
    this._avatarSprite.anchor.set(0.5, 0.5);
    this._avatarSprite.position.set(avatarSize / 2);
    this._avatarSprite.scale.set(
      Math.min(avatarSize / this._avatarSprite.width, avatarSize / this._avatarSprite.height)
    );
    this._nameBg.position.set(0, avatarSize + borderThickness);
    this._nameText.anchor.set(0.5, 0.5);
    this._nameText.position.set(avatarSize / 2, avatarSize + borderThickness + nameBgHeight / 2);
    this._nameText.scale.set(0.9 * Math.min(avatarSize / this._nameText.width, nameBgHeight / this._nameText.height));

    this._avatarContainer.addChild(this._avatarBg, this._avatarSprite, this._nameBg, this._nameText);
    this.addChild(this._background, this._avatarContainer, this._messageText);

    this.setWidth(startWidth);
  }

  setWidth(width: number): void {
    const targetWidth = Math.max(width, minBoxWidth);
    this.scale.set(width < minBoxWidth ? width / minBoxWidth : 1);

    const messageWidth = targetWidth - 3 * borderThickness - 2 * messagePadding - avatarSize;
    this._messageText.setWordWrap(messageWidth);
    const messageHeight = this._messageText.height;

    const targetHeight = Math.max(
      3 * borderThickness + avatarSize + nameBgHeight,
      2 * borderThickness + 2 * messagePadding + messageHeight
    );

    if (this._side === 'left') {
      this._avatarContainer.position.x = borderThickness;
      this._messageText.position.x = 2 * borderThickness + avatarSize + messagePadding;

      this._background
        .clear()
        .beginPath()
        .moveTo(0, 0)
        .lineTo(targetWidth - 2 * borderThickness - backgroundCornerRadius, 0)
        .arc(
          targetWidth - 2 * borderThickness - backgroundCornerRadius,
          backgroundCornerRadius,
          backgroundCornerRadius,
          1.5 * Math.PI,
          2 * Math.PI,
          false
        )
        .lineTo(targetWidth - 2 * borderThickness, targetHeight - 2 * borderThickness - 2 * backgroundCornerRadius)
        .arc(
          targetWidth - 2 * borderThickness - backgroundCornerRadius,
          targetHeight - 2 * borderThickness - backgroundCornerRadius,
          backgroundCornerRadius,
          0,
          Math.PI / 2
        )
        .lineTo(0, targetHeight - 2 * borderThickness)
        .closePath();
    } else {
      this._avatarContainer.position.x = targetWidth - borderThickness - avatarSize;
      this._messageText.position.x = borderThickness + messagePadding;

      this._background
        .clear()
        .beginPath()
        .moveTo(targetWidth - 2 * borderThickness, 0)
        .lineTo(targetWidth - 2 * borderThickness, targetHeight - 2 * borderThickness)
        .lineTo(backgroundCornerRadius, targetHeight - 2 * borderThickness)
        .arc(
          backgroundCornerRadius,
          targetHeight - 2 * borderThickness - backgroundCornerRadius,
          backgroundCornerRadius,
          Math.PI / 2,
          Math.PI,
          false
        )
        .lineTo(0, backgroundCornerRadius)
        .arc(backgroundCornerRadius, backgroundCornerRadius, backgroundCornerRadius, Math.PI, 1.5 * Math.PI, false)
        .closePath();
    }
    this._background.fill({ color: backgroundColors[this._side] }).stroke({
      alignment: 0,
      cap: 'square',
      width: borderThickness,
      color: borderColor
    });
  }
}
