const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const addCalls = [];
  const logs = [];
  class TelegramClientStub {
    addEventHandler(fn, event) { addCalls.push({fn, event}); }
    removeEventHandler() {}
  }
  class RawStub {}

  let NodeCtor;
  const configNode = { client: new TelegramClientStub() };
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
        node.log = (msg) => logs.push(msg);
        node.send = () => {};
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return configNode; }
    }
  };

  proxyquire('../nodes/receiver.js', {
    'telegram/events': { Raw: RawStub }
  })(RED);

  return { NodeCtor, addCalls, logs };
}

describe('Receiver node debug with BigInt', function() {
  it('logs update and output without throwing', function() {
    const { NodeCtor, addCalls, logs } = load();
    const node = new NodeCtor({config:'c', ignore:'', debug:true});
    const handler = addCalls[0].fn;
    assert.doesNotThrow(() => handler({
      className: 'UpdateNewMessage',
      message: { fromId:{userId:1n}, peerId:{userId:1n}, message:'hi' }
    }));
    assert(logs.some(l => l.includes('receiver raw update')));
    assert(logs.some(l => l.includes('receiver output')));
  });
});
