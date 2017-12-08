/* run in service worker */
var URL_MAP =
"@include ../site-cache/urlmap.json"

"@include lib/MyReader.js"

const BLK_SIZE  = 1024 * 16;
const HASH_SIZE = 16;


// TODO: URL_MAP use binary format
for (let k in URL_MAP) {
  let v = URL_MAP[k];
  v.hash = hexToBytes(v.hash);
}

function hexToBytes(inStr) {
  let outLen = inStr.length / 2;
  let outBuf = new Uint8Array(outLen);

  for (let i = 0; i < outLen; i++) {
      let byte = parseInt(inStr.substr(i * 2, 2), 16);
      console.assert(!isNaN(byte));
      outBuf[i] = byte;
  }
  return outBuf;
}

//
// utils
//
function memcmp(b1, b2, size) {
  // TODO: u32 optimize
  for (let i = 0; i < size; i++) {
    if (b1[i] !== b2[i]) {
      return false;
    }
  }
  return true;
}

function sha256(buf) {
  return crypto.subtle.digest('SHA-256', buf);
}

async function output(size, reader, os, hash) {
  let n = Math.ceil(size / BLK_SIZE);
  console.log('blk num:', n);

  for (let i = 0; i < n; i++) {
    if (reader.eof) {
      // TODO: error handler
      console.warn('bad size');
      os.close();
      return i;
    }

    // bufBiHj = Bi + H(i+1)
    let bufBiHj = await reader.readBytes(BLK_SIZE + HASH_SIZE);

    
    let hashBuf = await sha256(bufBiHj);
    let hashU8 = new Uint8Array(hashBuf);

    let equal = memcmp(hashU8, hash, HASH_SIZE);
    if (!equal) {
      // TODO: error handler
      console.warn('bad hash');
      os.close();
      return i;
    }

    
    hash = bufBiHj.subarray(-HASH_SIZE);

    let chunk = bufBiHj.subarray(0, BLK_SIZE);
    os.enqueue(chunk);
  }

  os.close();
  return -1;  // success
}

async function proxy(req, item) {
  // TODO: choose fastest node, error retry
  let url = 'https://ipfs.io/ipfs/' + item.ipfs;

  let res = await fetch(url);
  let reader = new MyReader(res.body.getReader());

  let stub = await reader.readBytes(item.stub);
  let size = await reader.readUint32();
  let mime = await reader.readTinyText();

  // http respond
  let headers = new Headers();
  headers.set('content-type', mime);
  headers.set('x-porxy', url);

  // ostream <- my chunks
  // istream -> Response
  let os;
  let is = new ReadableStream({
    start(controller) {
      os = controller;
    }
  });

  res = new Response(is, {
    headers: headers,
  });

  output(size, reader, os, item.hash);
  return res;
}

exports.onfetch = function(e) {
  let req = e.request;
  let url = new URL(req.url);

  let path = url.pathname;
  if (path.endsWith('/')) {
    path += 'index.html';
  }

  let item = URL_MAP[path.substr(1)];
  if (!item) {
    let html = '404: Not Found';

    return new Response(html, {
      status: 404,
      statusText: 'Not Found'
    });
  }

  return proxy(req, item);
};

exports.oninit = function(e) {
  console.log('mod oninit');
};

exports.onterm = function(e) {
  console.log('mod onterm');
};