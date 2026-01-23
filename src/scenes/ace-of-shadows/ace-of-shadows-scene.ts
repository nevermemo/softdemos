import { Container, Sprite, Texture, Matrix, Ticker } from 'pixi.js';
import { Tween, Easing, Group } from '@tweenjs/tween.js';

import { AbstractScene } from '../abstract-scene';
import { generateLinearLerp, generateParabolicLerp } from './utils';

type AnimEasings = {
  x: (t: number) => number;
  y: (t: number) => number;
  rotation: (t: number) => number;
};

// Cached math objects
const tempMatrix1 = new Matrix();
const tempMatrix2 = new Matrix();

const horizontalPadding = 15;
const verticalPadding = 15;

const numOfCards = 144;
const cardSeperation = 0.3;
const deckOffsetX = 40;

const deckAnimRepeat = 4000;
const cardAnimDuration = 2000;
const cardAnimRepeat = 1000;
const cardPeakHeight = 100;
const cardExtraFlips = -2;

export class AceOfShadowsScene extends AbstractScene {
  label = 'ace-of-shadows';
  public readonly title = 'Ace of Shadows';

  // Cards can be manipulated in run time, safer to keep an unused card sprite for reference
  private _referenceCard: Sprite = new Sprite();

  private _deckContainers: Container[] = [new Container({ label: 'deck-1' }), new Container({ label: 'deck-2' })];
  private _flyingCardsContainer: Container = new Container({ label: 'flying-cards' });

  private _animTime: number = 0;
  private _activeDeck: number = 0;
  private readonly _deckAnimationTween: Tween<{ rot: number }> = new Tween({ rot: 0 })
    .to({ rot: Math.PI * 2 }, deckAnimRepeat)
    .repeat(Infinity)
    .onUpdate(({ rot }) => this.updateDeckAnim(rot));
  private readonly _cardAnimationTriggerTween: Tween<{ t: number }> = new Tween({ t: 0 })
    .to({ t: 1 }, cardAnimRepeat)
    .onRepeat(() => this.triggerCardAnimation())
    .repeat(Infinity);
  private readonly _cardAnimationTweens: Tween<{ t: number }>[] = [];
  private readonly _animGroup: Group = new Group();

  constructor() {
    super();

    this._referenceCard.texture = Texture.from('card-back');

    const [firstDeck, secondDeck] = this._deckContainers;

    this.addChild(...this._deckContainers, this._flyingCardsContainer);

    for (let i = 0; i < numOfCards; i++) {
      const card = new Sprite(Texture.from('card-back'));
      // card.anchor.set(0.5);
      card.pivot.set(Math.round(this._referenceCard.width / 2), Math.round(this._referenceCard.height / 2));
      card.label = `card-${i}`;
      this._deckContainers[0].addChild(card);
    }

    const cardDiagonal = Math.sqrt(Math.pow(this._referenceCard.width, 2) + Math.pow(this._referenceCard.height, 2));
    const baseHeight = (numOfCards - 1) * cardSeperation + cardPeakHeight + cardDiagonal;

    firstDeck.position.set(-deckOffsetX, (baseHeight - cardDiagonal) / 2);
    secondDeck.position.set(deckOffsetX, (baseHeight - cardDiagonal) / 2);

    this._animGroup.add(this._deckAnimationTween, this._cardAnimationTriggerTween, ...this._cardAnimationTweens);

    this.reset();
  }

  reset(): void {
    const cards = [...this._deckContainers, this._flyingCardsContainer].reduce<Container[]>(
      (arr, cont) => (arr.push(...cont.children), arr),
      []
    );
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      card.removeFromParent();
      this._deckContainers[0].addChild(card);
      card.label = `card-${i}`;
      card.position.set(0, -i * cardSeperation);
      card.scale.set(1);
      card.rotation = 0;
    }

