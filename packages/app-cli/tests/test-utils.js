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
exports.TestApp = exports.createNTestTags = exports.createNTestFolders = exports.createNTestNotes = exports.at = exports.sortedIds = exports.ids = exports.id = exports.currentClientId = exports.decryptionWorker = exports.fileContentEqual = exports.loadEncryptionMasterKey = exports.encryptionService = exports.checkThrow = exports.checkThrowAsync = exports.objectsEqual = exports.syncTargetId = exports.switchClient = exports.clearDatabase = exports.sleep = exports.fileApi = exports.synchronizer = exports.db = exports.setupDatabaseAndSynchronizer = exports.revisionService = exports.setupDatabase = exports.msleep = exports.allSyncTargetItemsEncrypted = exports.tempFilePath = exports.resourceFetcher = exports.resourceService = exports.expectNotThrow = exports.logger = exports.expectThrow = exports.kvStore = exports.isNetworkSyncTarget = exports.createTempDir = exports.syncDir = exports.setSyncTargetName = exports.syncTargetName = exports.afterEachCleanUp = exports.synchronizerStart = exports.newPluginScript = exports.newPluginService = exports.exportDir = exports.afterAllCleanUp = exports.waitForFolderCount = exports.supportDir = void 0;
/* eslint-disable require-atomic-updates */
const BaseApplication_1 = require("@joplin/lib/BaseApplication");
const BaseModel_1 = require("@joplin/lib/BaseModel");
const Logger_1 = require("@joplin/lib/Logger");
const Setting_1 = require("@joplin/lib/models/Setting");
const BaseService_1 = require("@joplin/lib/services/BaseService");
const fs_driver_node_1 = require("@joplin/lib/fs-driver-node");
const time_1 = require("@joplin/lib/time");
const shim_1 = require("@joplin/lib/shim");
const uuid_1 = require("@joplin/lib/uuid");
const ResourceService_1 = require("@joplin/lib/services/ResourceService");
const KeymapService_1 = require("@joplin/lib/services/KeymapService");
const KvStore_1 = require("@joplin/lib/services/KvStore");
const KeychainServiceDriver_node_1 = require("@joplin/lib/services/keychain/KeychainServiceDriver.node");
const KeychainServiceDriver_dummy_1 = require("@joplin/lib/services/keychain/KeychainServiceDriver.dummy");
const PluginRunner_1 = require("../app/services/plugins/PluginRunner");
const PluginService_1 = require("@joplin/lib/services/plugins/PluginService");
const file_api_driver_joplinServer_1 = require("@joplin/lib/file-api-driver-joplinServer");
const onedrive_api_1 = require("@joplin/lib/onedrive-api");
const SyncTargetOneDrive_1 = require("@joplin/lib/SyncTargetOneDrive");
const JoplinDatabase_1 = require("@joplin/lib/JoplinDatabase");
const fs = require('fs-extra');
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
const Folder_1 = require("@joplin/lib/models/Folder");
const Note_1 = require("@joplin/lib/models/Note");
const ItemChange_1 = require("@joplin/lib/models/ItemChange");
const Resource_1 = require("@joplin/lib/models/Resource");
const Tag_1 = require("@joplin/lib/models/Tag");
const NoteTag_1 = require("@joplin/lib/models/NoteTag");
const Revision_1 = require("@joplin/lib/models/Revision");
const MasterKey_1 = require("@joplin/lib/models/MasterKey");
const BaseItem_1 = require("@joplin/lib/models/BaseItem");
const { FileApi } = require('@joplin/lib/file-api.js');
const { FileApiDriverMemory } = require('@joplin/lib/file-api-driver-memory.js');
const { FileApiDriverLocal } = require('@joplin/lib/file-api-driver-local.js');
const { FileApiDriverWebDav } = require('@joplin/lib/file-api-driver-webdav.js');
const { FileApiDriverDropbox } = require('@joplin/lib/file-api-driver-dropbox.js');
const { FileApiDriverOneDrive } = require('@joplin/lib/file-api-driver-onedrive.js');
const { FileApiDriverAmazonS3 } = require('@joplin/lib/file-api-driver-amazon-s3.js');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const SyncTargetRegistry = require('@joplin/lib/SyncTargetRegistry.js');
const SyncTargetMemory = require('@joplin/lib/SyncTargetMemory.js');
const SyncTargetFilesystem = require('@joplin/lib/SyncTargetFilesystem.js');
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
const SyncTargetJoplinServer_1 = require("@joplin/lib/SyncTargetJoplinServer");
const EncryptionService_1 = require("@joplin/lib/services/EncryptionService");
const DecryptionWorker_1 = require("@joplin/lib/services/DecryptionWorker");
const RevisionService_1 = require("@joplin/lib/services/RevisionService");
const ResourceFetcher_1 = require("@joplin/lib/services/ResourceFetcher");
const WebDavApi = require('@joplin/lib/WebDavApi');
const DropboxApi = require('@joplin/lib/DropboxApi');
const JoplinServerApi_1 = require("@joplin/lib/JoplinServerApi");
const { loadKeychainServiceAndSettings } = require('@joplin/lib/services/SettingUtils');
const md5 = require('md5');
const S3 = require('aws-sdk/clients/s3');
const { Dirnames } = require('@joplin/lib/services/synchronizer/utils/types');
const sharp = require('sharp');
const { credentialFile } = require('@joplin/tools/tool-utils');
// Each suite has its own separate data and temp directory so that multiple
// suites can be run at the same time. suiteName is what is used to
// differentiate between suite and it is currently set to a random string
// (Ideally it would be something like the filename currently being executed by
// Jest, to make debugging easier, but it's not clear how to get this info).
const suiteName_ = uuid_1.default.createNano();
const databases_ = [];
let synchronizers_ = [];
const synchronizerContexts_ = {};
const fileApis_ = {};
const encryptionServices_ = [];
const revisionServices_ = [];
const decryptionWorkers_ = [];
const resourceServices_ = [];
const resourceFetchers_ = [];
const kvStores_ = [];
let currentClient_ = 1;
// The line `process.on('unhandledRejection'...` in all the test files is going to
// make it throw this error. It's not too big a problem so disable it for now.
// https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
process.setMaxListeners(0);
let keytar;
try {
    keytar = shim_1.default.platformSupportsKeyChain() ? require('keytar') : null;
}
catch (error) {
    console.error('Cannot load keytar - keychain support will be disabled', error);
    keytar = null;
}
shimInit(sharp, keytar);
shim_1.default.setIsTestingEnv(true);
const fsDriver = new fs_driver_node_1.default();
Logger_1.default.fsDriver_ = fsDriver;
Resource_1.default.fsDriver_ = fsDriver;
EncryptionService_1.default.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;
const logDir = `${__dirname}/../tests/logs`;
const baseTempDir = `${__dirname}/../tests/tmp/${suiteName_}`;
const supportDir = `${__dirname}/support`;
exports.supportDir = supportDir;
// We add a space in the data directory path as that will help uncover
// various space-in-path issues.
const dataDir = `${__dirname}/test data/${suiteName_}`;
const profileDir = `${dataDir}/profile`;
fs.mkdirpSync(logDir, 0o755);
fs.mkdirpSync(baseTempDir, 0o755);
fs.mkdirpSync(dataDir);
fs.mkdirpSync(profileDir);
SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive_1.default);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer_1.default);
let syncTargetName_ = '';
let syncTargetId_ = null;
let sleepTime = 0;
let isNetworkSyncTarget_ = false;
function syncTargetName() {
    return syncTargetName_;
}
exports.syncTargetName = syncTargetName;
function setSyncTargetName(name) {
    if (name === syncTargetName_)
        return syncTargetName_;
    const previousName = syncTargetName_;
    syncTargetName_ = name;
    syncTargetId_ = SyncTargetRegistry.nameToId(syncTargetName_);
    sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 100; // 400;
    isNetworkSyncTarget_ = ['nextcloud', 'dropbox', 'onedrive', 'amazon_s3', 'joplinServer'].includes(syncTargetName_);
    synchronizers_ = [];
    return previousName;
}
exports.setSyncTargetName = setSyncTargetName;
setSyncTargetName('memory');
// setSyncTargetName('nextcloud');
// setSyncTargetName('dropbox');
// setSyncTargetName('onedrive');
// setSyncTargetName('amazon_s3');
// setSyncTargetName('joplinServer');
// console.info(`Testing with sync target: ${syncTargetName_}`);
const syncDir = `${__dirname}/../tests/sync/${suiteName_}`;
exports.syncDir = syncDir;
// 90 seconds now that the tests are running in parallel and have been
// split into smaller suites might not be necessary but for now leave it
// anyway.
let defaultJestTimeout = 90 * 1000;
if (isNetworkSyncTarget_)
    defaultJestTimeout = 60 * 1000 * 10;
