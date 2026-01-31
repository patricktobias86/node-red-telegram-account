const assert = require('assert');
const proxyquire = require('proxyquire').noPreserveCache();

function load() {
  const addCalls = [];
  const removeCalls = [];
  class TelegramClientStub {
    addEventHandler(fn, event) { addCalls.push({fn, event}); }
    removeEventHandler(fn, event) { removeCalls.push({fn, event}); }
  }
  class RawStub {}

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
    'teleproto/events': { Raw: RawStub }
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

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 123 }, media: { document: { size: 6 * 1024 * 1024 } } }
    });

    assert.strictEqual(sent.length, 0);
  });

  it('delivers media updates when size is below threshold', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'5'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 123 }, media: { document: { size: 3 * 1024 * 1024 } } }
    });

    assert.strictEqual(sent.length, 1);
  });

  it('skips updates when media type is ignored', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'video\ndocument', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 123 }, media: { document: { mimeType: 'video/mp4', attributes: [{ className: 'DocumentAttributeVideo' }] } } }
    });

    assert.strictEqual(sent.length, 0);
  });

  it('delivers updates when media type is not ignored', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'voice', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 123 }, media: { document: { mimeType: 'video/mp4', attributes: [{ className: 'DocumentAttributeVideo' }] } } }
    });

    assert.strictEqual(sent.length, 1);
  });

  it('filters by includeChats', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'', includeChats:'111'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 111 }, message: 'allowed' }
    });
    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 222 }, message: 'blocked' }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.chatId, 111);
    assert.strictEqual(sent[0].payload.message.message, 'allowed');
  });

  it('filters by excludeChats', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'', excludeChats:'222'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 111 }, message: 'allowed' }
    });
    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 222 }, message: 'blocked' }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.chatId, 111);
  });

  it('filters by includeSenders', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'', includeSenders:'123'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 111 }, message: 'allowed' }
    });
    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 456 }, peerId:{ userId: 111 }, message: 'blocked' }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.senderId, 123);
  });

  it('filters by excludeSenders', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'', excludeSenders:'456'});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 123 }, peerId:{ userId: 111 }, message: 'allowed' }
    });
    handler({
      className: 'UpdateNewMessage',
      message: { fromId: { userId: 456 }, peerId:{ userId: 111 }, message: 'blocked' }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.senderId, 123);
  });

  it('populates chatId and senderId for string ids', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewChannelMessage',
      message: {
        fromId: { userId: '6304354944', className: 'PeerUser' },
        peerId: { channelId: '2877134366', className: 'PeerChannel' },
        message: 'hello'
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.chatId, 2877134366);
    assert.strictEqual(sent[0].payload.senderId, 6304354944);
  });

  it('populates chatId and senderId for Integer wrappers', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewChannelMessage',
      message: {
        fromId: { userId: { value: 6304354944n }, className: 'PeerUser' },
        peerId: { channelId: { value: 2877134366n }, className: 'PeerChannel' },
        message: 'hello'
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.chatId, 2877134366);
    assert.strictEqual(sent[0].payload.senderId, 6304354944);
  });

  it('handles UpdateNewScheduledMessage updates', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateNewScheduledMessage',
      message: {
        id: 456,
        fromId: { userId: 789, className: 'PeerUser' },
        peerId: { userId: 789, className: 'PeerUser' },
        message: 'scheduled message',
        date: 1234567890
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.message.message, 'scheduled message');
  });

  it('handles UpdateBotNewBusinessMessage updates', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateBotNewBusinessMessage',
      message: {
        id: 123,
        fromId: { userId: 456, className: 'PeerUser' },
        peerId: { userId: 789, className: 'PeerUser' },
        message: 'business message'
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.message.message, 'business message');
  });

  it('handles UpdateBotEditBusinessMessage updates', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateBotEditBusinessMessage',
      message: {
        id: 123,
        fromId: { userId: 456, className: 'PeerUser' },
        peerId: { userId: 789, className: 'PeerUser' },
        message: 'edited business message'
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.message.message, 'edited business message');
  });

  it('can ignore edited message updates when emitEdits is disabled', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:'', emitEdits:false});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateEditChannelMessage',
      message: {
        id: 171429,
        peerId: { channelId: '1050289360', className: 'PeerChannel' },
        message: 'same content'
      }
    });

    assert.strictEqual(sent.length, 0);
  });

  it('handles UpdateQuickReplyMessage updates', function() {
    const { NodeCtor, addCalls } = load();
    const sent = [];
    const node = new NodeCtor({config:'c', ignore:'', ignoreMessageTypes:'', maxFileSizeMb:''});
    node.send = (msg) => sent.push(msg);
    const handler = addCalls[0].fn;

    handler({
      className: 'UpdateQuickReplyMessage',
      message: {
        id: 999,
        fromId: { userId: 111, className: 'PeerUser' },
        peerId: { userId: 222, className: 'PeerUser' },
        message: 'quick reply'
      }
    });

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].payload.message.message, 'quick reply');
  });
});
