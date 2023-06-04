# install
pip install localstack

# start 
localstack start -d

# list
localstack status services

# aws-cli local
pip install awscli-local

# test

# Create a Lambda function
To create a new Lambda function, create a new file called index.js with the following code:

cat << EOF> index.js
exports.handler = async (event) => {
    let body = JSON.parse(event.body)
    const product = body.num1 * body.num2;
    const response = {
        statusCode: 200,
        body: "The product of " + body.num1 + " and " + body.num2 + " is " + product,
    };
    return response;
};
EOF


# Enter the following command to create a new Lambda function:

zip function.zip index.js
awslocal lambda create-function \
    --function-name localstack-lamba-url-example \
    --runtime nodejs18.x \
    --zip-file fileb://function.zip \
    --handler index.handler \
    --role arn:aws:iam::000000000000:role/lambda-role

# Create a Function URL
With the Function URL property, there is now a new way to call a Lambda Function via HTTP API call using the CreateFunctionURLConfig API. To create a URL for invoking the function, run the following command:

awslocal lambda create-function-url-config \
    --function-name localstack-lamba-url-example \
    --auth-type NONE
This will generate a HTTP URL that can be used to invoke the Lambda function. The URL will be in the format http://<XXXXXXXX>.lambda-url.us-east-1.localhost.localstack.cloud:4566.

{
    "FunctionUrl": "http://hcb0sejvl7ty7h3hn9ld4pjutu18fb5w.lambda-url.us-east-1.localhost.localstack.cloud:4566/",
    "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:localstack-lamba-url-example",
    "AuthType": "NONE",
    "CreationTime": "2023-06-03T18:22:36.580925+0000"
}


# Trigger the Lambda function URL 
You can now trigger the Lambda function by sending a HTTP POST request to the URL using cURL or your REST HTTP client:

curl -X POST \
    'http://hcb0sejvl7ty7h3hn9ld4pjutu18fb5w.lambda-url.us-east-1.localhost.localstack.cloud:4566/' \
    -H 'Content-Type: application/json' \
    -d '{"num1": "10", "num2": "10"}'


# clean lamda

delete-function
delete-function-url-config

awslocal lambda delete-function \
    --function-name localstack-lamba-url-example 

awslocal lambda delete-function-url-config \
    --function-name localstack-lamba-url-example  

# API gateway
awslocal apigateway create-rest-api --name 'API Gateway Lambda integration'

# DynamoDB
create table
awslocal dynamodb create-table \
--table-name global01 \
--key-schema AttributeName=id,KeyType=HASH \
--attribute-definitions AttributeName=id,AttributeType=S \
--billing-mode PAY_PER_REQUEST \
--region ap-south-1

list tables
awslocal dynamodb list-tables --region eu-central-1

awslocal dynamodb delete-table \                                                                  
    --table-name global01


# pulumi-localstack
mkdir quickstart && cd quickstart
pulumi new aws-typescript
localstack start -d 
pulumi up
pulumilocal up
awslocal s3 ls

# klotho thing

# install 
brew install klothoplatform/tap/klotho

git clone https://github.com/klothoplatform/sample-apps.git
cd sample-apps/js-my-first-app
npm install


# Compiling with Klotho
First, log in to Klotho. This will allow us to support you if you run into any issues, and give you the opportunity to shape the product in this early development stage.

Locally Installed
Docker
klotho --login # if you haven't already

Now compile the application for AWS by running klotho and passing --provider aws as an argument on the command line.

Locally Installed
Docker
klotho . --app my-first-app --provider aws

# go 
mkdir klotho-my-first-app
cd klotho-my-first-app

cat << EOF> go.mod
module example/klotho-my-first-app

go 1.18

require github.com/go-chi/chi/v5 v5.0.8
EOF

cat << EOF> go.sum
github.com/go-chi/chi/v5 v5.0.8 h1:lD+NLqFcAi1ovnVZpsnObHGW4xb4J8lNmoYVfECH1Y0=
github.com/go-chi/chi/v5 v5.0.8/go.mod h1:DslCQbL2OYiznFReuXYUmQ2hGd1aDpCnlMNITLSKoi8=
EOF

cat << EOF> main.go
package main

import (
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)

    r.Get("/hello", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello from Klotho!"))
    })

    r.Get("/hello/{name}", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(fmt.Sprintf("Hello %s!", chi.URLParam(r, "name"))))
    })

    fmt.Println("Listening on :3000")

    /* @klotho::expose {
     *   target = "public"
     *   id = "app"
     * }
     */
    http.ListenAndServe(":3000", r)
}

EOF

# Testing locally
go run main.go
curl "localhost:3000/hello"

# Compiling with Klotho
klotho --login # if you haven't already
klotho . --app my-first-app --provider aws --outDir _compiled

# Deploying Application
pulumilocal login --local
cat Pulumi.localstack.yaml|g region
pulumilocal config set aws:region us-east-1 --cwd '_compiled/' -s my-first-app

cd compiled
npm install 
npm install request --save
nvm install 16
nvm use 16
pulumilocal up



# pulumi with localstack
pip install pulumi-local

# Usage
The pulumilocal command has the same usage as the pulumi command. For detailed usage, please refer to the man pages of pulumi -h.

For example, to deploy a Pulumi application to LocalStack:

pulumilocal up


# How it works
When running a deployment command like pulumilocal up, the wrapper script creates a Pulumi.localstack.yaml config file with local endpoint definitions, and then deploys a Pulumi stack called localstack to your LocalStack instance on localhost.

# Configurations
You can configure the following environment variables:

LOCALSTACK_HOSTNAME: Target host to use for connecting to LocalStack (default: localhost)
EDGE_PORT: Target port to use for connecting to LocalStack (default: 4566)
PULUMI_CMD: Name of the executable Pulumi command on the system PATH (default: pulumi)
PULUMI_STACK_NAME: Name of the Pulumi stack used to configure local endpoints (default: localstack)