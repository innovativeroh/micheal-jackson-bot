const _queue = [];

function enqueue(item) {
  _queue.push(item);
}

function dequeue() {
  return _queue.shift();
}

function clear() {
  _queue.length = 0;
}

function getAll() {
  return [..._queue];
}

function isEmpty() {
  return _queue.length === 0;
}

module.exports = { enqueue, dequeue, clear, getAll, isEmpty };
