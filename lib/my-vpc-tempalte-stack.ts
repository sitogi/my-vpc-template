import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';

const PREFIX = 'my-app-';
const VPC_ID = `${PREFIX}vpc`;
// Subnet 名には自動で VPC_ID が付与されるのでここでは PREFIX は付けない
const PUBLIC_SUBNET_FOR_ALB_ID = `public-for-alb`;
const PUBLIC_SUBNET_FOR_ALB2_ID = `public-for-alb2`;
const PRIVATE_SUBNET_FOR_APP_ID = `private-for-app`;
const PRIVATE_SUBNET_FOR_APP2_ID = `private-for-app2`;
const PRIVATE_SUBNET_FOR_DB_ID = `private-for-db`;
const PRIVATE_SUBNET_FOR_DB2_ID = `private-for-db2`;
const PRIVATE_SUBNET_FOR_BASTION_ID = `private-subnet-for-bastion`;
const PRIVATE_SUBNET_FOR_BASTION2_ID = `private-subnet-for-bastion2`;
const PRIVATE_SUBNET_FOR_EGRESS_ID = `private-subnet-for-egress`;
const PRIVATE_SUBNET_FOR_EGRESS2_ID = `private-subnet-for-egress2`;
const SG_FOR_ALB_ID = `${PREFIX}sg-for-alb`;
const SG_FOR_APP_ID = `${PREFIX}sg-for-app`;
const SG_FOR_DB_ID = `${PREFIX}sg-for-db`;
const SG_FOR_BASTION_ID = `${PREFIX}sg-for-bastion`;
const SG_FOR_EGRESS_ID = `${PREFIX}sg-for-egress`; // for VPC Endpoints
const VPC_ENDPOINT_S3 = `${PREFIX}vpc-endpoint-s3`;
const VPC_ENDPOINT_LOGS = `${PREFIX}vpc-endpoint-logs`;
const VPC_ENDPOINT_ECR_DKR = `${PREFIX}vpc-endpoint-ecr-dkr`;
const VPC_ENDPOINT_ECR_API = `${PREFIX}vpc-endpoint-ecr-api`;
const VPC_ENDPOINT_SSM = `${PREFIX}vpc-endpoint-ssm`;
const VPC_ENDPOINT_SSM_MSG = `${PREFIX}vpc-endpoint-ssm-msg`;
const ALB_ID = `${PREFIX}alb`;
const TARGET_GROUP_ID = `${PREFIX}target-group`;
const TARGET_GROUP_FOR_GREEN_ID = `${PREFIX}target-group-for-green`;
const ALB_LISTENER_ID = `${PREFIX}alb-listener`;
const ALB_LISTENER_FOR_GREEN_ID = `${PREFIX}alb-listener-for-green`;

