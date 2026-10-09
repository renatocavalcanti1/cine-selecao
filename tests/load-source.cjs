// Transpile project TS/TSX for Node's test runner, using the installed compiler.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) {
  return originalResolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args);
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    if (!filename.startsWith(root + path.sep) || filename.includes(`${path.sep}node_modules${path.sep}`)) throw new Error('Only project source may be transpiled');
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true, target:ts.ScriptTarget.ES2020},
      fileName:filename,
    });
    module._compile(result.outputText, filename);
  };
}
