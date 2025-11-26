# Render Deployment Guide

## Configuration

The project is configured for Render deployment with the following files:

### render.yaml
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: Node.js

### package.json
- `main`: `dist/server.js` (entry point)
- `start`: `node dist/server.js` (start script)
- `build`: `tsc` (TypeScript compilation)

## Render Dashboard Settings

If not using `render.yaml`, configure in Render dashboard:

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Root Directory**: Leave empty (or set to project root)
4. **Environment**: Node

## Environment Variables

Make sure to set these in Render dashboard:

- `PORT` - Port number (Render sets this automatically)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_SSL` - SSL setting (usually "true" for cloud databases)
- `JWT_SECRET` - JWT secret key
- `REFRESH_TOKEN_SECRET` - Refresh token secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLIENT_URL` - Frontend URL for CORS
- `SERPER_API_KEY` - (Optional) For AI question generation

## Troubleshooting

### Error: Cannot find module '/opt/render/project/src/src/dist/index.js'

**Solution**: 
1. Ensure `package.json` has `"main": "dist/server.js"`
2. Ensure `package.json` has `"start": "node dist/server.js"`
3. Check that `render.yaml` or dashboard settings have correct build/start commands
4. Verify `tsconfig.json` has correct `outDir: "./dist"`

### Build Fails

- Ensure TypeScript is in `devDependencies` (it will be installed during build)
- Check that all dependencies are listed in `package.json`
- Verify `tsconfig.json` is correct

### Server Not Starting

- Check environment variables are set correctly
- Verify database connection settings
- Check logs in Render dashboard for specific errors

