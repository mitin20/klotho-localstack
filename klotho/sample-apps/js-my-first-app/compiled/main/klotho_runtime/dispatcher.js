"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInflight = void 0;
const s3fs = require('./fs_payload');
const serverless_express_1 = require("@vendia/serverless-express");
const uuid = require('uuid');
const _ = require('lodash');
const path = require('path');


const inflight = new Set();
/**
 * Use this to attach background processes that need to be awaited before the lambda exits.
 * This is especially useful for cleanup tasks or to bridge between synchronous APIs.
 */
function addInflight(p) {
    if (p != null && p != undefined) {
        inflight.add(p);
        p.then(() => {
            inflight.delete(p);
        });
    }
}
exports.addInflight = addInflight;
async function lambdaHandler(event, context) {
    console.info(`main Dispatched`, event);
    try {
        let { __callType, __functionToCall, __moduleName, __params, path: __path } = event;
        const mode = parseMode(event, __callType, __path);
        if (!mode)
            throw new Error(`Invalid Dispatcher Mode: ${mode}`);
        const parameters = __params ? await s3fs.getCallParameters(__params, mode) : {};
        if (!parameters)
            throw new Error(`Runtime Error: Expected Parameters but got none`);
        let response;
        switch (mode) {
            case 'webserver':
                response = await webserverResponse(event, context);
                break;
            case 'emitter':
                response = await activate_emitter(event);
                break;
            case 'rpc':
                response = await handle_rpc_call(__functionToCall, __moduleName, parameters);
                break;
            case 'keepWarm':
                break;
        }
        // await kvInterface.flushAlldMaps()
        return response;
    }
    catch (err) {
        console.error(`Dispatcher Failed`, err);
        throw err;
    }
    finally {
        try {
            while (inflight.size > 0) {
                const promises = Array.from(inflight);
                inflight.clear();
                console.info(`awaiting ${promises.length} promises before exiting`);
                await Promise.all(promises);
            }
        }
        catch (err) {
            console.error('error waiting for inflight promises', err);
        }
    }
}
async function handle_rpc_call(__functionToCall, __moduleName, parameters) {
    const result = await require(path.join('../', __moduleName))[__functionToCall].apply(null, parameters);
    const payloadKey = uuid.v4();
    await s3fs.saveParametersToS3(payloadKey, result);
    return payloadKey;
}
async function activate_emitter(event) {
    const p = [];
    for (const record of event.Records) {
        console.info('Processing record', JSON.stringify(record, null, 2));
        const sns = record.Sns;
        if (!sns)
            continue;
        const moduleName = sns.MessageAttributes.Path.Value;
        const emitterName = sns.MessageAttributes.Name.Value;
        const emitter = require(path.join('../', moduleName))[emitterName];
        p.push(emitter.receive(record));
    }
    await Promise.all(p);
}
function parseMode(lambdaEvent, __callType, eventPathEntry) {
    if (lambdaEvent.Records?.length > 0 && lambdaEvent.Records[0].Sns)
        return 'emitter';
    if (eventPathEntry)
        return 'webserver';
    if (__callType === 'rpc')
        return 'rpc';
    if (lambdaEvent[0] == 'warmed up')
        return 'keepWarm';
}
async function webserverResponse(event, context) {
    
    const app = await require('../index.js')['app'];
    return await (0, serverless_express_1.configure)({
        app: app,
        binarySettings: { contentTypes: ['application/octet-stream', 'image/*'] },
    }).apply(null, [event, context]);
    
}
let handler = lambdaHandler;


exports.handler = handler;
