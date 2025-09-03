const fs = require('fs');
const os = require('os');
const path = require('path');
const ChunkedLineReader = require('../src/chunked-line-reader');

describe("ChunkedLineReader", function() {
  let rootPath, chunkSize;

  beforeEach(function() {
    chunkSize = ChunkedLineReader.CHUNK_SIZE;
    ChunkedLineReader.CHUNK_SIZE = 10;
  });

  afterEach(function() {
    ChunkedLineReader.CHUNK_SIZE = chunkSize;
    ChunkedLineReader.chunkedBuffer = null;
  });

  it("emits an error when the file does not exist", function() {
    let endHandler, errorHandler;
    const dataHandler = jasmine.createSpy('data handler');

    const reader = new ChunkedLineReader('/this-does-not-exist.js');
    reader.on('end', (endHandler = jasmine.createSpy('end handler')));
    reader.on('error', (errorHandler = jasmine.createSpy('error handler')));

    reader.on('data', dataHandler);

    waitsFor(() => errorHandler.callCount > 0);

    runs(function() {
      expect(errorHandler).toHaveBeenCalled();
      expect(endHandler).toHaveBeenCalled();
      expect(dataHandler).not.toHaveBeenCalled();
    });
  });

  it("works with no newline at the end", function() {
    let endHandler;
    rootPath = fs.realpathSync(path.join("spec", "fixtures", "many-files", "sample.js"));
    const reader = new ChunkedLineReader(rootPath);
    reader.on('end', (endHandler = jasmine.createSpy('end handler')));

    let allLines = [];
    reader.on('data', function(chunk) {
      const line = chunk.toString().replace(/\r?\n?$/, '');
      allLines = allLines.concat(line.split(os.EOL));
    });

    waitsFor(() => endHandler.callCount > 0);

    runs(function() {
      const sample = [
        'var quicksort = function () {',
        '  var sort = function(items) {  # followed by a pretty long comment which is used to check the maxLineLength feature',
        '    if (items.length <= 1) return items;',
        '    var pivot = items.shift(), current, left = [], right = [];',
        '    while(items.length > 0) {',
        '      current = items.shift();',
        '      current < pivot ? left.push(current) : right.push(current);',
        '    }',
        '    return sort(left).concat(pivot).concat(sort(right));',
        '  };',
        '',
        '  return sort(Array.apply(this, arguments));',
        '};'
      ];

      expect(allLines.length).toEqual(sample.length);
      allLines.forEach((line, i) => expect(line).toEqual(sample[i]));
    });
});

  it("works with newline at the end", function() {
    let endHandler;
    rootPath = fs.realpathSync(path.join("spec", "fixtures", "many-files", "sample-end-newline.js"));
    const reader = new ChunkedLineReader(rootPath);
    reader.on('end', (endHandler = jasmine.createSpy('end handler')));

    let allLines = [];
    reader.on('data', function(chunk) {
      const line = chunk.toString().replace(/\r?\n?$/, '');
      allLines = allLines.concat(line.split(os.EOL));
    });

    waitsFor(() => endHandler.callCount > 0);

    runs(function() {
      const sample = [
        'var quicksort = function () {',
        '  var sort = function(items) {',
        '    if (items.length <= 1) return items;',
        '    var pivot = items.shift(), current, left = [], right = [];',
        '    while(items.length > 0) {',
        '      current = items.shift();',
        '      current < pivot ? left.push(current) : right.push(current);',
        '    }',
        '    return sort(left).concat(pivot).concat(sort(right));',
        '  };',
        '',
        '  return sort(Array.apply(this, arguments));',
        '};'
      ];

      expect(allLines.length).toEqual(sample.length);
      allLines.forEach((line, i) => expect(line).toEqual(sample[i]));
    });
});

  it("works with windows newlines at the end", function() {
    let endHandler;
    rootPath = fs.realpathSync(path.join("spec", "fixtures", "many-files", "sample-with-windows-line-endings.js"));

    const reader = new ChunkedLineReader(rootPath);
    reader.on('end', (endHandler = jasmine.createSpy('end handler')));

    let allLines = [];
    reader.on('data', function(chunk) {
      const line = chunk.toString().replace(/\r?\n?$/, '');
      return allLines = allLines.concat(line.split('\r\n'));
    });

    waitsFor(() => endHandler.callCount > 0);

    runs(function() {
      const sample = [
        'var quicksort = function () {',
        '  var sort = function(items) {',
        '    if (items.length <= 1) return items;',
        '    var pivot = items.shift(), current, left = [], right = [];',
        '    while(items.length > 0) {',
        '      current = items.shift();',
        '      current < pivot ? left.push(current) : right.push(current);',
        '    }',
        '    return sort(left).concat(pivot).concat(sort(right));',
        '  };',
        '',
        '  return sort(Array.apply(this, arguments));',
        '};'
      ];

      expect(allLines.length).toEqual(sample.length);
      allLines.forEach((line, i) => expect(line).toEqual(sample[i]));});
});

  it("works with multibyte characters in utf8", function() {
    let endHandler;
    rootPath = fs.realpathSync(path.join("spec", "fixtures", "many-files", "file7_multibyte.txt"));
    const reader = new ChunkedLineReader(rootPath);
    reader.on('end', (endHandler = jasmine.createSpy('end handler')));

    let allLines = [];
    reader.on('data', function(chunk) {
      const line = chunk.toString().replace(/\r?\n?$/, '');
      allLines = allLines.concat(line.split(os.EOL));
    });

    waitsFor(() => endHandler.callCount > 0);

    runs(function() {
      const sampleText = fs.readFileSync(rootPath, {encoding: 'utf8'});
      const sampleLines = sampleText.trim().split("\n");

      expect(reader.encoding).toBe('utf8');
      expect(allLines.length).toEqual(sampleLines.length);
      allLines.forEach((line, i) => expect(line).toEqual(sampleLines[i]));
    });
  });
});
