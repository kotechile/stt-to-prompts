# Use the official Node.js 18 image as base
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# We copy the package.json from the backend folder
COPY backend/package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Bundle app source (Copy the entire backend folder contents into the root of the container)
COPY backend/ .

# Expose the API port (default from server.js is 3000)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# The Google account credentials JSON to be provided by Coolify Secrets at /usr/src/app/google-credentials.json
# ENV GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/google-credentials.json

# Start the server
CMD [ "node", "server.js" ]
