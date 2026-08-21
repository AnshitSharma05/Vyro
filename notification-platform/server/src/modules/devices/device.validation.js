const { z } = require('zod');

const registerDeviceSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
  body: z.object({
    token: z.string({ required_error: 'Push device token is required' }).min(1, 'Token cannot be empty').trim(),
    platform: z.enum(['IOS', 'ANDROID', 'WEB']).optional().default('WEB'),
  }),
});

const listDevicesSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
  }),
});

const deactivateDeviceSchema = z.object({
  params: z.object({
    externalUserId: z.string().min(1, 'externalUserId is required'),
    deviceId: z.string().uuid('Invalid Device ID format'),
  }),
});

module.exports = {
  registerDeviceSchema,
  listDevicesSchema,
  deactivateDeviceSchema,
};
