const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const addCalls = [];
  const logs = [];
  class TelegramClientStub {
    addEventHandler(fn, event) { addCalls.push({fn, event}); }
    removeEventHandler() {}
  }
  class NewMessageStub {}

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

  proxyquire('../nodes/command.js', {
    'telegram/events': { NewMessage: NewMessageStub }
  })(RED);

  return { NodeCtor, addCalls, logs };
}

describe('Debug option', function() {
  it('logs update and output when enabled', function() {
    const { NodeCtor, addCalls, logs } = load();
    const node = new NodeCtor({config:'c', command:'cmd', regex:false, debug:true});
    const handler = addCalls[0].fn;
    handler({ message: { message:'cmd', fromId:{userId:1} } });
    assert(logs.some(l => l.includes('command update')));
    assert(logs.some(l => l.includes('command output')));
  });
});