export class MyVpcTempalteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createVpc();
  }

  private createVpc() {
    // VPC
    const vpc = new ec2.Vpc(this, VPC_ID, {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      subnetConfiguration: [], // 自動で作成されないように明示的に空にしておく
    });

    // Subnets
    const albSubnet1 = new ec2.Subnet(this, PUBLIC_SUBNET_FOR_ALB_ID, {
      availabilityZone: "ap-northeast-1a",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.0.0/24"
    });

    const albSubnet2 = new ec2.Subnet(this, PUBLIC_SUBNET_FOR_ALB2_ID, {
      availabilityZone: "ap-northeast-1c",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.1.0/24"
    });

    const igw = new ec2.CfnInternetGateway(this, "InternetGateway", {});
    new ec2.CfnVPCGatewayAttachment(this, "gateway", {
      vpcId: vpc.vpcId,
      internetGatewayId: igw.ref
    });

    albSubnet1.addRoute("ALBSubnetRoute1", {
      routerType: ec2.RouterType.GATEWAY,
      routerId: igw.ref
    });

    albSubnet2.addRoute("ALBSubnetRoute2", {
      routerType: ec2.RouterType.GATEWAY,
      routerId: igw.ref
    });

    const appSubnet1 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_APP_ID, {
      availabilityZone: "ap-northeast-1a",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.2.0/24"
    });

    const appSubnet2 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_APP2_ID, {
      availabilityZone: "ap-northeast-1c",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.3.0/24"
    });

    new ec2.Subnet(this, PRIVATE_SUBNET_FOR_DB_ID, {
      availabilityZone: "ap-northeast-1a",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.4.0/24"
    });

    new ec2.Subnet(this, PRIVATE_SUBNET_FOR_DB2_ID, {
      availabilityZone: "ap-northeast-1c",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.5.0/24"
    });

    const bastionSubnet1 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_BASTION_ID, {
      availabilityZone: "ap-northeast-1a",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.6.0/24"
    });

    const bastionSubnet2 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_BASTION2_ID, {
      availabilityZone: "ap-northeast-1c",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.7.0/24"
    });

    const egressSubnet1 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_EGRESS_ID, {
      availabilityZone: "ap-northeast-1a",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.8.0/24"
    });

    const egressSubnet2 = new ec2.Subnet(this, PRIVATE_SUBNET_FOR_EGRESS2_ID, {
      availabilityZone: "ap-northeast-1c",
      vpcId: vpc.vpcId,
      cidrBlock: "10.0.9.0/24"
    });

    // Security Groups
    const sgForAlb = new ec2.SecurityGroup(this, SG_FOR_ALB_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_ALB_ID
    });
    sgForAlb.addIngressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(80));
    sgForAlb.addIngressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(443));
    // Blue/Green Deployment の確認用
    // TODO: 実際には特定 IP or SG からのみ許可にする
    sgForAlb.addIngressRule(ec2.Peer.ipv4("0.0.0.0/0"), ec2.Port.tcp(10080));

    const sgForApp = new ec2.SecurityGroup(this, SG_FOR_APP_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_APP_ID
    });
    sgForApp.addIngressRule(sgForAlb, ec2.Port.tcp(80));

    const sgForBastion = new ec2.SecurityGroup(this, SG_FOR_BASTION_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_BASTION_ID
    });

    const sgForDb = new ec2.SecurityGroup(this, SG_FOR_DB_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_DB_ID
    });
    sgForDb.addIngressRule(sgForApp, ec2.Port.tcp(3306));
    sgForDb.addIngressRule(sgForBastion, ec2.Port.tcp(3306));

    vpc.addGatewayEndpoint(VPC_ENDPOINT_S3, {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: [appSubnet1, appSubnet2, bastionSubnet1, bastionSubnet2] }],
    });

    const sgForVpcEndpoints = new ec2.SecurityGroup(this, SG_FOR_EGRESS_ID, {
      vpc: vpc,
      securityGroupName:  SG_FOR_EGRESS_ID
    });

    // make it possible pull docker images from ECR in app
    sgForApp.addIngressRule(sgForVpcEndpoints, ec2.Port.tcp(443));
    sgForBastion.addIngressRule(sgForVpcEndpoints, ec2.Port.tcp(443));

    vpc.addInterfaceEndpoint(VPC_ENDPOINT_ECR_DKR, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnets: [egressSubnet1, egressSubnet2] },
      securityGroups: [sgForVpcEndpoints]
    });

    vpc.addInterfaceEndpoint(VPC_ENDPOINT_ECR_API, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnets: [egressSubnet1, egressSubnet2] },
      securityGroups: [sgForVpcEndpoints]
    });

    vpc.addInterfaceEndpoint(VPC_ENDPOINT_LOGS, {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnets: [egressSubnet1, egressSubnet2] },
      securityGroups: [sgForVpcEndpoints]
    });

    vpc.addInterfaceEndpoint(VPC_ENDPOINT_SSM, {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: { subnets: [egressSubnet1, egressSubnet2] },
      securityGroups: [sgForVpcEndpoints]
    });

    vpc.addInterfaceEndpoint(VPC_ENDPOINT_SSM_MSG, {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: { subnets: [egressSubnet1, egressSubnet2] },
      securityGroups: [sgForVpcEndpoints]
    });

    // Application Load Balancer
    const alb = new elb.ApplicationLoadBalancer(this, ALB_ID, {
        vpc: vpc,
        internetFacing: true,
        ipAddressType: elb.IpAddressType.IPV4,
        loadBalancerName: ALB_ID,
        securityGroup: sgForAlb,
        vpcSubnets: { subnets: [albSubnet1, albSubnet2] }
    });

    const targetGroup = new elb.ApplicationTargetGroup(this, TARGET_GROUP_ID, {
      targetGroupName: TARGET_GROUP_ID,
      vpc: vpc,
      targetType: elb.TargetType.IP,
      protocol: elb.ApplicationProtocol.HTTP,
      port: 80,
    });

    const targetGroupForGreen = new elb.ApplicationTargetGroup(this, TARGET_GROUP_FOR_GREEN_ID, {
      targetGroupName: TARGET_GROUP_FOR_GREEN_ID,
      vpc: vpc,
      targetType: elb.TargetType.IP,
      protocol: elb.ApplicationProtocol.HTTP,
      port: 80,
    });

    new elb.ApplicationListener(this, ALB_LISTENER_ID, {
      loadBalancer: alb,
      port: 80,
      defaultTargetGroups: [targetGroup]
    });

    new elb.ApplicationListener(this, ALB_LISTENER_FOR_GREEN_ID, {
      loadBalancer: alb,
      port: 10080,
      protocol: elb.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroupForGreen]
    });
  }

}

