/* run in service worker */
const EVENT_FETCH = 0;
const EVENT_MSG = 1;

let queue = [];
let swMod;

function addQueue(v) {
  queue.push(v);
}

function flushQueue() {
  queue.forEach(args => {
    let [type, e, y, n] = args;

    switch (type) {
    case EVENT_MSG:
      swMod.onmsg(e);
      break;

    case EVENT_FETCH:
      let p = swMod.onfetch(e);
      if (!p) {
        // sw bypass
        p = fetch(e.request);
      }
      p.then(y).catch(n);
      break;
    }
  });
  queue = [];
}

self.onmessage = function(e) {
  if (swMod) {
    swMod.onmsg(e);
  } else {
    addQueue([EVENT_MSG, e]);
  }
};

self.onfetch = function(e) {
  let req = e.request;
  let url = req.url;

  console.log('[sw_loader] fetch {mode: %o, url: %o, hdr: %o}',
    req.mode, url, new Map(req.headers)
  );

  // force update
  if (url.endsWith('/--update')) {
    load(true);
    let res = new Response('UPDATED');
    e.respondWith(res);
    return;
  }

  // bypass Mixed-Content (except localhost)
  if (url.startsWith('http:') && !url.startsWith('http://127.0.0.1')) {
    return;
  }

  let ret;

  if (swMod) {
    ret = swMod.onfetch(e);
  } else {
    ret = new Promise((y, n) => {
      addQueue([EVENT_FETCH, e, y, n]);
    });
  }

  if (ret) {
    e.respondWith(ret);
  }
};

self.onactivate = function(e) {
  console.log('[sw_loader] onactivate');
};

self.oninstall = function(e) {
  console.log('[sw_loader] oninstall');
  skipWaiting();
};

function run(code) {
  let exports = {};

  let fn = Function('exports', code);
  fn(exports);

  if (swMod) {
    swMod.onterm();
  }
  swMod = exports;
  swMod.oninit();

  flushQueue();
}

function extractSwMain(code) {
  let m = code.match(/\;{3}.+?\;{3}/);
  return m && m[0]
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

async function load(isUpdate) {
  let oldJs;
  let cache = await caches.open('v1');
  let req = new Request('/sw_main');
  let res = await cache.match(req);

  if (res) {
    oldJs = await res.text();
  } else {
    // if cache missing, we use the default
    // module which defined in boot.js
    oldJs = SW_MAIN;
  }

  // init
  if (!isUpdate) {
    run(oldJs);
    return;
  }

  // fetch latest version
  let url = location.href;
  if (isUpdate) {
    url += '?_=' + Date.now();
  }
  res = await fetch(url);

  // cache & run if sw_main modified
  let newJs = await res.text();
  let newSw = extractSwMain(newJs);
  console.assert(newSw);

  if (newSw !== SW_MAIN) {
    cache.put(req, new Response(newSw));
    run(newSw);
    console.log('[sw_loader] sw_main updated');
  } else {
    console.log('[sw_loader] sw_main no updated');
  }
}

load();