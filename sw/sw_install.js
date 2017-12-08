/* run in page */

function reload() {
  var curr = +new Date;
  var last;
  try {
    last = +sessionStorage._ts || 0;
  } catch (err) {
    last = curr;
  }

  if (curr - last < 100) {
    show('waiting...');
    setTimeout(reload, 5000);
    return;
  }

  try {
    sessionStorage._ts = curr;
  } catch (err) {
  }
  location.reload();
}

function show(s) {
  var node = document.body || document.documentElement;
  node.innerHTML = s;
}

function unsupport() {
  show('Please use the latest Chrome');
}

function onfail(err) {
  show(err);
}

function main() {
  var sw = navigator.serviceWorker;
  if (!sw) {
    return unsupport();
  }

  var asynFlag;
  try {
    asynFlag = eval('async _=>_');
  } catch(err) {
  }

  var streamFlag = self.ReadableStream;
  //...

  if (!asynFlag || !streamFlag) {
    unsupport();
    return;
  }

  let url = document.currentScript.src;
  sw
    .register(url)
    .then(reload)
    .catch(onfail);

  sw.onerror = function(err) {
    console.warn('sw err:', err);
  };
}
main();