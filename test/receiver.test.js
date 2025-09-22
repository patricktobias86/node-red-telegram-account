const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const addCalls = [];
  const removeCalls = [];
  class TelegramClientStub {
    addEventHandler(fn, event) { addCalls.push({fn, event}); }
    removeEventHandler(fn, event) { removeCalls.push({fn, event}); }
  }
  class NewMessageStub {}

  let NodeCtor;
  const configNode = { client: new TelegramClientStub() };
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return configNode; }
    }
  };

  proxyquire('../nodes/receiver.js', {
    'telegram/events': { NewMessage: NewMessageStub }
  })(RED);

  return { NodeCtor, addCalls, removeCalls };
}

describe('Receiver node', function() {
  it('removes event handler on close', function() {
    const { NodeCtor, addCalls, removeCalls } = load();
    const node = new NodeCtor({config:'c', ignore:''});
    assert.strictEqual(addCalls.length, 1);
    node._events.close();
    assert.strictEqual(removeCalls.length, 1);
    assert.strictEqual(removeCalls[0].fn, addCalls[0].fn);
    assert.strictEqual(removeCalls[0].event, addCalls[0].event);
  });

  it('skips media updates when size exceeds threshold', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'5'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({ message: { fromId: { userId: 123 }, media: { document: { size: 6 * 1024 * 1024 } } } });

    assert.strictEqual(sent.length, 0);
  });

  it('delivers media updates when size is below threshold', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'5'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({ message: { fromId: { userId: 123 }, media: { document: { size: 3 * 1024 * 1024 } } } });

    assert.strictEqual(sent.length, 1);
  });

  it('skips updates when media type is ignored', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'video\ndocument', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({ message: { fromId: { userId: 123 }, media: { document: { mimeType: 'video/mp4', attributes: [{ className: 'DocumentAttributeVideo' }] } } } });

    assert.strictEqual(sent.length, 0);
  });

  it('delivers updates when media type is not ignored', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'voice', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({ message: { fromId: { userId: 123 }, media: { document: { mimeType: 'video/mp4', attributes: [{ className: 'DocumentAttributeVideo' }] } } } });

    assert.strictEqual(sent.length, 1);
  });
});
