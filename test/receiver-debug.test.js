const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const addCalls = [];
  const logs = [];
  const sends = [];
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
        node.send = (msg) => sends.push(msg);
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return configNode; }
    }
  };

  proxyquire('../nodes/receiver.js', {
    'telegram/events': { Raw: RawStub }
  })(RED);

  return { NodeCtor, addCalls, logs, sends };
}

describe('Receiver node debug with BigInt', function() {
  it('logs update and output without throwing', function() {
    const { NodeCtor, addCalls, logs, sends } = load();
    const node = new NodeCtor({config:'c', ignore:'', debug:true});
    const handler = addCalls[0].fn;
    assert.doesNotThrow(() => handler({
      className: 'UpdateNewMessage',
      message: { fromId:{userId:1n}, peerId:{userId:1n}, message:'hi' }
    }));
    assert(logs.some(l => l.includes('receiver raw update')));
    assert(logs.some(l => l.includes('receiver output')));
    assert(sends.some((msg) => Array.isArray(msg) && msg.length === 2));
    assert(sends.some((msg) => Array.isArray(msg) && msg[1] && msg[1].payload && msg[1].payload.event === 'rawUpdate'));
    assert(sends.some((msg) => Array.isArray(msg) && msg[1] && msg[1].payload && msg[1].payload.event === 'output'));
  });
});
