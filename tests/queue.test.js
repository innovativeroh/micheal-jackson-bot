const queue = require('../player/queue');

beforeEach(() => {
  queue.clear();
});

test('isEmpty returns true on empty queue', () => {
  expect(queue.isEmpty()).toBe(true);
});

test('enqueue adds item', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  expect(queue.isEmpty()).toBe(false);
  expect(queue.getAll()).toHaveLength(1);
});

test('dequeue removes and returns first item', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  queue.enqueue({ title: 'Song B', url: 'url-b', requestedBy: 'user2' });
  const item = queue.dequeue();
  expect(item.title).toBe('Song A');
  expect(queue.getAll()).toHaveLength(1);
});

test('dequeue returns undefined on empty queue', () => {
  expect(queue.dequeue()).toBeUndefined();
});

test('clear empties the queue', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  queue.enqueue({ title: 'Song B', url: 'url-b', requestedBy: 'user2' });
  queue.clear();
  expect(queue.isEmpty()).toBe(true);
  expect(queue.getAll()).toHaveLength(0);
});

test('getAll returns copy, not reference', () => {
  queue.enqueue({ title: 'Song A', url: 'url-a', requestedBy: 'user1' });
  const all = queue.getAll();
  all.push({ title: 'Fake', url: 'fake', requestedBy: 'nobody' });
  expect(queue.getAll()).toHaveLength(1);
});

test('maintains FIFO order', () => {
  queue.enqueue({ title: 'First', url: 'url-1', requestedBy: 'u1' });
  queue.enqueue({ title: 'Second', url: 'url-2', requestedBy: 'u2' });
  queue.enqueue({ title: 'Third', url: 'url-3', requestedBy: 'u3' });
  expect(queue.dequeue().title).toBe('First');
  expect(queue.dequeue().title).toBe('Second');
  expect(queue.dequeue().title).toBe('Third');
});
