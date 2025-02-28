# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install
RUN npm run postinstall

# Copy the rest of the application code to the working directory
COPY . .

# Build TypeScript code to JavaScript
# RUN npm start

# Expose a port (if your Node.js app listens on a specific port)
EXPOSE 3000

# Define the command to start your Node.js app
CMD ["npm", "start"]