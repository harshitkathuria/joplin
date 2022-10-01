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
const shim_1 = require("@joplin/lib/shim");
const Setting_1 = require("@joplin/lib/models/Setting");
const test_utils_synchronizer_1 = require("./test-utils-synchronizer");
const { synchronizerStart, tempFilePath, resourceFetcher, setupDatabaseAndSynchronizer, synchronizer, fileApi, switchClient, syncTargetId, encryptionService, loadEncryptionMasterKey, fileContentEqual, checkThrowAsync } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const Resource_1 = require("@joplin/lib/models/Resource");
const ResourceFetcher_1 = require("@joplin/lib/services/ResourceFetcher");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
let insideBeforeEach = false;
describe('Synchronizer.resources', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        insideBeforeEach = true;
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
        insideBeforeEach = false;
    }));
    it('should sync resources', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        const resourcePath1 = Resource_1.default.fullPath(resource1);
        yield synchronizerStart();
        expect((yield test_utils_synchronizer_1.remoteNotesFoldersResources()).length).toBe(3);
        yield switchClient(2);
        yield synchronizerStart();
        const allResources = yield Resource_1.default.all();
        expect(allResources.length).toBe(1);
        let resource1_2 = allResources[0];
        let ls = yield Resource_1.default.localState(resource1_2);
        expect(resource1_2.id).toBe(resource1.id);
        expect(ls.fetch_status).toBe(Resource_1.default.FETCH_STATUS_IDLE);
        const fetcher = new ResourceFetcher_1.default(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1_2.id);
        yield fetcher.waitForAllFinished();
        resource1_2 = yield Resource_1.default.load(resource1.id);
        ls = yield Resource_1.default.localState(resource1_2);
        expect(ls.fetch_status).toBe(Resource_1.default.FETCH_STATUS_DONE);
        const resourcePath1_2 = Resource_1.default.fullPath(resource1_2);
        expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
    })));
    it('should handle resource download errors', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        let resource1 = (yield Resource_1.default.all())[0];
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        const fetcher = new ResourceFetcher_1.default(() => {
            return {
                // Simulate a failed download
                get: () => { return new Promise((_resolve, reject) => { reject(new Error('did not work')); }); },
            };
        });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        resource1 = yield Resource_1.default.load(resource1.id);
        const ls = yield Resource_1.default.localState(resource1);
        expect(ls.fetch_status).toBe(Resource_1.default.FETCH_STATUS_ERROR);
        expect(ls.fetch_error).toBe('did not work');
    })));
    it('should set the resource file size if it is missing', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let r1 = (yield Resource_1.default.all())[0];
        yield Resource_1.default.setFileSizeOnly(r1.id, -1);
        r1 = yield Resource_1.default.load(r1.id);
        expect(r1.size).toBe(-1);
        const fetcher = new ResourceFetcher_1.default(() => { return synchronizer().api(); });
        fetcher.queueDownload_(r1.id);
        yield fetcher.waitForAllFinished();
        r1 = yield Resource_1.default.load(r1.id);
        expect(r1.size).toBe(2720);
    })));
    it('should delete resources', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(500);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        const resourcePath1 = Resource_1.default.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        let allResources = yield Resource_1.default.all();
        expect(allResources.length).toBe(1);
        expect((yield test_utils_synchronizer_1.remoteNotesFoldersResources()).length).toBe(3);
        yield Resource_1.default.delete(resource1.id);
        yield synchronizerStart();
        expect((yield test_utils_synchronizer_1.remoteNotesFoldersResources()).length).toBe(2);
        const remoteBlob = yield fileApi().stat(`.resource/${resource1.id}`);
        expect(!remoteBlob).toBe(true);
        yield switchClient(1);
        expect(yield shim_1.default.fsDriver().exists(resourcePath1)).toBe(true);
        yield synchronizerStart();
        allResources = yield Resource_1.default.all();
        expect(allResources.length).toBe(0);
        expect(yield shim_1.default.fsDriver().exists(resourcePath1)).toBe(false);
    })));
    it('should encrypt resources', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        const resourcePath1 = Resource_1.default.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        const fetcher = new ResourceFetcher_1.default(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        let resource1_2 = (yield Resource_1.default.all())[0];
        resource1_2 = yield Resource_1.default.decrypt(resource1_2);
        const resourcePath1_2 = Resource_1.default.fullPath(resource1_2);
        expect(fileContentEqual(resourcePath1, resourcePath1_2)).toBe(true);
    })));
    it('should sync resource blob changes', (() => __awaiter(this, void 0, void 0, function* () {
        const tempFile = tempFilePath('txt');
        yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, tempFile);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield resourceFetcher().start();
        yield resourceFetcher().waitForAllFinished();
        let resource1_2 = (yield Resource_1.default.all())[0];
        const modFile = tempFilePath('txt');
        yield shim_1.default.fsDriver().writeFile(modFile, '1234 MOD', 'utf8');
        yield Resource_1.default.updateResourceBlobContent(resource1_2.id, modFile);
        const originalSize = resource1_2.size;
        resource1_2 = (yield Resource_1.default.all())[0];
        const newSize = resource1_2.size;
        expect(originalSize).toBe(4);
        expect(newSize).toBe(8);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        yield resourceFetcher().start();
        yield resourceFetcher().waitForAllFinished();
        const resource1_1 = (yield Resource_1.default.all())[0];
        expect(resource1_1.size).toBe(newSize);
        expect(yield Resource_1.default.resourceBlobContent(resource1_1.id, 'utf8')).toBe('1234 MOD');
    })));
    it('should handle resource conflicts', (() => __awaiter(this, void 0, void 0, function* () {
        {
            const tempFile = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
            const folder1 = yield Folder_1.default.save({ title: 'folder1' });
            const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
            yield shim_1.default.attachFileToNote(note1, tempFile);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            yield synchronizerStart();
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
            const resource = (yield Resource_1.default.all())[0];
            const modFile2 = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(modFile2, '1234 MOD 2', 'utf8');
            yield Resource_1.default.updateResourceBlobContent(resource.id, modFile2);
            yield synchronizerStart();
        }
        yield switchClient(1);
        {
            // Going to modify a resource without syncing first, which will cause a conflict
            const resource = (yield Resource_1.default.all())[0];
            const modFile1 = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(modFile1, '1234 MOD 1', 'utf8');
            yield Resource_1.default.updateResourceBlobContent(resource.id, modFile1);
            yield synchronizerStart(); // CONFLICT
            // If we try to read the resource content now, it should throw because the local
            // content has been moved to the conflict notebook, and the new local content
            // has not been downloaded yet.
            yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield Resource_1.default.resourceBlobContent(resource.id); }));
            // Now download resources, and our local content would have been overwritten by
            // the content from client 2
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
            const localContent = yield Resource_1.default.resourceBlobContent(resource.id, 'utf8');
            expect(localContent).toBe('1234 MOD 2');
            // Check that the Conflict note has been generated, with the conflict resource
            // attached to it, and check that it has the original content.
            const allNotes = yield Note_1.default.all();
            expect(allNotes.length).toBe(2);
            const conflictNote = allNotes.find((v) => {
                return !!v.is_conflict;
            });
            expect(!!conflictNote).toBe(true);
            const resourceIds = yield Note_1.default.linkedResourceIds(conflictNote.body);
            expect(resourceIds.length).toBe(1);
            const conflictContent = yield Resource_1.default.resourceBlobContent(resourceIds[0], 'utf8');
            expect(conflictContent).toBe('1234 MOD 1');
        }
    })));
    it('should handle resource conflicts if a resource is changed locally but deleted remotely', (() => __awaiter(this, void 0, void 0, function* () {
        {
            const tempFile = tempFilePath('txt');
            yield shim_1.default.fsDriver().writeFile(tempFile, '1234', 'utf8');
            const folder1 = yield Folder_1.default.save({ title: 'folder1' });
            const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
            yield shim_1.default.attachFileToNote(note1, tempFile);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            yield synchronizerStart();
            yield resourceFetcher().start();
            yield resourceFetcher().waitForAllFinished();
        }
        yield switchClient(1);
        {
            const resource = (yield Resource_1.default.all())[0];
            yield Resource_1.default.delete(resource.id);
            yield synchronizerStart();
        }
        yield switchClient(2);
        {
            const originalResource = (yield Resource_1.default.all())[0];
            yield Resource_1.default.save({ id: originalResource.id, title: 'modified resource' });
            yield synchronizerStart(); // CONFLICT
            const deletedResource = yield Resource_1.default.load(originalResource.id);
            expect(!deletedResource).toBe(true);
            const allResources = yield Resource_1.default.all();
            expect(allResources.length).toBe(1);
            const conflictResource = allResources[0];
            expect(originalResource.id).not.toBe(conflictResource.id);
            expect(conflictResource.title).toBe('modified resource');
        }
    })));
    it('should not upload a resource if it has not been fetched yet', (() => __awaiter(this, void 0, void 0, function* () {
        // In some rare cases, the synchronizer might try to upload a resource even though it
        // doesn't have the resource file. It can happen in this situation:
        // - C1 create resource
        // - C1 sync
        // - C2 sync
        // - C2 resource metadata is received but ResourceFetcher hasn't downloaded the file yet
        // - C2 enables E2EE - all the items are marked for forced sync
        // - C2 sync
        // The synchronizer will try to upload the resource, even though it doesn't have the file,
        // so we need to make sure it doesn't. But also that once it gets the file, the resource
        // does get uploaded.
        const note1 = yield Note_1.default.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource = (yield Resource_1.default.all())[0];
        yield Resource_1.default.setLocalState(resource.id, { fetch_status: Resource_1.default.FETCH_STATUS_IDLE });
        yield synchronizerStart();
        expect((yield test_utils_synchronizer_1.remoteResources()).length).toBe(0);
        yield Resource_1.default.setLocalState(resource.id, { fetch_status: Resource_1.default.FETCH_STATUS_DONE });
        yield synchronizerStart();
        expect((yield test_utils_synchronizer_1.remoteResources()).length).toBe(1);
    })));
    it('should not download resources over the limit', (() => __awaiter(this, void 0, void 0, function* () {
        const note1 = yield Note_1.default.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizer().start();
        yield switchClient(2);
        const previousMax = synchronizer().maxResourceSize_;
        synchronizer().maxResourceSize_ = 1;
        yield synchronizerStart();
        synchronizer().maxResourceSize_ = previousMax;
        const syncItems = yield BaseItem_1.default.allSyncItems(syncTargetId());
        expect(syncItems.length).toBe(2);
        expect(syncItems[1].item_location).toBe(BaseItem_1.default.SYNC_ITEM_LOCATION_REMOTE);
        expect(syncItems[1].sync_disabled).toBe(1);
    })));
});
//# sourceMappingURL=Synchronizer.resources.js.map