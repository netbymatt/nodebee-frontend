# NodeBee Frontend

A frontend for data logged by [NodeBee](https://github.com/netbymatt/nodebee). The data is plotted using [Plotly](https://github.com/plotly/plotly.js/).

## Requirements
This tool requires a dataset from [NodeBee](https://github.com/netbymatt/nodebee). Please follow the setup procedures there first as they are only referenced below.

## Quick start
### Server
1. Clone this project to your server
```
git clone https://github.com/netbymatt/nodebee-frontend.git
```

### Node.js app
1. Open config.js
2. Enter the database credentials, host name and database name in `username`, `password`, `host` and `name`. Then uncomment each line.
3. Enter a port number to serve the application on.
4. Start the server
```
npm start
```

## Further details
The quick start routine is just that... a quick start. It has the following limitations:
- Stores your database credentials in a file on the system against current best practices.
- Ties up a terminal instance while running the server

### Store configuration in environment variables
Storing your credentials in a file within the project is not considered a best practice. Instead environment variables should be used store this information.  Environment variables that are shared with Nodebee are noted below. Nodebee-frontend uses the following environment variables to store configuration details:

config.js | Environment variable | Shared with Nodebee | default
--- | --- | --- | ---
db.username | NODEBEE_DB_USERNAME | yes |
db.password | NODEBEE_DB_PASSWORD | yes |
db.host | NODEBEE_DB_HOST | yes | localhost 
db.name | NODEBEE_DB_NAME | yes | nodebee
server.port | NODEBEE_SERVER_PORT | no | 8080

After creating the environment variables make sure to clear out any stored credentials from config.js, or just delete the file entirely.

### Run in the background
PM2 is recommended to run the process in the background, and start it automatically at boot. Use these commands to install PM2 and configure the process. If you've configured nodebee you may have already installed PM2, in which case you'll only ned to run step 2 and 4
```
# 1. install pm2
npm install -g pm2

# 2. start the nodebee process
pm2 server/index.js --name nodebee-frontend

# 3. restart pm2 automatically
pm2 startup
# 4. follow the instructions that this command outputs
pm2 save
```