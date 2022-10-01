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
exports.localNotesFoldersSameAsRemote = exports.remoteResources = exports.remoteNotesFoldersResources = exports.remoteNotesAndFolders = exports.allNotesFolders = void 0;
const BaseModel_1 = require("@joplin/lib/BaseModel");
const { fileApi } = require('./test-utils.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
function allNotesFolders() {
    return __awaiter(this, void 0, void 0, function* () {
        const folders = yield Folder_1.default.all();
        const notes = yield Note_1.default.all();
        return folders.concat(notes);
    });
}
exports.allNotesFolders = allNotesFolders;
function remoteItemsByTypes(types) {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield fileApi().list('', { includeDirs: false, syncItemsOnly: true });
        if (list.has_more)
            throw new Error('Not implemented!!!');
        const files = list.items;
        const output = [];
        for (const file of files) {
            const remoteContent = yield fileApi().get(file.path);
            const content = yield BaseItem_1.default.unserialize(remoteContent);
            if (types.indexOf(content.type_) < 0)
                continue;
            output.push(content);
        }
        return output;
    });
}
function remoteNotesAndFolders() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER]);
    });
}
exports.remoteNotesAndFolders = remoteNotesAndFolders;
function remoteNotesFoldersResources() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER, BaseModel_1.default.TYPE_RESOURCE]);
    });
}
exports.remoteNotesFoldersResources = remoteNotesFoldersResources;
function remoteResources() {
    return __awaiter(this, void 0, void 0, function* () {
        return remoteItemsByTypes([BaseModel_1.default.TYPE_RESOURCE]);
    });
}
exports.remoteResources = remoteResources;
function localNotesFoldersSameAsRemote(locals, expect) {
    return __awaiter(this, void 0, void 0, function* () {
        let error = null;
        try {
            const nf = yield remoteNotesAndFolders();
            expect(locals.length).toBe(nf.length);
            for (let i = 0; i < locals.length; i++) {
                const dbItem = locals[i];
                const path = BaseItem_1.default.systemPath(dbItem);
                const remote = yield fileApi().stat(path);
                expect(!!remote).toBe(true);
                if (!remote)
                    continue;
                let remoteContent = yield fileApi().get(path);
                remoteContent = dbItem.type_ == BaseModel_1.default.TYPE_NOTE ? yield Note_1.default.unserialize(remoteContent) : yield Folder_1.default.unserialize(remoteContent);
                expect(remoteContent.title).toBe(dbItem.title);
            }
        }
        catch (e) {
            error = e;
        }
        expect(error).toBe(null);
    });
}
exports.localNotesFoldersSameAsRemote = localNotesFoldersSameAsRemote;
//# sourceMappingURL=test-utils-synchronizer.js.map