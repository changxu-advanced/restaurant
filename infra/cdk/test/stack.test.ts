import { describe, expect, it } from "vitest";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { RestaurantOpsStack } from "../lib/restaurant-ops-stack.js";

describe("RestaurantOpsStack", () => {
  it("creates the core AWS services", () => {
    const app = new App();
    const stack = new RestaurantOpsStack(app, "TestStack", { stage: "demo" });
    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::SQS::Queue", 4);
    template.resourceCountIs("AWS::Cognito::UserPool", 1);
    template.resourceCountIs("AWS::RDS::DBInstance", 1);
  }, 60_000);
});

