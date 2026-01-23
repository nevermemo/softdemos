import { Texture, groupD8, Ticker, FrameObject, Sprite, Rectangle } from 'pixi.js';

import { ParticleEmitter, ParticleSystemConfig } from './components/particle-emitter';

import { AbstractScene } from '../abstract-scene';
import { createColorLerper } from './color-utils';

function getRandomFloat(first: number, second: number = 0): number {
  return first + Math.random() * (second - first);
}

function getRandomInt(first: number, second: number = 0): number {
  return Math.floor(getRandomFloat(first, second));
}

function createRotatedTexture(original: Texture, rotate: number): Texture {
  return new Texture({
    defaultAnchor: original.defaultAnchor,
    defaultBorders: original.defaultBorders,
    dynamic: original.dynamic,
    frame: original.frame,
    orig: original.orig,
    source: original.source,
    trim: original.trim,
    label: `${original.label}-rotated-${rotate}`,
    rotate: groupD8.add(rotate, original.rotate)
  });
}

const horizontalPadding = 15;
const verticalPadding = 15;

const trailPrefix = 'trail-';
const trailTextureAmount = 4;
const trailParticleData = {
  maxLifeMS: 450,
  sequenceIndex: 0,
  textureIndex: 0,
  speedY: 0,
  shared: {
    textureSequences: [] as FrameObject[][],
    speedYRange: [-0.39, -0.42],
    scale: {
      start: { x: 1.5, y: 0.1 },
      end: { x: 1.5, y: 0.3 }
    },
    spawnArc: {
      offset: { x: 0, y: -10 },
      radius: 90,
      rotationRange: [0.25 * Math.PI, 0.75 * Math.PI]
    },
    colorLerper: createColorLerper(0xff6600, 0x660000) // (Start color, end color)
  }
};
const trailEmitterConfig: ParticleSystemConfig<typeof trailParticleData> = {
  autoSpawn: lastInfo => Math.floor(lastInfo.timePassed / 70), // Time between spawns
  maxParticles: 7,
  data: trailParticleData
};

const blazePrefix = 'blaze-';
const blazeTextureAmount = 2;
const blazeParticleData = {
  maxLifeMS: 600,
  shared: {
    textures: [] as Texture[],
    speedY: -0.1,
    scaleEnd: 1,
    colorLerper: createColorLerper(0xffbb00, 0x660000) // (Start color, end color)
  }
};
const blazeEmitterConfig: ParticleSystemConfig<typeof blazeParticleData> = {
  autoSpawn: lastInfo => Math.floor(lastInfo.timePassed / 210), // Time between spawns
  maxParticles: 3,
  data: blazeParticleData
};

export class PhoenixFlameScene extends AbstractScene {
  label = 'phoenix-flame';
  public readonly title = 'Phoenix Flame';

  private readonly _safeArea: Rectangle = new Rectangle(-200, -310, 400, 450);

  private readonly _trailEmitter: ParticleEmitter<typeof trailParticleData>;
  private readonly _blazeEmitter: ParticleEmitter<typeof blazeParticleData>;

