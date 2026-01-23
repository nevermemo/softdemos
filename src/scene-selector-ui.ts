import { Container, Sprite, Text } from 'pixi.js';
import { SceneLike } from './types';

const font2spriteRatio = 0.9;
const buttonSeperation = 2;
const bottomPadding = 5;
const sidePadding = 5;
const maxHeightRatio = 0.3;

export class SceneSelectorUI extends Container {
  private readonly _buttonsContainer: Container = new Container({ label: 'buttons' });
  private readonly _buttons: Container[] = [];
  private readonly _sceneToButton: Map<SceneLike, Container> = new Map();

  constructor() {
    super({ label: 'scene-selector' });

    this.addChild(this._buttonsContainer);
  }

  resize(width: number, height: number): number {
    const maxWidth = width - 2 * sidePadding;
    const maxHeight = height * maxHeightRatio - bottomPadding;

    this.width = maxWidth;
    this.height = maxHeight;
    this.scale.set(Math.min(this.scale.x, this.scale.y));
    this.position.set(width / 2, height - bottomPadding);

    // Return the y coordinate of the top edge of the menu, i.e. the available game height.
    return height - this.height - bottomPadding;
  }

  addButton(scene: SceneLike): void {
    const { title } = scene;

    const buttonContainer = new Container({ label: `${title.toLocaleLowerCase().replace(' ', '-')}-button` });
    this._buttons.push(buttonContainer);
    this._sceneToButton.set(scene, buttonContainer);

    const buttonSprite = Sprite.from('button');
    buttonSprite.eventMode = 'static';
    buttonSprite.cursor = 'pointer';
    buttonContainer.addChild(buttonSprite);

    const buttonText = new Text({
      text: title,
      style: {
        fontFamily: 'Pixeloid',
        fontSize: 32,
        fill: 0x000000,
        align: 'center'
      }
    });
    buttonText.anchor.set(0.5, 0.5);
    buttonText.position.set(buttonSprite.width / 2, buttonSprite.height / 2);
    buttonText.width = buttonSprite.width * font2spriteRatio;
    buttonText.height = buttonSprite.height * font2spriteRatio;
    buttonText.scale.set(Math.min(buttonText.scale.x, buttonText.scale.y));
    buttonContainer.addChild(buttonText);

    this._buttonsContainer.addChild(buttonContainer);

    this.rearrangeButtons();

    buttonSprite.on('pointertap', () => {
      this.emit('sceneselected', scene);
    });
  }

  removeButton(scene: SceneLike): boolean {
    const button = this._sceneToButton.get(scene);
    if (!button) {
      return false;
    }

    this._sceneToButton.delete(scene);

    const index = this._buttons.indexOf(button);
    if (index >= 0) {
      this._buttons.splice(index, 1);
    }

    button.removeFromParent();
    button.destroy({ children: true });
    this.rearrangeButtons();

    return true;
  }

  rearrangeButtons(): void {
    for (let i = 0; i < this._buttons.length; i++) {
      const button = this._buttons[i];
      button.position.set(-button.width / 2, -(i + 1) * button.height - i * buttonSeperation);
    }
  }
}
