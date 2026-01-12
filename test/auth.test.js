const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function setup() {
  let NodeCtor;
  let sent;
  class TelegramClientStub {
    constructor(session, id, hash, opts) {
      this.session = { save: () => 'sess-string' };
    }
    start() { return Promise.resolve(); }
    disconnect() { return Promise.resolve(); }
  }
  class StringSessionStub { constructor(str) {} }

  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
        node.send = (msg) => { sent = msg; };
        node.status = () => {};
        node.log = () => {};
        node.error = () => {};
        node.context = () => ({ flow: { set() {}, get() {} } });
      },
      registerType(name, ctor) { NodeCtor = ctor; }
    }
  };

  proxyquire('../nodes/auth.js', {
    teleproto: { TelegramClient: TelegramClientStub },
    'teleproto/sessions': { StringSession: StringSessionStub }
  })(RED);

  return { NodeCtor, getSent: () => sent };
}

describe('auth node', function() {
  it('emits stringSession on successful auth', async function() {
    const { NodeCtor, getSent } = setup();
    const node = new NodeCtor({ api_id: 1, api_hash: 'hash', phoneNumber: '123' });
    await node._events['input']({ payload: {} });
    const out = getSent();
    assert.strictEqual(out.stringSession, 'sess-string');
    assert.strictEqual(out.payload.stringSession, 'sess-string');
  });
});
