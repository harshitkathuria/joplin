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
const htmlUtils_1 = require("@joplin/lib/htmlUtils");
describe('htmlUtils', function () {
    beforeEach((done) => __awaiter(this, void 0, void 0, function* () {
        done();
    }));
    it('should extract image URLs', (() => __awaiter(this, void 0, void 0, function* () {
        const testCases = [
            ['<img src="http://test.com/img.png"/>', ['http://test.com/img.png']],
            ['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://test.com/img.png', 'http://test.com/img2.png']],
            ['<img src="http://test.com/img.png" alt="testing"  >', ['http://test.com/img.png']],
            ['<img src=""/> <img src="http://test.com/img2.png"/>', ['http://test.com/img2.png']],
            ['nothing here', []],
            ['', []],
        ];
        for (let i = 0; i < testCases.length; i++) {
            const md = testCases[i][0];
            const expected = testCases[i][1];
            expect(htmlUtils_1.default.extractImageUrls(md).join(' ')).toBe(expected.join(' '));
        }
    })));
    it('should replace image URLs', (() => __awaiter(this, void 0, void 0, function* () {
        const testCases = [
            ['<img src="http://test.com/img.png"/>', ['http://other.com/img2.png'], '<img src="http://other.com/img2.png"/>'],
            ['<img src="http://test.com/img.png"/> <img src="http://test.com/img2.png"/>', ['http://other.com/img2.png', 'http://other.com/img3.png'], '<img src="http://other.com/img2.png"/> <img src="http://other.com/img3.png"/>'],
            ['<img src="http://test.com/img.png" alt="testing"  >', ['http://other.com/img.png'], '<img src="http://other.com/img.png" alt="testing"  >'],
        ];
        const callback = (urls) => {
            let i = -1;
            return function (_src) {
                i++;
                return urls[i];
            };
        };
        for (let i = 0; i < testCases.length; i++) {
            const md = testCases[i][0];
            const r = htmlUtils_1.default.replaceImageUrls(md, callback(testCases[i][1]));
            expect(r.trim()).toBe(testCases[i][2].trim());
        }
    })));
    it('should encode attributes', (() => __awaiter(this, void 0, void 0, function* () {
        const testCases = [
            [{ a: 'one', b: 'two' }, 'a="one" b="two"'],
            [{ a: 'one&two' }, 'a="one&amp;two"'],
        ];
        for (let i = 0; i < testCases.length; i++) {
            const attrs = testCases[i][0];
            const expected = testCases[i][1];
            expect(htmlUtils_1.default.attributesHtml(attrs)).toBe(expected);
        }
    })));
    it('should prepend a base URL', (() => __awaiter(this, void 0, void 0, function* () {
        const testCases = [
            [
                '<a href="a.html">Something</a>',
                'http://test.com',
                '<a href="http://test.com/a.html">Something</a>',
            ],
            [
                '<a href="a.html">a</a> <a href="b.html">b</a>',
                'http://test.com',
                '<a href="http://test.com/a.html">a</a> <a href="http://test.com/b.html">b</a>',
            ],
            [
                '<a href="a.html">a</a> <a href="b.html">b</a>',
                'http://test.com',
                '<a href="http://test.com/a.html">a</a> <a href="http://test.com/b.html">b</a>',
            ],
        ];
        for (let i = 0; i < testCases.length; i++) {
            const html = testCases[i][0];
            const baseUrl = testCases[i][1];
            const expected = testCases[i][2];
            expect(htmlUtils_1.default.prependBaseUrl(html, baseUrl)).toBe(expected);
        }
    })));
});
//# sourceMappingURL=htmlUtils.js.map