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
const MigrationHandler_1 = require("@joplin/lib/services/synchronizer/MigrationHandler");
const types_1 = require("@joplin/lib/services/synchronizer/utils/types");
// To create a sync target snapshot for the current syncVersion:
// - In test-utils, set syncTargetName_ to "filesystem"
// - Then run:
// gulp buildTests -L && node tests-build/support/createSyncTargetSnapshot.js normal && node tests-build/support/createSyncTargetSnapshot.js e2ee
const { setSyncTargetName, fileApi, synchronizer, decryptionWorker, encryptionService, setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('./test-utils.js');
const { deploySyncTargetSnapshot, testData, checkTestData } = require('./support/syncTargetUtils');
const Setting_1 = require("@joplin/lib/models/Setting");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
const specTimeout = 60000 * 10; // Nextcloud tests can be slow
let lockHandler_ = null;
let migrationHandler_ = null;
function lockHandler() {
    if (lockHandler_)
        return lockHandler_;
    lockHandler_ = new LockHandler_1.default(fileApi());
    return lockHandler_;
}
function migrationHandler(clientId = 'abcd') {
    if (migrationHandler_)
        return migrationHandler_;
    migrationHandler_ = new MigrationHandler_1.default(fileApi(), lockHandler(), 'desktop', clientId);
    return migrationHandler_;
}
const migrationTests = {
    2: function () {
        return __awaiter(this, void 0, void 0, function* () {
            const items = (yield fileApi().list('', { includeHidden: true })).items;
            expect(items.filter((i) => i.path === '.resource' && i.isDir).length).toBe(1);
            expect(items.filter((i) => i.path === 'locks' && i.isDir).length).toBe(1);
            expect(items.filter((i) => i.path === 'temp' && i.isDir).length).toBe(1);
            expect(items.filter((i) => i.path === 'info.json' && !i.isDir).length).toBe(1);
            const versionForOldClients = yield fileApi().get('.sync/version.txt');
            expect(versionForOldClients).toBe('2');
        });
    },
};
let previousSyncTargetName = '';
describe('synchronizer_MigrationHandler', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        // Note that, for undocumented reasons, the timeout argument passed
        // to `test()` (or `it()`) is ignored if it is higher than the
        // global Jest timeout. So we need to set it globally.
        //
        // https://github.com/facebook/jest/issues/5055#issuecomment-513585906
        jest.setTimeout(specTimeout);
        // To test the migrations, we have to use the filesystem sync target
        // because the sync target snapshots are plain files. Eventually
        // it should be possible to copy a filesystem target to memory
        // but for now that will do.
        previousSyncTargetName = setSyncTargetName('filesystem');
        lockHandler_ = null;
        migrationHandler_ = null;
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
    }));
    afterEach((done) => __awaiter(this, void 0, void 0, function* () {
        setSyncTargetName(previousSyncTargetName);
        done();
    }));
    it('should init a new sync target', (() => __awaiter(this, void 0, void 0, function* () {
        // Check that basic folders "locks" and "temp" are created for new sync targets.
        yield migrationHandler().upgrade(1);
        const result = yield fileApi().list();
        expect(result.items.filter((i) => i.path === types_1.Dirnames.Locks).length).toBe(1);
        expect(result.items.filter((i) => i.path === types_1.Dirnames.Temp).length).toBe(1);
    })), specTimeout);
    it('should not allow syncing if the sync target is out-dated', (() => __awaiter(this, void 0, void 0, function* () {
        yield synchronizer().start();
        yield fileApi().put('info.json', `{"version":${Setting_1.default.value('syncVersion') - 1}}`);
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield migrationHandler().checkCanSync(); }), 'outdatedSyncTarget');
    })), specTimeout);
    it('should not allow syncing if the client is out-dated', (() => __awaiter(this, void 0, void 0, function* () {
        yield synchronizer().start();
        yield fileApi().put('info.json', `{"version":${Setting_1.default.value('syncVersion') + 1}}`);
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield migrationHandler().checkCanSync(); }), 'outdatedClient');
    })), specTimeout);
    for (const migrationVersionString in migrationTests) {
        const migrationVersion = Number(migrationVersionString);
        it(`should migrate (${migrationVersion})`, (() => __awaiter(this, void 0, void 0, function* () {
            yield deploySyncTargetSnapshot('normal', migrationVersion - 1);
            const info = yield migrationHandler().fetchSyncTargetInfo();
            expect(info.version).toBe(migrationVersion - 1);
            // Now, migrate to the new version
            yield migrationHandler().upgrade(migrationVersion);
            // Verify that it has been upgraded
            const newInfo = yield migrationHandler().fetchSyncTargetInfo();
            expect(newInfo.version).toBe(migrationVersion);
            yield migrationTests[migrationVersion]();
            // Now sync with that upgraded target
            yield synchronizer().start();
            // Check that the data has not been altered
            yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield checkTestData(testData); }));
            // Check what happens if we switch to a different client and sync
            yield switchClient(2);
            Setting_1.default.setConstant('syncVersion', migrationVersion);
            yield synchronizer().start();
            yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield checkTestData(testData); }));
        })), specTimeout);
        it(`should migrate (E2EE) (${migrationVersion})`, (() => __awaiter(this, void 0, void 0, function* () {
            // First create some test data that will be used to validate
            // that the migration didn't alter any data.
            yield deploySyncTargetSnapshot('e2ee', migrationVersion - 1);
            // Now, migrate to the new version
            Setting_1.default.setConstant('syncVersion', migrationVersion);
            yield migrationHandler().upgrade(migrationVersion);
            // Verify that it has been upgraded
            const newInfo = yield migrationHandler().fetchSyncTargetInfo();
            expect(newInfo.version).toBe(migrationVersion);
            yield migrationTests[migrationVersion]();
            // Now sync with that upgraded target
            yield synchronizer().start();
            // Decrypt the data
            const masterKey = (yield MasterKey_1.default.all())[0];
            Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
            yield encryptionService().loadMasterKeysFromSettings();
            yield decryptionWorker().start();
            // Check that the data has not been altered
            yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield checkTestData(testData); }));
            // Check what happens if we switch to a different client and sync
            yield switchClient(2);
            Setting_1.default.setConstant('syncVersion', migrationVersion);
            yield synchronizer().start();
            // Should throw because data hasn't been decrypted yet
            yield expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield checkTestData(testData); }));
            // Enable E2EE and decrypt
            Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
            yield encryptionService().loadMasterKeysFromSettings();
            yield decryptionWorker().start();
            // Should not throw because data is decrypted
            yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield checkTestData(testData); }));
        })), specTimeout);
    }
});
//# sourceMappingURL=synchronizer_MigrationHandler.js.map