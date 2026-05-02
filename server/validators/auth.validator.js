const { z } = require('zod');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&#]/, 'Password must contain at least one special character');

const setupPasswordSchema = z.string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[@$!%*?&#]/, 'Password must contain at least one special character');

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').trim(),
  password: passwordSchema,
  fullName: z.string().trim().optional(),
  age: z.coerce.number().min(13, 'You must be at least 13 years old').max(120).optional(),
  dob: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().refine((val) => {
    if (!val) return true;
    const dobDate = new Date(val);
    const now = new Date();
    let age = now.getFullYear() - dobDate.getFullYear();
    const m = now.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) {
      age--;
    }
    return age >= 13;
  }, { message: 'You must be at least 13 years old' }),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
  location: z.string().trim().optional(),
  interests: z.array(z.string().trim()).optional(),
  bio: z.string().trim().optional(),
  profilePic: z.union([z.string().url(), z.string()]).optional(),
}).refine((data) => {
  if (data.dob && data.age) {
    const dobDate = new Date(data.dob);
    const now = new Date();
    let calculatedAge = now.getFullYear() - dobDate.getFullYear();
    const monthDelta = now.getMonth() - dobDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dobDate.getDate())) {
      calculatedAge -= 1;
    }
    return Math.abs(calculatedAge - data.age) <= 1;
  }
  return true;
}, {
  message: "Age does not match the provided date of birth",
  path: ["age"]
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
  isAdminPanel: z.boolean().optional(),
});

const setupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long').trim(),
  password: setupPasswordSchema,
  email: z.string().email('Invalid email address').optional(),
});

const completeProfileSchema = z.object({
  fullName: z.string().trim().optional(),
  age: z.coerce.number().min(13, 'You must be at least 13 years old').max(120).optional(),
  dob: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional().refine((val) => {
    if (!val) return true;
    const dobDate = new Date(val);
    const now = new Date();
    let age = now.getFullYear() - dobDate.getFullYear();
    const m = now.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) {
      age--;
    }
    return age >= 13;
  }, { message: 'You must be at least 13 years old' }),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
  location: z.string().trim().optional(),
  interests: z.array(z.string().trim()).optional(),
  bio: z.string().trim().optional(),
  profilePic: z.union([z.string().url(), z.string()]).optional(),
}).refine((data) => {
  if (data.dob && data.age) {
    const dobDate = new Date(data.dob);
    const now = new Date();
    let calculatedAge = now.getFullYear() - dobDate.getFullYear();
    const monthDelta = now.getMonth() - dobDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dobDate.getDate())) {
      calculatedAge -= 1;
    }
    return Math.abs(calculatedAge - data.age) <= 1;
  }
  return true;
}, {
  message: "Age does not match the provided date of birth",
  path: ["age"]
});

module.exports = {
  registerSchema,
  loginSchema,
  setupSchema,
  completeProfileSchema,
};
