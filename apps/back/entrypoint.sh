#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Run database migrations
# This assumes your mikro-orm.config.ts and migration files are in src/
# and that npx can use ts-node to execute them.
# Your package.json should have @mikro-orm/cli, ts-node, typescript
# and your DB driver (e.g., @mikro-orm/postgresql) as dependencies (not just devDependencies)
# if you run migrations this way in the final image.
echo "Running database migrations..."
pnpm run mikro:migrate

# Execute the main command (passed to this script)
echo "Starting application..."
exec "$@"