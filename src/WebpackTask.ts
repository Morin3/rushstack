import { GulpTask } from 'gulp-core-build';

export interface IWebpackConfig {
  configPath: string;
}

export class WebpackTask extends GulpTask<IWebpackConfig> {
  public name = 'webpack';

  public taskConfig: IWebpackConfig = {
    configPath: './webpack.config.js'
  };

  public executeTask(gulp, completeCallback): any {
    // let isProduction = (process.argv.indexOf('--production') > -1);
    // let streams = [];
    let shouldInitWebpack = (process.argv.indexOf('--initwebpack') > -1);
    let path = require('path');

    if (shouldInitWebpack) {
      this.log('Initializing a webpack.config.js, which bundles lib/index.js into dist/packagename.js into a UMD module.');
      this.copyFile(path.resolve(__dirname, '../webpack.config.js'));
      completeCallback();
    } else if (!this.taskConfig.configPath) {
      completeCallback();
    } else {
      let configPath = this.taskConfig.configPath;

      if (!this.fileExists(configPath)) {
        let relativeConfigPath = path.relative(this.buildConfig.rootPath, configPath);

        this.logWarning(
          `The webpack config location '${relativeConfigPath}' doesn't exist. ` +
          `Run again using --initwebpack to create a default config, or call webpack.setConfig({ configPath: null }).`);

        completeCallback();
      } else {
        configPath = this.resolvePath(configPath);

        let webpack = require('webpack');
        let gutil = require('gulp-util');

        let webpackConfig = require(configPath);
        let startTime = new Date().getTime();
        let outputDir = this.buildConfig.distFolder;

        webpack(
          webpackConfig,
          (error, stats) => {
            if (!this.buildConfig.properties) {
              this.buildConfig.properties = {};
            }

            /* tslint:disable:no-string-literal */
            this.buildConfig.properties['webpackStats'] = stats;
            /* tslint:enable:no-string-literal */

            let statsResult = stats.toJson({
              hash: false,
              source: false
            });

            if (statsResult.errors && statsResult.errors.length) {
              this.logError(`'${outputDir}':` + '\n' + statsResult.errors.join('\n') + '\n');
            }

            if (statsResult.warnings && statsResult.warnings.length) {
              this.logWarning(`'${outputDir}':` + '\n' + statsResult.warnings.join('\n') + '\n');
            }

            let duration = (new Date().getTime() - startTime);
            let statsResultChildren = statsResult.children ? statsResult.children : [ statsResult ];

            statsResultChildren.forEach(child => {
              child.chunks.forEach(chunk => {

                chunk.files.forEach(file => (
                  this.log(`Bundled: '${gutil.colors.cyan(path.basename(file))}', ` +
                    `size: ${gutil.colors.magenta(chunk.size)} bytes, ` +
                    `took ${gutil.colors.magenta(duration)} ms.`)
                )); // end file

/*

                let chunkStats = {
                  chunk: chunk,
                  modules: null
                };
                let statsPath = path.join(outputDir, chunk.files[0]) + '.stats.json';

                if (child.modules) {
                  chunkStats.modules = statsResult.modules
                    .filter(mod => (mod.chunks && mod.chunks.indexOf(chunk.id) > -1))
                    .map(mod => ({ name: mod.name, size: mod.size }))
                    .sort((a, b) => (a.size < b.size ? 1 : -1));
                }

                let fs = require('fs');

                fs.writeFileSync(
                  statsPath,
                  JSON.stringify(chunkStats, null, 2),
                  'utf8'
                );
*/

              }); // end chunk

            }); // end child

            completeCallback();
          }); // endwebpack callback
      }
    }
  }
}
