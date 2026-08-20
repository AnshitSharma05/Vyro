const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development database...');

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo Developer',
      passwordHash: passwordHash,
    },
  });
  console.log(`User created/found: ${user.email} (${user.id})`);

  // 2. Create Demo Organization
  const organization = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });
  console.log(`Organization created/found: ${organization.name} (${organization.id})`);

  // 3. Create Organization Membership
  const membership = await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: 'OWNER',
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'OWNER',
    },
  });
  console.log(`Organization membership assigned: ${membership.role}`);

  // 4. Create Demo Project
  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: 'main-ecommerce',
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: 'Main E-Commerce App',
      slug: 'main-ecommerce',
    },
  });
  console.log(`Project created/found: ${project.name} (${project.id})`);

  // 5. Create Demo API Key
  const rawKeySecret = 'dev_secret_key_1234567890';
  const keyPrefix = 'np_dev_';
  const keyHash = crypto.createHash('sha256').update(rawKeySecret).digest('hex');

  const apiKey = await prisma.apiKey.upsert({
    where: { keyHash: keyHash },
    update: {},
    create: {
      projectId: project.id,
      name: 'Development API Key',
      keyPrefix: keyPrefix,
      keyHash: keyHash,
    },
  });
  console.log(`API Key created/found: ${apiKey.name} (Prefix: ${apiKey.keyPrefix})`);

  // 6. Create Demo Templates
  const welcomeTemplate = await prisma.template.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'welcome-email',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'welcome-email',
      channel: 'EMAIL',
      subject: 'Welcome to {{companyName}}, {{name}}!',
      body: '<h1>Welcome {{name}}!</h1><p>Thank you for registering with {{companyName}}.</p>',
    },
  });

  const otpTemplate = await prisma.template.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: 'otp-sms',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'otp-sms',
      channel: 'SMS',
      subject: null,
      body: 'Your verification code is {{code}}. Valid for 10 minutes.',
    },
  });

  console.log(`Templates created: ${welcomeTemplate.name}, ${otpTemplate.name}`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
