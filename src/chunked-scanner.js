const ChunkedExecutor = require('./chunked-executor');

module.exports =
class ChunkedScanner extends ChunkedExecutor {
  constructor(scanner, execPathFn) {
    super([], execPath);
    this.finishedScanning = false;
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
}
