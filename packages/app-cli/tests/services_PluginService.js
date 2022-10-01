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
const PluginRunner_1 = require("../app/services/plugins/PluginRunner");
const PluginService_1 = require("@joplin/lib/services/plugins/PluginService");
const types_1 = require("@joplin/lib/services/plugins/api/types");
const MdToHtml_1 = require("@joplin/renderer/MdToHtml");
const shim_1 = require("@joplin/lib/shim");
const Setting_1 = require("@joplin/lib/models/Setting");
const fs = require("fs-extra");
const Note_1 = require("@joplin/lib/models/Note");
const Folder_1 = require("@joplin/lib/models/Folder");
const test_utils_1 = require("./test-utils");
const test_utils_js_1 = require("./test-utils.js");
const testPluginDir = `${__dirname}/../tests/support/plugins`;
function newPluginService(appVersion = '1.4') {
    const runner = new PluginRunner_1.default();
    const service = new PluginService_1.default();
    service.initialize(appVersion, {
        joplin: {},
    }, runner, {
        dispatch: () => { },
        getState: () => { },
    });
    return service;
}
describe('services_PluginService', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        yield test_utils_js_1.setupDatabaseAndSynchronizer(1);
        yield test_utils_js_1.switchClient(1);
        done();
    }));
    it('should load and run a simple plugin', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins([`${testPluginDir}/simple`], {});
        expect(() => service.pluginById('org.joplinapp.plugins.Simple')).not.toThrowError();
        const allFolders = yield Folder_1.default.all();
        expect(allFolders.length).toBe(1);
        expect(allFolders[0].title).toBe('my plugin folder');
        const allNotes = yield Note_1.default.all();
        expect(allNotes.length).toBe(1);
        expect(allNotes[0].title).toBe('testing plugin!');
        expect(allNotes[0].parent_id).toBe(allFolders[0].id);
    })));
    it('should load and run a simple plugin and handle trailing slash', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins([`${testPluginDir}/simple/`], {});
        expect(() => service.pluginById('org.joplinapp.plugins.Simple')).not.toThrowError();
    })));
    it('should load and run a plugin that uses external packages', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins([`${testPluginDir}/withExternalModules`], {});
        expect(() => service.pluginById('org.joplinapp.plugins.ExternalModuleDemo')).not.toThrowError();
        const allFolders = yield Folder_1.default.all();
        expect(allFolders.length).toBe(1);
        // If you have an error here, it might mean you need to run `npm i` from
        // the "withExternalModules" folder. Not clear exactly why.
        expect(allFolders[0].title).toBe('  foo');
    })));
    it('should load multiple plugins from a directory', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins(`${testPluginDir}/multi_plugins`, {});
        const plugin1 = service.pluginById('org.joplinapp.plugins.MultiPluginDemo1');
        const plugin2 = service.pluginById('org.joplinapp.plugins.MultiPluginDemo2');
        expect(!!plugin1).toBe(true);
        expect(!!plugin2).toBe(true);
        const allFolders = yield Folder_1.default.all();
        expect(allFolders.length).toBe(2);
        expect(allFolders.map((f) => f.title).sort().join(', ')).toBe('multi - simple1, multi - simple2');
    })));
    it('should load plugins from JS bundles', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        const plugin = yield service.loadPluginFromJsBundle('/tmp', `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugins.JsBundleTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://joplinapp.org"
			}
			*/
			
			joplin.plugins.register({
				onStart: async function() {
					await joplin.data.post(['folders'], null, { title: "my plugin folder" });
				},
			});
		`);
        yield service.runPlugin(plugin);
        expect(plugin.manifest.manifest_version).toBe(1);
        expect(plugin.manifest.name).toBe('JS Bundle test');
        const allFolders = yield Folder_1.default.all();
        expect(allFolders.length).toBe(1);
    })));
    it('should load plugins from JS bundle files', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins(`${testPluginDir}/jsbundles`, {});
        expect(!!service.pluginById('org.joplinapp.plugins.JsBundleDemo')).toBe(true);
        expect((yield Folder_1.default.all()).length).toBe(1);
    })));
    it('should load plugins from JPL archive', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        yield service.loadAndRunPlugins([`${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`], {});
        expect(!!service.pluginById('org.joplinapp.FirstJplPlugin')).toBe(true);
        expect((yield Folder_1.default.all()).length).toBe(1);
    })));
    it('should validate JS bundles', (() => __awaiter(this, void 0, void 0, function* () {
        const invalidJsBundles = [
            `
				/* joplin-manifest:
				{
					"not_a_valid_manifest_at_all": 1
				}
				*/
				
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				/* joplin-manifest:
				*/
				
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, `
				joplin.plugins.register({
					onStart: async function() {},
				});
			`, '',
        ];
        const service = newPluginService();
        for (const jsBundle of invalidJsBundles) {
            yield test_utils_js_1.expectThrow(() => __awaiter(this, void 0, void 0, function* () { return yield service.loadPluginFromJsBundle('/tmp', jsBundle); }));
        }
    })));
    it('should register a Markdown-it plugin', (() => __awaiter(this, void 0, void 0, function* () {
        const tempDir = yield test_utils_js_1.createTempDir();
        const contentScriptPath = `${tempDir}/markdownItTestPlugin.js`;
        const contentScriptCssPath = `${tempDir}/markdownItTestPlugin.css`;
        yield shim_1.default.fsDriver().copy(`${testPluginDir}/markdownItTestPlugin.js`, contentScriptPath);
        yield shim_1.default.fsDriver().copy(`${testPluginDir}/content_script/src/markdownItTestPlugin.css`, contentScriptCssPath);
        const service = newPluginService();
        const plugin = yield service.loadPluginFromJsBundle(tempDir, `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugin.MarkdownItPluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://joplinapp.org"
			}
			*/
			
			joplin.plugins.register({
				onStart: async function() {
					await joplin.contentScripts.register('markdownItPlugin', 'justtesting', './markdownItTestPlugin.js');
				},
			});
		`);
        yield service.runPlugin(plugin);
        const contentScripts = plugin.contentScriptsByType(types_1.ContentScriptType.MarkdownItPlugin);
        expect(contentScripts.length).toBe(1);
        expect(!!contentScripts[0].path).toBe(true);
        const contentScript = contentScripts[0];
        const mdToHtml = new MdToHtml_1.default();
        const module = require(contentScript.path).default;
        mdToHtml.loadExtraRendererRule(contentScript.id, tempDir, module({}));
        const result = yield mdToHtml.render([
            '```justtesting',
            'something',
            '```',
        ].join('\n'));
        const asset = result.pluginAssets.find(a => a.name === 'justtesting/markdownItTestPlugin.css');
        const assetContent = yield shim_1.default.fsDriver().readFile(asset.path, 'utf8');
        expect(assetContent.includes('.just-testing')).toBe(true);
        expect(assetContent.includes('background-color: rgb(202, 255, 255)')).toBe(true);
        expect(result.html.includes('JUST TESTING: something')).toBe(true);
        yield shim_1.default.fsDriver().remove(tempDir);
    })));
    it('should enable and disable plugins depending on what app version they support', (() => __awaiter(this, void 0, void 0, function* () {
        const pluginScript = `
			/* joplin-manifest:
			{
				"id": "org.joplinapp.plugins.PluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"version": "1.0.0"
			}
			*/
			
			joplin.plugins.register({
				onStart: async function() { },
			});
		`;
        const testCases = [
            ['1.4', true],
            ['1.5', true],
            ['2.0', true],
            ['1.3', false],
            ['0.9', false],
        ];
        for (const testCase of testCases) {
            const [appVersion, hasNoError] = testCase;
            const service = newPluginService(appVersion);
            const plugin = yield service.loadPluginFromJsBundle('', pluginScript);
            if (hasNoError) {
                yield test_utils_js_1.expectNotThrow(() => service.runPlugin(plugin));
            }
            else {
                yield test_utils_js_1.expectThrow(() => service.runPlugin(plugin));
            }
        }
    })));
    it('should install a plugin', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newPluginService();
        const pluginPath = `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`;
        yield service.installPlugin(pluginPath);
        const installedPluginPath = `${Setting_1.default.value('pluginDir')}/org.joplinapp.FirstJplPlugin.jpl`;
        expect(yield fs.pathExists(installedPluginPath)).toBe(true);
    })));
    it('should rename the plugin archive to the right name', (() => __awaiter(this, void 0, void 0, function* () {
        const tempDir = yield test_utils_js_1.createTempDir();
        const service = newPluginService();
        const pluginPath = `${testPluginDir}/jpl_test/org.joplinapp.FirstJplPlugin.jpl`;
        const tempPath = `${tempDir}/something.jpl`;
        yield shim_1.default.fsDriver().copy(pluginPath, tempPath);
        const installedPluginPath = `${Setting_1.default.value('pluginDir')}/org.joplinapp.FirstJplPlugin.jpl`;
        yield service.installPlugin(tempPath);
        expect(yield fs.pathExists(installedPluginPath)).toBe(true);
    })));
    it('should create the data directory', (() => __awaiter(this, void 0, void 0, function* () {
        const pluginScript = test_utils_1.newPluginScript(`			
			joplin.plugins.register({
				onStart: async function() {
					const dataDir = await joplin.plugins.dataDir();
					joplin.data.post(['folders'], null, { title: JSON.stringify(dataDir) });
				},
			});
		`);
        const expectedPath = `${Setting_1.default.value('pluginDataDir')}/org.joplinapp.plugins.PluginTest`;
        expect(yield fs.pathExists(expectedPath)).toBe(false);
        const service = newPluginService();
        const plugin = yield service.loadPluginFromJsBundle('', pluginScript);
        yield service.runPlugin(plugin);
        expect(yield fs.pathExists(expectedPath)).toBe(true);
        const folders = yield Folder_1.default.all();
        expect(JSON.parse(folders[0].title)).toBe(expectedPath);
    })));
});
//# sourceMappingURL=services_PluginService.js.map