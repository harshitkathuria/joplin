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
const Note_1 = require("@joplin/lib/models/Note");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
const shim_1 = require("@joplin/lib/shim");
const Resource_1 = require("@joplin/lib/models/Resource");
describe('Synchronizer.sharing', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.setupDatabaseAndSynchronizer(1);
        yield test_utils_1.setupDatabaseAndSynchronizer(2);
        yield test_utils_1.switchClient(1);
        done();
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.afterAllCleanUp();
    }));
    it('should mark link resources as shared before syncing', (() => __awaiter(this, void 0, void 0, function* () {
        let note1 = yield Note_1.default.save({ title: 'note1' });
        note1 = yield shim_1.default.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
        const resourceId1 = (yield Note_1.default.linkedResourceIds(note1.body))[0];
        const note2 = yield Note_1.default.save({ title: 'note2' });
        yield shim_1.default.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);
        expect((yield Resource_1.default.sharedResourceIds()).length).toBe(0);
        yield BaseItem_1.default.updateShareStatus(note1, true);
        yield test_utils_1.synchronizerStart();
        const sharedResourceIds = yield Resource_1.default.sharedResourceIds();
        expect(sharedResourceIds.length).toBe(1);
        expect(sharedResourceIds[0]).toBe(resourceId1);
    })));
});
//# sourceMappingURL=Synchronizer.sharing.js.map