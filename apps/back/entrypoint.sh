#!/bin/sh
# entrypoint.sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Run database migrations (compiled config + JS migrations in dist/)
echo "Running database migrations..."
pnpm run mikro:migrate:prod

# Execute the main command (passed to this script)
echo "Starting application..."
exec "$@"