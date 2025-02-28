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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const logger_1 = __importDefault(require("./logger"));
const config_1 = require("./../config");
class AwsService extends client_s3_1.S3Client {
    constructor() {
        super({
            region: config_1.config.aws.region,
            credentials: {
                accessKeyId: config_1.config.aws.accessKey,
                secretAccessKey: config_1.config.aws.secretKey,
            },
        });
    }
    uploadToS3(fileName, path) {
        return __awaiter(this, void 0, void 0, function* () {
            const putCommand = {
                Bucket: config_1.config.aws.bucket,
                Key: fileName,
                Body: fs_1.default.readFileSync(path),
            };
            try {
                const command = new client_s3_1.PutObjectCommand(putCommand);
                const result = yield this.send(command);
                logger_1.default.info('S3 Uplload Success', result);
                return { result: result };
            }
            catch (error) {
                logger_1.default.error('Error in S3 Upload', error);
            }
        });
    }
    uploadBuferToS3(fileName, path) {
        return __awaiter(this, void 0, void 0, function* () {
            const putCommand = {
                Bucket: config_1.config.aws.bucket,
                Key: fileName,
                Body: path,
            };
            try {
                const command = new client_s3_1.PutObjectCommand(putCommand);
                const result = yield this.send(command);
                return { result: result };
            }
            catch (error) {
                logger_1.default.error('Error in S3 Upload', error);
            }
        });
    }
    readCSV(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log('getCommand', fileName);
            const getCommand = {
                Bucket: config_1.config.aws.bucket,
                Key: fileName,
            };
            try {
                if (!fileName) {
                    // console.log('getCommand');
                    throw 'S3:Please provide file';
                }
                const command = new client_s3_1.GetObjectCommand(getCommand);
                return yield this.send(command);
            }
            catch (error) {
                logger_1.default.error('Error in S3 get object', error.message);
            }
        });
    }
}
exports.AwsService = AwsService;
//# sourceMappingURL=awsService.js.map