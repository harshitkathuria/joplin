"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const LockHandler_1 = require("@joplin/lib/services/synchronizer/LockHandler");
const { isNetworkSyncTarget, fileApi, setupDatabaseAndSynchronizer, synchronizer, switchClient, msleep, expectThrow, expectNotThrow } = require('./test-utils.js');
// For tests with memory of file system we can use low intervals to make the tests faster.
// However if we use such low values with network sync targets, some calls might randomly fail with
// ECONNRESET and similar errors (Dropbox or OneDrive migth also throttle). Also we can't use a
// low lock TTL value because the lock might expire between the time it's written and the time it's checked.
// For that reason we add this multiplier for non-memory sync targets.
const timeoutMultipler = isNetworkSyncTarget() ? 100 : 1;
let lockHandler_ = null;
function newLockHandler(options = null) {
    return new LockHandler_1.default(fileApi(), options);
}
function lockHandler() {
    if (lockHandler_)
        return lockHandler_;
    lockHandler_ = new LockHandler_1.default(fileApi());
    return lockHandler_;
}
describe('synchronizer_LockHandler', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        // logger.setLevel(Logger.LEVEL_WARN);
        lockHandler_ = null;
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        yield synchronizer().start(); // Need to sync once to setup the sync target and allow locks to work
        // logger.setLevel(Logger.LEVEL_DEBUG);
        done();
    }));
    it('should acquire and release a sync lock', (() => __awaiter(this, void 0, void 0, function* () {
        yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '123456');
        const locks = yield lockHandler().locks(LockHandler_1.LockType.Sync);
        expect(locks.length).toBe(1);
        expect(locks[0].type).toBe(LockHandler_1.LockType.Sync);
        expect(locks[0].clientId).toBe('123456');
        expect(locks[0].clientType).toBe('mobile');
        yield lockHandler().releaseLock(LockHandler_1.LockType.Sync, 'mobile', '123456');
        expect((yield lockHandler().locks(LockHandler_1.LockType.Sync)).length).toBe(0);
    })));
    it('should not use files that are not locks', (() => __awaiter(this, void 0, void 0, function* () {
        yield fileApi().put('locks/desktop.ini', 'a');
        yield fileApi().put('locks/exclusive.json', 'a');
        yield fileApi().put('locks/garbage.json', 'a');
        yield fileApi().put('locks/sync_mobile_72c4d1b7253a4475bfb2f977117d26ed.json', 'a');
        const locks = yield lockHandler().locks(LockHandler_1.LockType.Sync);
        expect(locks.length).toBe(1);
    })));
    it('should allow multiple sync locks', (() => __awaiter(this, void 0, void 0, function* () {
        yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
        yield switchClient(2);
        yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
        expect((yield lockHandler().locks(LockHandler_1.LockType.Sync)).length).toBe(2);
        {
            yield lockHandler().releaseLock(LockHandler_1.LockType.Sync, 'mobile', '222');
            const locks = yield lockHandler().locks(LockHandler_1.LockType.Sync);
            expect(locks.length).toBe(1);
            expect(locks[0].clientId).toBe('111');
        }
    })));
    it('should auto-refresh a lock', (() => __awaiter(this, void 0, void 0, function* () {
        const handler = newLockHandler({ autoRefreshInterval: 100 * timeoutMultipler });
        const lock = yield handler.acquireLock(LockHandler_1.LockType.Sync, 'desktop', '111');
        const lockBefore = yield handler.activeLock(LockHandler_1.LockType.Sync, 'desktop', '111');
        handler.startAutoLockRefresh(lock, () => { });
        yield msleep(500 * timeoutMultipler);
        const lockAfter = yield handler.activeLock(LockHandler_1.LockType.Sync, 'desktop', '111');
        expect(lockAfter.updatedTime).toBeGreaterThan(lockBefore.updatedTime);
        handler.stopAutoLockRefresh(lock);
    })));
    it('should call the error handler when lock has expired while being auto-refreshed', (() => __awaiter(this, void 0, void 0, function* () {
        const handler = newLockHandler({
            lockTtl: 50 * timeoutMultipler,
            autoRefreshInterval: 200 * timeoutMultipler,
        });
        const lock = yield handler.acquireLock(LockHandler_1.LockType.Sync, 'desktop', '111');
        let autoLockError = null;
        handler.startAutoLockRefresh(lock, (error) => {
            autoLockError = error;
        });
        yield msleep(250 * timeoutMultipler);
        expect(autoLockError.code).toBe('lockExpired');
        handler.stopAutoLockRefresh(lock);
    })));
    it('should not allow sync locks if there is an exclusive lock', (() => __awaiter(this, void 0, void 0, function* () {
        yield lockHandler().acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '111');
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () {
            yield lockHandler().acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
        }), 'hasExclusiveLock');
    })));
    it('should not allow exclusive lock if there are sync locks', (() => __awaiter(this, void 0, void 0, function* () {
        const lockHandler = newLockHandler({ lockTtl: 1000 * 60 * 60 });
        yield lockHandler.acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
        yield lockHandler.acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () {
            yield lockHandler.acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '333');
        }), 'hasSyncLock');
    })));
    it('should allow exclusive lock if the sync locks have expired', (() => __awaiter(this, void 0, void 0, function* () {
        const lockHandler = newLockHandler({ lockTtl: 500 * timeoutMultipler });
        yield lockHandler.acquireLock(LockHandler_1.LockType.Sync, 'mobile', '111');
        yield lockHandler.acquireLock(LockHandler_1.LockType.Sync, 'mobile', '222');
        yield msleep(600 * timeoutMultipler);
        yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () {
            yield lockHandler.acquireLock(LockHandler_1.LockType.Exclusive, 'desktop', '333');
        }));
    })));
    it('should decide what is the active exclusive lock', (() => __awaiter(this, void 0, void 0, function* () {
        const lockHandler = newLockHandler();
        {
            const lock1 = { type: LockHandler_1.LockType.Exclusive, clientId: '1', clientType: 'd' };
            const lock2 = { type: LockHandler_1.LockType.Exclusive, clientId: '2', clientType: 'd' };
            yield lockHandler.saveLock_(lock1);
            yield msleep(100);
            yield lockHandler.saveLock_(lock2);
            const activeLock = yield lockHandler.activeLock(LockHandler_1.LockType.Exclusive);
            expect(activeLock.clientId).toBe('1');
        }
    })));
    // it('should not have race conditions', (async () => {
    // 	const lockHandler = newLockHandler();
    // 	const clients = [];
    // 	for (let i = 0; i < 20; i++) {
    // 		clients.push({
    // 			id: 'client' + i,
    // 			type: 'desktop',
    // 		});
    // 	}
    // 	for (let loopIndex = 0; loopIndex < 1000; loopIndex++) {
    // 		const promises:Promise<void | Lock>[] = [];
    // 		for (let clientIndex = 0; clientIndex < clients.length; clientIndex++) {
    // 			const client = clients[clientIndex];
    // 			promises.push(
    // 				lockHandler.acquireLock(LockType.Exclusive, client.type, client.id).catch(() => {})
    // 			);
    // 			// if (gotLock) {
    // 			// 	await msleep(100);
    // 			// 	const locks = await lockHandler.locks(LockType.Exclusive);
    // 			// 	console.info('=======================================');
    // 			// 	console.info(locks);
    // 			// 	lockHandler.releaseLock(LockType.Exclusive, client.type, client.id);
    // 			// }
    // 			// await msleep(500);
    // 		}
    // 		const result = await Promise.all(promises);
    // 		const locks = result.filter((lock:any) => !!lock);
    // 		expect(locks.length).toBe(1);
    // 		const lock:Lock = locks[0] as Lock;
    // 		const allLocks = await lockHandler.locks();
    // 		console.info('================================', allLocks);
    // 		lockHandler.releaseLock(LockType.Exclusive, lock.clientType, lock.clientId);
    // 	}
    // }));
});
//# sourceMappingURL=synchronizer_LockHandler.js.map