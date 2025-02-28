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
exports.verifyCode = void 0;
const config_1 = require("../config");
const google_auth_library_1 = require("google-auth-library");
const verifyCode = (code) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new google_auth_library_1.OAuth2Client(config_1.config.googleClientId);
        const ticket = yield client.verifyIdToken({
            idToken: code,
            audience: config_1.config.googleClientId,
        });
        return ticket.getPayload();
    }
    catch (err) {
        throw Error('Invalid google auth code');
    }
});
exports.verifyCode = verifyCode;
//# sourceMappingURL=googleService.js.map