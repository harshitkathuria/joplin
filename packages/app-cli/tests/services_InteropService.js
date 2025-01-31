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
const InteropService_1 = require("@joplin/lib/services/interop/InteropService");
const types_1 = require("@joplin/lib/services/interop/types");
const shim_1 = require("@joplin/lib/shim");
const { fileContentEqual, setupDatabaseAndSynchronizer, switchClient, checkThrowAsync, exportDir } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const Tag_1 = require("@joplin/lib/models/Tag");
const Resource_1 = require("@joplin/lib/models/Resource");
const fs = require('fs-extra');
const ArrayUtils = require('@joplin/lib/ArrayUtils');
function recreateExportDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = exportDir();
        yield fs.remove(dir);
        yield fs.mkdirp(dir);
    });
}
function fieldsEqual(model1, model2, fieldNames) {
    for (let i = 0; i < fieldNames.length; i++) {
        const f = fieldNames[i];
        expect(model1[f]).toBe(model2[f]);
    }
}
describe('services_InteropService', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield switchClient(1);
        yield recreateExportDir();
        done();
    }));
    it('should export and import folders', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        let folder1 = yield Folder_1.default.save({ title: 'folder1' });
        folder1 = yield Folder_1.default.load(folder1.id);
        const filePath = `${exportDir()}/test.jex`;
        yield service.export({ path: filePath });
        yield Folder_1.default.delete(folder1.id);
        yield service.import({ path: filePath });
        // Check that a new folder, with a new ID, has been created
        expect(yield Folder_1.default.count()).toBe(1);
        const folder2 = (yield Folder_1.default.all())[0];
        expect(folder2.id).not.toBe(folder1.id);
        expect(folder2.title).toBe(folder1.title);
        yield service.import({ path: filePath });
        // As there was already a folder with the same title, check that the new one has been renamed
        yield Folder_1.default.delete(folder2.id);
        const folder3 = (yield Folder_1.default.all())[0];
        expect(yield Folder_1.default.count()).toBe(1);
        expect(folder3.title).not.toBe(folder2.title);
        let fieldNames = Folder_1.default.fieldNames();
        fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
        fieldNames = ArrayUtils.removeElement(fieldNames, 'title');
        fieldsEqual(folder3, folder1, fieldNames);
    })));
    it('should import folders and de-duplicate titles when needed', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder' });
        const folder2 = yield Folder_1.default.save({ title: 'folder' });
        const filePath = `${exportDir()}/test.jex`;
        yield service.export({ path: filePath });
        yield Folder_1.default.delete(folder1.id);
        yield Folder_1.default.delete(folder2.id);
        yield service.import({ path: filePath });
        const allFolders = yield Folder_1.default.all();
        expect(allFolders.map((f) => f.title).sort().join(' - ')).toBe('folder - folder (1)');
    })));
    it('should import folders, and only de-duplicate titles when needed', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const folder2 = yield Folder_1.default.save({ title: 'folder2' });
        yield Folder_1.default.save({ title: 'Sub', parent_id: folder1.id });
        yield Folder_1.default.save({ title: 'Sub', parent_id: folder2.id });
        const filePath = `${exportDir()}/test.jex`;
        yield service.export({ path: filePath });
        yield Folder_1.default.delete(folder1.id);
        yield Folder_1.default.delete(folder2.id);
        yield service.import({ path: filePath });
        const importedFolder1 = yield Folder_1.default.loadByTitle('folder1');
        const importedFolder2 = yield Folder_1.default.loadByTitle('folder2');
        const importedSub1 = yield Folder_1.default.load((yield Folder_1.default.childrenIds(importedFolder1.id))[0]);
        const importedSub2 = yield Folder_1.default.load((yield Folder_1.default.childrenIds(importedFolder2.id))[0]);
        expect(importedSub1.title).toBe('Sub');
        expect(importedSub2.title).toBe('Sub');
    })));
    it('should export and import folders and notes', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield Note_1.default.load(note1.id);
        const filePath = `${exportDir()}/test.jex`;
        yield service.export({ path: filePath });
        yield Folder_1.default.delete(folder1.id);
        yield Note_1.default.delete(note1.id);
        yield service.import({ path: filePath });
        expect(yield Note_1.default.count()).toBe(1);
        let note2 = (yield Note_1.default.all())[0];
        const folder2 = (yield Folder_1.default.all())[0];
        expect(note1.parent_id).not.toBe(note2.parent_id);
        expect(note1.id).not.toBe(note2.id);
        expect(note2.parent_id).toBe(folder2.id);
        let fieldNames = Note_1.default.fieldNames();
        fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
        fieldNames = ArrayUtils.removeElement(fieldNames, 'parent_id');
        fieldsEqual(note1, note2, fieldNames);
        yield service.import({ path: filePath });
        note2 = (yield Note_1.default.all())[0];
        const note3 = (yield Note_1.default.all())[1];
        expect(note2.id).not.toBe(note3.id);
        expect(note2.parent_id).not.toBe(note3.parent_id);
        fieldsEqual(note2, note3, fieldNames);
    })));
    it('should export and import notes to specific folder', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield Note_1.default.load(note1.id);
        const filePath = `${exportDir()}/test.jex`;
        yield service.export({ path: filePath });
        yield Note_1.default.delete(note1.id);
        yield service.import({ path: filePath, destinationFolderId: folder1.id });
        expect(yield Note_1.default.count()).toBe(1);
        expect(yield Folder_1.default.count()).toBe(1);
        expect(yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield service.import({ path: filePath, destinationFolderId: 'oops' }); }))).toBe(true);
    })));
    it('should export and import tags', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        let tag1 = yield Tag_1.default.save({ title: 'mon tag' });
        tag1 = yield Tag_1.default.load(tag1.id);
        yield Tag_1.default.addNote(tag1.id, note1.id);
        yield service.export({ path: filePath });
        yield Folder_1.default.delete(folder1.id);
        yield Note_1.default.delete(note1.id);
        yield Tag_1.default.delete(tag1.id);
        yield service.import({ path: filePath });
        expect(yield Tag_1.default.count()).toBe(1);
        const tag2 = (yield Tag_1.default.all())[0];
        const note2 = (yield Note_1.default.all())[0];
        expect(tag1.id).not.toBe(tag2.id);
        let fieldNames = Note_1.default.fieldNames();
        fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
        fieldsEqual(tag1, tag2, fieldNames);
        let noteIds = yield Tag_1.default.noteIds(tag2.id);
        expect(noteIds.length).toBe(1);
        expect(noteIds[0]).toBe(note2.id);
        yield service.import({ path: filePath });
        // If importing again, no new tag should be created as one with
        // the same name already existed. The newly imported note should
        // however go under that already existing tag.
        expect(yield Tag_1.default.count()).toBe(1);
        noteIds = yield Tag_1.default.noteIds(tag2.id);
        expect(noteIds.length).toBe(2);
    })));
    it('should export and import resources', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        note1 = yield Note_1.default.load(note1.id);
        let resourceIds = yield Note_1.default.linkedResourceIds(note1.body);
        const resource1 = yield Resource_1.default.load(resourceIds[0]);
        yield service.export({ path: filePath });
        yield Note_1.default.delete(note1.id);
        yield service.import({ path: filePath });
        expect(yield Resource_1.default.count()).toBe(2);
        const note2 = (yield Note_1.default.all())[0];
        expect(note2.body).not.toBe(note1.body);
        resourceIds = yield Note_1.default.linkedResourceIds(note2.body);
        expect(resourceIds.length).toBe(1);
        const resource2 = yield Resource_1.default.load(resourceIds[0]);
        expect(resource2.id).not.toBe(resource1.id);
        let fieldNames = Note_1.default.fieldNames();
        fieldNames = ArrayUtils.removeElement(fieldNames, 'id');
        fieldsEqual(resource1, resource2, fieldNames);
        const resourcePath1 = Resource_1.default.fullPath(resource1);
        const resourcePath2 = Resource_1.default.fullPath(resource2);
        expect(resourcePath1).not.toBe(resourcePath2);
        expect(fileContentEqual(resourcePath1, resourcePath2)).toBe(true);
    })));
    it('should export and import single notes', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield service.export({ path: filePath, sourceNoteIds: [note1.id] });
        yield Note_1.default.delete(note1.id);
        yield Folder_1.default.delete(folder1.id);
        yield service.import({ path: filePath });
        expect(yield Note_1.default.count()).toBe(1);
        expect(yield Folder_1.default.count()).toBe(1);
        const folder2 = (yield Folder_1.default.all())[0];
        expect(folder2.title).toBe('test');
    })));
    it('should export and import single folders', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield service.export({ path: filePath, sourceFolderIds: [folder1.id] });
        yield Note_1.default.delete(note1.id);
        yield Folder_1.default.delete(folder1.id);
        yield service.import({ path: filePath });
        expect(yield Note_1.default.count()).toBe(1);
        expect(yield Folder_1.default.count()).toBe(1);
        const folder2 = (yield Folder_1.default.all())[0];
        expect(folder2.title).toBe('folder1');
    })));
    it('should export and import folder and its sub-folders', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const folder2 = yield Folder_1.default.save({ title: 'folder2', parent_id: folder1.id });
        const folder3 = yield Folder_1.default.save({ title: 'folder3', parent_id: folder2.id });
        const folder4 = yield Folder_1.default.save({ title: 'folder4', parent_id: folder2.id });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder4.id });
        yield service.export({ path: filePath, sourceFolderIds: [folder1.id] });
        yield Note_1.default.delete(note1.id);
        yield Folder_1.default.delete(folder1.id);
        yield Folder_1.default.delete(folder2.id);
        yield Folder_1.default.delete(folder3.id);
        yield Folder_1.default.delete(folder4.id);
        yield service.import({ path: filePath });
        expect(yield Note_1.default.count()).toBe(1);
        expect(yield Folder_1.default.count()).toBe(4);
        const folder1_2 = yield Folder_1.default.loadByTitle('folder1');
        const folder2_2 = yield Folder_1.default.loadByTitle('folder2');
        const folder3_2 = yield Folder_1.default.loadByTitle('folder3');
        const folder4_2 = yield Folder_1.default.loadByTitle('folder4');
        const note1_2 = yield Note_1.default.loadByTitle('ma note');
        expect(folder2_2.parent_id).toBe(folder1_2.id);
        expect(folder3_2.parent_id).toBe(folder2_2.id);
        expect(folder4_2.parent_id).toBe(folder2_2.id);
        expect(note1_2.parent_id).toBe(folder4_2.id);
    })));
    it('should export and import links to notes', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const filePath = `${exportDir()}/test.jex`;
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        const note2 = yield Note_1.default.save({ title: 'ma deuxième note', body: `Lien vers première note : ${Note_1.default.markdownTag(note1)}`, parent_id: folder1.id });
        yield service.export({ path: filePath, sourceFolderIds: [folder1.id] });
        yield Note_1.default.delete(note1.id);
        yield Note_1.default.delete(note2.id);
        yield Folder_1.default.delete(folder1.id);
        yield service.import({ path: filePath });
        expect(yield Note_1.default.count()).toBe(2);
        expect(yield Folder_1.default.count()).toBe(1);
        const note1_2 = yield Note_1.default.loadByTitle('ma note');
        const note2_2 = yield Note_1.default.loadByTitle('ma deuxième note');
        expect(note2_2.body.indexOf(note1_2.id) >= 0).toBe(true);
    })));
    it('should export selected notes in md format', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note11 = yield Note_1.default.save({ title: 'title note11', parent_id: folder1.id });
        note11 = yield Note_1.default.load(note11.id);
        const note12 = yield Note_1.default.save({ title: 'title note12', parent_id: folder1.id });
        yield Note_1.default.load(note12.id);
        let folder2 = yield Folder_1.default.save({ title: 'folder2', parent_id: folder1.id });
        folder2 = yield Folder_1.default.load(folder2.id);
        let note21 = yield Note_1.default.save({ title: 'title note21', parent_id: folder2.id });
        note21 = yield Note_1.default.load(note21.id);
        yield Folder_1.default.save({ title: 'folder3', parent_id: folder1.id });
        yield Folder_1.default.load(folder2.id);
        const outDir = exportDir();
        yield service.export({ path: outDir, format: 'md', sourceNoteIds: [note11.id, note21.id] });
        // verify that the md files exist
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/title note11.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/title note12.md`)).toBe(false);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/folder2`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/folder2/title note21.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder3`)).toBe(false);
    })));
    it('should export MD with unicode filenames', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const folder2 = yield Folder_1.default.save({ title: 'ジョプリン' });
        yield Note_1.default.save({ title: '生活', parent_id: folder1.id });
        yield Note_1.default.save({ title: '生活', parent_id: folder1.id });
        yield Note_1.default.save({ title: '生活', parent_id: folder1.id });
        yield Note_1.default.save({ title: '', parent_id: folder1.id });
        yield Note_1.default.save({ title: '', parent_id: folder1.id });
        yield Note_1.default.save({ title: 'salut, ça roule ?', parent_id: folder1.id });
        yield Note_1.default.save({ title: 'ジョプリン', parent_id: folder2.id });
        const outDir = exportDir();
        yield service.export({ path: outDir, format: 'md' });
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/生活.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/生活 (1).md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/生活 (2).md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/Untitled.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/Untitled (1).md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/folder1/salut, ça roule _.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${outDir}/ジョプリン/ジョプリン.md`)).toBe(true);
    })));
    it('should export a notebook as MD', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'testexportfolder' });
        yield Note_1.default.save({ title: 'textexportnote1', parent_id: folder1.id });
        yield Note_1.default.save({ title: 'textexportnote2', parent_id: folder1.id });
        const service = InteropService_1.default.instance();
        yield service.export({
            path: exportDir(),
            format: 'md',
            sourceFolderIds: [folder1.id],
        });
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote1.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote2.md`)).toBe(true);
    })));
    it('should export conflict notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'testexportfolder' });
        yield Note_1.default.save({ title: 'textexportnote1', parent_id: folder1.id, is_conflict: 1 });
        yield Note_1.default.save({ title: 'textexportnote2', parent_id: folder1.id });
        const service = InteropService_1.default.instance();
        yield service.export({
            path: exportDir(),
            format: 'md',
            sourceFolderIds: [folder1.id],
            includeConflicts: false,
        });
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote1.md`)).toBe(false);
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote2.md`)).toBe(true);
        yield recreateExportDir();
        yield service.export({
            path: exportDir(),
            format: 'md',
            sourceFolderIds: [folder1.id],
            includeConflicts: true,
        });
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote1.md`)).toBe(true);
        expect(yield shim_1.default.fsDriver().exists(`${exportDir()}/testexportfolder/textexportnote2.md`)).toBe(true);
    })));
    it('should not try to export folders with a non-existing parent', (() => __awaiter(this, void 0, void 0, function* () {
        // Handles and edge case where user has a folder but this folder with a parent
        // that doesn't exist. Can happen for example in this case:
        //
        // - folder1/folder2
        // - Client 1 sync folder2, but not folder1
        // - Client 2 sync and get folder2 only
        // - Client 2 export data
        // => Crash if we don't handle this case
        yield Folder_1.default.save({ title: 'orphan', parent_id: '0c5bbd8a1b5a48189484a412a7e534cc' });
        const service = InteropService_1.default.instance();
        const result = yield service.export({
            path: exportDir(),
            format: 'md',
        });
        expect(result.warnings.length).toBe(0);
    })));
    it('should allow registering new import modules', (() => __awaiter(this, void 0, void 0, function* () {
        const testImportFilePath = `${exportDir()}/testImport${Math.random()}.test`;
        yield shim_1.default.fsDriver().writeFile(testImportFilePath, 'test', 'utf8');
        const result = {
            hasBeenExecuted: false,
            sourcePath: '',
        };
        const module = {
            type: types_1.ModuleType.Importer,
            description: 'Test Import Module',
            format: 'testing',
            fileExtensions: ['test'],
            isCustom: true,
            onExec: (context) => __awaiter(this, void 0, void 0, function* () {
                result.hasBeenExecuted = true;
                result.sourcePath = context.sourcePath;
            }),
        };
        const service = InteropService_1.default.instance();
        service.registerModule(module);
        yield service.import({
            format: 'testing',
            path: testImportFilePath,
        });
        expect(result.hasBeenExecuted).toBe(true);
        expect(result.sourcePath).toBe(testImportFilePath);
    })));
    it('should allow registering new export modules', (() => __awaiter(this, void 0, void 0, function* () {
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'note1', parent_id: folder1.id });
        yield Note_1.default.save({ title: 'note2', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const filePath = `${exportDir()}/example.test`;
        const result = {
            destPath: '',
            itemTypes: [],
            items: [],
            resources: [],
            filePaths: [],
            closeCalled: false,
        };
        const module = {
            type: types_1.ModuleType.Exporter,
            description: 'Test Export Module',
            format: 'testing',
            fileExtensions: ['test'],
            isCustom: true,
            onInit: (context) => __awaiter(this, void 0, void 0, function* () {
                result.destPath = context.destPath;
            }),
            onProcessItem: (_context, itemType, item) => __awaiter(this, void 0, void 0, function* () {
                result.itemTypes.push(itemType);
                result.items.push(item);
            }),
            onProcessResource: (_context, resource, filePath) => __awaiter(this, void 0, void 0, function* () {
                result.resources.push(resource);
                result.filePaths.push(filePath);
            }),
            onClose: (_context) => __awaiter(this, void 0, void 0, function* () {
                result.closeCalled = true;
            }),
        };
        const service = InteropService_1.default.instance();
        service.registerModule(module);
        yield service.export({
            format: 'testing',
            path: filePath,
        });
        expect(result.destPath).toBe(filePath);
        expect(result.itemTypes.sort().join('_')).toBe('1_1_2_4');
        expect(result.items.length).toBe(4);
        expect(result.items.map((o) => o.title).sort().join('_')).toBe('folder1_note1_note2_photo.jpg');
        expect(result.resources.length).toBe(1);
        expect(result.resources[0].title).toBe('photo.jpg');
        expect(result.filePaths.length).toBe(1);
        expect(!!result.filePaths[0]).toBe(true);
        expect(result.closeCalled).toBe(true);
    })));
});
//# sourceMappingURL=services_InteropService.js.map