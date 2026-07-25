-- Extend Campaign Assignment allocation strategies for auto-distribution.
ALTER TYPE "campaigns"."allocation_method" ADD VALUE IF NOT EXISTS 'ROUND_ROBIN';
ALTER TYPE "campaigns"."allocation_method" ADD VALUE IF NOT EXISTS 'RANDOM';
ALTER TYPE "campaigns"."allocation_method" ADD VALUE IF NOT EXISTS 'MANUAL';
