"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const locale_1 = require("@joplin/lib/locale");
const declarations = [
    {
        name: 'insertText',
    },
    {
        name: 'scrollToHash',
    },
    {
        name: 'textCopy',
        label: () => locale_1._('Copy'),
        role: 'copy',
    },
    {
        name: 'textCut',
        label: () => locale_1._('Cut'),
        role: 'cut',
    },
    {
        name: 'textPaste',
        label: () => locale_1._('Paste'),
        role: 'paste',
    },
    {
        name: 'textSelectAll',
        label: () => locale_1._('Select all'),
        role: 'selectAll',
    },
    {
        name: 'textBold',
        label: () => locale_1._('Bold'),
        iconName: 'icon-bold',
    },
    {
        name: 'textItalic',
        label: () => locale_1._('Italic'),
        iconName: 'icon-italic',
    },
    {
        name: 'textLink',
        label: () => locale_1._('Hyperlink'),
        iconName: 'icon-link',
    },
    {
        name: 'textCode',
        label: () => locale_1._('Code'),
        iconName: 'icon-code',
    },
    {
        name: 'attachFile',
        label: () => locale_1._('Attach file'),
        iconName: 'icon-attachment',
    },
    {
        name: 'textNumberedList',
        label: () => locale_1._('Numbered List'),
        iconName: 'icon-numbered-list',
    },
    {
        name: 'textBulletedList',
        label: () => locale_1._('Bulleted List'),
        iconName: 'icon-bulleted-list',
    },
    {
        name: 'textCheckbox',
        label: () => locale_1._('Checkbox'),
        iconName: 'icon-to-do-list',
    },
    {
        name: 'textHeading',
        label: () => locale_1._('Heading'),
        iconName: 'icon-heading',
    },
    {
        name: 'textHorizontalRule',
        label: () => locale_1._('Horizontal Rule'),
        iconName: 'fas fa-ellipsis-h',
    },
    {
        name: 'insertDateTime',
        label: () => locale_1._('Insert Date Time'),
        iconName: 'icon-add-date',
    },
    {
        name: 'editor.deleteLine',
        label: () => locale_1._('Delete line'),
    },
    {
        name: 'editor.undo',
        label: () => locale_1._('Undo'),
    },
    {
        name: 'editor.redo',
        label: () => locale_1._('Redo'),
    },
    {
        name: 'editor.indentLess',
        label: () => locale_1._('Indent less'),
    },
    {
        name: 'editor.indentMore',
        label: () => locale_1._('Indent more'),
    },
    {
        name: 'editor.toggleComment',
        label: () => locale_1._('Toggle comment'),
    },
    {
        name: 'editor.sortSelectedLines',
        label: () => locale_1._('Sort selected lines'),
    },
    {
        name: 'editor.swapLineUp',
        label: () => locale_1._('Swap line up'),
    },
    {
        name: 'editor.swapLineDown',
        label: () => locale_1._('Swap line down'),
    },
    {
        name: 'selectedText',
    },
    {
        name: 'replaceSelection',
    },
    {
        name: 'editor.setText',
    },
    {
        name: 'editor.focus',
    },
    {
        name: 'editor.execCommand',
    },
];
exports.default = declarations;
//# sourceMappingURL=editorCommandDeclarations.js.map