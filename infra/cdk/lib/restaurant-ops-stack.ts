import { Duration, RemovalPolicy, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "node:path";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as sqs from "aws-cdk-lib/aws-sqs";

interface RestaurantOpsStackProps extends StackProps { stage: "demo" | "production"; }

export class RestaurantOpsStack extends Stack {
  constructor(scope: Construct, id: string, props: RestaurantOpsStackProps) {
    super(scope, id, props);
    const production = props.stage === "production";
    const retention = logs.RetentionDays.TWO_WEEKS;
    const repositoryRoot = path.resolve(process.cwd(), "../..");

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: production ? 2 : 0,
      subnetConfiguration: production
        ? [
            { name: "public", subnetType: ec2.SubnetType.PUBLIC },
            { name: "application", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            { name: "database", subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
          ]
        : [
            { name: "public", subnetType: ec2.SubnetType.PUBLIC },
            { name: "database", subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
          ]
    });

    const webBucket = new s3.Bucket(this, "WebBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !production
    });
    const uploadBucket = new s3.Bucket(this, "UploadBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: production ? Duration.days(365) : Duration.days(7) }],
      cors: [{ allowedMethods: [s3.HttpMethods.PUT], allowedOrigins: ["*"], allowedHeaders: ["content-type"] }],
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !production
    });

    const spaRewrite = new cloudfront.Function(this, "SpaRewrite", {
      code: cloudfront.FunctionCode.fromInline(`function handler(event) {
  var request = event.request;
  if (!request.uri.includes('.')) request.uri = '/index.html';
  return request;
}`)
    });
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(webBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{ eventType: cloudfront.FunctionEventType.VIEWER_REQUEST, function: spaRewrite }],
        responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
          securityHeadersBehavior: {
            contentTypeOptions: { override: true },
            frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
            referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
            strictTransportSecurity: { accessControlMaxAge: Duration.days(365), includeSubdomains: true, preload: true, override: true },
            xssProtection: { protection: true, modeBlock: true, override: true }
          }
        })
      }
    });
    new s3deploy.BucketDeployment(this, "WebDeployment", {
      sources: [s3deploy.Source.asset(path.join(repositoryRoot, "apps/web/dist"))],
      destinationBucket: webBucket,
      distribution,
      distributionPaths: ["/*"]
    });

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      passwordPolicy: { minLength: 12, requireDigits: true, requireLowercase: true, requireUppercase: true },
      customAttributes: {
        tenant_id: new cognito.StringAttribute({ mutable: false }),
        store_id: new cognito.StringAttribute({ mutable: true }),
        role: new cognito.StringAttribute({ mutable: true })
      },
      removalPolicy: production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY
    });
    const userPoolClient = userPool.addClient("WebClient", { authFlows: { userSrp: true }, preventUserExistenceErrors: true });

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_8 }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MICRO),
      databaseName: "restaurant_ops",
      credentials: rds.Credentials.fromGeneratedSecret("restaurant_ops"),
      multiAz: production,
      allocatedStorage: 20,
      storageEncrypted: true,
      backupRetention: production ? Duration.days(7) : Duration.days(1),
      deletionProtection: production,
      removalPolicy: production ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY
    });

    const requestDlq = new sqs.Queue(this, "SchedulingRequestDlq", { retentionPeriod: Duration.days(14) });
    const resultDlq = new sqs.Queue(this, "SchedulingResultDlq", { retentionPeriod: Duration.days(14) });
    const requestQueue = new sqs.Queue(this, "SchedulingRequestQueue", {
      visibilityTimeout: Duration.seconds(90),
      deadLetterQueue: { queue: requestDlq, maxReceiveCount: 3 }
    });
    const resultQueue = new sqs.Queue(this, "SchedulingResultQueue", {
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: { queue: resultDlq, maxReceiveCount: 3 }
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc, containerInsightsV2: ecs.ContainerInsights.ENHANCED });

    const apiTask = new ecs.FargateTaskDefinition(this, "ApiTask", { cpu: 512, memoryLimitMiB: 1024 });
    const apiContainer = apiTask.addContainer("Api", {
      image: ecs.ContainerImage.fromAsset(path.join(repositoryRoot, "apps/api")),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "api", logRetention: retention }),
      environment: {
        SPRING_PROFILES_ACTIVE: production ? "aws" : "demo-aws",
        DB_URL: `jdbc:postgresql://${database.instanceEndpoint.hostname}:5432/restaurant_ops`,
        DB_USERNAME: "restaurant_ops",
        AWS_REGION: this.region,
        SCHEDULING_REQUEST_QUEUE_URL: requestQueue.queueUrl,
        COGNITO_ISSUER_URI: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`
      },
      secrets: { DB_PASSWORD: ecs.Secret.fromSecretsManager(database.secret!, "password") },
      healthCheck: { command: ["CMD-SHELL", "wget -qO- http://localhost:8080/actuator/health || exit 1"], interval: Duration.seconds(30) }
    });
    apiContainer.addPortMappings({ containerPort: 8080 });
    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "ApiService", {
      cluster,
      taskDefinition: apiTask,
      desiredCount: 1,
      publicLoadBalancer: true,
      assignPublicIp: !production,
      taskSubnets: { subnetType: production ? ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC },
      listenerPort: 80,
      healthCheckGracePeriod: Duration.seconds(90),
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100
    });
    apiService.targetGroup.configureHealthCheck({ path: "/actuator/health", healthyHttpCodes: "200" });
    distribution.addBehavior("/api/*", new origins.LoadBalancerV2Origin(apiService.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY
    }), {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
    });
    database.connections.allowDefaultPortFrom(apiService.service);
    requestQueue.grantSendMessages(apiTask.taskRole);
    resultQueue.grantConsumeMessages(apiTask.taskRole);
    uploadBucket.grantReadWrite(apiTask.taskRole);
    database.secret!.grantRead(apiTask.taskRole);

    const schedulerTask = new ecs.FargateTaskDefinition(this, "SchedulerTask", { cpu: 1024, memoryLimitMiB: 2048 });
    schedulerTask.addContainer("Scheduler", {
      image: ecs.ContainerImage.fromAsset(path.join(repositoryRoot, "services/scheduler")),
      command: ["python", "-m", "app.worker"],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "scheduler", logRetention: retention }),
      environment: { AWS_REGION: this.region, SCHEDULING_REQUEST_QUEUE_URL: requestQueue.queueUrl, SCHEDULING_RESULT_QUEUE_URL: resultQueue.queueUrl }
    });
    const schedulerService = new ecs.FargateService(this, "SchedulerService", {
      cluster, taskDefinition: schedulerTask, desiredCount: 1, assignPublicIp: !production,
      circuitBreaker: { rollback: true }, minHealthyPercent: 100,
      vpcSubnets: { subnetType: production ? ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC }
    });
    requestQueue.grantConsumeMessages(schedulerTask.taskRole);
    resultQueue.grantSendMessages(schedulerTask.taskRole);

    const billingEmail = this.node.tryGetContext("billingEmail") as string | undefined;
    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: { budgetName: `restaurant-ops-${props.stage}`, budgetType: "COST", timeUnit: "MONTHLY", budgetLimit: { amount: production ? 150 : 60, unit: "USD" } },
      notificationsWithSubscribers: billingEmail ? [70, 90, 100].map((threshold) => ({
        notification: { comparisonOperator: "GREATER_THAN", notificationType: "FORECASTED", threshold, thresholdType: "PERCENTAGE" },
        subscribers: [{ address: billingEmail, subscriptionType: "EMAIL" }]
      })) : undefined
    });

    new CfnOutput(this, "WebUrl", { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, "ApiUrl", { value: `http://${apiService.loadBalancer.loadBalancerDnsName}` });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "WebBucketName", { value: webBucket.bucketName });
  }
}

