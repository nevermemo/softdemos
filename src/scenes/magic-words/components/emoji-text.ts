import { Container, CanvasTextMetrics, Text, TextOptions, TextStyle, Sprite, Texture, DestroyOptions } from 'pixi.js';

interface EmojiTextSegment {
  type: 'text' | 'emoji';
  content: string;
}

const unknownEmojiName = 'unknown-emoji';
const defaultWordWrapWidth = 500;

export class EmojiText extends Container {
  private _emojiHeightEm = 1.2;
  private _rawText: string;
  private _rawStyle: TextStyle;
  private _wordWrapWidth: number = 0;

  private readonly _textPool: Text[] = [];
  private readonly _emojiSpritePools: Map<string, Sprite[]> = new Map();
  private readonly _unknownEmojiTexture: Texture;

  constructor(
    textOptions: TextOptions,
    private readonly _emojis: Map<string, Texture>
  ) {
    super();

    const { text, style } = textOptions;

    this._rawText = String(text ?? '');
    this._rawStyle = new TextStyle(style);
    this._rawStyle.wordWrap = false;
    this._rawStyle.wordWrapWidth = Infinity;

    this._unknownEmojiTexture = Texture.from(unknownEmojiName);
    this._emojis.forEach((_, name) => this._emojiSpritePools.set(name, []));
    this._emojiSpritePools.set(unknownEmojiName, []);

    this.setWordWrap(style && style.wordWrap && style.wordWrapWidth ? style.wordWrapWidth : defaultWordWrapWidth);
  }

  setText(value: string) {
    if (value === this._rawText) {
      return;
    }
    this._rawText = value;
    this.redrawLayout();
  }

  setWordWrap(value: number) {
    if (value === this._wordWrapWidth) {
      return;
    }
    this._wordWrapWidth = value;
    this.redrawLayout();
  }

  override destroy(options?: DestroyOptions): void {
    this.clearObjects();
    this._textPool.forEach(text => text.destroy(true));
    this._emojiSpritePools.forEach(sprites => sprites.forEach(sprite => sprite.destroy(false)))
    super.destroy(options);
  }

  private redrawLayout(): void {
    this.clearObjects();

    const referenceMetrics = CanvasTextMetrics.measureText(' ', this._rawStyle);
    const lineSpacingHeight = CanvasTextMetrics.measureText(' \n ', this._rawStyle).height - referenceMetrics.height;
    const whiteSpaceWidth =
      CanvasTextMetrics.measureText('. .', this._rawStyle).width -
      CanvasTextMetrics.measureText('..', this._rawStyle).width;

    const segments = this.segmentText(this._rawText);
    let wwWidth = this._wordWrapWidth;
    let X = 0,
      Y = 0;
    for (let i = 0; i < segments.length; i++) {
      // Check if previous content already overflowed
      if (X > this._wordWrapWidth) {
        // Start a new line
        X = 0;
        Y += lineSpacingHeight;
      }

      const segment = segments[i];
      let { type, content } = segment;
      wwWidth = this._wordWrapWidth - X;

      if (type === 'text') {
        const currentStyle = this.cloneStyleWithCustomWrap(wwWidth);
        let segmentMetrics = CanvasTextMetrics.measureText(content, currentStyle);

        // Skip text creation for empty string
        if (content.length === 0) {
          continue;
        }

        let needsNewLineAfter = false;

        // If this is not begining of a line
        if (X > 0) {
          // If even the first line is too big to fit (like a very long word)
          if (segmentMetrics.lineWidths[0] > wwWidth) {
            // Start whole segment from a new line
            X = 0;
            Y += lineSpacingHeight;
            wwWidth = this._wordWrapWidth;
            currentStyle.wordWrapWidth = wwWidth;
            segmentMetrics = CanvasTextMetrics.measureText(content, currentStyle);

            // First line can fit but there are multiple Lines
          } else if (segmentMetrics.lines.length > 1) {
            // Split the segment
            const firstSubContent = segmentMetrics.lines[0];
            const secondSubContent = content.substring(
              content.indexOf(segmentMetrics.lines[1], firstSubContent.length)
            );

            needsNewLineAfter = true;

            // Add the new segment to array and change local variables
            segments.splice(i + 1, 0, { type, content: secondSubContent });
            segment.content = firstSubContent;
            content = firstSubContent;
            segmentMetrics = CanvasTextMetrics.measureText(content, currentStyle);
          }
        }

        const text = this.getTextObject(content, currentStyle);
        this.addChild(text);
        text.position.set(X, Y);

        if (needsNewLineAfter) {
          X = 0;
          Y += lineSpacingHeight;
        } else {
          X +=
            segmentMetrics.lineWidths[segmentMetrics.lines.length - 1] +
            (content.length - content.trimEnd().length) * whiteSpaceWidth;
          Y += lineSpacingHeight * (segmentMetrics.lines.length - 1);
        }
      } else {
        const sprite = this.getEmojiSprite(content);
        this.addChild(sprite);

        const { fontProperties } = referenceMetrics;
        const fontSize = this._rawStyle.fontSize ?? fontProperties.fontSize ?? 16;
        const ascent = fontProperties.ascent ?? Math.round(fontSize * 0.8);
        const descent = fontProperties.descent ?? Math.round(fontSize * 0.2);
        // const emojiH = (fontSize - descent) * this._emojiHeightEm;
        const emojiH = fontSize * this._emojiHeightEm;

        sprite.height = emojiH;
        sprite.scale.x = sprite.scale.y;

        // If emoji is too big
        if (sprite.width > wwWidth) {
          // Start a new line
          X = 0;
          Y += lineSpacingHeight;
        }

        sprite.position.set(X, Y + ascent + descent - sprite.height);
        X += sprite.width;
      }
    }
  }

