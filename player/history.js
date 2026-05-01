const _history = [];

function push(item) {
  _history.push({ title: item.title, url: item.url });
  if (_history.length > 50) _history.shift();
}

// Removes current (last) and returns the one before it, also removed so re-push works correctly.
function popForPrev() {
  _history.pop();
  return _history.pop() || null;
}

module.exports = { push, popForPrev };
