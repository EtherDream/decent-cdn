document.addEventListener('DOMContentLoaded', function() {
  function update() {
    txt.value = new Date().toLocaleTimeString();
  }
  setInterval(update, 1000);
  update();
});