import { defineConfig } from 'prisma/config';

// Flisk sets DATABASE_URL for the database this migrator owns.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
