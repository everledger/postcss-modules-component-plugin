/**
 * Webpack plugin for processing postcss modules as classname hash objects.
 *
 * :CAVEAT: if app components use same class names as those of partials, they will end up global
 *
 * @package: postcss-modules-component-plugin
 * @author:  pospi <sam@everledger.io>
 * @since:   2016-08-25
 */

const loaderUtils = require('loader-utils');


// JSON cache layer

const cssScopes = {};

function setFileJSON(cssFileName, json) {
    cssScopes[cssFileName] = json;
}

function getFileJSON(cssFileName) {
    if (cssScopes[cssFileName] === undefined) {
        throw new Error("Unable to load PostCSS module JSON for " + cssFileName);
    }
    return cssScopes[cssFileName];
}


// resolve references to integrate with Webpack loaders system

const loaderName = require.resolve("./");

function getLoaderName() {
    return loaderName;
}


// configuration to allow overriding list of global module path regexes

const globalModulePaths = [/\/node_modules\//];

function setGlobalModulePaths(paths) {
    if (!Array.isArray(paths)) {
        paths = [paths];
    }
}

let localModuleNameFormat = '[name][emoji]_[localName]_[hash:base64:5]';

function setLocalModuleNameFormat(newFormat) {
    localModuleNameFormat = newFormat;
}


// provide a function for handling name scoping...

const SELECTORS_ENCOUNTERED_GLOBALLY = {};

function scopedName(name, filename, css) {
  // In component entrypoints:
  // where we find selectors encountered in our partials, leave them alone
  if (SELECTORS_ENCOUNTERED_GLOBALLY[name]) {
    return name;
  }

  // In partials:
  // use global selectors within node_modules folder
  let isGlobal = false;
  if (globalModulePaths.filter(regex => isGlobal || (isGlobal = filename.match(regex))).length !== 0) {
    SELECTORS_ENCOUNTERED_GLOBALLY[name] = true;
    return name;
  } else if (SELECTORS_ENCOUNTERED_GLOBALLY[name]) {
    SELECTORS_ENCOUNTERED_GLOBALLY[name] = false;
  }

  // In component entrypoints:
  // use local selectors for app code by default
  return loaderUtils.interpolateName(
    { resourcePath: filename },
    localModuleNameFormat.replace(/\[localName\]/g, name),
    { content: css }
  );
}


// Main loader entrypoint (injects JSON onto `css-loader` output)

function Loader(source) {
    this.cacheable();
    return source + "\nexports.locals = " + JSON.stringify(getFileJSON(this.resourcePath)) + ';';
}


// exports

Loader.loader = getLoaderName;
Loader.writer = setFileJSON;
Loader.scopedName = scopedName;
Loader.setGlobalModulesWhitelist = setGlobalModulePaths;
Loader.setLocalModuleNameFormat = setLocalModuleNameFormat;

module.exports = Loader;
