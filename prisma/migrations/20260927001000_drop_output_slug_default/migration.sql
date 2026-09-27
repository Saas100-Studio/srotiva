-- Keep UUID generation in Prisma, matching the schema's `@default(uuid())` behavior.
ALTER TABLE "feeds" ALTER COLUMN "output_slug" DROP DEFAULT;