    this._animTime = 0;
    this._activeDeck = 0;
    this._deckAnimationTween.stop().start(0);
    this._cardAnimationTriggerTween.stop().start(0);
    this._cardAnimationTweens.forEach(t => t.stop());
  }

  resize(width: number, height: number): void {
    const targetWidth = width - 2 * horizontalPadding;
    const targetHeight = height - 2 * verticalPadding;

    const cardDiagonal = Math.sqrt(Math.pow(this._referenceCard.width, 2) + Math.pow(this._referenceCard.height, 2));

    const baseWidth = cardDiagonal + deckOffsetX * 2;
    const baseHeight = (numOfCards - 1) * cardSeperation + cardPeakHeight + cardDiagonal;

    this.scale.set(Math.min(targetWidth / baseWidth, targetHeight / baseHeight));
    this.position.set(horizontalPadding + targetWidth / 2, verticalPadding + targetHeight / 2);
  }

  update(ticker: Ticker): boolean {
    if (!super.update(ticker)) {
      return false;
    }

    this._animTime += ticker.deltaMS;
    this._animGroup.update(this._animTime);

    return true;
  }

  private triggerCardAnimation(): void {
    let startDeck = this._deckContainers[this._activeDeck];
    if (startDeck.children.length === 0) {
      if (this._cardAnimationTweens.some(tw => tw.isPlaying())) {
        // Last card from starting deck didn't finish flying
        return;
      }
      this._activeDeck = (this._activeDeck + 1) % this._deckContainers.length;
      startDeck = this._deckContainers[this._activeDeck];
    }
    const targetDeck = this._deckContainers[(this._activeDeck + 1) % this._deckContainers.length];
    const card = startDeck.children[startDeck.children.length - 1];

    // this._flyingCardsContainer.reparentChildAt(card, 0);
    this._flyingCardsContainer.reparentChild(card);
    const startX = card.x;
    const startY = card.y;
    const startRot = card.rotation;

    const targetIndex =
      targetDeck.children.length +
      this._cardAnimationTweens.reduce((value, tw) => (tw.isPlaying() ? ++value : value), 0);
    tempMatrix1.identity().translate(0, -targetIndex * cardSeperation);
    tempMatrix2.copyFrom(targetDeck.worldTransform);
    tempMatrix1.prepend(tempMatrix2);
    tempMatrix2.copyFrom(this._flyingCardsContainer.worldTransform).invert();
    tempMatrix1.prepend(tempMatrix2);
    const endX = tempMatrix1.tx;
    const endY = tempMatrix1.ty;
    const endRot = startRot + 2 * Math.PI * (cardExtraFlips + cardAnimDuration / deckAnimRepeat);

    tempMatrix1.identity().translate(0, -(numOfCards - 1) * cardSeperation - cardPeakHeight);
    tempMatrix2.copyFrom(startDeck.worldTransform);
    tempMatrix1.prepend(tempMatrix2);
    tempMatrix2.copyFrom(this._flyingCardsContainer.worldTransform).invert();
    tempMatrix1.prepend(tempMatrix2);
    const peakY = tempMatrix1.ty;

    const tween = this.getCardAnimTween();
    const easings: AnimEasings = {
      x: generateLinearLerp(startX, endX),
      y: generateParabolicLerp(startY, endY, peakY),
      rotation: generateLinearLerp(startRot, endRot)
    };
    tween
      .onUpdate(({ t }) => this.updateCardAnim(card, t, easings))
      .onComplete(() => {
        targetDeck.addChild(card);
        card.position.set(0, -(targetDeck.children.length - 1) * cardSeperation);
        tween.onUpdate().onComplete();
      })
      .start(this._animTime);
  }

  private updateDeckAnim(rot: number): void {
    for (const deck of this._deckContainers) {
      for (const card of deck.children) {
        card.rotation = rot;
      }
    }
  }

  private updateCardAnim(card: Container, t: number, easings: AnimEasings): void {
    let prop: keyof AnimEasings;
    for (prop in easings) {
      card[prop] = easings[prop](t);
    }
  }

  private getCardAnimTween(): Tween {
    let tween = this._cardAnimationTweens.find(t => !t.isPlaying());

    if (tween) {
      return tween;
    }

    tween = new Tween({ t: 0 }).to({ t: 1 }, cardAnimDuration);
    this._cardAnimationTweens.push(tween);
    this._animGroup.add(tween);

    return tween;
  }
}
