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
const BaseModel_1 = require("@joplin/lib/BaseModel");
const { synchronizerStart, revisionService, setupDatabaseAndSynchronizer, synchronizer, switchClient, encryptionService, loadEncryptionMasterKey, decryptionWorker } = require('./test-utils.js');
const Note_1 = require("@joplin/lib/models/Note");
const Revision_1 = require("@joplin/lib/models/Revision");
describe('Synchronizer.revisions', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
    }));
    it('should not save revisions when updating a note via sync', (() => __awaiter(this, void 0, void 0, function* () {
        // When a note is updated, a revision of the original is created.
        // Here, on client 1, the note is updated for the first time, however since it is
        // via sync, we don't create a revision - that revision has already been created on client
        // 2 and is going to be synced.
        const n1 = yield Note_1.default.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note_1.default.save({ id: n1.id, title: 'mod from client 2' });
        yield revisionService().collectRevisions();
        const allRevs1 = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(allRevs1.length).toBe(1);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        const allRevs2 = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(allRevs2.length).toBe(1);
        expect(allRevs2[0].id).toBe(allRevs1[0].id);
    })));
    it('should not save revisions when deleting a note via sync', (() => __awaiter(this, void 0, void 0, function* () {
        const n1 = yield Note_1.default.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note_1.default.delete(n1.id);
        yield revisionService().collectRevisions(); // REV 1
        {
            const allRevs = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart(); // The local note gets deleted here, however a new rev is *not* created
        {
            const allRevs = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        const notes = yield Note_1.default.all();
        expect(notes.length).toBe(0);
    })));
    it('should not save revisions when an item_change has been generated as a result of a sync', (() => __awaiter(this, void 0, void 0, function* () {
        // When a note is modified an item_change object is going to be created. This
        // is used for example to tell the search engine, when note should be indexed. It is
        // also used by the revision service to tell what note should get a new revision.
        // When a note is modified via sync, this item_change object is also created. The issue
        // is that we don't want to create revisions for these particular item_changes, because
        // such revision has already been created on another client (whatever client initially
        // modified the note), and that rev is going to be synced.
        //
        // So in the end we need to make sure that we don't create these unecessary additional revisions.
        const n1 = yield Note_1.default.save({ title: 'testing' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note_1.default.save({ id: n1.id, title: 'mod from client 2' });
        yield revisionService().collectRevisions();
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        {
            const allRevs = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
        yield revisionService().collectRevisions();
        {
            const allRevs = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
            expect(allRevs.length).toBe(1);
        }
    })));
    it('should handle case when new rev is created on client, then older rev arrives later via sync', (() => __awaiter(this, void 0, void 0, function* () {
        // - C1 creates note 1
        // - C1 modifies note 1 - REV1 created
        // - C1 sync
        // - C2 sync
        // - C2 receives note 1
        // - C2 modifies note 1 - REV2 created (but not based on REV1)
        // - C2 receives REV1
        //
        // In that case, we need to make sure that REV1 and REV2 are both valid and can be retrieved.
        // Even though REV1 was created before REV2, REV2 is *not* based on REV1. This is not ideal
        // due to unecessary data being saved, but a possible edge case and we simply need to check
        // all the data is valid.
        // Note: this test seems to be a bit shaky because it doesn't work if the synchronizer
        // context is passed around (via synchronizerStart()), but it should.
        const n1 = yield Note_1.default.save({ title: 'note' });
        yield Note_1.default.save({ id: n1.id, title: 'note REV1' });
        yield revisionService().collectRevisions(); // REV1
        expect((yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id)).length).toBe(1);
        yield synchronizer().start();
        yield switchClient(2);
        synchronizer().testingHooks_ = ['skipRevisions'];
        yield synchronizer().start();
        synchronizer().testingHooks_ = [];
        yield Note_1.default.save({ id: n1.id, title: 'note REV2' });
        yield revisionService().collectRevisions(); // REV2
        expect((yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id)).length).toBe(1);
        yield synchronizer().start(); // Sync the rev that had been skipped above with skipRevisions
        const revisions = yield Revision_1.default.allByType(BaseModel_1.default.TYPE_NOTE, n1.id);
        expect(revisions.length).toBe(2);
        expect((yield revisionService().revisionNote(revisions, 0)).title).toBe('note REV1');
        expect((yield revisionService().revisionNote(revisions, 1)).title).toBe('note REV2');
    })));
    it('should not create revisions when item is modified as a result of decryption', (() => __awaiter(this, void 0, void 0, function* () {
        // Handle this scenario:
        // - C1 creates note
        // - C1 never changes it
        // - E2EE is enabled
        // - C1 sync
        // - More than one week later (as defined by oldNoteCutOffDate_), C2 sync
        // - C2 enters master password and note gets decrypted
        //
        // Technically at this point the note is modified (from encrypted to non-encrypted) and thus a ItemChange
        // object is created. The note is also older than oldNoteCutOffDate. However, this should not lead to the
        // creation of a revision because that change was not the result of a user action.
        // I guess that's the general rule - changes that come from user actions should result in revisions,
        // while automated changes (sync, decryption) should not.
        const dateInPast = revisionService().oldNoteCutOffDate_() - 1000;
        yield Note_1.default.save({ title: 'ma note', updated_time: dateInPast, created_time: dateInPast }, { autoTimestamp: false });
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        yield revisionService().collectRevisions();
        expect((yield Revision_1.default.all()).length).toBe(0);
    })));
});
//# sourceMappingURL=Synchronizer.revisions.js.map