# AWS deployment

## Prerequisites

- AWS account with billing alerts enabled
- GitHub repository connected with OIDC
- CDK bootstrap in `ap-northeast-1`
- Docker, Node.js 22, pnpm and Java 21

## Initial setup

1. `cd infra/cdk && pnpm build`
2. `pnpm exec cdk bootstrap aws://ACCOUNT_ID/ap-northeast-1`
3. Create the GitHub OIDC deployment role with least privilege.
4. Add repository variables `AWS_DEPLOY_ENABLED=true` and `AWS_DEPLOY_ROLE_ARN`.
5. Run `deploy-demo` manually for the first deployment.
6. Create manager/staff demo users in Cognito and assign the custom tenant claims.
7. Confirm CloudWatch alarms and AWS Budget notifications before making the URL public.

## Important

`cdk destroy -c stage=demo` removes demo resources marked for destruction. It must never be run against the production stage without an approved data-retention plan.

