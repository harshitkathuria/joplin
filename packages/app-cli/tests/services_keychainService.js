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
const KeychainService_1 = require("@joplin/lib/services/keychain/KeychainService");
const shim_1 = require("@joplin/lib/shim");
const Setting_1 = require("@joplin/lib/models/Setting");
const { db, setupDatabaseAndSynchronizer, switchClient } = require('./test-utils.js');
function describeIfCompatible(name, fn, elseFn) {
    if (['win32', 'darwin'].includes(shim_1.default.platformName())) {
        return describe(name, fn);
    }
    else {
        elseFn();
    }
}
describeIfCompatible('services_KeychainService', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1, { keychainEnabled: true });
        yield switchClient(1, { keychainEnabled: true });
        yield Setting_1.default.deleteKeychainPasswords();
        done();
    }));
    afterEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield Setting_1.default.deleteKeychainPasswords();
        done();
    }));
    it('should be enabled on macOS and Windows', (() => __awaiter(this, void 0, void 0, function* () {
        expect(Setting_1.default.value('keychain.supported')).toBe(1);
    })));
    it('should set, get and delete passwords', (() => __awaiter(this, void 0, void 0, function* () {
        const service = KeychainService_1.default.instance();
        const isSet = yield service.setPassword('zz_testunit', 'password');
        expect(isSet).toBe(true);
        const password = yield service.password('zz_testunit');
        expect(password).toBe('password');
        yield service.deletePassword('zz_testunit');
        expect(yield service.password('zz_testunit')).toBe(null);
    })));
    it('should save and load secure settings', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setObjectValue('encryption.passwordCache', 'testing', '123456');
        yield Setting_1.default.saveAll();
        yield Setting_1.default.load();
        const passwords = Setting_1.default.value('encryption.passwordCache');
        expect(passwords.testing).toBe('123456');
    })));
    it('should delete db settings if they have been saved in keychain', (() => __awaiter(this, void 0, void 0, function* () {
        // First save some secure settings and make sure it ends up in the databse
        KeychainService_1.default.instance().enabled = false;
        Setting_1.default.setValue('sync.5.password', 'password');
        yield Setting_1.default.saveAll();
        {
            // Check that it is in the database
            const row = yield db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
            expect(row.value).toBe('password');
        }
        KeychainService_1.default.instance().enabled = true;
        // Change any setting to make sure a save operation is triggered
        Setting_1.default.setValue('sync.5.path', '/tmp');
        // Save the settings - now db secure keys should have been cleared and moved to keychain
        yield Setting_1.default.saveAll();
        {
            // Check that it's been removed from the database
            const row = yield db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
            expect(row).toBe(undefined);
        }
        // However we should still get it via the Setting class, since it will use the keychain
        expect(Setting_1.default.value('sync.5.password')).toBe('password');
        // Now do it again - because there was a bug that would cause the second attempt to save to the db instead
        Setting_1.default.setValue('sync.5.username', 'john');
        yield Setting_1.default.saveAll();
        {
            // Check that it's been removed from the database
            const row = yield db().selectOne('SELECT * FROM settings WHERE key = "sync.5.password"');
            expect(row).toBe(undefined);
        }
    })));
}, () => {
    it('will pass', () => {
        expect(true).toBe(true);
    });
});
//# sourceMappingURL=services_keychainService.js.map