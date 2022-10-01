"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_driver_node_1 = require("@joplin/lib/fs-driver-node");
const shim_1 = require("@joplin/lib/shim");
const { expectThrow } = require('./test-utils.js');
// On Windows, path.resolve is going to convert a path such as
// /tmp/file.txt to c:\tmp\file.txt
function platformPath(path) {
    if (shim_1.default.isWindows()) {
        return `c:${path.replace(/\//g, '\\')}`;
    }
    else {
        return path;
    }
}
describe('fsDriver', function () {
    it('should resolveRelativePathWithinDir', () => {
        const fsDriver = new fs_driver_node_1.default();
        expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './my/file.txt').toLowerCase()).toBe(platformPath('/test/temp/my/file.txt'));
        expect(fsDriver.resolveRelativePathWithinDir('/', './test').toLowerCase()).toBe(platformPath('/test'));
        expect(fsDriver.resolveRelativePathWithinDir('/test', 'myfile.txt').toLowerCase()).toBe(platformPath('/test/myfile.txt'));
        expect(fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../test.txt').toLowerCase()).toBe(platformPath('/test/temp/test.txt'));
        expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '../myfile.txt'));
        expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', './mydir/../../test.txt'));
        expectThrow(() => fsDriver.resolveRelativePathWithinDir('/test/temp', '/var/local/no.txt'));
    });
});
//# sourceMappingURL=fsDriver.js.map