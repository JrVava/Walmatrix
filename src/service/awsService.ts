import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import logger from './logger';
import { config } from './../config';

export class AwsService extends S3Client {
    constructor() {
        super({
            region: config.aws.region,
            credentials: {
                accessKeyId: config.aws.accessKey,
                secretAccessKey: config.aws.secretKey,
            },
        });
    }
    public async uploadToS3(fileName: string, path: string) {
        const putCommand = {
            Bucket: config.aws.bucket,
            Key: fileName,
            Body: fs.readFileSync(path),
        };

        try {
            const command = new PutObjectCommand(putCommand);
            const result = await this.send(command);
            logger.info('S3 Uplload Success', result);
            return { result: result };
        } catch (error) {
            logger.error('Error in S3 Upload', error);
        }
    }

    public async uploadBuferToS3(fileName: string, path) {
        const putCommand = {
            Bucket: config.aws.bucket,
            Key: fileName,
            Body: path,
        };

        try {
            const command = new PutObjectCommand(putCommand);
            const result = await this.send(command);
            return { result: result };
        } catch (error) {
            logger.error('Error in S3 Upload', error);
        }
    }

    public async readCSV(fileName: string) {
        // console.log('getCommand', fileName);
        const getCommand = {
            Bucket: config.aws.bucket,
            Key: fileName,
        };

        try {
            if (!fileName) {
                // console.log('getCommand');
                throw 'S3:Please provide file';
            }
            const command = new GetObjectCommand(getCommand);
            return await this.send(command);
        } catch (error) {
            logger.error('Error in S3 get object', error.message);
        }
    }
}
