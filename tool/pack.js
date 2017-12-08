const program = require('commander');
program
  .version('0.0.1')
  .option('-i, --input <file>', 'input file')
  .option('-o, --output <file>', 'output file')
  .parse(process.argv);


const $crypto = require('crypto');
const $mime = require('mime');
const $fs = require('fs');
const $path = require('path');

const BLK_SIZE = 1024 * 16;
const HASH_SIZE = 16;


function sha256(data1, data2) {
  let hash = $crypto.createHash('sha256');
  hash.update(data1);
  if (data2) {
    hash.update(data2);
  }
  return hash.digest();
}

function pack(manifest, stub, fileName, dirIn, dirOut) {
  let infile = $path.join(dirIn, fileName);
  let buf = $fs.readFileSync(infile);

  /*
  Output Struct:
    STUB      ...
    SIZE      4
    MIME_LEN  1
    MIME      $MIME_LEN
    B1        $BLK_SIZE
    H2 B2     $HASH_SIZE + $BLK_SIZE
    H3 B3     $HASH_SIZE + $BLK_SIZE
    ...
    Hn Bn     $HASH_SIZE + $BLK_SIZE

  Hash Chain:
    H1   = Hash(B1 + H2)
    H2   = Hash(B2 + H3)
    ...
    Hn-1 = Hash(Bn-1 + Hn)
    Hn   = Hash(Bn)

  Alog:
    SHA256
  */
  let size = buf.length;
  
  let n = Math.ceil(size / BLK_SIZE); // block count
  let bufs = [];  // buf array (reversed)
  let hash;

  for (let i = n; i >= 1; i--) {
    let beg = (i - 1) * BLK_SIZE;
    let end = beg + BLK_SIZE;
    let blk = buf.slice(beg, end);

    hash = sha256(blk, hash).slice(0, HASH_SIZE);

    if (i !== 1) {
      bufs.push(blk, hash);
    } else {
      bufs.push(blk);
    }
  }

  let mimeStr = $mime.getType(infile);
  let mimeBuf = new Buffer(mimeStr);
  bufs.push(mimeBuf);

  let mimeLen = new Buffer(1);
  mimeLen[0] = mimeBuf.length;
  bufs.push(mimeLen);

  let sizeBuf = new Buffer(4);
  sizeBuf.writeUInt32LE(size, 0);
  bufs.push(sizeBuf);

  bufs.push(stub);

  let outfile = $path.join(dirOut, fileName + '.gif');
  let ws = $fs.createWriteStream(outfile);
  for (let i = bufs.length - 1; i >= 0; i--) {
    ws.write(bufs[i]);
  }
  ws.end();

  manifest[fileName] = {
    'hash': hash.toString('hex'),
    'stub': stub.length,
    'ipfs': '',
  };
}


function main() {
  // let dirIn = program.input;
  // let dirOut = program.output;
  let dirIn = '../example-site/';
  let dirOut = '../site-cache/';

  if (!dirIn || !dirOut) {
    console.log('usage: node pack -i indir -o outdir');
    return;
  }

  let stub = $fs.readFileSync(__dirname + '/stub/1x1.gif');
  let list = $fs.readdirSync(dirIn);
  let manifest = {};

  list.forEach(fileName => {
    if (fileName[0] === '.') {
      return;
    }
    console.log('pack:', fileName);
    pack(manifest, stub, fileName, dirIn, dirOut);
  });

  let maniFile = $path.join(dirOut, 'urlmap.json');
  $fs.writeFileSync(maniFile, JSON.stringify(manifest, null, 2));
  console.log('done');
}

main();
