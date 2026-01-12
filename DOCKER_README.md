# Image Generator - Docker Setup

This setup provides a complete production-ready environment for the Image Generator using Docker Compose.

## Services Included

### Core Services
- **PostgreSQL**: Database for user accounts, sessions, and image generation history
- **Valkey**: Redis-compatible cache for session storage and performance
- **Next.js App**: The main application containerized and optimized
- **Caddy**: Reverse proxy with automatic HTTPS and security headers

### Optional Services
- **Kong**: API Gateway (commented out - see below)

## Quick Start

1. **Clone and navigate to the project**:
   ```bash
   cd frontend
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Main app: http://localhost
   - Caddy will handle SSL certificates automatically for production domains

4. **Stop services**:
   ```bash
   docker-compose down
   ```

## Environment Variables

Update the following in your `.env.local`:
- `NEXTAUTH_SECRET`: Change to a secure random string
- `IMAGE_GENERATOR_ENDPOINT_URL` & `IMAGE_GENERATOR_API_KEY`: Your RunPod credentials
- Database credentials if changed from defaults

## Database Schema

The `init.sql` file creates:
- `users` table with credits tracking
- NextAuth session/account tables
- `image_generations` table for history
- Proper indexes for performance

## Kong API Gateway

**Do you need Kong?** Since you're using RunPod endpoints directly from your Next.js frontend, Kong is **optional** but can provide:

### When to Use Kong:
- **Rate Limiting**: Protect your RunPod API from abuse
- **Authentication**: Add API key authentication
- **Logging**: Centralized API logging and monitoring
- **Load Balancing**: Distribute requests across multiple endpoints
- **API Management**: Version control, documentation, etc.

### When Kong is NOT Needed:
- Direct API calls from frontend (your current setup)
- Simple applications without complex API management needs
- Development/testing environments

### To Enable Kong:
1. Uncomment the Kong service in `docker-compose.yml`
2. Update your Caddyfile to proxy API routes through Kong
3. Configure Kong routes and plugins via the admin API

## Production Deployment

1. **Update domain**: Change `localhost` in Caddyfile to your domain
2. **SSL**: Caddy will automatically obtain Let's Encrypt certificates
3. **Environment**: Set `NODE_ENV=production`
4. **Secrets**: Use strong passwords and secrets
5. **Backups**: Set up PostgreSQL and Valkey data backups

## Development

For development with hot reload:
```bash
# Run just the database services
docker-compose up -d postgres valkey

# Run Next.js in development mode
npm run dev
```

## Troubleshooting

- **Port conflicts**: Change ports in docker-compose.yml if needed
- **Database connection**: Ensure DATABASE_URL is correct
- **Redis connection**: Check REDIS_URL configuration
- **Build issues**: Clear Docker cache with `docker system prune`

## Security Notes

- Change all default passwords
- Use strong NEXTAUTH_SECRET
- Configure firewall rules
- Keep services updated
- Monitor logs for suspicious activity