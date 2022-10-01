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
const { synchronizerStart, allSyncTargetItemsEncrypted, kvStore, setupDatabaseAndSynchronizer, synchronizer, fileApi, switchClient, encryptionService, loadEncryptionMasterKey, decryptionWorker, checkThrowAsync } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const Resource_1 = require("@joplin/lib/models/Resource");
const ResourceFetcher_1 = require("@joplin/lib/services/ResourceFetcher");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
let insideBeforeEach = false;
describe('Synchronizer.e2ee', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        insideBeforeEach = true;
        yield setupDatabaseAndSynchronizer(1);
        yield setupDatabaseAndSynchronizer(2);
        yield switchClient(1);
        done();
        insideBeforeEach = false;
    }));
    it('notes and folders should get encrypted when encryption is enabled', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        let note1 = yield Note_1.default.save({ title: 'un', body: 'to be encrypted', parent_id: folder1.id });
        yield synchronizerStart();
        // After synchronisation, remote items should be encrypted but local ones remain plain text
        note1 = yield Note_1.default.load(note1.id);
        expect(note1.title).toBe('un');
        yield switchClient(2);
        yield synchronizerStart();
        let folder1_2 = yield Folder_1.default.load(folder1.id);
        let note1_2 = yield Note_1.default.load(note1.id);
        const masterKey_2 = yield MasterKey_1.default.load(masterKey.id);
        // On this side however it should be received encrypted
        expect(!note1_2.title).toBe(true);
        expect(!folder1_2.title).toBe(true);
        expect(!!note1_2.encryption_cipher_text).toBe(true);
        expect(!!folder1_2.encryption_cipher_text).toBe(true);
        // Master key is already encrypted so it does not get re-encrypted during sync
        expect(masterKey_2.content).toBe(masterKey.content);
        expect(masterKey_2.checksum).toBe(masterKey.checksum);
        // Now load the master key we got from client 1 and try to decrypt
        yield encryptionService().loadMasterKey_(masterKey_2, '123456', true);
        // Get the decrypted items back
        yield Folder_1.default.decrypt(folder1_2);
        yield Note_1.default.decrypt(note1_2);
        folder1_2 = yield Folder_1.default.load(folder1.id);
        note1_2 = yield Note_1.default.load(note1.id);
        // Check that properties match the original items. Also check
        // the encryption did not affect the updated_time timestamp.
        expect(note1_2.title).toBe(note1.title);
        expect(note1_2.body).toBe(note1.body);
        expect(note1_2.updated_time).toBe(note1.updated_time);
        expect(!note1_2.encryption_cipher_text).toBe(true);
        expect(folder1_2.title).toBe(folder1.title);
        expect(folder1_2.updated_time).toBe(folder1.updated_time);
        expect(!folder1_2.encryption_cipher_text).toBe(true);
    })));
    it('should enable encryption automatically when downloading new master key (and none was previously available)', (() => __awaiter(this, void 0, void 0, function* () {
        // Enable encryption on client 1 and sync an item
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        let folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        // Synchronising should enable encryption since we're going to get a master key
        expect(Setting_1.default.value('encryption.enabled')).toBe(false);
        yield synchronizerStart();
        expect(Setting_1.default.value('encryption.enabled')).toBe(true);
        // Check that we got the master key from client 1
        const masterKey = (yield MasterKey_1.default.all())[0];
        expect(!!masterKey).toBe(true);
        // Since client 2 hasn't supplied a password yet, no master key is currently loaded
        expect(encryptionService().loadedMasterKeyIds().length).toBe(0);
        // If we sync now, nothing should be sent to target since we don't have a password.
        // Technically it's incorrect to set the property of an encrypted variable but it allows confirming
        // that encryption doesn't work if user hasn't supplied a password.
        yield BaseItem_1.default.forceSync(folder1.id);
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        folder1 = yield Folder_1.default.load(folder1.id);
        expect(folder1.title).toBe('folder1'); // Still at old value
        yield switchClient(2);
        // Now client 2 set the master key password
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        // Now that master key should be loaded
        expect(encryptionService().loadedMasterKeyIds()[0]).toBe(masterKey.id);
        // Decrypt all the data. Now change the title and sync again - this time the changes should be transmitted
        yield decryptionWorker().start();
        yield Folder_1.default.save({ id: folder1.id, title: 'change test' });
        // If we sync now, this time client 1 should get the changes we did earlier
        yield synchronizerStart();
        yield switchClient(1);
        yield synchronizerStart();
        // Decrypt the data we just got
        yield decryptionWorker().start();
        folder1 = yield Folder_1.default.load(folder1.id);
        expect(folder1.title).toBe('change test'); // Got title from client 2
    })));
    it('should encrypt existing notes too when enabling E2EE', (() => __awaiter(this, void 0, void 0, function* () {
        // First create a folder, without encryption enabled, and sync it
        yield Folder_1.default.save({ title: 'folder1' });
        yield synchronizerStart();
        let files = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        let content = yield fileApi().get(files.items[0].path);
        expect(content.indexOf('folder1') >= 0).toBe(true);
        // Then enable encryption and sync again
        let masterKey = yield encryptionService().generateMasterKey('123456');
        masterKey = yield MasterKey_1.default.save(masterKey);
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        // Even though the folder has not been changed it should have been synced again so that
        // an encrypted version of it replaces the decrypted version.
        files = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        expect(files.items.length).toBe(2);
        // By checking that the folder title is not present, we can confirm that the item has indeed been encrypted
        // One of the two items is the master key
        content = yield fileApi().get(files.items[0].path);
        expect(content.indexOf('folder1') < 0).toBe(true);
        content = yield fileApi().get(files.items[1].path);
        expect(content.indexOf('folder1') < 0).toBe(true);
    })));
    it('should upload decrypted items to sync target after encryption disabled', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        yield Folder_1.default.save({ title: 'folder1' });
        yield synchronizerStart();
        let allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(true);
        yield encryptionService().disableEncryption();
        yield synchronizerStart();
        allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(false);
    })));
    it('should not upload any item if encryption was enabled, and items have not been decrypted, and then encryption disabled', (() => __awaiter(this, void 0, void 0, function* () {
        // For some reason I can't explain, this test is sometimes executed before beforeEach is finished
        // which means it's going to fail in unexpected way. So the loop below wait for beforeEach to be done.
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        yield Folder_1.default.save({ title: 'folder1' });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        expect(Setting_1.default.value('encryption.enabled')).toBe(true);
        // If we try to disable encryption now, it should throw an error because some items are
        // currently encrypted. They must be decrypted first so that they can be sent as
        // plain text to the sync target.
        // let hasThrown = await checkThrowAsync(async () => await encryptionService().disableEncryption());
        // expect(hasThrown).toBe(true);
        // Now supply the password, and decrypt the items
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        // Try to disable encryption again
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield encryptionService().disableEncryption(); }));
        expect(hasThrown).toBe(false);
        // If we sync now the target should receive the decrypted items
        yield synchronizerStart();
        const allEncrypted = yield allSyncTargetItemsEncrypted();
        expect(allEncrypted).toBe(false);
    })));
    it('should set the resource file size after decryption', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        const masterKey = yield loadEncryptionMasterKey();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resource1 = (yield Resource_1.default.all())[0];
        yield Resource_1.default.setFileSizeOnly(resource1.id, -1);
        Resource_1.default.fullPath(resource1);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        const fetcher = new ResourceFetcher_1.default(() => { return synchronizer().api(); });
        fetcher.queueDownload_(resource1.id);
        yield fetcher.waitForAllFinished();
        yield decryptionWorker().start();
        const resource1_2 = yield Resource_1.default.load(resource1.id);
        expect(resource1_2.size).toBe(2720);
    })));
    it('should encrypt remote resources after encryption has been enabled', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(false);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(true);
    })));
    it('should upload encrypted resource, but it should not mark the blob as encrypted locally', (() => __awaiter(this, void 0, void 0, function* () {
        while (insideBeforeEach)
            yield time_1.default.msleep(100);
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'ma note', parent_id: folder1.id });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        const resource1 = (yield Resource_1.default.all())[0];
        expect(resource1.encryption_blob_encrypted).toBe(0);
    })));
    it('should decrypt the resource metadata, but not try to decrypt the file, if it is not present', (() => __awaiter(this, void 0, void 0, function* () {
        const note1 = yield Note_1.default.save({ title: 'note' });
        yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        expect(yield allSyncTargetItemsEncrypted()).toBe(true);
        yield switchClient(2);
        yield synchronizerStart();
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield decryptionWorker().start();
        let resource = (yield Resource_1.default.all())[0];
        expect(!!resource.encryption_applied).toBe(false);
        expect(!!resource.encryption_blob_encrypted).toBe(true);
        const resourceFetcher = new ResourceFetcher_1.default(() => { return synchronizer().api(); });
        yield resourceFetcher.start();
        yield resourceFetcher.waitForAllFinished();
        const ls = yield Resource_1.default.localState(resource);
        expect(ls.fetch_status).toBe(Resource_1.default.FETCH_STATUS_DONE);
        yield decryptionWorker().start();
        resource = (yield Resource_1.default.all())[0];
        expect(!!resource.encryption_blob_encrypted).toBe(false);
    })));
    it('should stop trying to decrypt item after a few attempts', (() => __awaiter(this, void 0, void 0, function* () {
        let hasThrown;
        const note = yield Note_1.default.save({ title: 'ma note' });
        const masterKey = yield loadEncryptionMasterKey();
        yield encryptionService().enableEncryption(masterKey, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        // First, simulate a broken note and check that the decryption worker
        // gives up decrypting after a number of tries. This is mainly relevant
        // for data that crashes the mobile application - we don't want to keep
        // decrypting these.
        const encryptedNote = yield Note_1.default.load(note.id);
        const goodCipherText = encryptedNote.encryption_cipher_text;
        yield Note_1.default.save({ id: note.id, encryption_cipher_text: 'doesntlookright' });
        Setting_1.default.setObjectValue('encryption.passwordCache', masterKey.id, '123456');
        yield encryptionService().loadMasterKeysFromSettings();
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        // Third time, an error is logged and no error is thrown
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(false);
        const disabledItems = yield decryptionWorker().decryptionDisabledItems();
        expect(disabledItems.length).toBe(1);
        expect(disabledItems[0].id).toBe(note.id);
        expect((yield kvStore().all()).length).toBe(1);
        yield kvStore().clear();
        // Now check that if it fails once but succeed the second time, the note
        // is correctly decrypted and the counters are cleared.
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(true);
        yield Note_1.default.save({ id: note.id, encryption_cipher_text: goodCipherText });
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield decryptionWorker().start({ errorHandler: 'throw' }); }));
        expect(hasThrown).toBe(false);
        const decryptedNote = yield Note_1.default.load(note.id);
        expect(decryptedNote.title).toBe('ma note');
        expect((yield kvStore().all()).length).toBe(0);
        expect((yield decryptionWorker().decryptionDisabledItems()).length).toBe(0);
    })));
    it('should not encrypt notes that are shared', (() => __awaiter(this, void 0, void 0, function* () {
        Setting_1.default.setValue('encryption.enabled', true);
        yield loadEncryptionMasterKey();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        const note1 = yield Note_1.default.save({ title: 'un', parent_id: folder1.id });
        let note2 = yield Note_1.default.save({ title: 'deux', parent_id: folder1.id });
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        yield switchClient(1);
        const origNote2 = Object.assign({}, note2);
        yield BaseItem_1.default.updateShareStatus(note2, true);
        note2 = yield Note_1.default.load(note2.id);
        // Sharing a note should not modify the timestamps
        expect(note2.user_updated_time).toBe(origNote2.user_updated_time);
        expect(note2.user_created_time).toBe(origNote2.user_created_time);
        yield synchronizerStart();
        yield switchClient(2);
        yield synchronizerStart();
        // The shared note should be decrypted
        const note2_2 = yield Note_1.default.load(note2.id);
        expect(note2_2.title).toBe('deux');
        expect(note2_2.is_shared).toBe(1);
        // The non-shared note should be encrypted
        const note1_2 = yield Note_1.default.load(note1.id);
        expect(note1_2.title).toBe('');
    })));
});
//# sourceMappingURL=Synchronizer.e2ee.js.map