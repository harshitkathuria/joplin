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
const shim_1 = require("@joplin/lib/shim");
const fs = require('fs-extra');
const os = require('os');
const { filename } = require('@joplin/lib/path-utils');
const { setupDatabaseAndSynchronizer, switchClient, expectNotThrow } = require('./test-utils.js');
const { enexXmlToMd } = require('@joplin/lib/import-enex-md-gen.js');
const { importEnex } = require('@joplin/lib/import-enex');
const Note_1 = require("@joplin/lib/models/Note");
const Tag_1 = require("@joplin/lib/models/Tag");
const Resource_1 = require("@joplin/lib/models/Resource");
const enexSampleBaseDir = `${__dirname}/enex_to_md`;
describe('EnexToMd', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield setupDatabaseAndSynchronizer(1);
        yield switchClient(1);
        done();
    }));
    it('should convert ENEX content to Markdown', () => __awaiter(this, void 0, void 0, function* () {
        const files = yield shim_1.default.fsDriver().readDirStats(enexSampleBaseDir);
        for (let i = 0; i < files.length; i++) {
            const htmlFilename = files[i].path;
            if (htmlFilename.indexOf('.html') < 0)
                continue;
            const htmlPath = `${enexSampleBaseDir}/${htmlFilename}`;
            const mdPath = `${enexSampleBaseDir}/${filename(htmlFilename)}.md`;
            // if (htmlFilename !== 'multiline_inner_text.html') continue;
            const html = yield shim_1.default.fsDriver().readFile(htmlPath);
            let expectedMd = yield shim_1.default.fsDriver().readFile(mdPath);
            let actualMd = yield enexXmlToMd(`<div>${html}</div>`, []);
            if (os.EOL === '\r\n') {
                expectedMd = expectedMd.replace(/\r\n/g, '\n');
                actualMd = actualMd.replace(/\r\n/g, '\n');
            }
            if (actualMd !== expectedMd) {
                const result = [];
                result.push('');
                result.push(`Error converting file: ${htmlFilename}`);
                result.push('--------------------------------- Got:');
                result.push(actualMd.split('\n').map((l) => `"${l}"`).join('\n'));
                result.push('--------------------------------- Expected:');
                result.push(expectedMd.split('\n').map((l) => `"${l}"`).join('\n'));
                result.push('--------------------------------------------');
                result.push('');
                console.info(result.join('\n'));
                expect(false).toBe(true);
                // return;
            }
            else {
                expect(true).toBe(true);
            }
        }
    }));
    it('should import ENEX metadata', () => __awaiter(this, void 0, void 0, function* () {
        const filePath = `${enexSampleBaseDir}/sample-enex.xml`;
        yield importEnex('', filePath);
        const note = (yield Note_1.default.all())[0];
        expect(note.title).toBe('Test Note for Export');
        expect(note.body).toBe([
            '    Hello, World.',
            '',
            '![snapshot-DAE9FC15-88E3-46CF-B744-DA9B1B56EB57.jpg](:/3d0f4d01abc02cf8c4dc1c796df8c4b2)',
        ].join('\n'));
        expect(note.created_time).toBe(1375217524000);
        expect(note.updated_time).toBe(1376560800000);
        expect(note.latitude).toBe('33.88394692');
        expect(note.longitude).toBe('-117.91913551');
        expect(note.altitude).toBe('96.0000');
        expect(note.author).toBe('Brett Kelly');
        const tag = (yield Tag_1.default.tagsByNoteId(note.id))[0];
        expect(tag.title).toBe('fake-tag');
        const resource = (yield Resource_1.default.all())[0];
        expect(resource.id).toBe('3d0f4d01abc02cf8c4dc1c796df8c4b2');
        const stat = yield fs.stat(Resource_1.default.fullPath(resource));
        expect(stat.size).toBe(277);
    }));
    it('should handle invalid dates', () => __awaiter(this, void 0, void 0, function* () {
        const filePath = `${enexSampleBaseDir}/invalid_date.enex`;
        yield importEnex('', filePath);
        const note = (yield Note_1.default.all())[0];
        expect(note.created_time).toBe(1521822724000); // 20180323T163204Z
        expect(note.updated_time).toBe(1521822724000); // Because this date was invalid, it is set to the created time instead
    }));
    it('should handle empty resources', () => __awaiter(this, void 0, void 0, function* () {
        const filePath = `${enexSampleBaseDir}/empty_resource.enex`;
        yield expectNotThrow(() => importEnex('', filePath));
        const all = yield Resource_1.default.all();
        expect(all.length).toBe(1);
        expect(all[0].size).toBe(0);
    }));
    it('should handle empty note content', () => __awaiter(this, void 0, void 0, function* () {
        const filePath = `${enexSampleBaseDir}/empty_content.enex`;
        yield expectNotThrow(() => importEnex('', filePath));
        const all = yield Note_1.default.all();
        expect(all.length).toBe(1);
        expect(all[0].title).toBe('China and the case for stimulus.');
        expect(all[0].body).toBe('');
    }));
    it('should handle invalid mime types', () => __awaiter(this, void 0, void 0, function* () {
        // This is to handle the case where a resource has an invalid mime type,
        // but that type can be determined from the filename. For example, in
        // this thread, the ENEX file contains a "file.zip" file with a mime
        // type "application/octet-stream", which can later cause problems to
        // open the file.
        // https://discourse.joplinapp.org/t/importing-a-note-with-a-zip-file/12123?u=laurent
        const filePath = `${enexSampleBaseDir}/WithInvalidMime.enex`;
        yield importEnex('', filePath);
        const all = yield Resource_1.default.all();
        expect(all.length).toBe(1);
        expect(all[0].mime).toBe('application/zip');
    }));
    it('should keep importing notes when one of them is corrupted', () => __awaiter(this, void 0, void 0, function* () {
        const filePath = `${enexSampleBaseDir}/ImportTestCorrupt.enex`;
        const errors = [];
        yield importEnex('', filePath, {
            onError: (error) => errors.push(error),
        });
        const notes = yield Note_1.default.all();
        expect(notes.length).toBe(2);
        // Check that an error was recorded and that it includes the title
        // of the note, so that it can be found back by the user
        expect(errors.length).toBe(1);
        expect(errors[0].message.includes('Note 2')).toBe(true);
    }));
});
//# sourceMappingURL=EnexToMd.js.map