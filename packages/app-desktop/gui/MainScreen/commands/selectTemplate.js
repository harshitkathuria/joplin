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
exports.runtime = exports.declaration = void 0;
const CommandService_1 = require("@joplin/lib/services/CommandService");
const locale_1 = require("@joplin/lib/locale");
const TemplateUtils = require('@joplin/lib/TemplateUtils');
exports.declaration = {
    name: 'selectTemplate',
};
exports.runtime = (comp) => {
    return {
        execute: (_context, noteType) => __awaiter(void 0, void 0, void 0, function* () {
            comp.setState({
                promptOptions: {
                    label: locale_1._('Template file:'),
                    inputType: 'dropdown',
                    value: comp.props.templates[0],
                    autocomplete: comp.props.templates,
                    onClose: (answer) => __awaiter(void 0, void 0, void 0, function* () {
                        if (answer) {
                            if (noteType === 'note' || noteType === 'todo') {
                                void CommandService_1.default.instance().execute('newNote', answer.value, noteType === 'todo');
                            }
                            else {
                                void CommandService_1.default.instance().execute('insertText', TemplateUtils.render(answer.value));
                            }
                        }
                        comp.setState({ promptOptions: null });
                    }),
                },
            });
        }),
    };
};
//# sourceMappingURL=selectTemplate.js.map