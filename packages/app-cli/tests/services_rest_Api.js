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
const types_1 = require("@joplin/lib/models/utils/types");
const Api_1 = require("@joplin/lib/services/rest/Api");
const shim_1 = require("@joplin/lib/shim");
const { setupDatabaseAndSynchronizer, switchClient, checkThrowAsync, db, msleep } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Resource_1 = require("@joplin/lib/models/Resource");
const Note_1 = require("@joplin/lib/models/Note");
const Tag_1 = require("@joplin/lib/models/Tag");
const NoteTag_1 = require("@joplin/lib/models/NoteTag");
const ResourceService_1 = require("@joplin/lib/services/ResourceService");
const SearchEngine_1 = require("@joplin/lib/services/searchengine/SearchEngine");
const createFolderForPagination = (num, time) => __awaiter(void 0, void 0, void 0, function* () {
    yield Folder_1.default.save({
        title: `folder${num}`,
        updated_time: time,
        created_time: time,
    }, { autoTimestamp: false });
});
const createNoteForPagination = (numOrTitle, time) => __awaiter(void 0, void 0, void 0, function* () {
    const title = typeof numOrTitle === 'string' ? numOrTitle : `note${numOrTitle}`;
    const body = typeof numOrTitle === 'string' ? `Note body ${numOrTitle}` : `noteBody${numOrTitle}`;
    yield Note_1.default.save({
        title: title,
        body: body,
        updated_time: time,
        created_time: time,
    }, { autoTimestamp: false });
});
let api = null;
describe('services_rest_Api', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        api = new Api_1.default();
        yield setupDatabaseAndSynchronizer(1);
        yield switchClient(1);
        done();
    }));
    it('should ping', (() => __awaiter(this, void 0, void 0, function* () {
        const response = yield api.route(Api_1.RequestMethod.GET, 'ping');
        expect(response).toBe('JoplinClipperServer');
    })));
    it('should handle Not Found errors', (() => __awaiter(this, void 0, void 0, function* () {
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield api.route(Api_1.RequestMethod.GET, 'pong'); }));
        expect(hasThrown).toBe(true);
    })));
    it('should get folders', (() => __awaiter(this, void 0, void 0, function* () {
        yield Folder_1.default.save({ title: 'mon carnet' });
        const response = yield api.route(Api_1.RequestMethod.GET, 'folders');
        expect(response.items.length).toBe(1);
    })));
    it('should update folders', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'mon carnet' });
        yield api.route(Api_1.RequestMethod.PUT, `folders/${f1.id}`, null, JSON.stringify({
            title: 'modifié',
        }));
        const f1b = yield Folder_1.default.load(f1.id);
        expect(f1b.title).toBe('modifié');
    })));
    it('should delete folders', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'mon carnet' });
        yield api.route(Api_1.RequestMethod.DELETE, `folders/${f1.id}`);
        const f1b = yield Folder_1.default.load(f1.id);
        expect(!f1b).toBe(true);
    })));
    it('should create folders', (() => __awaiter(this, void 0, void 0, function* () {
        const response = yield api.route(Api_1.RequestMethod.POST, 'folders', null, JSON.stringify({
            title: 'from api',
        }));
        expect(!!response.id).toBe(true);
        const f = yield Folder_1.default.all();
        expect(f.length).toBe(1);
        expect(f[0].title).toBe('from api');
    })));
    it('should get one folder', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'mon carnet' });
        const response = yield api.route(Api_1.RequestMethod.GET, `folders/${f1.id}`);
        expect(response.id).toBe(f1.id);
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield api.route(Api_1.RequestMethod.GET, 'folders/doesntexist'); }));
        expect(hasThrown).toBe(true);
    })));
    it('should get the folder notes', (() => __awaiter(this, void 0, void 0, function* () {
        const f1 = yield Folder_1.default.save({ title: 'mon carnet' });
        const response2 = yield api.route(Api_1.RequestMethod.GET, `folders/${f1.id}/notes`);
        expect(response2.items.length).toBe(0);
        yield Note_1.default.save({ title: 'un', parent_id: f1.id });
        yield Note_1.default.save({ title: 'deux', parent_id: f1.id });
        const response = yield api.route(Api_1.RequestMethod.GET, `folders/${f1.id}/notes`);
        expect(response.items.length).toBe(2);
    })));
    it('should fail on invalid paths', (() => __awaiter(this, void 0, void 0, function* () {
        const hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield api.route(Api_1.RequestMethod.GET, 'schtroumpf'); }));
        expect(hasThrown).toBe(true);
    })));
    it('should get notes', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f1 = yield Folder_1.default.save({ title: 'mon carnet' });
        const f2 = yield Folder_1.default.save({ title: 'mon deuxième carnet' });
        const n1 = yield Note_1.default.save({ title: 'un', parent_id: f1.id });
        yield Note_1.default.save({ title: 'deux', parent_id: f1.id });
        const n3 = yield Note_1.default.save({ title: 'trois', parent_id: f2.id });
        response = yield api.route(Api_1.RequestMethod.GET, 'notes');
        expect(response.items.length).toBe(3);
        response = yield api.route(Api_1.RequestMethod.GET, `notes/${n1.id}`);
        expect(response.id).toBe(n1.id);
        response = yield api.route(Api_1.RequestMethod.GET, `notes/${n3.id}`, { fields: 'id,title' });
        expect(Object.getOwnPropertyNames(response).length).toBe(3);
        expect(response.id).toBe(n3.id);
        expect(response.title).toBe('trois');
    })));
    it('should create notes', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing',
            parent_id: f.id,
        }));
        expect(response.title).toBe('testing');
        expect(!!response.id).toBe(true);
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing',
            parent_id: f.id,
        }));
        expect(response.title).toBe('testing');
        expect(!!response.id).toBe(true);
    })));
    it('should allow setting note properties', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing',
            parent_id: f.id,
            latitude: '48.732071',
            longitude: '-3.458700',
            altitude: '21',
        }));
        const noteId = response.id;
        {
            const note = yield Note_1.default.load(noteId);
            expect(note.latitude).toBe('48.73207100');
            expect(note.longitude).toBe('-3.45870000');
            expect(note.altitude).toBe('21.0000');
        }
        yield api.route(Api_1.RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
            latitude: '49',
            longitude: '-3',
            altitude: '22',
        }));
        {
            const note = yield Note_1.default.load(noteId);
            expect(note.latitude).toBe('49.00000000');
            expect(note.longitude).toBe('-3.00000000');
            expect(note.altitude).toBe('22.0000');
        }
    })));
    it('should preserve user timestamps when creating notes', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        const updatedTime = Date.now() - 1000;
        const createdTime = Date.now() - 10000;
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            parent_id: f.id,
            user_updated_time: updatedTime,
            user_created_time: createdTime,
        }));
        expect(response.user_updated_time).toBe(updatedTime);
        expect(response.user_created_time).toBe(createdTime);
        const timeBefore = Date.now();
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            parent_id: f.id,
        }));
        const newNote = yield Note_1.default.load(response.id);
        expect(newNote.user_updated_time).toBeGreaterThanOrEqual(timeBefore);
        expect(newNote.user_created_time).toBeGreaterThanOrEqual(timeBefore);
    })));
    it('should preserve user timestamps when updating notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({ title: 'mon carnet' });
        const updatedTime = Date.now() - 1000;
        const createdTime = Date.now() - 10000;
        const response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            parent_id: folder.id,
        }));
        const noteId = response.id;
        {
            // Check that if user timestamps are supplied, they are preserved by the API
            yield api.route(Api_1.RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
                user_updated_time: updatedTime,
                user_created_time: createdTime,
                title: 'mod',
            }));
            const modNote = yield Note_1.default.load(noteId);
            expect(modNote.title).toBe('mod');
            expect(modNote.user_updated_time).toBe(updatedTime);
            expect(modNote.user_created_time).toBe(createdTime);
        }
        {
            // Check if no user timestamps are supplied they are automatically updated.
            const beforeTime = Date.now();
            yield api.route(Api_1.RequestMethod.PUT, `notes/${noteId}`, null, JSON.stringify({
                title: 'mod2',
            }));
            const modNote = yield Note_1.default.load(noteId);
            expect(modNote.title).toBe('mod2');
            expect(modNote.user_updated_time).toBeGreaterThanOrEqual(beforeTime);
            expect(modNote.user_created_time).toBeGreaterThanOrEqual(createdTime);
        }
    })));
    it('should create notes with supplied ID', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            id: '12345678123456781234567812345678',
            title: 'testing',
            parent_id: f.id,
        }));
        expect(response.id).toBe('12345678123456781234567812345678');
    })));
    it('should create todos', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'stuff to do' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing',
            parent_id: f.id,
            is_todo: 1,
        }));
        expect(response.is_todo).toBe(1);
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing 2',
            parent_id: f.id,
            is_todo: 0,
        }));
        expect(response.is_todo).toBe(0);
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing 3',
            parent_id: f.id,
        }));
        expect(response.is_todo).toBeUndefined();
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing 4',
            parent_id: f.id,
            is_todo: '1',
        }));
    })));
    it('should create folders with supplied ID', (() => __awaiter(this, void 0, void 0, function* () {
        const response = yield api.route(Api_1.RequestMethod.POST, 'folders', null, JSON.stringify({
            id: '12345678123456781234567812345678',
            title: 'from api',
        }));
        expect(response.id).toBe('12345678123456781234567812345678');
    })));
    it('should create notes with images', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing image',
            parent_id: f.id,
            image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
        }));
        const resources = yield Resource_1.default.all();
        expect(resources.length).toBe(1);
        const resource = resources[0];
        expect(response.body.indexOf(resource.id) >= 0).toBe(true);
    })));
    it('should not compress images uploaded through resource api', (() => __awaiter(this, void 0, void 0, function* () {
        const originalImagePath = `${__dirname}/../tests/support/photo-large.png`;
        yield api.route(Api_1.RequestMethod.POST, 'resources', null, JSON.stringify({
            title: 'testing resource',
        }), [
            {
                path: originalImagePath,
            },
        ]);
        const resources = yield Resource_1.default.all();
        expect(resources.length).toBe(1);
        const uploadedImagePath = Resource_1.default.fullPath(resources[0]);
        const originalImageSize = (yield shim_1.default.fsDriver().stat(originalImagePath)).size;
        const uploadedImageSize = (yield shim_1.default.fsDriver().stat(uploadedImagePath)).size;
        expect(originalImageSize).toEqual(uploadedImageSize);
    })));
    it('should delete resources', (() => __awaiter(this, void 0, void 0, function* () {
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing image',
            parent_id: f.id,
            image_data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII=',
        }));
        const resource = (yield Resource_1.default.all())[0];
        const filePath = Resource_1.default.fullPath(resource);
        expect(yield shim_1.default.fsDriver().exists(filePath)).toBe(true);
        yield api.route(Api_1.RequestMethod.DELETE, `resources/${resource.id}`);
        expect(yield shim_1.default.fsDriver().exists(filePath)).toBe(false);
        expect(!(yield Resource_1.default.load(resource.id))).toBe(true);
    })));
    it('should create notes from HTML', (() => __awaiter(this, void 0, void 0, function* () {
        let response = null;
        const f = yield Folder_1.default.save({ title: 'mon carnet' });
        response = yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({
            title: 'testing HTML',
            parent_id: f.id,
            body_html: '<b>Bold text</b>',
        }));
        expect(response.body).toBe('**Bold text**');
    })));
    it('should handle tokens', (() => __awaiter(this, void 0, void 0, function* () {
        api = new Api_1.default('mytoken');
        let hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield api.route(Api_1.RequestMethod.GET, 'notes'); }));
        expect(hasThrown).toBe(true);
        const response = yield api.route(Api_1.RequestMethod.GET, 'notes', { token: 'mytoken' });
        expect(response.items.length).toBe(0);
        hasThrown = yield checkThrowAsync(() => __awaiter(this, void 0, void 0, function* () { return yield api.route(Api_1.RequestMethod.POST, 'notes', null, JSON.stringify({ title: 'testing' })); }));
        expect(hasThrown).toBe(true);
    })));
    it('should add tags to notes', (() => __awaiter(this, void 0, void 0, function* () {
        const tag = yield Tag_1.default.save({ title: 'mon étiquette' });
        const note = yield Note_1.default.save({ title: 'ma note' });
        yield api.route(Api_1.RequestMethod.POST, `tags/${tag.id}/notes`, null, JSON.stringify({
            id: note.id,
        }));
        const noteIds = yield Tag_1.default.noteIds(tag.id);
        expect(noteIds[0]).toBe(note.id);
    })));
    it('should remove tags from notes', (() => __awaiter(this, void 0, void 0, function* () {
        const tag = yield Tag_1.default.save({ title: 'mon étiquette' });
        const note = yield Note_1.default.save({ title: 'ma note' });
        yield Tag_1.default.addNote(tag.id, note.id);
        yield api.route(Api_1.RequestMethod.DELETE, `tags/${tag.id}/notes/${note.id}`);
        const noteIds = yield Tag_1.default.noteIds(tag.id);
        expect(noteIds.length).toBe(0);
    })));
    it('should list all tag notes', (() => __awaiter(this, void 0, void 0, function* () {
        const tag = yield Tag_1.default.save({ title: 'mon étiquette' });
        const tag2 = yield Tag_1.default.save({ title: 'mon étiquette 2' });
        const note1 = yield Note_1.default.save({ title: 'ma note un' });
        const note2 = yield Note_1.default.save({ title: 'ma note deux' });
        yield Tag_1.default.addNote(tag.id, note1.id);
        yield Tag_1.default.addNote(tag.id, note2.id);
        const response = yield api.route(Api_1.RequestMethod.GET, `tags/${tag.id}/notes`);
        expect(response.items.length).toBe(2);
        expect('id' in response.items[0]).toBe(true);
        expect('title' in response.items[0]).toBe(true);
        const response2 = yield api.route(Api_1.RequestMethod.GET, `notes/${note1.id}/tags`);
        expect(response2.items.length).toBe(1);
        yield Tag_1.default.addNote(tag2.id, note1.id);
        const response3 = yield api.route(Api_1.RequestMethod.GET, `notes/${note1.id}/tags`, { fields: 'id' });
        expect(response3.items.length).toBe(2);
        // Also check that it only returns the required fields
        response3.items.sort((a, b) => {
            return a.id < b.id ? -1 : +1;
        });
        const sortedTagIds = [tag.id, tag2.id];
        sortedTagIds.sort();
        expect(JSON.stringify(response3.items)).toBe(`[{"id":"${sortedTagIds[0]}"},{"id":"${sortedTagIds[1]}"}]`);
    })));
    it('should update tags when updating notes', (() => __awaiter(this, void 0, void 0, function* () {
        const tag1 = yield Tag_1.default.save({ title: 'mon étiquette 1' });
        const tag2 = yield Tag_1.default.save({ title: 'mon étiquette 2' });
        const tag3 = yield Tag_1.default.save({ title: 'mon étiquette 3' });
        const note = yield Note_1.default.save({
            title: 'ma note un',
        });
        yield Tag_1.default.addNote(tag1.id, note.id);
        yield Tag_1.default.addNote(tag2.id, note.id);
        const response = yield api.route(Api_1.RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
            tags: `${tag1.title},${tag3.title}`,
        }));
        const tagIds = yield NoteTag_1.default.tagIdsByNoteId(note.id);
        expect(response.tags === `${tag1.title},${tag3.title}`).toBe(true);
        expect(tagIds.length === 2).toBe(true);
        expect(tagIds.includes(tag1.id)).toBe(true);
        expect(tagIds.includes(tag3.id)).toBe(true);
    })));
    it('should create and update tags when updating notes', (() => __awaiter(this, void 0, void 0, function* () {
        const tag1 = yield Tag_1.default.save({ title: 'mon étiquette 1' });
        const tag2 = yield Tag_1.default.save({ title: 'mon étiquette 2' });
        const newTagTitle = 'mon étiquette 3';
        const note = yield Note_1.default.save({
            title: 'ma note un',
        });
        yield Tag_1.default.addNote(tag1.id, note.id);
        yield Tag_1.default.addNote(tag2.id, note.id);
        const response = yield api.route(Api_1.RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
            tags: `${tag1.title},${newTagTitle}`,
        }));
        const newTag = yield Tag_1.default.loadByTitle(newTagTitle);
        const tagIds = yield NoteTag_1.default.tagIdsByNoteId(note.id);
        expect(response.tags === `${tag1.title},${newTag.title}`).toBe(true);
        expect(tagIds.length === 2).toBe(true);
        expect(tagIds.includes(tag1.id)).toBe(true);
        expect(tagIds.includes(newTag.id)).toBe(true);
    })));
    it('should not update tags if tags is not mentioned when updating', (() => __awaiter(this, void 0, void 0, function* () {
        const tag1 = yield Tag_1.default.save({ title: 'mon étiquette 1' });
        const tag2 = yield Tag_1.default.save({ title: 'mon étiquette 2' });
        const note = yield Note_1.default.save({
            title: 'ma note un',
        });
        yield Tag_1.default.addNote(tag1.id, note.id);
        yield Tag_1.default.addNote(tag2.id, note.id);
        const response = yield api.route(Api_1.RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
            title: 'Some other title',
        }));
        const tagIds = yield NoteTag_1.default.tagIdsByNoteId(note.id);
        expect(response.tags === undefined).toBe(true);
        expect(tagIds.length === 2).toBe(true);
        expect(tagIds.includes(tag1.id)).toBe(true);
        expect(tagIds.includes(tag2.id)).toBe(true);
    })));
    it('should remove tags from note if tags is set to empty string when updating', (() => __awaiter(this, void 0, void 0, function* () {
        const tag1 = yield Tag_1.default.save({ title: 'mon étiquette 1' });
        const tag2 = yield Tag_1.default.save({ title: 'mon étiquette 2' });
        const note = yield Note_1.default.save({
            title: 'ma note un',
        });
        yield Tag_1.default.addNote(tag1.id, note.id);
        yield Tag_1.default.addNote(tag2.id, note.id);
        const response = yield api.route(Api_1.RequestMethod.PUT, `notes/${note.id}`, null, JSON.stringify({
            tags: '',
        }));
        const tagIds = yield NoteTag_1.default.tagIdsByNoteId(note.id);
        expect(response.tags === '').toBe(true);
        expect(tagIds.length === 0).toBe(true);
    })));
    it('should paginate results', (() => __awaiter(this, void 0, void 0, function* () {
        yield createFolderForPagination(1, 1001);
        yield createFolderForPagination(2, 1002);
        yield createFolderForPagination(3, 1003);
        yield createFolderForPagination(4, 1004);
        {
            const baseQuery = {
                fields: ['id', 'title', 'updated_time'],
                limit: 2,
                order_dir: types_1.PaginationOrderDir.ASC,
                order_by: 'updated_time',
            };
            const r1 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign({}, baseQuery));
            expect(r1.has_more).toBe(true);
            expect(r1.items.length).toBe(2);
            expect(r1.items[0].title).toBe('folder1');
            expect(r1.items[1].title).toBe('folder2');
            const r2 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign(Object.assign({}, baseQuery), { page: 2 }));
            // The API currently doesn't check if there's effectively a
            // page of data after the current one. If the number of
            // returned items === limit, it sets `has_more` and the next
            // result set will be empty
            expect(r1.has_more).toBe(true);
            expect(r2.items.length).toBe(2);
            expect(r2.items[0].title).toBe('folder3');
            expect(r2.items[1].title).toBe('folder4');
            const r3 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign(Object.assign({}, baseQuery), { page: 3 }));
            expect(r3.items.length).toBe(0);
            expect(r3.has_more).toBe(false);
        }
        {
            const baseQuery = {
                fields: ['id', 'title', 'updated_time'],
                limit: 3,
                order_dir: types_1.PaginationOrderDir.ASC,
                order_by: 'updated_time',
            };
            const r1 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign({}, baseQuery));
            expect(r1.items.length).toBe(3);
            expect(r1.items[0].title).toBe('folder1');
            expect(r1.items[1].title).toBe('folder2');
            expect(r1.items[2].title).toBe('folder3');
            const r2 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign(Object.assign({}, baseQuery), { page: 2 }));
            expect(r2.items.length).toBe(1);
            expect(r2.items[0].title).toBe('folder4');
            expect(r2.has_more).toBe(false);
        }
    })));
    it('should paginate results and handle duplicate field values', (() => __awaiter(this, void 0, void 0, function* () {
        // If, for example, ordering by updated_time, and two of the rows
        // have the same updated_time, it should make sure that the sort
        // order is stable and all results are correctly returned.
        yield createFolderForPagination(1, 1001);
        yield createFolderForPagination(2, 1002);
        yield createFolderForPagination(3, 1002);
        yield createFolderForPagination(4, 1003);
        const baseQuery = {
            fields: ['id', 'title', 'updated_time'],
            limit: 2,
            order_dir: types_1.PaginationOrderDir.ASC,
            order_by: 'updated_time',
        };
        const r1 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign({}, baseQuery));
        expect(r1.items.length).toBe(2);
        expect(r1.items[0].title).toBe('folder1');
        expect(['folder2', 'folder3'].includes(r1.items[1].title)).toBe(true);
        const r2 = yield api.route(Api_1.RequestMethod.GET, 'folders', Object.assign(Object.assign({}, baseQuery), { page: 2 }));
        expect(r2.items.length).toBe(2);
        expect(r2.items[0].title).toBe(r1.items[1].title === 'folder2' ? 'folder3' : 'folder2');
        expect(r2.items[1].title).toBe('folder4');
    })));
    it('should paginate results and return the requested fields only', (() => __awaiter(this, void 0, void 0, function* () {
        yield createNoteForPagination(1, 1001);
        yield createNoteForPagination(2, 1002);
        yield createNoteForPagination(3, 1003);
        const baseQuery = {
            fields: ['id', 'title', 'body'],
            limit: 2,
            order_dir: types_1.PaginationOrderDir.ASC,
            order_by: 'updated_time',
        };
        const r1 = yield api.route(Api_1.RequestMethod.GET, 'notes', Object.assign({}, baseQuery));
        expect(Object.keys(r1.items[0]).sort().join(',')).toBe('body,id,title');
        expect(r1.items.length).toBe(2);
        expect(r1.items[0].title).toBe('note1');
        expect(r1.items[0].body).toBe('noteBody1');
        expect(r1.items[1].title).toBe('note2');
        expect(r1.items[1].body).toBe('noteBody2');
        const r2 = yield api.route(Api_1.RequestMethod.GET, 'notes', Object.assign(Object.assign({}, baseQuery), { fields: ['id'], page: 2 }));
        expect(Object.keys(r2.items[0]).sort().join(',')).toBe('id');
        expect(r2.items.length).toBe(1);
        expect(!!r2.items[0].id).toBe(true);
    })));
    it('should paginate folder notes', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({});
        const note1 = yield Note_1.default.save({ parent_id: folder.id });
        yield msleep(1);
        const note2 = yield Note_1.default.save({ parent_id: folder.id });
        yield msleep(1);
        const note3 = yield Note_1.default.save({ parent_id: folder.id });
        const r1 = yield api.route(Api_1.RequestMethod.GET, `folders/${folder.id}/notes`, {
            limit: 2,
        });
        expect(r1.items.length).toBe(2);
        expect(r1.items[0].id).toBe(note1.id);
        expect(r1.items[1].id).toBe(note2.id);
        const r2 = yield api.route(Api_1.RequestMethod.GET, `folders/${folder.id}/notes`, {
            limit: 2,
            page: 2,
        });
        expect(r2.items.length).toBe(1);
        expect(r2.items[0].id).toBe(note3.id);
    })));
    it('should sort search paginated results', (() => __awaiter(this, void 0, void 0, function* () {
        SearchEngine_1.default.instance().setDb(db());
        yield createNoteForPagination('note c', 1000);
        yield createNoteForPagination('note e', 1001);
        yield createNoteForPagination('note b', 1002);
        yield createNoteForPagination('note a', 1003);
        yield createNoteForPagination('note d', 1004);
        yield SearchEngine_1.default.instance().syncTables();
        {
            const baseQuery = {
                query: 'note',
                fields: ['id', 'title', 'updated_time'],
                limit: 3,
                order_dir: types_1.PaginationOrderDir.ASC,
                order_by: 'updated_time',
            };
            const r1 = yield api.route(Api_1.RequestMethod.GET, 'search', baseQuery);
            expect(r1.items[0].updated_time).toBe(1000);
            expect(r1.items[1].updated_time).toBe(1001);
            expect(r1.items[2].updated_time).toBe(1002);
            const r2 = yield api.route(Api_1.RequestMethod.GET, 'search', Object.assign(Object.assign({}, baseQuery), { page: 2 }));
            expect(r2.items[0].updated_time).toBe(1003);
            expect(r2.items[1].updated_time).toBe(1004);
        }
        {
            const baseQuery = {
                query: 'note',
                fields: ['id', 'title', 'updated_time'],
                limit: 2,
                order_dir: types_1.PaginationOrderDir.DESC,
                order_by: 'title',
            };
            const r1 = yield api.route(Api_1.RequestMethod.GET, 'search', baseQuery);
            expect(r1.items[0].title).toBe('note e');
            expect(r1.items[1].title).toBe('note d');
            const r2 = yield api.route(Api_1.RequestMethod.GET, 'search', Object.assign(Object.assign({}, baseQuery), { page: 2 }));
            expect(r2.items[0].title).toBe('note c');
            expect(r2.items[1].title).toBe('note b');
            const r3 = yield api.route(Api_1.RequestMethod.GET, 'search', Object.assign(Object.assign({}, baseQuery), { page: 3 }));
            expect(r3.items[0].title).toBe('note a');
        }
    })));
    it('should return default fields', (() => __awaiter(this, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({ title: 'folder' });
        const note1 = yield Note_1.default.save({ title: 'note1', parent_id: folder.id });
        yield Note_1.default.save({ title: 'note2', parent_id: folder.id });
        const tag = yield Tag_1.default.save({ title: 'tag' });
        yield Tag_1.default.addNote(tag.id, note1.id);
        {
            const r = yield api.route(Api_1.RequestMethod.GET, `folders/${folder.id}`);
            expect('id' in r).toBe(true);
            expect('title' in r).toBe(true);
            expect('parent_id' in r).toBe(true);
        }
        {
            const r = yield api.route(Api_1.RequestMethod.GET, `folders/${folder.id}/notes`);
            expect('id' in r.items[0]).toBe(true);
            expect('title' in r.items[0]).toBe(true);
            expect('parent_id' in r.items[0]).toBe(true);
        }
        {
            const r = yield api.route(Api_1.RequestMethod.GET, 'notes');
            expect('id' in r.items[0]).toBe(true);
            expect('title' in r.items[0]).toBe(true);
            expect('parent_id' in r.items[0]).toBe(true);
        }
        {
            const r = yield api.route(Api_1.RequestMethod.GET, `notes/${note1.id}/tags`);
            expect('id' in r.items[0]).toBe(true);
            expect('title' in r.items[0]).toBe(true);
        }
        {
            const r = yield api.route(Api_1.RequestMethod.GET, `tags/${tag.id}`);
            expect('id' in r).toBe(true);
            expect('title' in r).toBe(true);
        }
    })));
    it('should return the notes associated with a resource', (() => __awaiter(this, void 0, void 0, function* () {
        const note = yield Note_1.default.save({});
        yield shim_1.default.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
        const resource = (yield Resource_1.default.all())[0];
        const resourceService = new ResourceService_1.default();
        yield resourceService.indexNoteResources();
        const r = yield api.route(Api_1.RequestMethod.GET, `resources/${resource.id}/notes`);
        expect(r.items.length).toBe(1);
        expect(r.items[0].id).toBe(note.id);
    })));
    it('should return the resources associated with a note', (() => __awaiter(this, void 0, void 0, function* () {
        const note = yield Note_1.default.save({});
        yield shim_1.default.attachFileToNote(note, `${__dirname}/../tests/support/photo.jpg`);
        const resource = (yield Resource_1.default.all())[0];
        const r = yield api.route(Api_1.RequestMethod.GET, `notes/${note.id}/resources`);
        expect(r.items.length).toBe(1);
        expect(r.items[0].id).toBe(resource.id);
    })));
    it('should return search results', (() => __awaiter(this, void 0, void 0, function* () {
        SearchEngine_1.default.instance().setDb(db());
        for (let i = 0; i < 10; i++) {
            yield Note_1.default.save({ title: 'a' });
        }
        yield SearchEngine_1.default.instance().syncTables();
        // Mostly testing pagination below
        const r1 = yield api.route(Api_1.RequestMethod.GET, 'search', { query: 'a', limit: 4 });
        expect(r1.items.length).toBe(4);
        expect(r1.has_more).toBe(true);
        const r2 = yield api.route(Api_1.RequestMethod.GET, 'search', { query: 'a', limit: 4, page: 2 });
        expect(r2.items.length).toBe(4);
        expect(r2.has_more).toBe(true);
        const r3 = yield api.route(Api_1.RequestMethod.GET, 'search', { query: 'a', limit: 4, page: 3 });
        expect(r3.items.length).toBe(2);
        expect(!!r3.has_more).toBe(false);
        yield SearchEngine_1.default.instance().destroy();
    })));
});
//# sourceMappingURL=services_rest_Api.js.map