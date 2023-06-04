"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require('lodash');
const path = require('path');
const client_s3_1 = require("@aws-sdk/client-s3");
const bucketEnvVar = 'KLOTHO_PROXY_RESOURCE_NAME';
const bucketName = process.env[bucketEnvVar];
const targetRegion = process.env['AWS_TARGET_REGION'];
const s3Client = new client_s3_1.S3Client({ region: targetRegion });
const streamToString = async (stream, encoding) => (await streamToBuffer(stream)).toString(encoding);
const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
});
async function getCallParameters(paramKey, dispatcherMode) {
    let isEmitter = dispatcherMode === 'emitter' ? true : false;
    try {
        const bucketParams = {
            Bucket: bucketName,
            Key: paramKey,
        };
        const result = await s3Client.send(new client_s3_1.GetObjectCommand(bucketParams));
        let parameters = '';
        if (result.Body) {
            parameters = await streamToString(result.Body, 'utf-8');
            console.log(parameters);
        }
        if (parameters != '') {
            parameters = JSON.parse(parameters);
        }
        console.log(parameters);
        if (isEmitter && Array.isArray(parameters)) {
            // Emitters only have 1 parameter - the runtime saves an array, so we
            // normalize the parameter
            parameters = parameters[0];
            if (Array.isArray(parameters)) {
                let paramPairs = Object.entries(parameters);
                paramPairs = paramPairs.map((x) => {
                    if (x[1].type == 'Buffer') {
                        return [x[0], x[1].data];
                    }
                    else {
                        return x;
                    }
                });
                parameters = Object.entries(paramPairs);
            }
        }
        return parameters || {};
    }
    catch (e) {
        console.error(e);
        throw e;
    }
}
exports.getCallParameters = getCallParameters;
async function saveParametersToS3(paramsS3Key, params) {
    try {
        const bucketParams = {
            Bucket: bucketName,
            Key: paramsS3Key,
            Body: JSON.stringify(params),
        };
        await s3Client.send(new client_s3_1.PutObjectCommand(bucketParams));
    }
    catch (e) {
        console.error(e);
        throw e;
    }
}
exports.saveParametersToS3 = saveParametersToS3;
async function s3_writeFile(...args) {
    const bucketParams = {
        Bucket: bucketName,
        Key: `${args[0]}`,
        Body: args[1],
    };
    try {
        await s3Client.send(new client_s3_1.PutObjectCommand(bucketParams));
        console.debug('Successfully uploaded object: ' + bucketParams.Bucket + '/' + bucketParams.Key);
    }
    catch (err) {
        console.log('Error', err);
        throw err;
    }
}
async function s3_readFile(...args) {
    const bucketParams = {
        Bucket: bucketName,
        Key: `${args[0]}`,
    };
    try {
        // Get the object from the Amazon S3 bucket. It is returned as a ReadableStream.
        const data = await s3Client.send(new client_s3_1.GetObjectCommand(bucketParams));
        if (data.Body) {
            if (args[1]?.encoding) {
                return await streamToString(data.Body, args[1].encoding);
            }
            return streamToBuffer(data.Body);
        }
    }
    catch (err) {
        console.log('Error', err);
        throw err;
    }
}
async function s3_readdir(path) {
    const bucketParams = {
        Bucket: bucketName,
        Prefix: `${path}`,
    };
    try {
        const data = await s3Client.send(new client_s3_1.ListObjectsCommand(bucketParams));
        if (data.Contents) {
            const objectKeys = data.Contents.map((c) => c.Key);
            console.debug('Success', objectKeys);
            return objectKeys;
        }
    }
    catch (err) {
        console.log('Error', err);
        throw err;
    }
}
async function s3_exists(fpath) {
    const bucketParams = { Bucket: bucketName, Key: `${path}` };
    try {
        const data = await s3Client.send(new client_s3_1.HeadObjectCommand(bucketParams));
        console.debug('Success. Object deleted.', data);
        return data; // For unit tests.
    }
    catch (err) {
        console.log('Error', err);
        throw err;
    }
}
async function s3_deleteFile(fpath) {
    const bucketParams = { Bucket: bucketName, Key: `${path}` };
    try {
        const data = await s3Client.send(new client_s3_1.DeleteObjectCommand(bucketParams));
        console.debug('Success. Object deleted.', data);
        return data; // For unit tests.
    }
    catch (err) {
        console.log('Error', err);
        throw err;
    }
}
exports.fs = {
    writeFile: s3_writeFile,
    readFile: s3_readFile,
    readdir: s3_readdir,
    access: s3_exists,
    rm: s3_deleteFile,
};
exports.fs.promises = exports.fs;
