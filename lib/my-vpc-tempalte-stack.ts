import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";

const PREFIX = 'my-app-';
const VPC_ID = `${PREFIX}vpc`;
// Subnet 名には自動で VPC_ID が付与されるのでここでは PREFIX は付けない
const PUBLIC_SUBNET_FOR_ALB_ID = `public-for-alb`;
const PRIVATE_SUBNET_FOR_APP_ID = `private-for-app`;
const PRIVATE_SUBNET_FOR_DB_ID = `private-for-db`;
const PRIVATE_SUBNET_FOR_BASTION_ID = `private-subnet-for-bastion`;
const SG_FOR_ALB_ID = `${PREFIX}sg-for-alb`;
const SG_FOR_APP_ID = `${PREFIX}sg-for-app`;
const SG_FOR_DB_ID = `${PREFIX}sg-for-db`;
const SG_FOR_BASTION_ID = `${PREFIX}sg-for-bastion`;

export class MyVpcTempalteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createVpc();
  }

  // VPC, Subnet, SecurityGroup の作成
  private createVpc() {
    const vpc = new ec2.Vpc(this, VPC_ID, {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      // 自動的に 2 つの AZ 上に構築される
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: PUBLIC_SUBNET_FOR_ALB_ID,
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: PRIVATE_SUBNET_FOR_APP_ID,
          subnetType: ec2.SubnetType.ISOLATED,
        },
        {
          cidrMask: 24,
          name: PRIVATE_SUBNET_FOR_DB_ID,
          subnetType: ec2.SubnetType.ISOLATED,
        },
        {
          cidrMask: 24,
          name: PRIVATE_SUBNET_FOR_BASTION_ID,
          subnetType: ec2.SubnetType.ISOLATED,
        },
      ],
    });

    const sgForAlb = new ec2.SecurityGroup(this, SG_FOR_ALB_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_ALB_ID
    });
    sgForAlb.addIngressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(80));

    const sgForApp = new ec2.SecurityGroup(this, SG_FOR_APP_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_APP_ID
    });
    sgForApp.addIngressRule(sgForAlb, ec2.Port.tcp(80));

    const sgForDb = new ec2.SecurityGroup(this, SG_FOR_DB_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_DB_ID
    });
    sgForDb.addIngressRule(sgForApp, ec2.Port.tcp(3306));

    new ec2.SecurityGroup(this, SG_FOR_BASTION_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_BASTION_ID
    });

    return vpc;
  }

}

