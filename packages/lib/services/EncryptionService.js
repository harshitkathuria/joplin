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
const Logger_1 = require("../Logger");
const shim_1 = require("../shim");
const Setting_1 = require("../models/Setting");
const MasterKey_1 = require("../models/MasterKey");
const BaseItem_1 = require("../models/BaseItem");
const { padLeft } = require('../string-utils.js');
const JoplinError = require('../JoplinError');
function hexPad(s, length) {
    return padLeft(s, length, '0');
}
class EncryptionService {
    constructor() {
        // Note: 1 MB is very slow with Node and probably even worse on mobile.
        //
        // On mobile the time it takes to decrypt increases exponentially for some reason, so it's important
        // to have a relatively small size so as not to freeze the app. For example, on Android 7.1 simulator
        // with 4.1 GB RAM, it takes this much to decrypt a block;
        //
        // 50KB => 1000 ms
        // 25KB => 250ms
        // 10KB => 200ms
        // 5KB => 10ms
        //
        // So making the block 10 times smaller make it 100 times faster! So for now using 5KB. This can be
        // changed easily since the chunk size is incorporated into the encrypted data.
        this.chunkSize_ = 5000;
        this.loadedMasterKeys_ = {};
        this.activeMasterKeyId_ = null;
        this.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL_1A;
        this.defaultMasterKeyEncryptionMethod_ = EncryptionService.METHOD_SJCL_4;
        this.logger_ = new Logger_1.default();
        this.headerTemplates_ = {
            // Template version 1
            1: {
                // Fields are defined as [name, valueSize, valueType]
                fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
            },
        };
        // Note: 1 MB is very slow with Node and probably even worse on mobile.
        //
        // On mobile the time it takes to decrypt increases exponentially for some reason, so it's important
        // to have a relatively small size so as not to freeze the app. For example, on Android 7.1 simulator
        // with 4.1 GB RAM, it takes this much to decrypt a block;
        //
        // 50KB => 1000 ms
        // 25KB => 250ms
        // 10KB => 200ms
        // 5KB => 10ms
        //
        // So making the block 10 times smaller make it 100 times faster! So for now using 5KB. This can be
        // changed easily since the chunk size is incorporated into the encrypted data.
        this.chunkSize_ = 5000;
        this.loadedMasterKeys_ = {};
        this.activeMasterKeyId_ = null;
        this.defaultEncryptionMethod_ = EncryptionService.METHOD_SJCL_1A;
        this.defaultMasterKeyEncryptionMethod_ = EncryptionService.METHOD_SJCL_4;
        this.logger_ = new Logger_1.default();
        this.headerTemplates_ = {
            // Template version 1
            1: {
                // Fields are defined as [name, valueSize, valueType]
                fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
            },
        };
    }
    static instance() {
        if (this.instance_)
            return this.instance_;
        this.instance_ = new EncryptionService();
        return this.instance_;
    }
    setLogger(l) {
        this.logger_ = l;
    }
    logger() {
        return this.logger_;
    }
    generateMasterKeyAndEnableEncryption(password) {
        return __awaiter(this, void 0, void 0, function* () {
            let masterKey = yield this.generateMasterKey(password);
            masterKey = yield MasterKey_1.default.save(masterKey);
            yield this.enableEncryption(masterKey, password);
            yield this.loadMasterKeysFromSettings();
            return masterKey;
        });
    }
    enableEncryption(masterKey, password = null) {
        return __awaiter(this, void 0, void 0, function* () {
            Setting_1.default.setValue('encryption.enabled', true);
            Setting_1.default.setValue('encryption.activeMasterKeyId', masterKey.id);
            if (password) {
                const passwordCache = Setting_1.default.value('encryption.passwordCache');
                passwordCache[masterKey.id] = password;
                Setting_1.default.setValue('encryption.passwordCache', passwordCache);
            }
            // Mark only the non-encrypted ones for sync since, if there are encrypted ones,
            // it means they come from the sync target and are already encrypted over there.
            yield BaseItem_1.default.markAllNonEncryptedForSync();
        });
    }
    disableEncryption() {
        return __awaiter(this, void 0, void 0, function* () {
            // Allow disabling encryption even if some items are still encrypted, because whether E2EE is enabled or disabled
            // should not affect whether items will enventually be decrypted or not (DecryptionWorker will still work as
            // long as there are encrypted items). Also even if decryption is disabled, it's possible that encrypted items
            // will still be received via synchronisation.
            // const hasEncryptedItems = await BaseItem.hasEncryptedItems();
            // if (hasEncryptedItems) throw new Error(_('Encryption cannot currently be disabled because some items are still encrypted. Please wait for all the items to be decrypted and try again.'));
            Setting_1.default.setValue('encryption.enabled', false);
            // The only way to make sure everything gets decrypted on the sync target is
            // to re-sync everything.
            yield BaseItem_1.default.forceSyncAll();
        });
    }
    loadMasterKeysFromSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            const masterKeys = yield MasterKey_1.default.all();
            const passwords = Setting_1.default.value('encryption.passwordCache');
            const activeMasterKeyId = Setting_1.default.value('encryption.activeMasterKeyId');
            this.logger().info(`Trying to load ${masterKeys.length} master keys...`);
            for (let i = 0; i < masterKeys.length; i++) {
                const mk = masterKeys[i];
                const password = passwords[mk.id];
                if (this.isMasterKeyLoaded(mk.id))
                    continue;
                if (!password)
                    continue;
                try {
                    yield this.loadMasterKey_(mk, password, activeMasterKeyId === mk.id);
                }
                catch (error) {
                    this.logger().warn(`Cannot load master key ${mk.id}. Invalid password?`, error);
                }
            }
            this.logger().info(`Loaded master keys: ${this.loadedMasterKeysCount()}`);
        });
    }
    loadedMasterKeysCount() {
        let output = 0;
        for (const n in this.loadedMasterKeys_) {
            if (!this.loadedMasterKeys_[n])
                continue;
            output++;
        }
        return output;
    }
    chunkSize() {
        return this.chunkSize_;
    }
    defaultEncryptionMethod() {
        return this.defaultEncryptionMethod_;
    }
    setActiveMasterKeyId(id) {
        this.activeMasterKeyId_ = id;
    }
    activeMasterKeyId() {
        if (!this.activeMasterKeyId_) {
            const error = new Error('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');
            error.code = 'noActiveMasterKey';
            throw error;
        }
        return this.activeMasterKeyId_;
    }
    isMasterKeyLoaded(id) {
        return !!this.loadedMasterKeys_[id];
    }
    loadMasterKey_(model, password, makeActive = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!model.id)
                throw new Error('Master key does not have an ID - save it first');
            this.loadedMasterKeys_[model.id] = yield this.decryptMasterKey_(model, password);
            if (makeActive)
                this.setActiveMasterKeyId(model.id);
        });
    }
    unloadMasterKey(model) {
        delete this.loadedMasterKeys_[model.id];
    }
    // unloadAllMasterKeys() {
    // 	for (const id in this.loadedMasterKeys_) {
    // 		if (!this.loadedMasterKeys_.hasOwnProperty(id)) continue;
    // 		this.unloadMasterKey(this.loadedMasterKeys_[id]);
    // 	}
    // }
    loadedMasterKey(id) {
        if (!this.loadedMasterKeys_[id]) {
            const error = new Error(`Master key is not loaded: ${id}`);
            error.code = 'masterKeyNotLoaded';
            error.masterKeyId = id;
            throw error;
        }
        return this.loadedMasterKeys_[id];
    }
    loadedMasterKeyIds() {
        const output = [];
        for (const id in this.loadedMasterKeys_) {
            if (!this.loadedMasterKeys_.hasOwnProperty(id))
                continue;
            output.push(id);
        }
        return output;
    }
    fsDriver() {
        if (!EncryptionService.fsDriver_)
            throw new Error('EncryptionService.fsDriver_ not set!');
        return EncryptionService.fsDriver_;
    }
    sha256(string) {
        const sjcl = shim_1.default.sjclModule;
        const bitArray = sjcl.hash.sha256.hash(string);
        return sjcl.codec.hex.fromBits(bitArray);
    }
    // async seedSjcl() {
    // 	throw new Error('NOT TESTED');
    // 	// Just putting this here in case it becomes needed
    // 	// Normally seeding random bytes is not needed for our use since
    // 	// we use shim.randomBytes directly to generate master keys.
    // 	const sjcl = shim.sjclModule;
    // 	const randomBytes = await shim.randomBytes(1024 / 8);
    // 	const hexBytes = randomBytes.map(a => {
    // 		return a.toString(16);
    // 	});
    // 	const hexSeed = sjcl.codec.hex.toBits(hexBytes.join(''));
    // 	sjcl.random.addEntropy(hexSeed, 1024, 'shim.randomBytes');
    // }
    randomHexString(byteCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const bytes = yield shim_1.default.randomBytes(byteCount);
            return bytes
                .map(a => {
                return hexPad(a.toString(16), 2);
            })
                .join('');
        });
    }
    masterKeysThatNeedUpgrading(masterKeys) {
        return MasterKey_1.default.allWithoutEncryptionMethod(masterKeys, this.defaultMasterKeyEncryptionMethod_);
    }
    upgradeMasterKey(model, decryptionPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const newEncryptionMethod = this.defaultMasterKeyEncryptionMethod_;
            const plainText = yield this.decryptMasterKey_(model, decryptionPassword);
            const newContent = yield this.encryptMasterKeyContent_(newEncryptionMethod, plainText, decryptionPassword);
            return Object.assign(Object.assign({}, model), newContent);
        });
    }
    encryptMasterKeyContent_(encryptionMethod, hexaBytes, password) {
        return __awaiter(this, void 0, void 0, function* () {
            // Checksum is not necessary since decryption will already fail if data is invalid
            const checksum = encryptionMethod === EncryptionService.METHOD_SJCL_2 ? this.sha256(hexaBytes) : '';
            const cipherText = yield this.encrypt(encryptionMethod, password, hexaBytes);
            return {
                checksum: checksum,
                encryption_method: encryptionMethod,
                content: cipherText,
            };
        });
    }
    generateMasterKeyContent_(password, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({}, {
                encryptionMethod: this.defaultMasterKeyEncryptionMethod_,
            }, options);
            const bytes = yield shim_1.default.randomBytes(256);
            const hexaBytes = bytes.map(a => hexPad(a.toString(16), 2)).join('');
            return this.encryptMasterKeyContent_(options.encryptionMethod, hexaBytes, password);
        });
    }
    generateMasterKey(password, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const model = yield this.generateMasterKeyContent_(password, options);
            const now = Date.now();
            model.created_time = now;
            model.updated_time = now;
            model.source_application = Setting_1.default.value('appId');
            return model;
        });
    }
    decryptMasterKey_(model, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const plainText = yield this.decrypt(model.encryption_method, password, model.content);
            if (model.encryption_method === EncryptionService.METHOD_SJCL_2) {
                const checksum = this.sha256(plainText);
                if (checksum !== model.checksum)
                    throw new Error('Could not decrypt master key (checksum failed)');
            }
            return plainText;
        });
    }
    checkMasterKeyPassword(model, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.decryptMasterKey_(model, password);
            }
            catch (error) {
                return false;
            }
            return true;
        });
    }
    wrapSjclError(sjclError) {
        const error = new Error(sjclError.message);
        error.stack = sjclError.stack;
        return error;
    }
    encrypt(method, key, plainText) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!method)
                throw new Error('Encryption method is required');
            if (!key)
                throw new Error('Encryption key is required');
            const sjcl = shim_1.default.sjclModule;
            // 2020-01-23: Deprecated and no longer secure due to the use og OCB2 mode - do not use.
            if (method === EncryptionService.METHOD_SJCL) {
                try {
                    // Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
                    return sjcl.json.encrypt(key, plainText, {
                        v: 1,
                        iter: 1000,
                        ks: 128,
                        ts: 64,
                        mode: 'ocb2',
                        // "adata":"", // Associated Data - not needed?
                        cipher: 'aes',
                    });
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            }
            // 2020-03-06: Added method to fix https://github.com/laurent22/joplin/issues/2591
            //             Also took the opportunity to change number of key derivations, per Isaac Potoczny's suggestion
            if (method === EncryptionService.METHOD_SJCL_1A) {
                try {
                    // We need to escape the data because SJCL uses encodeURIComponent to process the data and it only
                    // accepts UTF-8 data, or else it throws an error. And the notes might occasionally contain
                    // invalid UTF-8 data. Fixes https://github.com/laurent22/joplin/issues/2591
                    return sjcl.json.encrypt(key, escape(plainText), {
                        v: 1,
                        iter: 101,
                        ks: 128,
                        ts: 64,
                        mode: 'ccm',
                        // "adata":"", // Associated Data - not needed?
                        cipher: 'aes',
                    });
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            }
            // 2020-01-23: Deprectated - see above.
            // Was used to encrypt master keys
            if (method === EncryptionService.METHOD_SJCL_2) {
                try {
                    return sjcl.json.encrypt(key, plainText, {
                        v: 1,
                        iter: 10000,
                        ks: 256,
                        ts: 64,
                        mode: 'ocb2',
                        cipher: 'aes',
                    });
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            }
            if (method === EncryptionService.METHOD_SJCL_3) {
                try {
                    // Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
                    return sjcl.json.encrypt(key, plainText, {
                        v: 1,
                        iter: 1000,
                        ks: 128,
                        ts: 64,
                        mode: 'ccm',
                        // "adata":"", // Associated Data - not needed?
                        cipher: 'aes',
                    });
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            }
            // Same as above but more secure (but slower) to encrypt master keys
            if (method === EncryptionService.METHOD_SJCL_4) {
                try {
                    return sjcl.json.encrypt(key, plainText, {
                        v: 1,
                        iter: 10000,
                        ks: 256,
                        ts: 64,
                        mode: 'ccm',
                        cipher: 'aes',
                    });
                }
                catch (error) {
                    throw this.wrapSjclError(error);
                }
            }
            throw new Error(`Unknown encryption method: ${method}`);
        });
    }
    decrypt(method, key, cipherText) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!method)
                throw new Error('Encryption method is required');
            if (!key)
                throw new Error('Encryption key is required');
            const sjcl = shim_1.default.sjclModule;
            if (!this.isValidEncryptionMethod(method))
                throw new Error(`Unknown decryption method: ${method}`);
            try {
                const output = sjcl.json.decrypt(key, cipherText);
                if (method === EncryptionService.METHOD_SJCL_1A) {
                    return unescape(output);
                }
                else {
                    return output;
                }
            }
            catch (error) {
                // SJCL returns a string as error which means stack trace is missing so convert to an error object here
                throw new Error(error.message);
            }
        });
    }
    encryptAbstract_(source, destination, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({}, {
                encryptionMethod: this.defaultEncryptionMethod(),
            }, options);
            const method = options.encryptionMethod;
            const masterKeyId = this.activeMasterKeyId();
            const masterKeyPlainText = this.loadedMasterKey(masterKeyId);
            const header = {
                encryptionMethod: method,
                masterKeyId: masterKeyId,
            };
            yield destination.append(this.encodeHeader_(header));
            let doneSize = 0;
            while (true) {
                const block = yield source.read(this.chunkSize_);
                if (!block)
                    break;
                doneSize += this.chunkSize_;
                if (options.onProgress)
                    options.onProgress({ doneSize: doneSize });
                // Wait for a frame so that the app remains responsive in mobile.
                // https://corbt.com/posts/2015/12/22/breaking-up-heavy-processing-in-react-native.html
                yield shim_1.default.waitForFrame();
                const encrypted = yield this.encrypt(method, masterKeyPlainText, block);
                yield destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
                yield destination.append(encrypted);
            }
        });
    }
    decryptAbstract_(source, destination, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            const header = yield this.decodeHeaderSource_(source);
            const masterKeyPlainText = this.loadedMasterKey(header.masterKeyId);
            let doneSize = 0;
            while (true) {
                const lengthHex = yield source.read(6);
                if (!lengthHex)
                    break;
                if (lengthHex.length !== 6)
                    throw new Error(`Invalid block size: ${lengthHex}`);
                const length = parseInt(lengthHex, 16);
                if (!length)
                    continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting
                doneSize += length;
                if (options.onProgress)
                    options.onProgress({ doneSize: doneSize });
                yield shim_1.default.waitForFrame();
                const block = yield source.read(length);
                const plainText = yield this.decrypt(header.encryptionMethod, masterKeyPlainText, block);
                yield destination.append(plainText);
            }
        });
    }
    stringReader_(string, sync = false) {
        const reader = {
            index: 0,
            read: function (size) {
                const output = string.substr(reader.index, size);
                reader.index += size;
                return !sync ? Promise.resolve(output) : output;
            },
            close: function () { },
        };
        return reader;
    }
    stringWriter_() {
        const output = {
            data: [],
            append: function (data) {
                return __awaiter(this, void 0, void 0, function* () {
                    output.data.push(data);
                });
            },
            result: function () {
                return output.data.join('');
            },
            close: function () { },
        };
        return output;
    }
    fileReader_(path, encoding) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield this.fsDriver().open(path, 'r');
            const reader = {
                handle: handle,
                read: (size) => __awaiter(this, void 0, void 0, function* () {
                    return this.fsDriver().readFileChunk(reader.handle, size, encoding);
                }),
                close: () => __awaiter(this, void 0, void 0, function* () {
                    yield this.fsDriver().close(reader.handle);
                }),
            };
            return reader;
        });
    }
    fileWriter_(path, encoding) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                append: (data) => __awaiter(this, void 0, void 0, function* () {
                    return this.fsDriver().appendFile(path, data, encoding);
                }),
                close: function () { },
            };
        });
    }
    encryptString(plainText, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.stringReader_(plainText);
            const destination = this.stringWriter_();
            yield this.encryptAbstract_(source, destination, options);
            return destination.result();
        });
    }
    decryptString(cipherText, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.stringReader_(cipherText);
            const destination = this.stringWriter_();
            yield this.decryptAbstract_(source, destination, options);
            return destination.data.join('');
        });
    }
    encryptFile(srcPath, destPath, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let source = yield this.fileReader_(srcPath, 'base64');
            let destination = yield this.fileWriter_(destPath, 'ascii');
            const cleanUp = () => __awaiter(this, void 0, void 0, function* () {
                if (source)
                    yield source.close();
                if (destination)
                    yield destination.close();
                // eslint-disable-next-line require-atomic-updates
                source = null;
                // eslint-disable-next-line require-atomic-updates
                destination = null;
            });
            try {
                yield this.fsDriver().unlink(destPath);
                yield this.encryptAbstract_(source, destination, options);
            }
            catch (error) {
                yield cleanUp();
                yield this.fsDriver().unlink(destPath);
                throw error;
            }
            yield cleanUp();
        });
    }
    decryptFile(srcPath, destPath, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let source = yield this.fileReader_(srcPath, 'ascii');
            let destination = yield this.fileWriter_(destPath, 'base64');
            const cleanUp = () => __awaiter(this, void 0, void 0, function* () {
                if (source)
                    yield source.close();
                if (destination)
                    yield destination.close();
                // eslint-disable-next-line require-atomic-updates
                source = null;
                // eslint-disable-next-line require-atomic-updates
                destination = null;
            });
            try {
                yield this.fsDriver().unlink(destPath);
                yield this.decryptAbstract_(source, destination, options);
            }
            catch (error) {
                yield cleanUp();
                yield this.fsDriver().unlink(destPath);
                throw error;
            }
            yield cleanUp();
        });
    }
    headerTemplate(version) {
        const r = this.headerTemplates_[version];
        if (!r)
            throw new Error(`Unknown header version: ${version}`);
        return r;
    }
    encodeHeader_(header) {
        // Sanity check
        if (header.masterKeyId.length !== 32)
            throw new Error(`Invalid master key ID size: ${header.masterKeyId}`);
        let encryptionMetadata = '';
        encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
        encryptionMetadata += header.masterKeyId;
        encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
        return `JED01${encryptionMetadata}`;
    }
    decodeHeaderString(cipherText) {
        return __awaiter(this, void 0, void 0, function* () {
            const source = this.stringReader_(cipherText);
            return this.decodeHeaderSource_(source);
        });
    }
    decodeHeaderSource_(source) {
        return __awaiter(this, void 0, void 0, function* () {
            const identifier = yield source.read(5);
            if (!this.isValidHeaderIdentifier(identifier))
                throw new JoplinError(`Invalid encryption identifier. Data is not actually encrypted? ID was: ${identifier}`, 'invalidIdentifier');
            const mdSizeHex = yield source.read(6);
            const mdSize = parseInt(mdSizeHex, 16);
            if (isNaN(mdSize) || !mdSize)
                throw new Error(`Invalid header metadata size: ${mdSizeHex}`);
            const md = yield source.read(parseInt(mdSizeHex, 16));
            return this.decodeHeaderBytes_(identifier + mdSizeHex + md);
        });
    }
    decodeHeaderBytes_(headerHexaBytes) {
        const reader = this.stringReader_(headerHexaBytes, true);
        const identifier = reader.read(3);
        const version = parseInt(reader.read(2), 16);
        if (identifier !== 'JED')
            throw new Error(`Invalid header (missing identifier): ${headerHexaBytes.substr(0, 64)}`);
        const template = this.headerTemplate(version);
        parseInt(reader.read(6), 16); // Read the size and move the reader pointer forward
        const output = {};
        for (let i = 0; i < template.fields.length; i++) {
            const m = template.fields[i];
            const name = m[0];
            const size = m[1];
            const type = m[2];
            let v = reader.read(size);
            if (type === 'int') {
                v = parseInt(v, 16);
            }
            else if (type === 'hex') {
                // Already in hexa
            }
            else {
                throw new Error(`Invalid type: ${type}`);
            }
            output[name] = v;
        }
        return output;
    }
    isValidHeaderIdentifier(id, ignoreTooLongLength = false) {
        if (!id)
            return false;
        if (!ignoreTooLongLength && id.length !== 5)
            return false;
        return /JED\d\d/.test(id);
    }
    isValidEncryptionMethod(method) {
        return [EncryptionService.METHOD_SJCL, EncryptionService.METHOD_SJCL_1A, EncryptionService.METHOD_SJCL_2, EncryptionService.METHOD_SJCL_3, EncryptionService.METHOD_SJCL_4].indexOf(method) >= 0;
    }
    itemIsEncrypted(item) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!item)
                throw new Error('No item');
            const ItemClass = BaseItem_1.default.itemClass(item);
            if (!ItemClass.encryptionSupported())
                return false;
            return item.encryption_applied && this.isValidHeaderIdentifier(item.encryption_cipher_text, true);
        });
    }
    fileIsEncrypted(path) {
        return __awaiter(this, void 0, void 0, function* () {
            const handle = yield this.fsDriver().open(path, 'r');
            const headerIdentifier = yield this.fsDriver().readFileChunk(handle, 5, 'ascii');
            yield this.fsDriver().close(handle);
            return this.isValidHeaderIdentifier(headerIdentifier);
        });
    }
}
exports.default = EncryptionService;
EncryptionService.instance_ = null;
EncryptionService.METHOD_SJCL_2 = 2;
EncryptionService.METHOD_SJCL_3 = 3;
EncryptionService.METHOD_SJCL_4 = 4;
EncryptionService.METHOD_SJCL_1A = 5;
EncryptionService.METHOD_SJCL = 1;
EncryptionService.fsDriver_ = null;
//# sourceMappingURL=EncryptionService.js.map