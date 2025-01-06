/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const fs = require('fs');
const temp = require('temp').track();
const {EventEmitter} = require('events');
const {Transform} = require('stream');
const {EOL} = require('os');

const ChunkedExecutor = require('./chunked-executor');
const ChunkedLineReader = require('./chunked-line-reader');

class ReplaceTransformer extends Transform {
  constructor(regex, replacementText, {dryReplace}) {
    this.replacements = 0;
    super();
    this.regex = regex;
    this.replacementText = replacementText;
    this.dryReplace = dryReplace;
  }

  _transform(chunk, encoding, done) {
    let data = chunk.toString();

    const matches = data.match(this.regex);
    if (matches) { this.replacements += matches.length; }

    if (matches && !this.dryReplace) { data = data.replace(this.regex, this.replacementText); }

    this.push(data, 'utf8');
    return done();
  }
}

module.exports =
class PathReplacer extends EventEmitter {
  constructor(param) {
    if (param == null) { param = {}; }
    const {dryReplace} = param;
    this.dryReplace = dryReplace;
  }

  replacePaths(regex, replacementText, paths, doneCallback) {
    let errors = null;
    let results = null;

    const replacePath = (filePath, pathCallback) => {
      return this.replacePath(regex, replacementText, filePath, function(result, error) {
        if (result) {
          if (results == null) { results = []; }
          results.push(result);
        }

        if (error) {
          if (errors == null) { errors = []; }
          errors.push(error);
        }

        return pathCallback();
      });
    };

    return new ChunkedExecutor(paths, replacePath).execute(() => doneCallback(results, errors));
  }

  replacePath(regex, replacementText, filePath, doneCallback) {
    const reader = new ChunkedLineReader(filePath);
    try {
      if (reader.isBinaryFile()) { return doneCallback(null); }
    } catch (error1) {
      const error = error1;
      this.emit('file-error', error);
      return doneCallback(null, error);
    }

    const replacer = new ReplaceTransformer(regex, replacementText, {dryReplace: this.dryReplace});
    const output = temp.createWriteStream();

    output.on('finish', () => {
      let replacements;
      let result = null;
      if (replacements = replacer.replacements) {
        result = {filePath, replacements};
        this.emit('path-replaced', result);
      }

      const readStream = fs.createReadStream(output.path);
      const writeStream = fs.createWriteStream(filePath);
      writeStream.on('finish', () => doneCallback(result));

      try {
        return readStream.pipe(writeStream);
      } catch (error) {
        this.emit('file-error', error);
        return doneCallback(null, error);
      }
    });

    reader.on('error', error => {
      this.emit('file-error', error);
      return doneCallback(null, error);
    });

    return reader.pipe(replacer).pipe(output);
  }
}
