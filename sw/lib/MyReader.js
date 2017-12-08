let _txtDec = new TextDecoder();

class MyReader {
  constructor(reader) {
    this.eof = false;
    this._reader = reader;
    this._queue = [];
    this._avail = 0;
    this._offset = 0;
  }

  async readUint32() {
    let buf = await this.readBytes(4);
    let int = buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0];
    return int >>> 0;
  }

  async readTinyText() {
    let lenBuf = await this.readBytes(1);
    let strBuf = await this.readBytes(lenBuf[0]);
    return _txtDec.decode(strBuf);
  }

  // ...

  async readBytes(size) {
    if (this.eof) {
      throw new Error('EOF');
    }

    while (this._avail < size) {
      await this._load();
      if (this.eof) {
        // return the remaining data,
        // even if less than $size.
        size = this._avail;
        break;
      }
    }
    return this._readFromBuf(size);
  }

  async _load() {
    let r = await this._reader.read();
    if (r.done) {
      this.eof = true;
      return;
    }
    let chunk = r.value;
    this._queue.push(chunk);
    this._avail += chunk.length;
  }

  _readFromBuf(size) {
    // first chunk
    let buf = this._queue[0];
    let len = buf.length;
    let beg = this._offset;

    // enough? (most case)
    let end = beg + size;
    if (end <= len) {
      this._avail -= size;
      this._offset = end;
      return buf.subarray(beg, end);
    }

    // concat small chunks
    let dstBuf = new Uint8Array(size);
    let dstPos = 0;
    let i = 0;
    let stop;

    for (;;) {
      end = len;

      let srcBuf = buf.subarray(beg, end);
      dstBuf.set(srcBuf, dstPos);
      dstPos += (end - beg);

      if (stop) {
        break;
      }

      buf = this._queue[++i];
      len = buf.length;

      let remain = size - dstPos;
      if (len >= remain) {
        len = remain;
        stop = true;
      }
      beg = 0;
    }

    this._avail -= size;
    this._queue.splice(0, i); // unshift i counts
    this._offset = end;

    return dstBuf;
  }
}