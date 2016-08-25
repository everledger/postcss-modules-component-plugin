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
  if (filename.match(/\/node_modules\//)) {
    SELECTORS_ENCOUNTERED_GLOBALLY[name] = true;
    return name;
  } else if (SELECTORS_ENCOUNTERED_GLOBALLY[name]) {
    SELECTORS_ENCOUNTERED_GLOBALLY[name] = false;
  }

  // In component entrypoints:
  // use local selectors for app code by default
  return loaderUtils.interpolateName(
    { resourcePath: filename },
    `[name][emoji]_${name}_[hash:base64:5]`,
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

module.exports = Loader;
