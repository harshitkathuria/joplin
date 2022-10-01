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
const Setting_1 = require("@joplin/lib/models/Setting");
const test_utils_1 = require("./test-utils");
const fs = require("fs-extra");
const Logger_1 = require("@joplin/lib/Logger");
function loadSettingsFromFile() {
    return __awaiter(this, void 0, void 0, function* () {
        return JSON.parse(yield fs.readFile(Setting_1.default.settingFilePath, 'utf8'));
    });
}
describe('models_Setting', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.setupDatabaseAndSynchronizer(1);
        yield test_utils_1.switchClient(1);
        done();
    }));
    it('should return only sub-values', (() => __awaiter(this, void 0, void 0, function* () {
        const settings = {
            'sync.5.path': 'http://example.com',
            'sync.5.username': 'testing',
        };
        let output = Setting_1.default.subValues('sync.5', settings);
        expect(output['path']).toBe('http://example.com');
        expect(output['username']).toBe('testing');
        output = Setting_1.default.subValues('sync.4', settings);
        expect('path' in output).toBe(false);
        expect('username' in output).toBe(false);
    })));
    it('should allow registering new settings dynamically', (() => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return Setting_1.default.setValue('myCustom', '123'); }));
        yield Setting_1.default.registerSetting('myCustom', {
            public: true,
            value: 'default',
            type: Setting_1.default.TYPE_STRING,
        });
        yield test_utils_1.expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return Setting_1.default.setValue('myCustom', '123'); }));
        expect(Setting_1.default.value('myCustom')).toBe('123');
    })));
    it('should not clear old custom settings', (() => __awaiter(this, void 0, void 0, function* () {
        // In general the following should work:
        //
        // - Plugin register a new setting
        // - User set new value for setting
        // - Settings are saved
        // - => App restart
        // - Plugin does not register setting again
        // - Settings are loaded
        // - Settings are saved
        // - Plugin register setting again
        // - Previous value set by user should still be there.
        //
        // In other words, once a custom setting has been set we don't clear it
        // even if registration doesn't happen immediately. That allows for example
        // to delay setting registration without a risk for the custom setting to be deleted.
        yield Setting_1.default.registerSetting('myCustom', {
            public: true,
            value: 'default',
            type: Setting_1.default.TYPE_STRING,
        });
        Setting_1.default.setValue('myCustom', '123');
        yield Setting_1.default.saveAll();
        yield Setting_1.default.reset();
        yield Setting_1.default.load();
        yield Setting_1.default.registerSetting('myCustom', {
            public: true,
            value: 'default',
            type: Setting_1.default.TYPE_STRING,
        });
        yield Setting_1.default.saveAll();
        expect(Setting_1.default.value('myCustom')).toBe('123');
    })));
    it('should return values with correct type for custom settings', (() => __awaiter(this, void 0, void 0, function* () {
        yield Setting_1.default.registerSetting('myCustom', {
            public: true,
            value: 123,
            type: Setting_1.default.TYPE_INT,
        });
        Setting_1.default.setValue('myCustom', 456);
        yield Setting_1.default.saveAll();
        yield Setting_1.default.reset();
        yield Setting_1.default.load();
        yield Setting_1.default.registerSetting('myCustom', {
            public: true,
            value: 123,
            type: Setting_1.default.TYPE_INT,
        });
        expect(typeof Setting_1.default.value('myCustom')).toBe('number');
        expect(Setting_1.default.value('myCustom')).toBe(456);
    })));
    it('should validate registered keys', (() => __awaiter(this, void 0, void 0, function* () {
        const md = {
            public: true,
            value: 'default',
            type: Setting_1.default.TYPE_STRING,
        };
        yield test_utils_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('', md); }));
        yield test_utils_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('no spaces', md); }));
        yield test_utils_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('nospecialcharacters!!!', md); }));
        yield test_utils_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('Robert\'); DROP TABLE Students;--', md); }));
        yield test_utils_1.expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('numbersareok123', md); }));
        yield test_utils_1.expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return yield Setting_1.default.registerSetting('so-ARE-dashes_123', md); }));
    })));
    it('should register new sections', (() => __awaiter(this, void 0, void 0, function* () {
        yield Setting_1.default.registerSection('mySection', Setting_1.SettingSectionSource.Default, {
            label: 'My section',
        });
        expect(Setting_1.default.sectionNameToLabel('mySection')).toBe('My section');
    })));
    it('should save and load settings from file', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('sync.target', 9); // Saved to file
        Setting_1.default.setValue('encryption.passwordCache', {}); // Saved to keychain or db
        Setting_1.default.setValue('plugins.states', { test: true }); // Always saved to db
        yield Setting_1.default.saveAll();
        {
            const settings = yield loadSettingsFromFile();
            expect(settings['sync.target']).toBe(9);
            expect(settings).not.toContain('encryption.passwordCache');
            expect(settings).not.toContain('plugins.states');
        }
        Setting_1.default.setValue('sync.target', 8);
        yield Setting_1.default.saveAll();
        {
            const settings = yield loadSettingsFromFile();
            expect(settings['sync.target']).toBe(8);
        }
    })));
    it('should not save to file if nothing has changed', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('sync.target', 9);
        yield Setting_1.default.saveAll();
        {
            // Double-check that timestamp is indeed changed when the content is
            // changed.
            const beforeStat = yield fs.stat(Setting_1.default.settingFilePath);
            yield test_utils_1.msleep(1001);
            Setting_1.default.setValue('sync.target', 8);
            yield Setting_1.default.saveAll();
            const afterStat = yield fs.stat(Setting_1.default.settingFilePath);
            expect(afterStat.mtime.getTime()).toBeGreaterThan(beforeStat.mtime.getTime());
        }
        {
            const beforeStat = yield fs.stat(Setting_1.default.settingFilePath);
            yield test_utils_1.msleep(1001);
            Setting_1.default.setValue('sync.target', 8);
            const afterStat = yield fs.stat(Setting_1.default.settingFilePath);
            yield Setting_1.default.saveAll();
            expect(afterStat.mtime.getTime()).toBe(beforeStat.mtime.getTime());
        }
    })));
    it('should handle invalid JSON', (() => __awaiter(this, void 0, void 0, function* () {
        const badContent = '{ oopsIforgotTheQuotes: true}';
        yield fs.writeFile(Setting_1.default.settingFilePath, badContent, 'utf8');
        yield Setting_1.default.reset();
        Logger_1.default.globalLogger.enabled = false;
        yield Setting_1.default.load();
        Logger_1.default.globalLogger.enabled = true;
        // Invalid JSON file has been moved to .bak file
        expect(yield fs.pathExists(Setting_1.default.settingFilePath)).toBe(false);
        const files = yield fs.readdir(Setting_1.default.value('profileDir'));
        expect(files.length).toBe(1);
        expect(files[0].endsWith('.bak')).toBe(true);
        expect(yield fs.readFile(`${Setting_1.default.value('profileDir')}/${files[0]}`, 'utf8')).toBe(badContent);
    })));
});
//# sourceMappingURL=models_Setting.js.map