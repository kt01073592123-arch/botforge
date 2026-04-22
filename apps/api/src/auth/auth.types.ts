import { User } from '@prisma/client'

// Safe user shape — passwordHash is excluded at the strategy level
// and must never appear in API responses.
export type SafeUser = Omit<User, 'passwordHash'>
