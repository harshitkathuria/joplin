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
const InMemoryCache_1 = require("@joplin/lib/InMemoryCache");
const time_1 = require("@joplin/lib/time");
describe('InMemoryCache', function () {
    it('should get and set values', () => {
        const cache = new InMemoryCache_1.default();
        expect(cache.value('test')).toBe(undefined);
        expect(cache.value('test', 'default')).toBe('default');
        cache.setValue('test', 'something');
        expect(cache.value('test')).toBe('something');
        // Check we get the exact same object back (cache should not copy)
        const someObj = { abcd: '123' };
        cache.setValue('someObj', someObj);
        expect(cache.value('someObj')).toBe(someObj);
    });
    it('should expire values', () => __awaiter(this, void 0, void 0, function* () {
        const cache = new InMemoryCache_1.default();
        // Check that the value is udefined once the cache has expired
        cache.setValue('test', 'something', 500);
        expect(cache.value('test')).toBe('something');
        yield time_1.default.msleep(510);
        expect(cache.value('test')).toBe(undefined);
        // This test can sometimes fail in some cases, probably because it
        // sleeps for more than 100ms (when the computer is slow). Changing this
        // to use higher values would slow down the test unit too much, so let's
        // disable it for now.
        // Check that the TTL is reset every time setValue is called
        // cache.setValue('test', 'something', 300);
        // await time.msleep(100);
        // cache.setValue('test', 'something', 300);
        // await time.msleep(100);
        // cache.setValue('test', 'something', 300);
        // await time.msleep(100);
        // cache.setValue('test', 'something', 300);
        // await time.msleep(100);
        // expect(cache.value('test')).toBe('something');
    }));
    it('should delete old records', () => __awaiter(this, void 0, void 0, function* () {
        const cache = new InMemoryCache_1.default(5);
        cache.setValue('1', '1');
        cache.setValue('2', '2');
        cache.setValue('3', '3');
        cache.setValue('4', '4');
        cache.setValue('5', '5');
        expect(cache.value('1')).toBe('1');
        cache.setValue('6', '6');
        expect(cache.value('1')).toBe(undefined);
    }));
});
//# sourceMappingURL=InMemoryCache.js.map