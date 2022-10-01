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
const { synchronizerStart, setupDatabaseAndSynchronizer, switchClient, encryptionService, loadEncryptionMasterKey } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const Tag_1 = require("@joplin/lib/models/Tag");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
describe('Synchronizer.tags', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
    }));
    function shoudSyncTagTest(withEncryption) {
        return __awaiter(this, void 0, void 0, function* () {
            let masterKey = null;
            if (withEncryption) {
                Setting_1.default.setValue('encryption.enabled', true);
                masterKey = yield loadEncryptionMasterKey();
            }
            yield Folder_1.default.save({ title: 'folder' });
            const n1 = yield Note_1.default.save({ title: 'mynote' });
            const n2 = yield Note_1.default.save({ title: 'mynote2' });
            const tag = yield Tag_1.default.save({ title: 'mytag' });
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            if (withEncryption) {
                const masterKey_2 = yield MasterKey_1.default.load(masterKey.id);
                yield encryptionService().loadMasterKey_(masterKey_2, '123456', true);
                const t = yield Tag_1.default.load(tag.id);
                yield Tag_1.default.decrypt(t);
            }
            const remoteTag = yield Tag_1.default.loadByTitle(tag.title);
            expect(!!remoteTag).toBe(true);
            expect(remoteTag.id).toBe(tag.id);
            yield Tag_1.default.addNote(remoteTag.id, n1.id);
            yield Tag_1.default.addNote(remoteTag.id, n2.id);
            let noteIds = yield Tag_1.default.noteIds(tag.id);
            expect(noteIds.length).toBe(2);
            yield synchronizerStart();
            yield switchClient(1);
            yield synchronizerStart();
            let remoteNoteIds = yield Tag_1.default.noteIds(tag.id);
            expect(remoteNoteIds.length).toBe(2);
            yield Tag_1.default.removeNote(tag.id, n1.id);
            remoteNoteIds = yield Tag_1.default.noteIds(tag.id);
            expect(remoteNoteIds.length).toBe(1);
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            noteIds = yield Tag_1.default.noteIds(tag.id);
            expect(noteIds.length).toBe(1);
            expect(remoteNoteIds[0]).toBe(noteIds[0]);
        });
    }
    it('should sync tags', (() => __awaiter(this, void 0, void 0, function* () {
        yield shoudSyncTagTest(false);
    })));
    it('should sync encrypted tags', (() => __awaiter(this, void 0, void 0, function* () {
        yield shoudSyncTagTest(true);
    })));
});
//# sourceMappingURL=Synchronizer.tags.js.map