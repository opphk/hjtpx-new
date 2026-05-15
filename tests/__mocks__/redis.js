const mockPing = jest.fn().mockResolvedValue('PONG');
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDel = jest.fn();
const mockExists = jest.fn();
const mockKeys = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockMulti = jest.fn().mockReturnValue({
  get: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([])
});
const mockScan = jest.fn().mockResolvedValue({ cursor: '0', keys: [] });
const mockMGet = jest.fn().mockResolvedValue([]);
const mockZRangeWithScores = jest.fn().mockResolvedValue([]);
const mockZScore = jest.fn().mockResolvedValue(null);
const mockHGetAll = jest.fn().mockResolvedValue({});
const mockHGet = jest.fn().mockResolvedValue(null);
const mockHSet = jest.fn().mockResolvedValue(1);
const mockHIncrBy = jest.fn().mockResolvedValue(1);
const mockSRem = jest.fn().mockResolvedValue(1);
const mockSCard = jest.fn().mockResolvedValue(0);
const mockSMembers = jest.fn().mockResolvedValue([]);
const mockExpire = jest.fn().mockResolvedValue(1);
const mockZIncrBy = jest.fn().mockResolvedValue(1);
const mockZRemRangeByScore = jest.fn().mockResolvedValue(0);
const mockFlushDb = jest.fn().mockResolvedValue('OK');
const mockSetEx = jest.fn().mockResolvedValue('OK');

const client = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
  exists: mockExists,
  keys: mockKeys,
  ping: mockPing,
  connect: mockConnect,
  disconnect: mockDisconnect,
  multi: mockMulti,
  scan: mockScan,
  mGet: mockMGet,
  zRangeWithScores: mockZRangeWithScores,
  zScore: mockZScore,
  hGetAll: mockHGetAll,
  hGet: mockHGet,
  hSet: mockHSet,
  hIncrBy: mockHIncrBy,
  sRem: mockSRem,
  sCard: mockSCard,
  sMembers: mockSMembers,
  expire: mockExpire,
  zIncrBy: mockZIncrBy,
  zRemRangeByScore: mockZRemRangeByScore,
  flushDb: mockFlushDb,
  setEx: mockSetEx,
  isOpen: true,
  on: jest.fn()
};

Object.defineProperty(client, 'isOpen', {
  get: function() { return true; }
});

module.exports = {
  client,
  ping: mockPing,
  get: mockGet,
  set: mockSet,
  del: mockDel,
  exists: mockExists,
  keys: mockKeys,
  connect: mockConnect,
  disconnect: mockDisconnect,
  multi: mockMulti,
  scan: mockScan,
  mGet: mockMGet,
  zRangeWithScores: mockZRangeWithScores,
  zScore: mockZScore,
  hGetAll: mockHGetAll,
  hGet: mockHGet,
  hSet: mockHSet,
  hIncrBy: mockHIncrBy,
  sRem: mockSRem,
  sCard: mockSCard,
  sMembers: mockSMembers,
  expire: mockExpire,
  zIncrBy: mockZIncrBy,
  zRemRangeByScore: mockZRemRangeByScore,
  flushDb: mockFlushDb,
  setEx: mockSetEx
};
