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

Need to run from the main directory, where the `Dockerfile` and the `docker-compose.yml` files are located.

#### Execute

> docker-compose up --build [-d]

This builds the image and brings the app online at Port 5000 by default. Visit `http://localhost:5000` to see it.

#### Logs

> docker-compose logs [-f]

## Validating a data file

1. Enter a dataset name (**optional**)
1. Upload data to validate
    * **Allowed formats**: CSV, Shapefile (in ZIP), GeoJSON, JSON (unnested), GeoPackage
1. Upload data to compare against (**optional**): can upload another file or enter the URL for a dataset stored in ArcGIS Online.
    * *Example - Data in ArcGIS Online*: [https://services3.arcgis.com/b9WvedVPoizGfvfD/ArcGIS/rest/services/COTGEO_POLICE_DIVISION/FeatureServer](https://services3.arcgis.com/b9WvedVPoizGfvfD/ArcGIS/rest/services/COTGEO_POLICE_DIVISION/FeatureServer)

## Caveats

This app is not suited for production environments

## License

* [MIT License](https://github.com/open-data-toronto/tool-data-validation/blob/master/LICENSE)
