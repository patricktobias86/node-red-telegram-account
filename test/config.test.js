const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const instances = [];
  class TelegramClientStub {
    constructor(session, id, hash, opts) {
      this.session = session;
      this.id = id;
      this.hash = hash;
      this.opts = opts;
      instances.push(this);
    }
    connect() { return Promise.resolve(); }
    isUserAuthorized() { return Promise.resolve(true); }
    disconnect() { return Promise.resolve(); }
  }
  class StringSessionStub {
    constructor(str) { this.str = str; }
  }

  let NodeCtor;
  const RED = {
    nodes: {
      createNode(node) {
        node._events = {};
        node.on = (e, fn) => { node._events[e] = fn; };
        node.status = () => {};
      },
      registerType(name, ctor) { NodeCtor = ctor; }
    }
  };

  proxyquire('../nodes/config.js', {
    teleproto: { TelegramClient: TelegramClientStub },
    'teleproto/sessions': { StringSession: StringSessionStub }
  })(RED);

  return { NodeCtor, instances };
}

describe('TelegramClientConfig', function() {
  it('creates only one client for identical sessions', async function() {
    const { NodeCtor, instances } = load();
    const cfg = { session: 'sess', api_id: 1, api_hash: 'hash' };
    const a = new NodeCtor(cfg);
    const b = new NodeCtor(cfg);
    assert.strictEqual(instances.length, 1);
    assert.strictEqual(a.client, b.client);
  });

  it('reuses session after node redeploy', async function() {
    const { NodeCtor, instances } = load();
    const cfg = { session: 'sess', api_id: 1, api_hash: 'hash' };
    const a = new NodeCtor(cfg);
    const b = new NodeCtor(cfg);
    await a._events.close();
    const c = new NodeCtor(cfg);
    assert.strictEqual(instances.length, 1);
    assert.strictEqual(b.client, c.client);
  });
});
