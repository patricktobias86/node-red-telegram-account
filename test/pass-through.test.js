const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function setup() {
  let NodeCtor;
  let sent;
  const configNode = { client: {} };
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
        node.send = (msg) => { sent = msg; };
        node.log = () => {};
        node.error = () => {};
      },
      registerType(name, ctor) { NodeCtor = ctor; },
      getNode() { return configNode; }
    }
  };

  proxyquire('../nodes/send-message.js', {
    teleproto: { TelegramClient: function() {} },
    'teleproto/Utils': { parseID: () => ({}) }
  })(RED);

  return { NodeCtor, getSent: () => sent };
}

describe('message property relay', function() {
  it('keeps non-payload properties on send-message output', async function() {
    const { NodeCtor, getSent } = setup();
    const node = new NodeCtor({ config: 'c', file: "" });
    const client = { sendMessage: async () => 'ok' };
    const msg = { foo: 'bar', payload: { client, chatId: 'me', message: 'hi' } };
    await node._events['input'](msg);
    const out = getSent();
    assert.strictEqual(out.foo, 'bar');
    assert.deepStrictEqual(out.payload.response, 'ok');
  });
});
