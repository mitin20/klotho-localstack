#####################################################
# Running AWS Services In A Laptop Using LocalStack #
# https://youtu.be/8hi9P1ffaQk                      #
#####################################################

# Referenced videos:
# - Terraform vs. Pulumi vs. Crossplane - Infrastructure as Code (IaC) Tools Comparison: https://youtu.be/RaoKcJGchKM
# - Should We Replace Docker Desktop With Rancher Desktop?: https://youtu.be/bYVfCp9dRTE

#########
# Setup #
#########

git clone https://github.com/vfarcic/localstack-demo

cd localstack-demo

# Replace `[...]` with the API key
export LOCALSTACK_API_KEY=[...]

cat orig/values.yaml \
    | sed -e "s@value: API_KEY@value: $LOCALSTACK_API_KEY@g" \
    | tee values.yaml

######################
# Install LocalStack #
######################

helm repo add localstack \
    https://helm.localstack.cloud

helm repo update

cat values.yaml

helm upgrade --install \
    localstack localstack/localstack \
    --namespace localstack \
    --create-namespace \
    --values values.yaml

# Run the commands from the Helm output
# If using a local Kubernetes cluster like, for example, Rancher Desktop, the `NODE_IP` should be `127.0.0.1`

# Replace `[...]` from the output
export LOCALSTACK_URL=[...]

export AWS_ACCESS_KEY_ID=test

export AWS_SECRET_ACCESS_KEY=test

export AWS_DEFAULT_REGION=us-east-1

alias aws="aws \
    --endpoint-url $LOCALSTACK_URL"

##############################
# S3 Buckets With LocalStack #
##############################

aws s3api list-buckets

aws s3api create-bucket --bucket dot

aws s3api list-buckets

aws s3api put-object \
    --bucket dot \
    --key silly \
    --body silly.txt

aws s3api list-objects --bucket dot

aws s3api get-object \
    --bucket dot \
    --key silly \
    silly-from-s3.txt

cat silly-from-s3.txt

aws s3api delete-object \
    --bucket dot \
    --key silly

aws s3api list-objects --bucket dot

aws s3api delete-bucket --bucket dot

aws s3api list-buckets

#########################################
# RDS Postgres Database With LocalStack #
#########################################

aws rds create-db-instance \
    --db-instance-identifier devops-toolkit \
    --db-instance-class c1 \
    --engine postgres

aws rds describe-db-instances

# It's (almost) fully functional database

aws rds delete-db-instance \
    --db-instance-identifier devops-toolkit

####################################################
# Elastic Container Registry (ECR) With LocalStack #
####################################################

aws ecr create-repository \
    --repository-name devops-toolkit

kubectl --namespace localstack logs \
    --selector app.kubernetes.io/name=localstack \
    --tail 100

# NOTE: It must have access to Docker?

####################################################
# Elastic Kubernetes Service (EKS) With LocalStack #
####################################################

aws eks create-cluster \
    --name my-cluster \
    --role-arn r1 \
    --resources-vpc-config '{}'

aws eks list-clusters

aws eks describe-cluster --name my-cluster

kubectl --namespace localstack logs \
    --selector app.kubernetes.io/name=localstack \
    --tail 100

###########################################
# Coverage, Integrations, And Limitations #
###########################################

# Open https://docs.localstack.cloud/aws/feature-coverage

# Open https://localstack.cloud/pricing

# Open https://docs.localstack.cloud/integrations

# Open https://docs.localstack.cloud/ci

# Open https://docs.localstack.cloud/localstack/limitations

##############
# Conclusion #
##############

# Cons:
# - Not all services are equal
# - Heavy reliance on Docker
# - Needs workarounds for ARM64 (including M1)

# Pros:
# - Great for testing, practicing, and developing