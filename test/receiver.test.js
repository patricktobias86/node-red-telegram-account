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
});
