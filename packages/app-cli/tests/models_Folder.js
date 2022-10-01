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
const test_utils_1 = require("./test-utils");
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
function allItems() {
    return __awaiter(this, void 0, void 0, function* () {
        const folders = yield Folder_1.default.all();
        const notes = yield Note_1.default.all();
        return folders.concat(notes);
    });
}
describe('models_Folder', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.setupDatabaseAndSynchronizer(1);
        yield test_utils_1.switchClient(1);
        done();
    }));
    it('should tell if a notebook can be nested under another one', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4' });
        expect(yield Folder_1.default.canNestUnder(f1.id, f2.id)).toBe(false);
        expect(yield Folder_1.default.canNestUnder(f2.id, f2.id)).toBe(false);
        expect(yield Folder_1.default.canNestUnder(f3.id, f1.id)).toBe(true);
        expect(yield Folder_1.default.canNestUnder(f4.id, f1.id)).toBe(true);
        expect(yield Folder_1.default.canNestUnder(f2.id, f3.id)).toBe(false);
        expect(yield Folder_1.default.canNestUnder(f3.id, f2.id)).toBe(true);
        expect(yield Folder_1.default.canNestUnder(f1.id, '')).toBe(true);
        expect(yield Folder_1.default.canNestUnder(f2.id, '')).toBe(true);
    })));
    it('should recursively delete notes and sub-notebooks', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4', parent_id: f1.id });
        const noOfNotes = 20;
        yield test_utils_1.createNTestNotes(noOfNotes, f1, null, 'note1');
        yield test_utils_1.createNTestNotes(noOfNotes, f2, null, 'note2');
        yield test_utils_1.createNTestNotes(noOfNotes, f3, null, 'note3');
        yield test_utils_1.createNTestNotes(noOfNotes, f4, null, 'note4');
        yield Folder_1.default.delete(f1.id);
        const all = yield allItems();
        expect(all.length).toBe(0);
    })));
    it('should sort by last modified, based on content', (() => __awaiter(this, void 0, void 0, function* () {
        let folders;
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        yield test_utils_1.sleep(0.1);
        const f2 = yield Folder_1.default.save({ title: 'folder2' });
        yield test_utils_1.sleep(0.1);
        const f3 = yield Folder_1.default.save({ title: 'folder3' });
        yield test_utils_1.sleep(0.1);
        const n1 = yield Note_1.default.save({ title: 'note1', parent_id: f2.id });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders.length).toBe(3);
        expect(folders[0].id).toBe(f2.id);
        expect(folders[1].id).toBe(f3.id);
        expect(folders[2].id).toBe(f1.id);
        yield Note_1.default.save({ title: 'note1', parent_id: f1.id });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders[0].id).toBe(f1.id);
        expect(folders[1].id).toBe(f2.id);
        expect(folders[2].id).toBe(f3.id);
        yield Note_1.default.save({ id: n1.id, title: 'note1 mod' });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders[0].id).toBe(f2.id);
        expect(folders[1].id).toBe(f1.id);
        expect(folders[2].id).toBe(f3.id);
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'asc');
        expect(folders[0].id).toBe(f3.id);
        expect(folders[1].id).toBe(f1.id);
        expect(folders[2].id).toBe(f2.id);
    })));
    it('should sort by last modified, based on content (sub-folders too)', (() => __awaiter(this, void 0, void 0, function* () {
        let folders;
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        yield test_utils_1.sleep(0.1);
        const f2 = yield Folder_1.default.save({ title: 'folder2' });
        yield test_utils_1.sleep(0.1);
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f1.id });
        yield test_utils_1.sleep(0.1);
        const n1 = yield Note_1.default.save({ title: 'note1', parent_id: f3.id });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders.length).toBe(3);
        expect(folders[0].id).toBe(f1.id);
        expect(folders[1].id).toBe(f3.id);
        expect(folders[2].id).toBe(f2.id);
        yield Note_1.default.save({ title: 'note2', parent_id: f2.id });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders[0].id).toBe(f2.id);
        expect(folders[1].id).toBe(f1.id);
        expect(folders[2].id).toBe(f3.id);
        yield Note_1.default.save({ id: n1.id, title: 'note1 MOD' });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders[0].id).toBe(f1.id);
        expect(folders[1].id).toBe(f3.id);
        expect(folders[2].id).toBe(f2.id);
        const f4 = yield Folder_1.default.save({ title: 'folder4', parent_id: f1.id });
        yield test_utils_1.sleep(0.1);
        yield Note_1.default.save({ title: 'note3', parent_id: f4.id });
        folders = yield Folder_1.default.orderByLastModified(yield Folder_1.default.all(), 'desc');
        expect(folders.length).toBe(4);
        expect(folders[0].id).toBe(f1.id);
        expect(folders[1].id).toBe(f4.id);
        expect(folders[2].id).toBe(f3.id);
        expect(folders[3].id).toBe(f2.id);
    })));
    it('should add node counts', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4' });
        yield Note_1.default.save({ title: 'note1', parent_id: f3.id });
        yield Note_1.default.save({ title: 'note1', parent_id: f3.id });
        yield Note_1.default.save({ title: 'note1', parent_id: f1.id });
        yield Note_1.default.save({ title: 'conflicted', parent_id: f1.id, is_conflict: 1 });
        {
            const folders = yield Folder_1.default.all({ includeConflictFolder: false });
            yield Folder_1.default.addNoteCounts(folders);
            const foldersById = {};
            folders.forEach((f) => { foldersById[f.id] = f; });
            expect(folders.length).toBe(4);
            expect(foldersById[f1.id].note_count).toBe(3);
            expect(foldersById[f2.id].note_count).toBe(2);
            expect(foldersById[f3.id].note_count).toBe(2);
            expect(foldersById[f4.id].note_count).toBe(0);
        }
        {
            const folders = yield Folder_1.default.all({ includeConflictFolder: true });
            yield Folder_1.default.addNoteCounts(folders);
            const foldersById = {};
            folders.forEach((f) => { foldersById[f.id] = f; });
            expect(folders.length).toBe(5);
            expect(foldersById[Folder_1.default.conflictFolderId()].note_count).toBe(1);
        }
    })));
    it('should not count completed to-dos', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4' });
        yield Note_1.default.save({ title: 'note1', parent_id: f3.id });
        yield Note_1.default.save({ title: 'note2', parent_id: f3.id });
        yield Note_1.default.save({ title: 'note3', parent_id: f1.id });
        yield Note_1.default.save({ title: 'note4', parent_id: f3.id, is_todo: 1, todo_completed: 0 });
        yield Note_1.default.save({ title: 'note5', parent_id: f3.id, is_todo: 1, todo_completed: 999 });
        yield Note_1.default.save({ title: 'note6', parent_id: f3.id, is_todo: 1, todo_completed: 999 });
        const folders = yield Folder_1.default.all();
        yield Folder_1.default.addNoteCounts(folders, false);
        const foldersById = {};
        folders.forEach((f) => { foldersById[f.id] = f; });
        expect(folders.length).toBe(4);
        expect(foldersById[f1.id].note_count).toBe(4);
        expect(foldersById[f2.id].note_count).toBe(3);
        expect(foldersById[f3.id].note_count).toBe(3);
        expect(foldersById[f4.id].note_count).toBe(0);
    })));
    it('should recursively find folder path', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f2.id });
        const folders = yield Folder_1.default.all();
        const folderPath = yield Folder_1.default.folderPath(folders, f3.id);
        expect(folderPath.length).toBe(3);
        expect(folderPath[0].id).toBe(f1.id);
        expect(folderPath[1].id).toBe(f2.id);
        expect(folderPath[2].id).toBe(f3.id);
    })));
    it('should sort folders alphabetically', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const f2 = yield Folder_1.default.save({ title: 'folder2', parent_id: f1.id });
        const f3 = yield Folder_1.default.save({ title: 'folder3', parent_id: f1.id });
        const f4 = yield Folder_1.default.save({ title: 'folder4' });
        const f5 = yield Folder_1.default.save({ title: 'folder5', parent_id: f4.id });
        const f6 = yield Folder_1.default.save({ title: 'folder6' });
        const folders = yield Folder_1.default.allAsTree();
        const sortedFolderTree = yield Folder_1.default.sortFolderTree(folders);
        expect(sortedFolderTree.length).toBe(3);
        expect(sortedFolderTree[0].id).toBe(f1.id);
        expect(sortedFolderTree[0].children[0].id).toBe(f2.id);
        expect(sortedFolderTree[0].children[1].id).toBe(f3.id);
        expect(sortedFolderTree[1].id).toBe(f4.id);
        expect(sortedFolderTree[1].children[0].id).toBe(f5.id);
        expect(sortedFolderTree[2].id).toBe(f6.id);
    })));
    it('should not allow setting a notebook parent as itself', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'folder1' });
        const hasThrown = yield test_utils_1.checkThrowAsync(() => Folder_1.default.save({ id: f1.id, parent_id: f1.id }, { userSideValidation: true }));
        expect(hasThrown).toBe(true);
    })));
});
//# sourceMappingURL=models_Folder.js.map