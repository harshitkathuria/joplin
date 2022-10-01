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
exports.setLogger = void 0;
const ntpClient = require('./vendor/ntp-client');
const Logger_1 = require("./Logger");
const Mutex = require('async-mutex').Mutex;
let nextSyncTime = 0;
let timeOffset = 0;
let logger = new Logger_1.default();
const fetchingTimeMutex = new Mutex();
const server = {
    domain: 'pool.ntp.org',
    port: 123,
};
function networkTime() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(function (resolve, reject) {
            ntpClient.getNetworkTime(server.domain, server.port, function (error, date) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(date);
            });
        });
    });
}
function shouldSyncTime() {
    return !nextSyncTime || Date.now() > nextSyncTime;
}
function setLogger(v) {
    logger = v;
}
exports.setLogger = setLogger;
function default_1() {
    return __awaiter(this, void 0, void 0, function* () {
        if (shouldSyncTime()) {
            const release = yield fetchingTimeMutex.acquire();
            try {
                if (shouldSyncTime()) {
                    const date = yield networkTime();
                    nextSyncTime = Date.now() + 60 * 1000;
                    timeOffset = date.getTime() - Date.now();
                }
            }
            catch (error) {
                logger.warn('Could not get NTP time - falling back to device time:', error);
                // Fallback to device time since
                // most of the time it's actually correct
                nextSyncTime = Date.now() + 20 * 1000;
                timeOffset = 0;
            }
            finally {
                release();
            }
        }
        return new Date(Date.now() + timeOffset);
    });
}
exports.default = default_1;
//# sourceMappingURL=ntpDate.js.map