const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

class AssetsManifestPlugin {
  /**
   * @param {{ assetsDir: string; outputManifestPath?: string; baseUrl?: string }} options
   */
  constructor(options) {
    this.assetsDir = options.assetsDir;
    this.outputManifestPath = options.outputManifestPath ?? 'assets/manifest.json';
    this.baseUrl = options.baseUrl ?? '/assets/';
  }

  /** @param {import('webpack').Compiler} compiler */
  apply(compiler) {
    const pluginName = 'AssetsManifestPlugin';
    const { webpack } = compiler;
    const { RawSource } = webpack.sources;

    /**
     * @param {string} dir
     * @param {string} base
     */
    const walk = (dir, base) => {
      /** @type {string[]} */
      const results = [];
      if (!fs.existsSync(dir)) return results;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...walk(full, base));
          continue;
        }
        if (!entry.isFile()) continue;

        const rel = path.relative(base, full).replace(/\\/g, '/');
        const baseName = path.basename(rel);
        results.push(rel);
      }
      return results;
    };

    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          const files = walk(this.assetsDir, this.assetsDir).sort((a, b) => a.localeCompare(b));

          // Make webpack-dev-server watch asset directory changes.
          compilation.contextDependencies.add(this.assetsDir);
          for (const file of files) {
            compilation.fileDependencies.add(path.join(this.assetsDir, file));
          }

          const manifest = {
            bundles: [
              {
                name: 'demos',
                assets: files.map(fileBase => {
                  return {
                    alias: path.parse(fileBase).name,
                    // src: `${this.baseUrl}${fileBase}`
                    src: fileBase
                  };
                })
              }
            ]
          };

          compilation.emitAsset(this.outputManifestPath, new RawSource(JSON.stringify(manifest, null, 2)));
        }
      );
    });
  }
}

/**
 * @param {Record<string, any>} _env
 * @param {{ mode?: 'development' | 'production' }} argv
 */
module.exports = (_env, argv) => {
  const isDev = argv.mode !== 'production';

  return {
    entry: path.resolve(__dirname, 'src', 'index.ts'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      // Ensures each build starts from a clean dist/.
      clean: true
    },
    devtool: isDev ? 'inline-source-map' : false,
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src', 'index.html')
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'assets'),
            to: 'assets',
            noErrorOnMissing: true
          }
        ]
      }),
      new AssetsManifestPlugin({
        assetsDir: path.resolve(__dirname, 'assets'),
        outputManifestPath: 'assets/manifest.json',
        baseUrl: '/assets/'
      })
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'dist')
      },
      port: 8080,
      hot: true
    }
  };
};
