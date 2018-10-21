const Generator = require('yeoman-generator');
const pkg = require('../../package.json');

const globalModules = require('global-modules');
const globby = require('globby');
const updateNotifier = require('update-notifier');
const yarnModules = require('yarn-global-modules');
const yosay = require('yosay');
const { basename, join } = require('path');
const { existsSync } = require('fs');

// Is there a newer version of this generator?
updateNotifier({ pkg: pkg }).notify();

const hljsDir = getModuleDir();

function getModuleDir() {
  const npmDir = join(globalModules, 'highlight.js');

  if (existsSync(npmDir)) {
    return npmDir;
  }

  const yarnDir = join(yarnModules(), 'node_modules', 'highlight.js');

  if (existsSync(yarnDir)) {
    return yarnDir;
  }

  const localDir = join(__dirname, '..', '..', 'node_modules', 'highlight.js');

  if (existsSync(localDir)) {
    return localDir;
  }

  throw 'Error: highlight.js not found in node_modules';
}

function getLanguages() {
  const languagesPath = join(hljsDir, 'src', 'languages');

  return globby(`${languagesPath}/*.js`).then( longPaths => {
    const languages = longPaths.map( longPath => {
      return basename(longPath, '.js');
    })

    return languages;
  });
}

module.exports = class extends Generator {
  inquirer() {
    console.log(yosay('Let me help you build your custom version of Highlight.js'));

    return this.prompt([
    {
      name: 'languages',
      message: 'Select languages to include in your build',
      type: 'checkbox',
      choices: () => getLanguages(),
      validate: (choices) => choices.length > 0 ? true : 'Please select at least one language',
      store: true
    },
    {
      name: 'auditFix',
      message: 'Install any compatible updates to vulnerable dependencies',
      type: 'confirm',
      store: true
    }
    ]).then(props => {
      const opts = {
        cwd: hljsDir
      };

      const npmInstall = this.spawnCommandSync('npm', ['install'], opts);
      if (npmInstall.status !== 0) throw new Error(`npm install exited with error code ${npmInstall.status}`);

      if (props.auditFix) {
        const npmAudit = this.spawnCommandSync('npm', ['audit', 'fix'], opts);
        if (npmAudit.status !== 0) throw new Error(`npm audit exited with error code ${npmAudit.status}`);
      }

      const args = [`${hljsDir}/tools/build.js`, ...props.languages];
      const buildCommand = this.spawnCommandSync('node', args, opts);
      if (buildCommand.status !== 0) throw new Error(`npm install exited with error code ${npmInstall.status}`);

      const sourceFile = `${join(hljsDir, 'build')}/highlight.pack.js`;
      const targetFile = `${process.cwd()}/highlight.pack.js`;

      this.fs.copy(
        sourceFile,
        targetFile
      );
    });
  }
};
