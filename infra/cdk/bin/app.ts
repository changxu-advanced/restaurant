#!/usr/bin/env node
import "source-map-support/register.js";
import { App } from "aws-cdk-lib";
import { RestaurantOpsStack } from "../lib/restaurant-ops-stack.js";

const app = new App();
const stage = app.node.tryGetContext("stage") ?? "demo";
new RestaurantOpsStack(app, `RestaurantOps-${stage}`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.RESTAURANT_OPS_AWS_REGION ?? "ap-northeast-1" },
  stage
});

