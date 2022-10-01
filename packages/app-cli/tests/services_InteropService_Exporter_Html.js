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
const test_utils_1 = require("./test-utils");
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const fs = require("fs-extra");
const test_utils_2 = require("./test-utils");
const types_1 = require("@joplin/lib/services/plugins/api/types");
function recreateExportDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = test_utils_1.exportDir();
        yield fs.remove(dir);
        yield fs.mkdirp(dir);
    });
}
describe('services_InteropService_Exporter_Html', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_1.setupDatabaseAndSynchronizer(1);
        yield test_utils_1.switchClient(1);
        yield recreateExportDir();
        done();
    }));
    test('should export HTML file', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield Note_1.default.save({ body: '**ma note**', parent_id: folder1.id });
        const filePath = `${test_utils_1.exportDir()}/test.html`;
        yield service.export({
            path: filePath,
            format: 'html',
        });
        const content = yield fs.readFile(filePath, 'utf8');
        expect(content).toContain('<strong>ma note</strong>');
    })));
    test('should export plugin assets', (() => __awaiter(this, void 0, void 0, function* () {
        const service = InteropService_1.default.instance();
        const folder1 = yield Folder_1.default.save({ title: 'folder1' });
        yield Note_1.default.save({ body: '**ma note**', parent_id: folder1.id });
        const filePath = `${test_utils_1.exportDir()}/test.html`;
        const contentScriptPath = test_utils_2.tempFilePath('js');
        yield fs.writeFile(contentScriptPath, `module.exports = {
			default: function(_context) { 
				return {
					plugin: function (markdownIt, _options) {
						
					}, 
					assets: function() {
						return [
							{ name: 'fence.css' }
						];
					},		
				}
			},
		}`);
        const assetPath = `${require('path').dirname(contentScriptPath)}/fence.css`;
        const fenceContent = 'strong { color: red; }';
        yield fs.writeFile(assetPath, fenceContent);
        const plugins = {
            'test': {
                id: 'test',
                contentScripts: {
                    [types_1.ContentScriptType.MarkdownItPlugin]: [
                        {
                            id: 'mdContentScript',
                            path: contentScriptPath,
                        },
                    ],
                },
                views: {},
            },
        };
        yield service.export({
            path: filePath,
            format: 'html',
            plugins,
        });
        const fenceRelativePath = 'pluginAssets/mdContentScript/fence.css';
        const content = yield fs.readFile(filePath, 'utf8');
        expect(content).toContain(fenceRelativePath);
        const readFenceContent = yield fs.readFile(`${test_utils_1.exportDir()}/${fenceRelativePath}`, 'utf8');
        expect(readFenceContent).toBe(fenceContent);
    })));
});
//# sourceMappingURL=services_InteropService_Exporter_Html.js.map