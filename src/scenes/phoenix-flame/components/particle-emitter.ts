import { Container, Sprite, Texture, Ticker } from 'pixi.js';

interface LastAutoSpawnInfo {
  amount: number;
  timePassed: number;
}

type ParticleFunction<T extends {}, K = undefined> = (
  particle: ParticleSprite<T>,
  configData: Readonly<T>,
  emitter: ParticleEmitter<T>,
  extraArgs: K
) => void;

export type ParticleSystemConfig<T extends {} = {}> = {
  autoSpawn?: (lastAutoSpawnInfo: Readonly<LastAutoSpawnInfo>, emitter?: ParticleEmitter<T>) => number;
  maxParticles?: number;
  initialTexture?: Texture;
  spawn?: ParticleFunction<T>;
  update?: ParticleFunction<T, number>;
  kill?: ParticleFunction<T>;
  data: T;
};

const createDefaultParticleConfig = <T extends {}>(): Required<ParticleSystemConfig<T>> => ({
  autoSpawn(lastAutoSpawnInfo: LastAutoSpawnInfo) {
    return 0;
  },
  maxParticles: Infinity,
  initialTexture: Texture.WHITE,
  spawn(particle: ParticleSprite<T>) {
    /* NOOP */
  },
  update(particle: ParticleSprite<T>) {
    /* NOOP */
  },
  kill(particle: ParticleSprite<T>) {
    particle.pData.currentLifeMS = 0;
    // particle.pData.maxLifeMS = 100;
    particle.position.set(0, 0);
    particle.scale.set(1, 1);
    particle.rotation = 0;
    particle.alpha = 1;
    particle.tint = 0xffffff;
    particle.blendMode = 'normal';
  },
  data: {} as T
});

export const defaultParticleConfig: Required<ParticleSystemConfig> = createDefaultParticleConfig();

export class ParticleSprite<T> extends Sprite {
  pData: T & { currentLifeMS: number; maxLifeMS: number };

  constructor(initialTexture: Texture, data: T) {
    super(initialTexture);
    this.pData = { currentLifeMS: 0, maxLifeMS: 100, ...data };
    this.anchor.set(0.5, 0.5);
  }
}

export class ParticleEmitter<T extends {}> extends Container {
  private readonly _config: Required<ParticleSystemConfig<T>>;

  private readonly _particlePool: ParticleSprite<T>[] = [];
  private readonly _activeParticles: ParticleSprite<T>[] = [];
  private readonly _lastAutoSpawnInfo: LastAutoSpawnInfo = { amount: 0, timePassed: 0 };

  constructor(config: ParticleSystemConfig<T>) {
    super();

    this._config = { ...createDefaultParticleConfig<T>(), ...config };
  }

  reset(): void {
    [...this._activeParticles].forEach(particle => this.killParticle(particle));
    this._lastAutoSpawnInfo.amount = 0;
    this._lastAutoSpawnInfo.timePassed = 0;
  }

  update({ deltaMS }: Ticker): void {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this._activeParticles[i];
      particle.pData.currentLifeMS += deltaMS;

      if (particle.pData.currentLifeMS >= particle.pData.maxLifeMS) {
        this.killParticle(particle);
        i--;
        continue;
      }

      this._config.update(particle, this._config.data, this, deltaMS);
    }

    this._lastAutoSpawnInfo.timePassed += deltaMS;
    const autoSpawnTarget = this._config.autoSpawn(this._lastAutoSpawnInfo);
    if (autoSpawnTarget) {
      let autoSpawnCount = 0;
      for (let i = 0; i < autoSpawnTarget; i++) {
        if (!this.spawnParticle()) {
          break;
        }
        autoSpawnCount++;
      }
      this._lastAutoSpawnInfo.amount = autoSpawnCount;
      this._lastAutoSpawnInfo.timePassed = 0;
    }
  }

  spawnParticle(): boolean {
    const count = this.particleCount;
    if (count >= this._config.maxParticles) {
      return false;
    }

    let particle = this._particlePool.pop();
    if (particle === undefined) {
      particle = new ParticleSprite(this._config.initialTexture, { ...this._config.data });
    }

    this._activeParticles.push(particle);
    this.addChild(particle);
    this._config.spawn(particle, this._config.data, this, undefined);

    return true;
  }

  get config(): ParticleSystemConfig<T> {
    return this._config;
  }

  get particleCount(): number {
    return this._activeParticles.length;
  }

  private killParticle(particle: ParticleSprite<T>): void {
    const index = this._activeParticles.indexOf(particle);
    if (index < 0) {
      return;
    }
    this._activeParticles.splice(index, 1);
    particle.removeFromParent();
    this._particlePool.push(particle);
    this._config.kill(particle, this._config.data, this, undefined);
  }
}
