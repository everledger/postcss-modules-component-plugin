This module provides linkage between [postcss-modules](https://github.com/css-modules/postcss-modules) output and React (or other view component) `import` / `require` statements.

You will find this very useful if you wish to create component-oriented [style modules](https://github.com/css-modules/css-modules#css-modules) that you can import directly from your JavaScript modules; and *also* easily share code with external libraries.

*But be warned*, this module is a dirty hack around various limitations in `css-loader`, `postcss-modules`, `postcss-import` and Webpack, and will probably go away once one of these tools / ecosystems evolves to a sufficient featureset. It was created out of frustration after many hours of head-banging &mdash; so if you're reading this thinking, "this sounds dumb...", then please open an issue explaining to me how to get these things working the *right* way.


### What it does

The current problem with "the done thing" in Webpack-land is that [css-loader](https://github.com/webpack/css-loader) does its module parsing at the *end* of the compilation process, leaving it unable (AFAIK) to make decisions about source files from their original locations. This is very annoying when you want to set default CSS scopes based on file location. Ideally you want a dependency graph that says:

```
MyComponent.js ──┐
   ┌─────────────┘
   └──> ./MyComponent.scss (LOCAL) ──┐
           ┌─────────────────────────┘
           │
           ├──> ${root}/src/framework.scss (LOCAL) ──┐
           │       ┌─────────────────────────────────┘
           │       │
           │       ├──> ${root}/node_modules/some-lib/_variables.scss (GLOBAL)
           │       │
           │       ├──> ./_variables.scss (LOCAL)
           │       │
           │       └──> ${root}/node_modules/some-lib/_mixins.scss (GLOBAL)
           │
           │
           └──> ${root}/node_modules/some-lib/ComponentBase.scss (GLOBAL)
```

This module allows you to achieve this, so that a class of `.currentElement` in `MyComponent.scss` will compile to something like `.MyComponent🇮🇳_currentElement_7KOWY` while in `ComponentBase.scss` it will come out as simply `.currentElement`. All in a way you can access directly from your JavaScript view components.


### Caveats

- If local components use the same class names as global components which have been previously loaded, these will come out global.
- Stylesheets which load other local styles will end up with the inner class names localised twice.


### Usage

Simply make the following additions to your webpack config. Note the configuration is setup for use with an `.scss` file extension but you can import `css`, `less`, `pcss` or whatever you want so long as you have the rest of your [postcss](https://github.com/postcss/postcss) plugins configured to deal with them.

```javascript
const loaderUtils = require('loader-utils');
const postCSSModuleComponents = require('postcss-modules-component-plugin');

// optional:

postCSSModuleComponents.setLocalModuleNameFormat('[name][emoji]_[localName]_[hash:base64:5]');
postCSSModuleComponents.setGlobalModulesWhitelist([
  /\/node_modules\//,               // <-- this is the default
  /src\/views\/globalView\.scss$/,
]);

//...

const moduleLoaderPlugin = postcssModules({
  generateScopedName: postCSSModuleComponents.scopedName,
  getJSON: postCSSModuleComponents.writer,
});

//...

module.exports = {
    
  //...   

  module: {
    loaders: [

      //...

      {
        test: /\.(scss)$/,  // or whichever
        exclude: [/\/node_modules/],
        loaders: [
          { loader: 'style-loader' },
          { loader: postCSSModuleComponents.loader() },
          { loader: 'css-loader', query: { sourceMap: true, importLoaders: 1 } },
          { loader: 'postcss-loader' },
        ],
      },

      //...

    ]
  },

  //...

  postcss: function(webpack) {
    return {
      plugins: [
        // :IMPORTANT: must be first
        partialImport({
          extension: 'scss',
          addDependencyTo: webpack,
          plugins: [moduleLoaderPlugin],
        }),
        moduleLoaderPlugin,

        //...

      ],
    };
  },

  //...

};
```

Note that `moduleLoaderPlugin` appears **TWICE** in the `postcss` plugin definition. This is very important- the plugin needs to run over modules *before* flattening partials, as well as over the final compiled module before continuing.


### How it works

If you study the above diagram you'll notice that `MyComponent.scss` has to render and return the classes *it* defines as local by default, and those `ComponentBase.scss` defines as global. The only way this can be done is during the PostCSS compilation phase, specifically by `postcss-modules` within [postcss-import](https://github.com/postcss/postcss-import)'s `plugins` *within* [PostCSS](https://github.com/postcss/postcss). Phrew. And then we need another `postcss-modules` pass on top of all of that to send out the class names *differently*, because in the toplevel case we want to emit a mix of local and global classes.

In the plugin, we:

1. Bind to the `getJSON` feature of `postcss-modules` to retain the parsed classname output for each module.
2. Intervene before `postcss-import` picks up each file and mark all encountered class names as global if the filename matches one of our global whitelist regexes. If the filename doesn't define an automatic global context we return a localised class name.
3. Intervene again after `postcss-import` has merged all the `@import`ed files together and, using the flags we picked up in step 2, emit either global or local classnames accordingly.
4. Bind to the webpack loader stack after `css-loader` has generated its code in order to inject the cached JSON from step 1 into the final payload (which will be empty, since `css-loader` isn't running in module mode.


### Todo

- Attempts with multiple instances of `postcss-modules` plugin resulted in issues, if we can revisit with two separate instances may be able to solve the "local classnames can be shadowed by globals" problem.


### Author

Made with love at [everledger.io](http://www.everledger.io/)

<small>(...and OK yes, some frustration :p)</small>


### License

MIT