  constructor() {
    super();

    const trailTextureSequences: FrameObject[][] = [[], []]; // 2 squences for mirrored textures
    for (let i = 0; i < trailTextureAmount; i++) {
      const original = Texture.from(`${trailPrefix}${i + 1}`);
      const mirrored = createRotatedTexture(original, groupD8.MIRROR_HORIZONTAL);
      trailTextureSequences[0].push({ texture: original, time: i / trailTextureAmount });
      trailTextureSequences[1].push({ texture: mirrored, time: i / trailTextureAmount });
    }
    trailEmitterConfig.data.shared.textureSequences = trailTextureSequences;
    this._trailEmitter = new ParticleEmitter({
      ...trailEmitterConfig,
      initialTexture: trailTextureSequences[0][0].texture,
      spawn: (particle, cData) => {
        const { pData } = particle;
        const { textureSequences, spawnArc, scale, speedYRange, colorLerper } = cData.shared;

        pData.sequenceIndex = getRandomInt(textureSequences.length);
        pData.textureIndex = 0;
        pData.speedY = getRandomFloat(speedYRange[0], speedYRange[1]);

        particle.anchor.set(0.5, 1);
        particle.texture = textureSequences[pData.sequenceIndex][pData.textureIndex].texture;
        particle.tint = colorLerper(0);
        // particle.alpha = 1;
        particle.blendMode = 'add';

        const arc = getRandomFloat(spawnArc.rotationRange[0], spawnArc.rotationRange[1]);
        particle.position.set(
          spawnArc.offset.x + Math.cos(arc) * spawnArc.radius,
          spawnArc.offset.y + Math.sin(arc) * spawnArc.radius
        );
        particle.scale.copyFrom(scale.start);
        particle.rotation = (arc - Math.PI / 2) / 3;
      },
      update: (particle, cData, _, deltaMS) => {
        const { pData } = particle;
        const { currentLifeMS, maxLifeMS, sequenceIndex, textureIndex, speedY } = pData;
        const { textureSequences, scale, colorLerper } = cData.shared;
        const t = currentLifeMS / maxLifeMS;

        const frames = textureSequences[sequenceIndex];
        if (textureIndex !== frames.length - 1) {
          for (let i = frames.length - 1; i > textureIndex; i--) {
            const frame = frames[i];
            if (t >= frame.time) {
              particle.texture = frame.texture;
              pData.textureIndex = i;
              break;
            }
          }
        }

        particle.position.y += speedY * deltaMS;
        particle.scale.set(
          scale.start.x + (scale.end.x - scale.start.x) * t,
          scale.start.y + Math.pow(t, 0.3) * (scale.end.y - scale.start.y)
        );
        // particle.alpha = Math.pow(1 - t, 0.3);
        particle.tint = colorLerper(t);
      }
    });

    const blazeTextures: Texture[] = [];
    for (let i = 0; i < blazeTextureAmount; i++) {
      const original = Texture.from(`${blazePrefix}${i + 1}`);
      const flipedX = createRotatedTexture(original, groupD8.MIRROR_HORIZONTAL);
      const flipedY = createRotatedTexture(original, groupD8.MIRROR_VERTICAL);
      blazeTextures.push(original, flipedX, flipedY);
    }
    blazeEmitterConfig.data.shared.textures = blazeTextures;
    this._blazeEmitter = new ParticleEmitter({
      ...blazeEmitterConfig,
      initialTexture: blazeTextures[0],
      spawn: (particle, cData) => {
        const { textures, colorLerper } = cData.shared;

        particle.texture = textures[getRandomInt(textures.length)];
        particle.tint = colorLerper(0);
        particle.alpha = 1;
        particle.blendMode = 'add';

        particle.position.set(0, 0);
        particle.scale.set(0);
        particle.rotation = getRandomFloat(0, 2 * Math.PI);
      },
      update: (particle, cData, _, deltaMS) => {
        const { currentLifeMS, maxLifeMS } = particle.pData;
        const { scaleEnd, speedY, colorLerper } = cData.shared;
        const t = currentLifeMS / maxLifeMS;

        particle.scale.set(Math.pow(t, 0.3) * scaleEnd);
        particle.alpha = Math.pow(1 - t, 0.4);
        particle.tint = colorLerper(t);
        particle.position.y += speedY * deltaMS;
      }
    });

    this.addChild(this._trailEmitter, this._blazeEmitter);
  }

  reset(): void {
    this._trailEmitter.reset();
    this._blazeEmitter.reset();
  }

  resize(width: number, height: number): void {
    const targetWidth = width - 2 * horizontalPadding;
    const targetHeight = height - 2 * verticalPadding;

    this.scale.set(Math.min(targetWidth / this._safeArea.width, targetHeight / this._safeArea.height));
    this.position.set(
      horizontalPadding + targetWidth / 2,
      verticalPadding + targetHeight / 2 - this.scale.y * (this._safeArea.height / 2 + this._safeArea.y)
    );
  }

  update(ticker: Ticker): boolean {
    if (!super.update(ticker)) {
      return false;
    }

    this._blazeEmitter.update(ticker);
    this._trailEmitter.update(ticker);

    return true;
  }

  protected override onDestroy(): void {
    this._blazeEmitter.config.data.shared.textures.forEach(texture => texture.destroy(false));
    this._trailEmitter.config.data.shared.textureSequences.forEach(sequence => {
      sequence.forEach(({ texture }) => texture.destroy(false));
    });
  }
}
