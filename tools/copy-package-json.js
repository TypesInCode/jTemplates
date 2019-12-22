const fs = require('fs-extra');
const path = require('path');

var pckg = fs.readJSONSync(path.resolve("./package.json"));
var package = {
    name: pckg.name,
    version: pckg.version,
    description: pckg.description,
    license: pckg.license,
    repository: pckg.repository,
    author: pckg.author,
    keywords: pckg.keywords,
    main: "./index.js",
    typings: "./index.d.ts"
};

fs.writeJSONSync(path.resolve("./lib/package.json"), package, { spaces: 2 });