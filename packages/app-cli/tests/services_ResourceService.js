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
const NoteResource_1 = require("@joplin/lib/models/NoteResource");
const ResourceService_1 = require("@joplin/lib/services/ResourceService");
const shim_1 = require("@joplin/lib/shim");
const { resourceService, decryptionWorker, encryptionService, loadEncryptionMasterKey, allSyncTargetItemsEncrypted, setupDatabaseAndSynchronizer, db, synchronizer, switchClient } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const Resource_1 = require("@joplin/lib/models/Resource");
const SearchEngine_1 = require("@joplin/lib/services/searchengine/SearchEngine");
describe('services_ResourceService', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
    }));
    it('should delete orphaned resources', (() => __awaiter(this, void 0, void 0, function* () {
        const service = new ResourceService_1.default();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        const resourcePath = Resource_1.default.fullPath(resource1);
        yield service.indexNoteResources();
        yield service.deleteOrphanResources(0);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(true);
        yield Note_1.default.delete(note1.id);
        yield service.deleteOrphanResources(0);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(true);
        yield service.indexNoteResources();
        yield service.deleteOrphanResources(1000 * 60);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(true);
        yield service.deleteOrphanResources(0);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(false);
        expect(yield shim_1.default.fsDriver().exists(resourcePath)).toBe(false);
        expect(!(yield NoteResource_1.default.all()).length).toBe(true);
    })));
    it('should not delete resource if still associated with at least one note', (() => __awaiter(this, void 0, void 0, function* () {
        const service = new ResourceService_1.default();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        const note2 = yield Note_1.default.save({ title: 'ma deuxième note', parent_id: folder1.id });
        note1 = yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        yield service.indexNoteResources();
        yield Note_1.default.delete(note1.id);
        yield service.indexNoteResources();
        yield Note_1.default.save({ id: note2.id, body: Resource_1.default.markdownTag(resource1) });
        yield service.indexNoteResources();
        yield service.deleteOrphanResources(0);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(true);
    })));
    it('should not delete a resource that has never been associated with any note, because it probably means the resource came via sync, and associated note has not arrived yet', (() => __awaiter(this, void 0, void 0, function* () {
        const service = new ResourceService_1.default();
        yield shim_1.default.createResourceFromPath(`${__dirname}/../tests/support/photo.jpg`);
        yield service.indexNoteResources();
        yield service.deleteOrphanResources(0);
        expect((yield Resource_1.default.all()).length).toBe(1);
    })));
    it('should not delete resource if it is used in an IMG tag', (() => __awaiter(this, void 0, void 0, function* () {
        const service = new ResourceService_1.default();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        yield service.indexNoteResources();
        yield Note_1.default.save({ id: note1.id, body: `This is HTML: <img src=":/${resource1.id}"/>` });
        yield service.indexNoteResources();
        yield service.deleteOrphanResources(0);
        expect(!!(yield Resource_1.default.load(resource1.id))).toBe(true);
    })));
    it('should not process twice the same change', (() => __awaiter(this, void 0, void 0, function* () {
        const service = new ResourceService_1.default();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield service.indexNoteResources();
        const before = (yield NoteResource_1.default.all())[0];
        yield time_1.default.sleep(0.1);
        yield service.indexNoteResources();
        const after = (yield NoteResource_1.default.all())[0];
        expect(before.last_seen_time).toBe(after.last_seen_time);
    })));
    it('should not delete resources that are associated with an encrypted note', (() => __awaiter(this, void 0, void 0, function* () {
        // https://github.com/laurent22/joplin/issues/1433
        //
        // Client 1 and client 2 have E2EE setup.
        //
        // - Client 1 creates note N1 and add resource R1 to it
        // - Client 1 syncs
        // - Client 2 syncs and get N1
        // - Client 2 add resource R2 to N1
        // - Client 2 syncs
        // - Client 1 syncs
        // - Client 1 runs resource indexer - but because N1 hasn't been decrypted yet, it found that R1 is no longer associated with any note
        // - Client 1 decrypts notes, but too late
        //
        // Eventually R1 is deleted because service thinks that it was at some point associated with a note, but no longer.
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`); // R1
        yield resourceService().indexNoteResources();
        yield synchronizer().start();
        expect(yield allSyncTargetItemsEncrypted()).toBe(true);
        yield switchClient(2);
        yield synchronizer().start();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        {
            const n1 = yield Note_1.default.load(note1.id);
            yield shim_1.default.attachFileToNote(n1, `${__dirname}/../tests/support/photo.jpg`); // R2
        }
        yield synchronizer().start();
        yield switchClient(1);
        yield synchronizer().start();
        yield resourceService().indexNoteResources();
        yield resourceService().deleteOrphanResources(0); // Previously, R1 would be deleted here because it's not indexed
        expect((yield Resource_1.default.all()).length).toBe(2);
    })));
    it('should double-check if the resource is still linked before deleting it', (() => __awaiter(this, void 0, void 0, function* () {
        SearchEngine_1.default.instance().setDb(db()); // /!\ Note that we use the global search engine here, which we shouldn't but will work for now
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        note1 = yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield resourceService().indexNoteResources();
        const bodyWithResource = note1.body;
        yield Note_1.default.save({ id: note1.id, body: '' });
        yield resourceService().indexNoteResources();
        yield Note_1.default.save({ id: note1.id, body: bodyWithResource });
        yield SearchEngine_1.default.instance().syncTables();
        yield resourceService().deleteOrphanResources(0);
        expect((yield Resource_1.default.all()).length).toBe(1); // It should not have deleted the resource
        const nr = (yield NoteResource_1.default.all())[0];
        expect(!!nr.is_associated).toBe(true); // And it should have fixed the situation by re-indexing the note content
    })));
    // it('should auto-delete resource even if the associated note was deleted immediately', (async () => {
    // 	// Previoulsy, when a resource was be attached to a note, then the
    // 	// note was immediately deleted, the ResourceService would not have
    // 	// time to quick in an index the resource/note relation. It means
    // 	// that when doing the orphan resource deletion job, those
    // 	// resources would permanently stay behing.
    // 	// https://github.com/laurent22/joplin/issues/932
    // 	const service = new ResourceService();
    // 	let note = await Note.save({});
    // 	note = await shim.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
    // 	const resource = (await Resource.all())[0];
    // 	const noteIds = await NoteResource.associatedNoteIds(resource.id);
    // 	expect(noteIds[0]).toBe(note.id);
    // 	await Note.save({ id: note.id, body: '' });
    // 	await resourceService().indexNoteResources();
    // 	await service.deleteOrphanResources(0);
    // 	expect((await Resource.all()).length).toBe(0);
    // }));
});
//# sourceMappingURL=services_ResourceService.js.map