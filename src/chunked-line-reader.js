const fs = require("fs");
const isBinaryFile = require("isbinaryfile");
const {Readable} = require('stream');
const {StringDecoder} = require('string_decoder');

const lastIndexOf = function(buffer, length, char) {
  let i = length;
  while (i--) {
    if (buffer[i] === char) { return i; }
  }
  return -1;
};

// Will ensure data will be read on a line boundary. So this will always do the
// right thing:
//
//   lines = []
//   reader = new ChunkedLineReader('some/file.txt')
//   reader.on 'data', (chunk) ->
//     line = chunk.toString().replace(/\r?\n?$/, '')
//     lines = lines.concat(line.split(/\r\n|\n|\r/))
//
// This will collect all the lines in the file, or you can process each line in
// the data handler for more efficiency.
module.exports =
class ChunkedLineReader extends Readable {
  constructor(filePath, options = {}) {
    super();
    this.encoding = options?.encoding ?? "utf8";
    this.filePath = filePath;

    this.CHUNK_SIZE = 10240;
    this.chunkedBuffer = null;
    this.headerBuffer = new Buffer(256);
  }

  isBinaryFile() {
    const fd = fs.openSync(this.filePath, "r");
    const isBin = isBinaryFile(this.headerBuffer, fs.readSync(fd, this.headerBuffer, 0, 256));
    fs.closeSync(fd);
    return isBin;
  }

  _read() {
    let fd;
    try {
      fd = fs.openSync(this.filePath, "r");
      const line = 0;
      let offset = 0;
      let remainder = '';
      if (isBinaryFile(this.headerBuffer, fs.readSync(fd, this.headerBuffer, 0, 256))) { return; }

      if (this.chunkedBuffer == null) { this.chunkedBuffer = new Buffer(this.CHUNK_SIZE); }
      let bytesRead = fs.readSync(fd, this.chunkedBuffer, 0, this.CHUNK_SIZE, 0);
      const decoder = new StringDecoder(this.encoding);

      while (bytesRead) {
        // Scary looking. Uses very few new objects
        let newRemainder, str;
        const char = 10;
        const index = lastIndexOf(this.chunkedBuffer, bytesRead, char);

        if (index < 0) {
          // no newlines here, the whole thing is a remainder
          newRemainder = decoder.write(this.chunkedBuffer.slice(0, bytesRead));
          str = null;
        } else if ((index > -1) && (index === (bytesRead - 1))) {
          // the last char is a newline
          newRemainder = '';
          str = decoder.write(this.chunkedBuffer.slice(0, bytesRead));
        } else {
          str = decoder.write(this.chunkedBuffer.slice(0, index+1));
          newRemainder = decoder.write(this.chunkedBuffer.slice(index+1, bytesRead));
        }

        if (str) {
          if (remainder) { str = remainder + str; }
          this.push(str);
          remainder = newRemainder;
        } else {
          remainder = remainder + newRemainder;
        }

        offset += bytesRead;
        bytesRead = fs.readSync(fd, this.chunkedBuffer, 0, this.CHUNK_SIZE, offset);
      }

      if (remainder) { return this.push(remainder); }

    } catch (error) {
      return this.emit('error', error);
    }

    finally {
      if (fd != null) { fs.closeSync(fd); }
      this.push(null);
    }
  }
}
