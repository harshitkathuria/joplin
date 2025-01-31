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
const time_1 = require("@joplin/lib/time");
const Setting_1 = require("@joplin/lib/models/Setting");
const test_utils_synchronizer_1 = require("./test-utils-synchronizer");
const { synchronizerStart, setupDatabaseAndSynchronizer, sleep, switchClient, syncTargetId, loadEncryptionMasterKey, decryptionWorker } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
describe('Synchronizer.conflicts', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
    }));
    it('should resolve note conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let note2 = yield Note_1.default.load(note1.id);
        note2.title = 'Updated on client 2';
        yield Note_1.default.save(note2);
        note2 = yield Note_1.default.load(note2.id);
        yield synchronizerStart();
        yield switchClient(1);
        let note2conf = yield Note_1.default.load(note1.id);
        note2conf.title = 'Updated on client 1';
        yield Note_1.default.save(note2conf);
        note2conf = yield Note_1.default.load(note1.id);
        yield synchronizerStart();
        const conflictedNotes = yield Note_1.default.conflictedNotes();
        expect(conflictedNotes.length).toBe(1);
        // Other than the id (since the conflicted note is a duplicate), and the is_conflict property
        // the conflicted and original note must be the same in every way, to make sure no data has been lost.
        const conflictedNote = conflictedNotes[0];
        expect(conflictedNote.id == note2conf.id).toBe(false);
        for (const n in conflictedNote) {
            if (!conflictedNote.hasOwnProperty(n))
                continue;
            if (n == 'id' || n == 'is_conflict')
                continue;
            expect(conflictedNote[n]).toBe(note2conf[n]);
        }
        const noteUpdatedFromRemote = yield Note_1.default.load(note1.id);
        for (const n in noteUpdatedFromRemote) {
            if (!noteUpdatedFromRemote.hasOwnProperty(n))
                continue;
            expect(noteUpdatedFromRemote[n]).toBe(note2[n]);
        }
    })));
    it('should resolve folders conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2); // ----------------------------------
        yield synchronizerStart();
        yield sleep(0.1);
        let folder1_modRemote = yield Folder_1.default.load(folder1.id);
        folder1_modRemote.title = 'folder1 UPDATE CLIENT 2';
        yield Folder_1.default.save(folder1_modRemote);
        folder1_modRemote = yield Folder_1.default.load(folder1_modRemote.id);
        yield synchronizerStart();
        yield switchClient(1); // ----------------------------------
        yield sleep(0.1);
        let folder1_modLocal = yield Folder_1.default.load(folder1.id);
        folder1_modLocal.title = 'folder1 UPDATE CLIENT 1';
        yield Folder_1.default.save(folder1_modLocal);
        folder1_modLocal = yield Folder_1.default.load(folder1.id);
        yield synchronizerStart();
        const folder1_final = yield Folder_1.default.load(folder1.id);
        expect(folder1_final.title).toBe(folder1_modRemote.title);
    })));
    it('should resolve conflict if remote folder has been deleted, but note has been added to folder locally', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Folder_1.default.delete(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield Note_1.default.save({ title: 'note1', parent_id: folder1.id });
        yield synchronizerStart();
        const items = yield test_utils_synchronizer_1.allNotesFolders();
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('note1');
        expect(items[0].is_conflict).toBe(1);
    })));
    it('should resolve conflict if note has been deleted remotely and locally', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({ title: 'folder' });
        const note = yield Note_1.default.save({ title: 'note', parent_id: folder.title });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note_1.default.delete(note.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield Note_1.default.delete(note.id);
        yield synchronizerStart();
        const items = yield test_utils_synchronizer_1.allNotesFolders();
        expect(items.length).toBe(1);
        expect(items[0].title).toBe('folder');
        yield test_utils_synchronizer_1.localNotesFoldersSameAsRemote(items, expect);
    })));
    it('should handle conflict when remote note is deleted then local note is modified', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Note_1.default.delete(note1.id);
        yield synchronizerStart();
        yield switchClient(1);
        const newTitle = 'Modified after having been deleted';
        yield Note_1.default.save({ id: note1.id, title: newTitle });
        yield synchronizerStart();
        const conflictedNotes = yield Note_1.default.conflictedNotes();
        expect(conflictedNotes.length).toBe(1);
        expect(conflictedNotes[0].title).toBe(newTitle);
        const unconflictedNotes = yield Note_1.default.unconflictedNotes();
        expect(unconflictedNotes.length).toBe(0);
    })));
    it('should handle conflict when remote folder is deleted then local folder is renamed', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield Folder_1.default.save({ title: 'folder2' });
        yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield sleep(0.1);
        yield Folder_1.default.delete(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield sleep(0.1);
        const newTitle = 'Modified after having been deleted';
        yield Folder_1.default.save({ id: folder1.id, title: newTitle });
        yield synchronizerStart();
        const items = yield test_utils_synchronizer_1.allNotesFolders();
        expect(items.length).toBe(1);
    })));
    it('should not sync notes with conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder' });
        yield Note_1.default.save({ title: 'mynote', parent_id: f1.id, is_conflict: 1 });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const notes = yield Note_1.default.all();
        const folders = yield Folder_1.default.all();
        expect(notes.length).toBe(0);
        expect(folders.length).toBe(1);
    })));
    it('should not try to delete on remote conflicted notes that have been deleted', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder' });
        const n1 = yield Note_1.default.save({ title: 'mynote', parent_id: f1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield Note_1.default.save({ id: n1.id, is_conflict: 1 });
        yield Note_1.default.delete(n1.id);
        const deletedItems = yield BaseItem_1.default.deletedItems(syncTargetId());
        expect(deletedItems.length).toBe(0);
    })));
    function ignorableNoteConflictTest(withEncryption) {
        return __awaiter(this, void 0, void 0, function* () {
            if (withEncryption) {
                Setting_1.default.setValue('encryption.enabled', true);
                yield loadEncryptionMasterKey();
            }
            const folder1 = yield Folder_1.default.save({ title: 'folder1' });
            const note1 = yield Note_1.default.save({ title: 'un', is_todo: 1, parent_id: folder1.id });
            yield synchronizerStart();
            yield switchClient(2);
            yield synchronizerStart();
            if (withEncryption) {
                yield loadEncryptionMasterKey(null, true);
                yield decryptionWorker().start();
            }
            let note2 = yield Note_1.default.load(note1.id);
            note2.todo_completed = time_1.default.unixMs() - 1;
            yield Note_1.default.save(note2);
            note2 = yield Note_1.default.load(note2.id);
            yield synchronizerStart();
            yield switchClient(1);
            let note2conf = yield Note_1.default.load(note1.id);
            note2conf.todo_completed = time_1.default.unixMs();
            yield Note_1.default.save(note2conf);
            note2conf = yield Note_1.default.load(note1.id);
            yield synchronizerStart();
            if (!withEncryption) {
                // That was previously a common conflict:
                // - Client 1 mark todo as "done", and sync
                // - Client 2 doesn't sync, mark todo as "done" todo. Then sync.
                // In theory it is a conflict because the todo_completed dates are different
                // but in practice it doesn't matter, we can just take the date when the
                // todo was marked as "done" the first time.
                const conflictedNotes = yield Note_1.default.conflictedNotes();
                expect(conflictedNotes.length).toBe(0);
                const notes = yield Note_1.default.all();
                expect(notes.length).toBe(1);
                expect(notes[0].id).toBe(note1.id);
                expect(notes[0].todo_completed).toBe(note2.todo_completed);
            }
            else {
                // If the notes are encrypted however it's not possible to do this kind of
                // smart conflict resolving since we don't know the content, so in that
                // case it's handled as a regular conflict.
                const conflictedNotes = yield Note_1.default.conflictedNotes();
                expect(conflictedNotes.length).toBe(1);
                const notes = yield Note_1.default.all();
                expect(notes.length).toBe(2);
            }
        });
    }
    it('should not consider it is a conflict if neither the title nor body of the note have changed', (() => __awaiter(this, void 0, void 0, function* () {
        yield ignorableNoteConflictTest(false);
    })));
    it('should always handle conflict if local or remote are encrypted', (() => __awaiter(this, void 0, void 0, function* () {
        yield ignorableNoteConflictTest(true);
    })));
});
//# sourceMappingURL=Synchronizer.conflicts.js.map