  private clearObjects(): void {
    const children = [...this.children];
    children.forEach(child => {
      if (child instanceof Sprite) {
        const spritePool = this._emojiSpritePools.get(child.label);
        if (spritePool) {
          spritePool.push(child);
        }
      } else if (child instanceof Text) {
        this._textPool.push(child);
      }
      child.removeFromParent();
    });
  }

  private getTextObject(text: string = '', style: TextStyle = this._rawStyle.clone()): Text {
    let textObj = this._textPool.pop();
    if (textObj) {
      textObj.text = text;
      textObj.style = style;
      return textObj;
    }
    return new Text({ text, style: style, resolution: 2 });
  }

  private getEmojiSprite(name: string): Sprite {
    const texture = this._emojis.get(name);
    const poolName = texture ? name : unknownEmojiName;
    const spriteTexture = texture ? texture : this._unknownEmojiTexture;

    const spritePool = this._emojiSpritePools.get(poolName);
    if (spritePool) {
      const sprite = spritePool.pop();
      if (sprite) {
        return sprite;
      }
    }
    return new Sprite({ texture: spriteTexture, label: poolName });
  }

  private cloneStyleWithCustomWrap(width: number | undefined = undefined): TextStyle {
    const style = this._rawStyle.clone();
    style.wordWrap = width !== undefined;
    style.wordWrapWidth = width ?? defaultWordWrapWidth;
    return style;
  }

  private segmentText(input: string, namePattern: RegExp = /[A-Za-z0-9_]+/): EmojiTextSegment[] {
    const reg = new RegExp(`\\{(${namePattern.source})\\}`, 'g');
    const matches = Array.from(input.matchAll(reg));

    if (matches.length === 0) {
      return [{ type: 'text', content: input }];
    }

    const out: EmojiTextSegment[] = [];

    let lastIndex = 0;
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const { index } = match;
      const [matchContent, emojiContent] = match;

      if (lastIndex < index) {
        out.push({ type: 'text', content: input.substring(lastIndex, index) });
        lastIndex = index;
      }
      out.push({ type: 'emoji', content: emojiContent });
      lastIndex = index + matchContent.length;
    }
    if (lastIndex < input.length) {
      out.push({ type: 'text', content: input.substring(lastIndex) });
    }

    return out;
  }
}
