# Data Validation Tool
## About
This is a simple app to help check data files for common issues we see at Open Data.

### Purpose
It is intended to reduce the time that traditionally goes into validating these datasets, as well as empower publishers to conduct these checks themselves.

### Use case
Checking data for issues before publishing a new or an updated dataset.

## Running the app
### Requirements
* `Docker`: a container with all dependencies for running the app.
* `Docker Compose`: to build the Docker image and run it in replaceable mode to restart it if it crashes.

### Commands
Need to run from `apps` directory.

#### Execute
> docker-compose up --build [-d]

This builds the image and brings the app online at Port 2500 by default. Visit `http://localhost:2500` to see it.

#### Logs
> docker-compose logs [-f]

## Validating a data file
1. Enter a dataset name
1. Upload the data file
    * **Allowed formats**: CSV, Shapefile (in ZIP), GeoJSON, JSON
1. **Optional**: the data file can be compared with datasets stored in ArcGIS Online, in that case will need to enter the URL here
    * **Example**: https://services3.arcgis.com/b9WvedVPoizGfvfD/ArcGIS/rest/services/COTGEO_POLICE_DIVISION/FeatureServer

## Caveats
1. This app is not yet intended for production environments
1. Comparison of data file to existing dataset is, for now, limited to datasets in ArcGIS Online. Hoping to expand this in the future.


## License
* [MIT License](https://github.com/open-data-toronto/tool-data-validation/blob/master/LICENSE)
