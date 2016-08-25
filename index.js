/**
 * Webpack plugin for processing postcss modules as classname hash objects.
 *
 * @package: postcss-modules-component-plugin
 * @author:  pospi <sam@everledger.io>
 * @since:   2016-08-25
 */


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


// Main loader entrypoint (injects JSON onto `css-loader` output)

function Loader(source) {
    this.cacheable();
    return source + "\nexports.locals = " + JSON.stringify(getFileJSON(this.resourcePath)) + ';';
}


// exports

Loader.loader = getLoaderName;
Loader.writer = setFileJSON;

module.exports = Loader;
