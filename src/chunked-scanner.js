/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
let ChunkedScanner;
const ChunkedExecutor = require('./chunked-executor');

module.exports =
(ChunkedScanner = class ChunkedScanner extends ChunkedExecutor {
  constructor(scanner, execPathFn) {
    this.finishedScanning = false;
    super([], execPathFn);
    this.onFinishedScanning = this.onFinishedScanning.bind(this);
    this.scanner = scanner;
  }

  execute(doneCallback) {
    super.execute(doneCallback);

    this.scanner.on('path-found', this.push);
    this.scanner.on('finished-scanning', this.onFinishedScanning);
    return this.scanner.scan();
  }

  onFinishedScanning() {
    this.finishedScanning = true;
    return this.checkIfFinished();
  }

  checkIfFinished() {
    if (!this.finishedScanning) { return false; }
    const isFinished = super.checkIfFinished();

    if (isFinished) {
      this.scanner.removeListener('path-found', this.path);
      this.scanner.removeListener('finished-scanning', this.onFinishedScanning);
    }

    return isFinished;
  }
});
