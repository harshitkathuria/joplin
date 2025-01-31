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
const MenuUtils_1 = require("@joplin/lib/services/commands/MenuUtils");
const ToolbarButtonUtils_1 = require("@joplin/lib/services/commands/ToolbarButtonUtils");
const CommandService_1 = require("@joplin/lib/services/CommandService");
const stateToWhenClauseContext_1 = require("@joplin/lib/services/commands/stateToWhenClauseContext");
const KeymapService_1 = require("@joplin/lib/services/KeymapService");
const { setupDatabaseAndSynchronizer, switchClient, expectThrow, expectNotThrow } = require('./test-utils.js');
function newService() {
    const service = new CommandService_1.default();
    const mockStore = {
        getState: () => {
            return {};
        },
    };
    service.initialize(mockStore, true, stateToWhenClauseContext_1.default);
    return service;
}
function createCommand(name, options) {
    const declaration = {
        name: name,
    };
    const runtime = {
        execute: options.execute,
    };
    if (options.enabledCondition)
        runtime.enabledCondition = options.enabledCondition;
    return { declaration, runtime };
}
function registerCommand(service, cmd) {
    service.registerDeclaration(cmd.declaration);
    service.registerRuntime(cmd.declaration.name, cmd.runtime);
}
describe('services_CommandService', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        KeymapService_1.default.destroyInstance();
        KeymapService_1.default.instance().initialize();
        yield setupDatabaseAndSynchronizer(1);
        yield switchClient(1);
        done();
    }));
    it('should create toolbar button infos from commands', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const toolbarButtonUtils = new ToolbarButtonUtils_1.default(service);
        const executedCommands = [];
        registerCommand(service, createCommand('test1', {
            execute: () => {
                executedCommands.push('test1');
            },
        }));
        registerCommand(service, createCommand('test2', {
            execute: () => {
                executedCommands.push('test2');
            },
        }));
        const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {});
        yield toolbarInfos[0].onClick();
        yield toolbarInfos[1].onClick();
        expect(executedCommands.join('_')).toBe('test1_test2');
        expect(toolbarInfos[0].enabled).toBe(true);
        expect(toolbarInfos[1].enabled).toBe(true);
    })));
    it('should enable and disable toolbar buttons depending on state', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const toolbarButtonUtils = new ToolbarButtonUtils_1.default(service);
        registerCommand(service, createCommand('test1', {
            execute: () => { },
            enabledCondition: 'oneNoteSelected',
        }));
        registerCommand(service, createCommand('test2', {
            execute: () => { },
            enabledCondition: 'multipleNotesSelected',
        }));
        const toolbarInfos = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
            oneNoteSelected: false,
            multipleNotesSelected: true,
        });
        expect(toolbarInfos[0].enabled).toBe(false);
        expect(toolbarInfos[1].enabled).toBe(true);
    })));
    it('should enable commands by default', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        registerCommand(service, createCommand('test1', {
            execute: () => { },
        }));
        expect(service.isEnabled('test1', {})).toBe(true);
    })));
    it('should return the same toolbarButtons array if nothing has changed', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const toolbarButtonUtils = new ToolbarButtonUtils_1.default(service);
        registerCommand(service, createCommand('test1', {
            execute: () => { },
            enabledCondition: 'cond1',
        }));
        registerCommand(service, createCommand('test2', {
            execute: () => { },
            enabledCondition: 'cond2',
        }));
        const toolbarInfos1 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
            cond1: true,
            cond2: false,
        });
        const toolbarInfos2 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
            cond1: true,
            cond2: false,
        });
        expect(toolbarInfos1).toBe(toolbarInfos2);
        expect(toolbarInfos1[0] === toolbarInfos2[0]).toBe(true);
        expect(toolbarInfos1[1] === toolbarInfos2[1]).toBe(true);
        const toolbarInfos3 = toolbarButtonUtils.commandsToToolbarButtons(['test1', 'test2'], {
            cond1: true,
            cond2: true,
        });
        expect(toolbarInfos2 === toolbarInfos3).toBe(false);
        expect(toolbarInfos2[0] === toolbarInfos3[0]).toBe(true);
        expect(toolbarInfos2[1] === toolbarInfos3[1]).toBe(false);
        {
            expect(toolbarButtonUtils.commandsToToolbarButtons(['test1', '-', 'test2'], {
                cond1: true,
                cond2: false,
            })).toBe(toolbarButtonUtils.commandsToToolbarButtons(['test1', '-', 'test2'], {
                cond1: true,
                cond2: false,
            }));
        }
    })));
    it('should create menu items from commands', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const utils = new MenuUtils_1.default(service);
        registerCommand(service, createCommand('test1', {
            execute: () => { },
        }));
        registerCommand(service, createCommand('test2', {
            execute: () => { },
        }));
        const clickedCommands = [];
        const onClick = (commandName) => {
            clickedCommands.push(commandName);
        };
        const menuItems = utils.commandsToMenuItems(['test1', 'test2'], onClick);
        menuItems.test1.click();
        menuItems.test2.click();
        expect(clickedCommands.join('_')).toBe('test1_test2');
        // Also check that the same commands always return strictly the same menu
        expect(utils.commandsToMenuItems(['test1', 'test2'], onClick)).toBe(utils.commandsToMenuItems(['test1', 'test2'], onClick));
    })));
    it('should give menu item props from state', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const utils = new MenuUtils_1.default(service);
        registerCommand(service, createCommand('test1', {
            execute: () => { },
            enabledCondition: 'cond1',
        }));
        registerCommand(service, createCommand('test2', {
            execute: () => { },
            enabledCondition: 'cond2',
        }));
        {
            const menuItemProps = utils.commandsToMenuItemProps(['test1', 'test2'], {
                cond1: true,
                cond2: false,
            });
            expect(menuItemProps.test1.enabled).toBe(true);
            expect(menuItemProps.test2.enabled).toBe(false);
        }
        {
            const menuItemProps = utils.commandsToMenuItemProps(['test1', 'test2'], {
                cond1: true,
                cond2: true,
            });
            expect(menuItemProps.test1.enabled).toBe(true);
            expect(menuItemProps.test2.enabled).toBe(true);
        }
        expect(utils.commandsToMenuItemProps(['test1', 'test2'], { cond1: true, cond2: true }))
            .toBe(utils.commandsToMenuItemProps(['test1', 'test2'], { cond1: true, cond2: true }));
    })));
    it('should create stateful menu items', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        const utils = new MenuUtils_1.default(service);
        let propValue = null;
        registerCommand(service, createCommand('test1', {
            execute: (_context, greeting) => {
                propValue = greeting;
            },
        }));
        const menuItem = utils.commandToStatefulMenuItem('test1', 'hello');
        menuItem.click();
        expect(propValue).toBe('hello');
    })));
    it('should throw an error for invalid when clause keys in dev mode', (() => __awaiter(this, void 0, void 0, function* () {
        const service = newService();
        registerCommand(service, createCommand('test1', {
            execute: () => { },
            enabledCondition: 'cond1 && cond2',
        }));
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () { return service.isEnabled('test1', {}); }));
        yield expectThrow(() => __awaiter(this, void 0, void 0, function* () { return service.isEnabled('test1', { cond1: true }); }));
        yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return service.isEnabled('test1', { cond1: true, cond2: true }); }));
        yield expectNotThrow(() => __awaiter(this, void 0, void 0, function* () { return service.isEnabled('test1', { cond1: true, cond2: false }); }));
    })));
});
//# sourceMappingURL=services_CommandService.js.map