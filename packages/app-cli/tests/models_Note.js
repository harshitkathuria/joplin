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
const shim_1 = require("@joplin/lib/shim");
const markdownUtils_1 = require("@joplin/lib/markdownUtils");
const { sortedIds, createNTestNotes, setupDatabaseAndSynchronizer, switchClient, checkThrowAsync } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const ArrayUtils = require('@joplin/lib/ArrayUtils.js');
function allItems() {
    return __awaiter(this, void 0, void 0, function* () {
        const folders = yield Folder_1.default.all();
        const notes = yield Note_1.default.all();
        return folders.concat(notes);
    });
}
describe('models_Note', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield switchClient(1);
        done();
    }));
    it('should find resource and note IDs', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        let note2 = yield Note_1.default.save({ title: 'ma deuxième note', body: `Lien vers première note : ${Note_1.default.markdownTag(note1)}`, parent_id: folder1.id });
        let items = yield Note_1.default.linkedItems(note2.body);
        expect(items.length).toBe(1);
        expect(items[0].id).toBe(note1.id);
        yield shim_1.default.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);
        note2 = yield Note_1.default.load(note2.id);
        items = yield Note_1.default.linkedItems(note2.body);
        expect(items.length).toBe(2);
        expect(items[0].type_).toBe(BaseModel_1.default.TYPE_NOTE);
        expect(items[1].type_).toBe(BaseModel_1.default.TYPE_RESOURCE);
        const resource2 = yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);
        const resource3 = yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);
        note2.body += `<img alt="bla" src=":/${resource2.id}"/>`;
        note2.body += `<img src=':/${resource3.id}' />`;
        items = yield Note_1.default.linkedItems(note2.body);
        expect(items.length).toBe(4);
    })));
    it('should find linked items', (() => __awaiter(this, void 0, void 0, function* () {
        const testCases = [
            ['[](:/06894e83b8f84d3d8cbe0f1587f9e226)', ['06894e83b8f84d3d8cbe0f1587f9e226']],
            ['[](:/06894e83b8f84d3d8cbe0f1587f9e226) [](:/06894e83b8f84d3d8cbe0f1587f9e226)', ['06894e83b8f84d3d8cbe0f1587f9e226']],
            ['[](:/06894e83b8f84d3d8cbe0f1587f9e226) [](:/06894e83b8f84d3d8cbe0f1587f9e227)', ['06894e83b8f84d3d8cbe0f1587f9e226', '06894e83b8f84d3d8cbe0f1587f9e227']],
            ['[](:/06894e83b8f84d3d8cbe0f1587f9e226 "some title")', ['06894e83b8f84d3d8cbe0f1587f9e226']],
        ];
        for (let i = 0; i < testCases.length; i++) {
            const t = testCases[i];
            const input = t[0];
            const expected = t[1];
            const actual = Note_1.default.linkedItemIds(input);
            const contentEquals = ArrayUtils.contentEquals(actual, expected);
            // console.info(contentEquals, input, expected, actual);
            expect(contentEquals).toBe(true);
        }
    })));
    it('should change the type of notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield Note_1.default.load(note1.id);
        let changedNote = Note_1.default.changeNoteType(note1, 'todo');
        expect(changedNote === note1).toBe(false);
        expect(!!changedNote.is_todo).toBe(true);
        yield Note_1.default.save(changedNote);
        note1 = yield Note_1.default.load(note1.id);
        changedNote = Note_1.default.changeNoteType(note1, 'todo');
        expect(changedNote === note1).toBe(true);
        expect(!!changedNote.is_todo).toBe(true);
        note1 = yield Note_1.default.load(note1.id);
        changedNote = Note_1.default.changeNoteType(note1, 'note');
        expect(changedNote === note1).toBe(false);
        expect(!!changedNote.is_todo).toBe(false);
    })));
    it('should serialize and unserialize without modifying data', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const testCases = [
            [{ title: '', body: 'Body and no title\nSecond line\nThird Line', parent_id: folder1.id },
                '', 'Body and no title\nSecond line\nThird Line'],
            [{ title: 'Note title', body: 'Body and title', parent_id: folder1.id },
                'Note title', 'Body and title'],
            [{ title: 'Title and no body', body: '', parent_id: folder1.id },
                'Title and no body', ''],
        ];
        for (let i = 0; i < testCases.length; i++) {
            const t = testCases[i];
            const input = t[0];
            const note1 = yield Note_1.default.save(input);
            const serialized = yield Note_1.default.serialize(note1);
            const unserialized = yield Note_1.default.unserialize(serialized);
            expect(unserialized.title).toBe(input.title);
            expect(unserialized.body).toBe(input.body);
        }
    })));
    it('should reset fields for a duplicate', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'note', parent_id: folder1.id });
        const duplicatedNote = yield Note_1.default.duplicate(note1.id);
        expect(duplicatedNote !== note1).toBe(true);
        expect(duplicatedNote.created_time !== note1.created_time).toBe(true);
        expect(duplicatedNote.updated_time !== note1.updated_time).toBe(true);
        expect(duplicatedNote.user_created_time !== note1.user_created_time).toBe(true);
        expect(duplicatedNote.user_updated_time !== note1.user_updated_time).toBe(true);
    })));
    it('should delete a set of notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const noOfNotes = 20;
        yield createNTestNotes(noOfNotes, folder1);
        const noteIds = yield Folder_1.default.noteIds(folder1.id);
        yield Note_1.default.batchDelete(noteIds);
        const all = yield allItems();
        expect(all.length).toBe(1);
        expect(all[0].id).toBe(folder1.id);
    })));
    it('should delete only the selected notes', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const noOfNotes = 20;
        yield createNTestNotes(noOfNotes, f1, null, 'note1');
        yield createNTestNotes(noOfNotes, f2, null, 'note1');
        const allBeforeDelete = yield allItems();
        const notesInFolder1IDs = yield Folder_1.default.noteIds(f1.id);
        const notesInFolder2IDs = yield Folder_1.default.noteIds(f2.id);
        const notesToRemoveFromFolder1 = notesInFolder1IDs.slice(0, 6);
        const notesToRemoveFromFolder2 = notesInFolder2IDs.slice(11, 14);
        yield Note_1.default.batchDelete(notesToRemoveFromFolder1);
        yield Note_1.default.batchDelete(notesToRemoveFromFolder2);
        const allAfterDelete = yield allItems();
        const expectedLength = allBeforeDelete.length - notesToRemoveFromFolder1.length - notesToRemoveFromFolder2.length;
        expect(allAfterDelete.length).toBe(expectedLength);
        // Common elements between the to-be-deleted notes and the notes and folders remaining after the delete
        const intersection = [...notesToRemoveFromFolder1, ...notesToRemoveFromFolder2].filter(x => allAfterDelete.includes(x));
        // Should be empty
        expect(intersection.length).toBe(0);
    })));
    it('should delete nothing', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4', parent_id: f1.id });
        const noOfNotes = 20;
        yield createNTestNotes(noOfNotes, f1, null, 'note1');
        yield createNTestNotes(noOfNotes, f2, null, 'note2');
        yield createNTestNotes(noOfNotes, f3, null, 'note3');
        yield createNTestNotes(noOfNotes, f4, null, 'note4');
        const beforeDelete = yield allItems();
        yield Note_1.default.batchDelete([]);
        const afterDelete = yield allItems();
        expect(sortedIds(afterDelete)).toEqual(sortedIds(beforeDelete));
    })));
    it('should not move to conflict folder', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'Folder' });
        const folder2 = yield Folder_1.default.save({ title: Folder_1.default.conflictFolderTitle(), id: Folder_1.default.conflictFolderId() });
        const note1 = yield Note_1.default.save({ title: 'note', parent_id: folder1.id });
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield Folder_1.default.moveToFolder(note1.id, folder2.id); }));
        expect(hasThrown).toBe(true);
        const note = yield Note_1.default.load(note1.id);
        expect(note.parent_id).toEqual(folder1.id);
    })));
    it('should not copy to conflict folder', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'Folder' });
        const folder2 = yield Folder_1.default.save({ title: Folder_1.default.conflictFolderTitle(), id: Folder_1.default.conflictFolderId() });
        const note1 = yield Note_1.default.save({ title: 'note', parent_id: folder1.id });
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield Note_1.default.copyToFolder(note1.id, folder2.id); }));
        expect(hasThrown).toBe(true);
    })));
    it('should convert resource paths from internal to external paths', (() => __awaiter(this, void 0, void 0, function* () {
        const resourceDirName = Setting_1.default.value('resourceDirName');
        const resourceDir = Setting_1.default.value('resourceDir');
        const r1 = yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);
        const r2 = yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);
        const r3 = yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/welcome.pdf`);
        const note1 = yield Note_1.default.save({ title: 'note1' });
        const t1 = r1.updated_time;
        const t2 = r2.updated_time;
        const resourceDirE = markdownUtils_1.default.escapeLinkUrl(resourceDir);
        const testCases = [
            [
                false,
                '',
                '',
            ],
            [
                true,
                '',
                '',
            ],
            [
                false,
                `![](:/${r1.id})`,
                `![](${resourceDirName}/${r1.id}.jpg)`,
            ],
            [
                false,
                `![](:/${r1.id}) ![](:/${r1.id}) ![](:/${r2.id})`,
                `![](${resourceDirName}/${r1.id}.jpg) ![](${resourceDirName}/${r1.id}.jpg) ![](${resourceDirName}/${r2.id}.jpg)`,
            ],
            [
                true,
                `![](:/${r1.id})`,
                `![](file://${resourceDirE}/${r1.id}.jpg?t=${t1})`,
            ],
            [
                true,
                `![](:/${r1.id}) ![](:/${r1.id}) ![](:/${r2.id})`,
                `![](file://${resourceDirE}/${r1.id}.jpg?t=${t1}) ![](file://${resourceDirE}/${r1.id}.jpg?t=${t1}) ![](file://${resourceDirE}/${r2.id}.jpg?t=${t2})`,
            ],
            [
                true,
                `![](:/${r3.id})`,
                `![](file://${resourceDirE}/${r3.id}.pdf)`,
            ],
        ];
        for (const testCase of testCases) {
            const [useAbsolutePaths, input, expected] = testCase;
            const internalToExternal = yield Note_1.default.replaceResourceInternalToExternalLinks(input, { useAbsolutePaths });
            expect(internalToExternal).toBe(expected);
            const externalToInternal = yield Note_1.default.replaceResourceExternalToInternalLinks(internalToExternal, { useAbsolutePaths });
            expect(externalToInternal).toBe(input);
        }
        const result = yield Note_1.default.replaceResourceExternalToInternalLinks(`[](joplin://${note1.id})`);
        expect(result).toBe(`[](:/${note1.id})`);
    })));
    it('should perform natural sorting', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({});
        const sortedNotes = yield Note_1.default.previews(folder1.id, {
            fields: ['id', 'title'],
            order: [{ by: 'title', dir: 'ASC' }],
        });
        expect(sortedNotes.length).toBe(0);
        const note0 = yield Note_1.default.save({ title: 'A3', parent_id: folder1.id, is_todo: 0 });
        const note1 = yield Note_1.default.save({ title: 'A20', parent_id: folder1.id, is_todo: 0 });
        const note2 = yield Note_1.default.save({ title: 'A100', parent_id: folder1.id, is_todo: 0 });
        const note3 = yield Note_1.default.save({ title: 'égalité', parent_id: folder1.id, is_todo: 0 });
        const note4 = yield Note_1.default.save({ title: 'z', parent_id: folder1.id, is_todo: 0 });
        const sortedNotes2 = yield Note_1.default.previews(folder1.id, {
            fields: ['id', 'title'],
            order: [{ by: 'title', dir: 'ASC' }],
        });
        expect(sortedNotes2.length).toBe(5);
        expect(sortedNotes2[0].id).toBe(note0.id);
        expect(sortedNotes2[1].id).toBe(note1.id);
        expect(sortedNotes2[2].id).toBe(note2.id);
        expect(sortedNotes2[3].id).toBe(note3.id);
        expect(sortedNotes2[4].id).toBe(note4.id);
        const todo3 = Note_1.default.changeNoteType(note3, 'todo');
        const todo4 = Note_1.default.changeNoteType(note4, 'todo');
        yield Note_1.default.save(todo3);
        yield Note_1.default.save(todo4);
        const sortedNotes3 = yield Note_1.default.previews(folder1.id, {
            fields: ['id', 'title'],
            order: [{ by: 'title', dir: 'ASC' }],
            uncompletedTodosOnTop: true,
        });
        expect(sortedNotes3.length).toBe(5);
        expect(sortedNotes3[0].id).toBe(note3.id);
        expect(sortedNotes3[1].id).toBe(note4.id);
        expect(sortedNotes3[2].id).toBe(note0.id);
        expect(sortedNotes3[3].id).toBe(note1.id);
        expect(sortedNotes3[4].id).toBe(note2.id);
    })));
});
//# sourceMappingURL=models_Note.js.map