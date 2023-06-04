/**
 * klotho generated
 * This file is generated by klotho to create the resources for your 'compiled' application and will
 * be overwritten on subsequent compilations, so do not modify. Configuration can be done via a configuration
 * file. The configuration used to generate this file has been rendered at `./klotho.yaml` which you can copy
 * and pass in to the CLI via the `--config path/to/config` flag.
 */

import * as pulumi from "@pulumi/pulumi"
import { Region, USEast1Region } from "@pulumi/aws";
import * as aws from '@pulumi/aws'
import * as awsx from '@pulumi/awsx'
import * as k8s from '@pulumi/kubernetes'
import { v4 as uuidv4 } from "uuid";
import {CloudCCLib, kloConfig} from './deploylib'
import {EksExecUnitArgs, EksExecUnit} from './iac/eks'
import {CockroachDB} from './iac/cockroachdb'
import {ApiGateway, Gateway, Route } from './iac/api_gateway'

import { LoadBalancerPlugin } from './iac/load_balancing'

export = async () => {
    const minimumNodeVersion = 16
    const nodeVersionMatch = process.version.match(/^v(\d+)/)
    if (nodeVersionMatch) {
        let nodeVersion = parseInt(nodeVersionMatch[1])
        if (nodeVersion < minimumNodeVersion) {
            console.error(`Node is at ${process.version}, but Klotho IaC requires at least v${minimumNodeVersion}.`)
            process.exit(1)
        }
    } else {
        console.warn("Couldn't find Node version. If you see other errors, Node may not be correctly set up.")
    }
    const stageName = "stage"
    const appName = "my-first-app"

    const awsConfig = new pulumi.Config("aws");

    const region = awsConfig.require<Region>("region");
    const webportalUpload = kloConfig.get("webportal-upload") || "false"
    const sharedRepo = new awsx.ecr.Repository(appName, {
        repository: new aws.ecr.Repository(appName, {
            name: `${appName}-repo`,
            forceDelete: true
        })
    })
    const namespace = kloConfig.get("namespace") || "cloudccprod"

    const datadogEnabled = false

    const topology = {
    "topologyIconData": [
        {
            "id": "petsByOwner_persist_kv",
            "title": "petsByOwner",
            "image": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/database/dynamodb.png",
            "kind": "persist_kv",
            "type": "dynamodb"
        },
        {
            "id": "InternalKlothoPayloads_internal",
            "title": "InternalKlothoPayloads",
            "image": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/generic/blank/blank.png",
            "kind": "internal",
            "type": ""
        },
        {
            "id": "main_exec_unit",
            "title": "main",
            "image": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/compute/lambda.png",
            "kind": "exec_unit",
            "type": "lambda"
        },
        {
            "id": "pet-api_gateway",
            "title": "pet-api",
            "image": "https://raw.githubusercontent.com/mingrammer/diagrams/master/resources/aws/network/api-gateway.png",
            "kind": "gateway",
            "type": "apigateway"
        }
    ],
    "topologyEdgeData": [
        {
            "source": "main_exec_unit",
            "target": "petsByOwner_persist_kv"
        },
        {
            "source": "pet-api_gateway",
            "target": "main_exec_unit"
        }
    ]
}

    const createVPC = false;

    const cloudLib = new CloudCCLib(
        sharedRepo,
        stageName,
        region,
        appName,
        namespace,
        datadogEnabled,
        topology,
        createVPC,
    )

    cloudLib.uploadAnalytics("Starting pulumi update", false, false)
    cloudLib.uploadAnalytics("Starting pulumi preview", true, false)
    cloudLib.createBuckets([{"Name":"InternalKlothoPayloads","Type":"","Params":null}], true)
    cloudLib.setupKV();

    

    

    

    let keepWarm: string[] = [];

    const lbPlugin = new LoadBalancerPlugin(cloudLib)

    cloudLib.createImage("main","Dockerfile")
    const eksUnits: EksExecUnit[] = []
    const arUrls: any[] = [];
    
    cloudLib.createDockerLambda("main",     {
        "memorySize": 512,
        "timeout": 180
    } as Partial<aws.lambda.FunctionArgs>, "private" ,     [
        {
            "Name": "KLOTHO_PROXY_RESOURCE_NAME",
            "Kind": "internal",
            "ResourceID": "InternalKlothoPayloads",
            "Value": "bucket_name"
        }
    ] );
    
    
    if (eksUnits.length > 0 ) {
        await cloudLib.createEksResources(eksUnits, [], lbPlugin);
    }
    

    cloudLib.configureExecUnitPolicies()

    const staticUnitUrls: any[] = [];

    

    const frontendUrls = staticUnitUrls;

    const apprunnerUrls = arUrls.filter(url => { return url != null});;

    const gatewayUrls: any[] = [];
    const apiGatewayUrls = new ApiGateway(cloudLib, lbPlugin,     [
        {
            "Name": "pet-api",
            "Routes": [
                {
                    "execUnitName": "main",
                    "path": "/pets",
                    "verb": "get"
                },
                {
                    "execUnitName": "main",
                    "path": "/pets",
                    "verb": "post"
                }
            ],
            "ApiType": "REST"
        }
    ])
    gatewayUrls.push(...apiGatewayUrls.invokeUrls)
    

    const apiUrls = gatewayUrls;

    

    if (keepWarm.length > 0) {
        cloudLib.installLambdaWarmer(keepWarm);
    }

    cloudLib.createPolicy();

    let url = `None - Opted out of topology upload by default`;

    if (webportalUpload == "true") {
        const id = `${pulumi.getStack()}-${uuidv4()}`
        cloudLib.uploadTopologyDiagramToPortal(id);
        cloudLib.uploadTopologySpecToPortal(id);
        url = `https://app.klo.dev/dashboard/${id}`
    }
    const deploymentPortal = url;

    cloudLib.uploadAnalytics("Finished pulumi update", false, true)
    cloudLib.uploadAnalytics("Finished pulumi preview", true, false)

    return { frontendUrls, apiUrls, apprunnerUrls, deploymentPortal};
}