jest.setTimeout(defaultJestTimeout);
const dbLogger = new Logger_1.default();
dbLogger.addTarget(Logger_1.TargetType.Console);
dbLogger.setLevel(Logger_1.default.LEVEL_WARN);
const logger = new Logger_1.default();
exports.logger = logger;
logger.addTarget(Logger_1.TargetType.Console);
logger.setLevel(Logger_1.default.LEVEL_WARN); // Set to DEBUG to display sync process in console
Logger_1.default.initializeGlobalLogger(logger);
BaseItem_1.default.loadClass('Note', Note_1.default);
BaseItem_1.default.loadClass('Folder', Folder_1.default);
BaseItem_1.default.loadClass('Resource', Resource_1.default);
BaseItem_1.default.loadClass('Tag', Tag_1.default);
BaseItem_1.default.loadClass('NoteTag', NoteTag_1.default);
BaseItem_1.default.loadClass('MasterKey', MasterKey_1.default);
BaseItem_1.default.loadClass('Revision', Revision_1.default);
Setting_1.default.setConstant('appId', 'net.cozic.joplintest-cli');
Setting_1.default.setConstant('appType', 'cli');
Setting_1.default.setConstant('tempDir', baseTempDir);
Setting_1.default.setConstant('cacheDir', baseTempDir);
Setting_1.default.setConstant('pluginDataDir', `${profileDir}/profile/plugin-data`);
Setting_1.default.setConstant('profileDir', profileDir);
Setting_1.default.setConstant('env', 'dev');
BaseService_1.default.logger_ = logger;
Setting_1.default.autoSaveEnabled = false;
function syncTargetId() {
    return syncTargetId_;
}
exports.syncTargetId = syncTargetId;
function isNetworkSyncTarget() {
    return isNetworkSyncTarget_;
}
exports.isNetworkSyncTarget = isNetworkSyncTarget;
function sleep(n) {
    return new Promise((resolve) => {
        shim_1.default.setTimeout(() => {
            resolve(null);
        }, Math.round(n * 1000));
    });
}
exports.sleep = sleep;
function msleep(ms) {
    // It seems setTimeout can sometimes last less time than the provided
    // interval:
    //
    // https://stackoverflow.com/a/50912029/561309
    //
    // This can cause issues in tests where we expect the actual duration to be
    // the same as the provided interval or more, but not less. So the code
    // below check that the elapsed time is no less than the provided interval,
    // and if it is, it waits a bit longer.
    const startTime = Date.now();
    return new Promise((resolve) => {
        shim_1.default.setTimeout(() => {
            if (Date.now() - startTime < ms) {
                const iid = setInterval(() => {
                    if (Date.now() - startTime >= ms) {
                        clearInterval(iid);
                        resolve(null);
                    }
                }, 2);
            }
            else {
                resolve(null);
            }
        }, ms);
    });
}
exports.msleep = msleep;
function currentClientId() {
    return currentClient_;
}
exports.currentClientId = currentClientId;
function afterEachCleanUp() {
    return __awaiter(this, void 0, void 0, function* () {
        yield ItemChange_1.default.waitForAllSaved();
        KeymapService_1.default.destroyInstance();
    });
}
exports.afterEachCleanUp = afterEachCleanUp;
function afterAllCleanUp() {
    return __awaiter(this, void 0, void 0, function* () {
        if (fileApi()) {
            try {
                yield fileApi().clearRoot();
            }
            catch (error) {
                console.warn('Could not clear sync target root:', error);
            }
        }
    });
}
exports.afterAllCleanUp = afterAllCleanUp;
function switchClient(id, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({}, { keychainEnabled: false }, options);
        if (!databases_[id])
            throw new Error(`Call setupDatabaseAndSynchronizer(${id}) first!!`);
        yield time_1.default.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
        yield Setting_1.default.saveAll();
        currentClient_ = id;
        BaseModel_1.default.setDb(databases_[id]);
        BaseItem_1.default.encryptionService_ = encryptionServices_[id];
        Resource_1.default.encryptionService_ = encryptionServices_[id];
        BaseItem_1.default.revisionService_ = revisionServices_[id];
        yield Setting_1.default.reset();
        Setting_1.default.setConstant('resourceDirName', resourceDirName(id));
        Setting_1.default.setConstant('resourceDir', resourceDir(id));
        Setting_1.default.setConstant('pluginDir', pluginDir(id));
        yield loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver_node_1.default : KeychainServiceDriver_dummy_1.default);
        Setting_1.default.setValue('sync.wipeOutFailSafe', false); // To keep things simple, always disable fail-safe unless explicitely set in the test itself
    });
}
exports.switchClient = switchClient;
function clearDatabase(id = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (id === null)
            id = currentClient_;
        if (!databases_[id])
            return;
        yield ItemChange_1.default.waitForAllSaved();
        const tableNames = [
            'notes',
            'folders',
            'resources',
            'tags',
            'note_tags',
            'master_keys',
            'item_changes',
            'note_resources',
            'settings',
            'deleted_items',
            'sync_items',
            'notes_normalized',
            'revisions',
            'key_values',
        ];
        const queries = [];
        for (const n of tableNames) {
            queries.push(`DELETE FROM ${n}`);
            queries.push(`DELETE FROM sqlite_sequence WHERE name="${n}"`); // Reset autoincremented IDs
        }
        yield databases_[id].transactionExecBatch(queries);
    });
}
exports.clearDatabase = clearDatabase;
function setupDatabase(id = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = Object.assign({}, { keychainEnabled: false }, options);
        if (id === null)
            id = currentClient_;
        Setting_1.default.cancelScheduleSave();
        // Note that this was changed from `Setting.cache_ = []` to `await
        // Setting.reset()` during the TypeScript conversion. Normally this is
        // more correct but something to keep in mind anyway in case there are
        // some strange async issue related to settings when the tests are
        // running.
        yield Setting_1.default.reset();
        if (databases_[id]) {
            BaseModel_1.default.setDb(databases_[id]);
            yield clearDatabase(id);
            yield loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver_node_1.default : KeychainServiceDriver_dummy_1.default);
            return;
        }
        const filePath = `${dataDir}/test-${id}.sqlite`;
        try {
            yield fs.unlink(filePath);
        }
        catch (error) {
            // Don't care if the file doesn't exist
        }
        databases_[id] = new JoplinDatabase_1.default(new DatabaseDriverNode());
        databases_[id].setLogger(dbLogger);
        yield databases_[id].open({ name: filePath });
        BaseModel_1.default.setDb(databases_[id]);
        yield loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver_node_1.default : KeychainServiceDriver_dummy_1.default);
    });
}
exports.setupDatabase = setupDatabase;
function exportDir(id = null) {
    if (id === null)
        id = currentClient_;
    return `${dataDir}/export`;
}
exports.exportDir = exportDir;
function resourceDirName(id = null) {
    if (id === null)
        id = currentClient_;
    return `resources-${id}`;
}
function resourceDir(id = null) {
    if (id === null)
        id = currentClient_;
    return `${dataDir}/${resourceDirName(id)}`;
}
function pluginDir(id = null) {
    if (id === null)
        id = currentClient_;
    return `${dataDir}/plugins-${id}`;
}
function setupDatabaseAndSynchronizer(id, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (id === null)
            id = currentClient_;
        BaseService_1.default.logger_ = logger;
        yield setupDatabase(id, options);
        EncryptionService_1.default.instance_ = null;
        DecryptionWorker_1.default.instance_ = null;
        yield fs.remove(resourceDir(id));
        yield fs.mkdirp(resourceDir(id), 0o755);
        yield fs.remove(pluginDir(id));
        yield fs.mkdirp(pluginDir(id), 0o755);
        if (!synchronizers_[id]) {
            const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
            const syncTarget = new SyncTargetClass(db(id));
            yield initFileApi(suiteName_);
            syncTarget.setFileApi(fileApi());
            syncTarget.setLogger(logger);
            synchronizers_[id] = yield syncTarget.synchronizer();
            synchronizerContexts_[id] = null;
        }
        encryptionServices_[id] = new EncryptionService_1.default();
        revisionServices_[id] = new RevisionService_1.default();
        decryptionWorkers_[id] = new DecryptionWorker_1.default();
        decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);
        resourceServices_[id] = new ResourceService_1.default();
        resourceFetchers_[id] = new ResourceFetcher_1.default(() => { return synchronizers_[id].api(); });
        kvStores_[id] = new KvStore_1.default();
        yield fileApi().initialize();
        yield fileApi().clearRoot();
    });
}
exports.setupDatabaseAndSynchronizer = setupDatabaseAndSynchronizer;
function db(id = null) {
    if (id === null)
        id = currentClient_;
    return databases_[id];
}
exports.db = db;
function synchronizer(id = null) {
    if (id === null)
        id = currentClient_;
    return synchronizers_[id];
}
exports.synchronizer = synchronizer;
// This is like calling synchronizer.start() but it handles the
// complexity of passing around the sync context depending on
// the client.
function synchronizerStart(id = null, extraOptions = null) {
    return __awaiter(this, void 0, void 0, function* () {
        if (id === null)
            id = currentClient_;
        const context = synchronizerContexts_[id];
        const options = Object.assign({}, extraOptions);
        if (context)
            options.context = context;
        const newContext = yield synchronizer(id).start(options);
        synchronizerContexts_[id] = newContext;
        return newContext;
    });
}
exports.synchronizerStart = synchronizerStart;
function encryptionService(id = null) {
    if (id === null)
        id = currentClient_;
    return encryptionServices_[id];
}
exports.encryptionService = encryptionService;
function kvStore(id = null) {
    if (id === null)
        id = currentClient_;
    const o = kvStores_[id];
    o.setDb(db(id));
    return o;
}
exports.kvStore = kvStore;
function revisionService(id = null) {
    if (id === null)
        id = currentClient_;
    return revisionServices_[id];
}
exports.revisionService = revisionService;
function decryptionWorker(id = null) {
    if (id === null)
        id = currentClient_;
    const o = decryptionWorkers_[id];
    o.setKvStore(kvStore(id));
    return o;
}
exports.decryptionWorker = decryptionWorker;
function resourceService(id = null) {
    if (id === null)
        id = currentClient_;
    return resourceServices_[id];
}
exports.resourceService = resourceService;
function resourceFetcher(id = null) {
    if (id === null)
        id = currentClient_;
    return resourceFetchers_[id];
}
exports.resourceFetcher = resourceFetcher;
function loadEncryptionMasterKey(id = null, useExisting = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const service = encryptionService(id);
        let masterKey = null;
        if (!useExisting) { // Create it
            masterKey = yield service.generateMasterKey('123456');
            masterKey = yield MasterKey_1.default.save(masterKey);
        }
        else { // Use the one already available
            const masterKeys = yield MasterKey_1.default.all();
            if (!masterKeys.length)
                throw new Error('No master key available');
            masterKey = masterKeys[0];
        }
        yield service.loadMasterKey_(masterKey, '123456', true);
        return masterKey;
    });
}
exports.loadEncryptionMasterKey = loadEncryptionMasterKey;
function initFileApi(suiteName) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fileApis_[syncTargetId_])
            return;
        let fileApi = null;
        if (syncTargetId_ == SyncTargetRegistry.nameToId('filesystem')) {
            fs.removeSync(syncDir);
            fs.mkdirpSync(syncDir, 0o755);
            fileApi = new FileApi(syncDir, new FileApiDriverLocal());
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('memory')) {
            fileApi = new FileApi('/root', new FileApiDriverMemory());
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('nextcloud')) {
            const options = require(`${__dirname}/../tests/support/nextcloud-auth.json`);
            const api = new WebDavApi({
                baseUrl: () => options.baseUrl,
                username: () => options.username,
                password: () => options.password,
            });
            fileApi = new FileApi('', new FileApiDriverWebDav(api));
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('dropbox')) {
            // To get a token, go to the App Console:
            // https://www.dropbox.com/developers/apps/
            // Then select "JoplinTest" and click "Generated access token"
            const api = new DropboxApi();
            const authTokenPath = `${__dirname}/support/dropbox-auth.txt`;
            const authToken = fs.readFileSync(authTokenPath, 'utf8');
            if (!authToken)
                throw new Error(`Dropbox auth token missing in ${authTokenPath}`);
            api.setAuthToken(authToken);
            fileApi = new FileApi('', new FileApiDriverDropbox(api));
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('onedrive')) {
            // To get a token, open the URL below, then copy the *complete*
            // redirection URL in onedrive-auth.txt. Keep in mind that auth
            // data only lasts 1h for OneDrive.
            //
            // https://login.live.com/oauth20_authorize.srf?client_id=f1e68e1e-a729-4514-b041-4fdd5c7ac03a&scope=files.readwrite,offline_access&response_type=token&redirect_uri=https://joplinapp.org
            //
            // Also for now OneDrive tests cannot be run in parallel because
            // for that each suite would need its own sub-directory within the
            // OneDrive app directory, and it's not clear how to get that
            // working.
            if (!process.argv.includes('--runInBand')) {
                throw new Error('OneDrive tests must be run sequentially, with the --runInBand arg. eg `npm test -- --runInBand`');
            }
            const { parameters, setEnvOverride } = require('@joplin/lib/parameters.js');
            Setting_1.default.setConstant('env', 'dev');
            setEnvOverride('test');
            const config = parameters().oneDriveTest;
            const api = new onedrive_api_1.default(config.id, config.secret, false);
            const authData = fs.readFileSync(yield credentialFile('onedrive-auth.txt'), 'utf8');
            const urlInfo = require('url-parse')(authData, true);
            const auth = require('querystring').parse(urlInfo.hash.substr(1));
            api.setAuth(auth);
            const accountProperties = yield api.execAccountPropertiesRequest();
            api.setAccountProperties(accountProperties);
            const appDir = yield api.appDirectory();
            fileApi = new FileApi(appDir, new FileApiDriverOneDrive(api));
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('amazon_s3')) {
            const amazonS3CredsPath = `${__dirname}/support/amazon-s3-auth.json`;
            const amazonS3Creds = require(amazonS3CredsPath);
            if (!amazonS3Creds || !amazonS3Creds.accessKeyId)
                throw new Error(`AWS auth JSON missing in ${amazonS3CredsPath} format should be: { "accessKeyId": "", "secretAccessKey": "", "bucket": "mybucket"}`);
            const api = new S3({ accessKeyId: amazonS3Creds.accessKeyId, secretAccessKey: amazonS3Creds.secretAccessKey, s3UseArnRegion: true });
            fileApi = new FileApi('', new FileApiDriverAmazonS3(api, amazonS3Creds.bucket));
        }
        else if (syncTargetId_ == SyncTargetRegistry.nameToId('joplinServer')) {
            // Note that to test the API in parallel mode, you need to use Postgres
            // as database, as the SQLite database is not reliable when being
            // read/write from multiple processes at the same time.
            const api = new JoplinServerApi_1.default({
                baseUrl: () => 'http://localhost:22300',
                username: () => 'admin@localhost',
                password: () => 'admin',
            });
            fileApi = new FileApi(`Apps/Joplin-${suiteName}`, new file_api_driver_joplinServer_1.default(api));
        }
        fileApi.setLogger(logger);
        fileApi.setSyncTargetId(syncTargetId_);
        fileApi.setTempDirName(Dirnames.Temp);
        fileApi.requestRepeatCount_ = isNetworkSyncTarget_ ? 1 : 0;
        fileApis_[syncTargetId_] = fileApi;
    });
}
function fileApi() {
    return fileApis_[syncTargetId_];
}
exports.fileApi = fileApi;
function objectsEqual(o1, o2) {
    if (Object.getOwnPropertyNames(o1).length !== Object.getOwnPropertyNames(o2).length)
        return false;
    for (const n in o1) {
        if (!o1.hasOwnProperty(n))
            continue;
        if (o1[n] !== o2[n])
            return false;
    }
    return true;
}
exports.objectsEqual = objectsEqual;
function checkThrowAsync(asyncFn) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasThrown = false;
        try {
            yield asyncFn();
        }
        catch (error) {
            hasThrown = true;
        }
        return hasThrown;
    });
}
exports.checkThrowAsync = checkThrowAsync;
function expectThrow(asyncFn, errorCode = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasThrown = false;
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            hasThrown = true;
            thrownError = error;
        }
        if (!hasThrown) {
            expect('not throw').toBe('throw');
        }
        else if (thrownError.code !== errorCode) {
            console.error(thrownError);
            expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
        }
        else {
            expect(true).toBe(true);
        }
    });
}
exports.expectThrow = expectThrow;
function expectNotThrow(asyncFn) {
    return __awaiter(this, void 0, void 0, function* () {
        let thrownError = null;
        try {
            yield asyncFn();
        }
        catch (error) {
            thrownError = error;
        }
        if (thrownError) {
            console.error(thrownError);
            expect(thrownError.message).toBe('');
        }
        else {
            expect(true).toBe(true);
        }
    });
}
exports.expectNotThrow = expectNotThrow;
function checkThrow(fn) {
    let hasThrown = false;
    try {
        fn();
    }
    catch (error) {
        hasThrown = true;
    }
    return hasThrown;
}
exports.checkThrow = checkThrow;
function fileContentEqual(path1, path2) {
    const fs = require('fs-extra');
    const content1 = fs.readFileSync(path1, 'base64');
    const content2 = fs.readFileSync(path2, 'base64');
    return content1 === content2;
}
exports.fileContentEqual = fileContentEqual;
function allSyncTargetItemsEncrypted() {
    return __awaiter(this, void 0, void 0, function* () {
        const list = yield fileApi().list('', { includeDirs: false });
        const files = list.items;
        let totalCount = 0;
        let encryptedCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!BaseItem_1.default.isSystemPath(file.path))
                continue;
            const remoteContentString = yield fileApi().get(file.path);
            const remoteContent = yield BaseItem_1.default.unserialize(remoteContentString);
            const ItemClass = BaseItem_1.default.itemClass(remoteContent);
            if (!ItemClass.encryptionSupported())
                continue;
            totalCount++;
            if (remoteContent.type_ === BaseModel_1.default.TYPE_RESOURCE) {
                const content = yield fileApi().get(`.resource/${remoteContent.id}`);
                totalCount++;
                if (content.substr(0, 5) === 'JED01')
                    encryptedCount++;
            }
            if (remoteContent.encryption_applied)
                encryptedCount++;
        }
        if (!totalCount)
            throw new Error('No encryptable item on sync target');
        return totalCount === encryptedCount;
    });
}
exports.allSyncTargetItemsEncrypted = allSyncTargetItemsEncrypted;
function id(a) {
    return a.id;
}
exports.id = id;
function ids(a) {
    return a.map(n => n.id);
}
exports.ids = ids;
function sortedIds(a) {
    return ids(a).sort();
}
exports.sortedIds = sortedIds;
function at(a, indexes) {
    const out = [];
    for (let i = 0; i < indexes.length; i++) {
        out.push(a[indexes[i]]);
    }
    return out;
}
exports.at = at;
function createNTestFolders(n) {
    return __awaiter(this, void 0, void 0, function* () {
        const folders = [];
        for (let i = 0; i < n; i++) {
            const folder = yield Folder_1.default.save({ title: 'folder' });
            folders.push(folder);
            yield time_1.default.msleep(10);
        }
        return folders;
    });
}
exports.createNTestFolders = createNTestFolders;
function createNTestNotes(n, folder, tagIds = null, title = 'note') {
    return __awaiter(this, void 0, void 0, function* () {
        const notes = [];
        for (let i = 0; i < n; i++) {
            const title_ = n > 1 ? `${title}${i}` : title;
            const note = yield Note_1.default.save({ title: title_, parent_id: folder.id, is_conflict: 0 });
            notes.push(note);
            yield time_1.default.msleep(10);
        }
        if (tagIds) {
            for (let i = 0; i < notes.length; i++) {
                yield Tag_1.default.setNoteTagsByIds(notes[i].id, tagIds);
                yield time_1.default.msleep(10);
            }
        }
        return notes;
    });
}
exports.createNTestNotes = createNTestNotes;
function createNTestTags(n) {
    return __awaiter(this, void 0, void 0, function* () {
        const tags = [];
        for (let i = 0; i < n; i++) {
            const tag = yield Tag_1.default.save({ title: 'tag' });
            tags.push(tag);
            yield time_1.default.msleep(10);
        }
        return tags;
    });
}
exports.createNTestTags = createNTestTags;
function tempFilePath(ext) {
    return `${Setting_1.default.value('tempDir')}/${md5(Date.now() + Math.random())}.${ext}`;
}
exports.tempFilePath = tempFilePath;
function createTempDir() {
    return __awaiter(this, void 0, void 0, function* () {
        const tempDirPath = `${baseTempDir}/${uuid_1.default.createNano()}`;
        yield fs.mkdirp(tempDirPath);
        return tempDirPath;
    });
}
exports.createTempDir = createTempDir;
function newPluginService(appVersion = '1.4', options = null) {
    options = options || {};
    const runner = new PluginRunner_1.default();
    const service = new PluginService_1.default();
    service.initialize(appVersion, {
        joplin: {},
    }, runner, {
        dispatch: () => { },
        getState: options.getState ? options.getState : () => { },
    });
    return service;
}
exports.newPluginService = newPluginService;
function newPluginScript(script) {
    return `
		/* joplin-manifest:
		{
			"id": "org.joplinapp.plugins.PluginTest",
			"manifest_version": 1,
			"app_min_version": "1.4",
			"name": "JS Bundle test",
			"version": "1.0.0"
		}
		*/
		
		${script}
	`;
}
exports.newPluginScript = newPluginScript;
function waitForFolderCount(count) {
    return __awaiter(this, void 0, void 0, function* () {
        const timeout = 2000;
        const startTime = Date.now();
        while (true) {
            const folders = yield Folder_1.default.all();
            if (folders.length >= count)
                return;
            if (Date.now() - startTime > timeout)
                throw new Error('Timeout waiting for folders to be created');
            yield msleep(10);
        }
    });
}
exports.waitForFolderCount = waitForFolderCount;
// TODO: Update for Jest
// function mockDate(year, month, day, tick) {
// 	const fixedDate = new Date(2020, 0, 1);
// 	jasmine.clock().install();
// 	jasmine.clock().mockDate(fixedDate);
// }
// function restoreDate() {
// 	jasmine.clock().uninstall();
// }
// Application for feature integration testing
class TestApp extends BaseApplication_1.default {
    constructor(hasGui = true) {
        super();
        this.hasGui_ = hasGui;
        this.middlewareCalls_ = [];
        this.logger_ = super.logger();
    }
    hasGui() {
        return this.hasGui_;
    }
    start(argv) {
        const _super = Object.create(null, {
            start: { get: () => super.start }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.logger_.info('Test app starting...');
            if (!argv.includes('--profile')) {
                argv = argv.concat(['--profile', `tests-build/profile/${uuid_1.default.create()}`]);
            }
            argv = yield _super.start.call(this, ['', ''].concat(argv));
            // For now, disable sync and encryption to avoid spurious intermittent failures
            // caused by them interupting processing and causing delays.
            Setting_1.default.setValue('sync.interval', 0);
            Setting_1.default.setValue('encryption.enabled', false);
            this.initRedux();
            Setting_1.default.dispatchUpdateAll();
            yield ItemChange_1.default.waitForAllSaved();
            yield this.wait();
            this.logger_.info('Test app started...');
        });
    }
    generalMiddleware(store, next, action) {
        const _super = Object.create(null, {
            generalMiddleware: { get: () => super.generalMiddleware }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.middlewareCalls_.push(true);
            try {
                yield _super.generalMiddleware.call(this, store, next, action);
            }
            finally {
                this.middlewareCalls_.pop();
            }
        });
    }
    wait() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                const iid = shim_1.default.setInterval(() => {
                    if (!this.middlewareCalls_.length) {
                        clearInterval(iid);
                        resolve(null);
                    }
                }, 100);
            });
        });
    }
    profileDir() {
        return __awaiter(this, void 0, void 0, function* () {
            return Setting_1.default.value('profileDir');
        });
    }
    destroy() {
        const _super = Object.create(null, {
            destroy: { get: () => super.destroy }
        });
        return __awaiter(this, void 0, void 0, function* () {
            this.logger_.info('Test app stopping...');
            yield this.wait();
            yield ItemChange_1.default.waitForAllSaved();
            this.deinitRedux();
            yield _super.destroy.call(this);
            yield time_1.default.msleep(100);
        });
    }
}
exports.TestApp = TestApp;
//# sourceMappingURL=test-utils.js.map