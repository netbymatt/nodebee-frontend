# NodeBee Frontend

A frontend for data logged by [NodeBee](https://github.com/netbymatt/nodebee). The data is plotted using [Plotly](https://github.com/plotly/plotly.js/).

## The chart
The chart shows one thermostat at a time, with its name as the title.

### Equipment (bars)
Bars show how long the fan, cooling and heating ran. Heights are minutes of runtime in each 5 minute interval or hour, or hours of runtime per day when viewing daily data. The fan usually runs along with heating or cooling, so its bar overlaps theirs. The equipment axis isn't labelled, but hovering shows each value with its units.

### Temperatures (lines, right axis in °F)
- **Outside**: outdoor temperature reported to the thermostat.
- **Setpoint**: the temperature the thermostat is aiming for, the cooling setpoint when the thermostat is in cool mode and the heating setpoint otherwise.
- **Average**: the thermostat's average of its sensors, drawn as a wide faded line.
- **Each room sensor**: one line per sensor, named as it is in the Ecobee app.

Hover over the chart, or tap it on a phone, to see every value at that time in one label.

### Intervals
Data can be shown every 5 minutes, hourly or daily. Hourly and daily data are averages (temperatures) and totals (runtime) over each hour or day. Up to about a month of data can be loaded at once.

## Using the app
- **Pan and zoom**: drag to pan, scroll or pinch to zoom. The chart stays within the loaded data, load a different range to see other dates.
- **Series** (list button, top left): turn individual series on and off. Each one is shown with its color on the chart.
- **Hover values** (pointer button, computers only): show every value at the mouse pointer's time. Off by default. On phones and tablets, tapping the chart always shows the values.
- **Occupancy** (people button): only show room temperatures while the room's occupancy sensor detects someone. Only available with 5 minute data.
- **Table** (table button): the same data as a table, limited to the time range visible on the chart. Double click the table to select it for copying.
- **Dates and thermostat** (calendar button): choose a start and end date, the interval and the thermostat, or use a quick link such as *7 Days* or *30 Days*.

The app always opens with the last 7 days of 5 minute data for the first thermostat. Series turned off in the series dialog are remembered in your browser for the next visit.

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
pm2 server/index.mjs --name nodebee-frontend

# 3. restart pm2 automatically
pm2 startup
# 4. follow the instructions that this command outputs
pm2 save
```