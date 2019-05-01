from fiona.collection import BytesCollection
from fiona.io import ZipMemoryFile
from io import BytesIO

import json

import fiona
import geopandas as gpd
import pandas as pd

import requests
import os

def read_file(data, format):
    if format == 'csv':
        return pd.read_csv(BytesIO(data))
    if format == 'json':
        return pd.DataFrame(json.loads(data))
    elif format == 'geojson':
        with BytesCollection(data) as f:
            return gpd.GeoDataFrame.from_features(f, crs=f.crs)
    elif format == 'zip':
        with ZipMemoryFile(data) as f:
            for layer in fiona.listlayers(f.name, vfs='zip://'):
                # Only reading the first layer of the Shapefile

                with f.open('{0}.shp'.format(layer)) as collection:
                    return gpd.GeoDataFrame.from_features(collection, crs=collection.crs)
    else:
        raise 'Incompatible format'

def read_agol_endpoint(agol_url, proxies={}, get_metadata=False):
    agol_query_params = {
        'geojson': {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'true',
            'f': 'geojson',
            'resultType': 'standard'
        },
        'metadata': {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': 'false',
            'f': 'json'
        }
    }

    agol_url =  agol_url.replace('/0/', '') if agol_url.endswith('/0/') else agol_url[:len(agol_url)-1] if agol_url.endswith('/') else agol_url.replace('/0', '') if agol_url.endswith('/0') else agol_url

    agol_data_url = agol_url + '/0/query?' + '&'.join(['{k}={v}'.format(k=k, v=v) for k, v in agol_query_params['geojson'].items()])

    if proxies:
        os.environ['http_proxy'] = os.environ['HTTP_PROXY'] = proxies['http']
        os.environ['https_proxy'] = os.environ['HTTPS_PROXY'] = proxies['https']

    agol_data_res = requests.get(agol_data_url)

    with BytesCollection(agol_data_res.content) as f:
        gdf = gpd.GeoDataFrame.from_features(f, crs=f.crs)
    
    if not get_metadata:
        return gdf
        
    agol_meta_url = agol_url + '/0/query?' + '&'.join(['{k}={v}'.format(k=k, v=v) for k, v in agol_query_params['metadata'].items()])
    agol_meta_res = requests.get(agol_meta_url)
    agol_meta = json.loads(agol_meta_res.content)

    return {
        'data': gdf,
        'meta': agol_meta
    }

def get_columns(data):
    if isinstance(data, (gpd.geodataframe.GeoDataFrame, pd.core.frame.DataFrame)):
        dtype_map = {
            'object': 'text',
            'int64': 'integer',
            'float64': 'float',
            'bool': 'boolean',
            'datetime64': 'datetime'
        }
        
        return { k:dtype_map[v.name] for k,v in data.dtypes.to_dict().items() }
    else:
        raise 'Data is not a valid DataFrame'
