from datetime import datetime
from shapely.geometry import shape, MultiPolygon, MultiPoint, MultiLineString

import json
import sys
import traceback

import geopandas as gpd
import numpy as np
import pandas as pd
import requests
import utils

class DataFrameComparison:
    def __init__(self, src, new, columns_excluded=['_id']):
        self.columns_excluded = columns_excluded
        self.src = src.drop(np.intersect1d(src.columns, self.columns_excluded), axis=1)
        self.new = new.drop(np.intersect1d(new.columns, self.columns_excluded), axis=1)

    def compare_columns(self):
        '''
            Compares the columns between the source and new DataFrame to find:
                * the columns that were inserted into the new DataFrame
                * the columns that existed in the source DataFrame but missing from the new DataFrame
                * the columns where the datatypes changed between the source and new DataFrames
        '''
        src, new = self.src, self.new
        results = []
        for column in np.union1d(new.columns, src.columns):
            change = 'matched'
            if src[column].dropna().empty and new[column].dropna().empty and (src[column].dtype == 'object' and new[column].dtype == 'float64') \
                or ( src[column].dtype == 'float64' and new[column].dtype == 'object' ):
                src[column] = src[column].astype('object')
                new[column] = new[column].astype('object')
            if column in new.columns and column in src.columns and src[column].dtype != new[column].dtype:
                change = 'modified'
            elif column in new.columns and column not in src.columns:
                change = 'added'
            elif column in src.columns and column not in new.columns:
                change = 'removed'

            results.append({
                'message': change,
                'index': column,
                'source': src[column].dtype.name if column in src.columns else False,
                'new': new[column].dtype.name if column in new.columns else False
            })

        if len(results):
            results = pd.DataFrame(results).set_index('index').reset_index(drop=False) 
        else:
            results = pd.DataFrame()
        
        results.index.name = None

        return results

    def compare_rows(self):
        '''
            Compare the rows between the source and new DataFrame to find:
                * the number of rows that changed between the source and new DataFrame
        '''

        results = {
            'index': 'Change in # of Records',
            'source': len(self.src.index),
            'new': len(self.new.index),
            'difference': len(self.new.index) - len(self.src.index)
        }

        results = pd.DataFrame.from_dict(results, orient='index').T

        return results

    def compare_dataframes(self):
        src, new = self.src, self.new
        if type(src) != type(new):
            return  {
                'message': 'Trying to compare geographic and tabular datasets',
                'level': 'error'
            }

        if isinstance(src, gpd.geodataframe.GeoDataFrame) and isinstance(new, gpd.geodataframe.GeoDataFrame):
            src['geometry'] = src['geometry'].apply(lambda x: str(x))
            new['geometry'] = new['geometry'].apply(lambda x: str(x))

        src_cols = sorted([c for c in self.src.columns.values])
        new_cols = sorted([c for c in self.new.columns.values])
        src = src[src_cols].sort_values(by=src_cols).reset_index(drop=True)
        new = new[new_cols].sort_values(by=new_cols).reset_index(drop=True)
        same_df = src.equals(new)

        return {
            'message': 'Datasets are the same' if same_df else 'Datasets are different',
            'level': 'error' if same_df else 'info'
        }
        

class DataFrameValidation:
    '''
        TODOS:
            * Add "name" (in the index or df) for ease of use
            * Validate datetime formats are consistent
    '''

    def __init__(self, data, schema={}, columns_excluded=['_id'], perc_leading_sp=0.8, perc_trailing_sp=0.8, perc_missing_thresh=0.8, perc_zeros_thresh=0.8, area_m2_thresh=1, len_m_thresh=1, xmin=-8866597.4417, ymin=5399138.0493, xmax=-8806484.9167, ymax=5443802.3603, epsg_code = 3857, city_wards_agol_url='https://services3.arcgis.com/b9WvedVPoizGfvfD/arcgis/rest/services/COTGEO_CITY_WARD/FeatureServer', max_column_name_length=10):
        if 'geometry' in columns_excluded:
            columns_excluded.pop(columns_excluded.index('geometry'))

        self.columns_excluded = columns_excluded
        self.df = data.drop(np.intersect1d(data.columns, columns_excluded), axis=1)
        self.schema = schema

        self.perc_missing_thresh=perc_missing_thresh
        self.perc_zeros_thresh=perc_zeros_thresh
        self.area_m2_thresh=area_m2_thresh
        self.len_m_thresh=len_m_thresh
        self.xmin=xmin
        self.ymin=ymin
        self.xmax=xmax
        self.ymax=ymax
        self.epsg_code=epsg_code
        self.city_wards_agol_url=city_wards_agol_url
        self.max_column_name_length=max_column_name_length
        self.perc_leading_sp=perc_leading_sp
        self.perc_trailing_sp=perc_trailing_sp

    def get_params(self):
        return {
            'perc_missing_thresh': int(self.perc_missing_thresh*100),
            'perc_zeros_thresh': int(self.perc_zeros_thresh*100),
            'perc_leading_sp': int(self.perc_leading_sp*100),
            'perc_trailing_sp': int(self.perc_trailing_sp*100),
            'area_m2_thresh': self.area_m2_thresh,
            'len_m_thresh': self.len_m_thresh,
            'xmin': self.xmin,
            'ymin': self.ymin,
            'xmax': self.xmax,
            'ymax': self.ymax,
            'epsg_code': self.epsg_code,
            'city_wards_agol_url': self.city_wards_agol_url,
            'max_column_name_length': self.max_column_name_length
        }

    def profile_dataframe(self):
        results = {
            'Geometry': self.validate_geometry(),
            'Truncated Column Names': self.validate_column_names(),
            'Geo Slivers': self.validate_slivers(),
            'Single Geometry Type': self.validate_single_geom_type(),
            'Geometries In Boundaries': self.validate_geometries_in_boundaries()
        }

        return results

    def profile_columns(self):
        '''
            Flags columns that meet one of the following criteria:
                1. % missing > perc_missing_thresh
                2. % zeros > perc_zeros_thresh
                3. A constant
                4. All unique values (may be a foreign key)
                5. Same number of unique values as another column (may be code/description/foreign key columns)
        '''
        df = self.df[[ c for c in self.df.columns if c != 'geometry' ]]

        # Initiate the thresholds and comparison methods
        cutoffs = pd.DataFrame({
            'p_missing': (np.greater, self.perc_missing_thresh),
            'p_zeros': (np.greater, self.perc_zeros_thresh),
            'distinct_count': (np.equal, 1),
            'is_unique': (np.equal, True),
            'p_leading_space': (np.greater, self.perc_leading_sp),
            'p_trailing_space': (np.greater, self.perc_trailing_sp)            
        }, index=['method', 'threshold'])

        def check_column(array):
            return {
                'p_missing': (array.size - array.count()) / array.size,
                'p_zeros': array[array == 0].size / array.size,
                'distinct_count': array.nunique(),
                'is_unique': True if array.size == array.nunique() else False,
                'p_leading_space': array.dropna()[array.dropna().str.startswith(" ")].size / array.size if array.dtype.name == 'object' else np.nan,
                'p_trailing_space': array.dropna()[array.dropna().str.endswith(" ")].size / array.size if array.dtype.name == 'object' else np.nan
            }

        profile = {}
        for column in df.columns:
            profile[column] = check_column(df[column])
        profile = pd.DataFrame(profile).T

        matched_columns = []
        dcount = profile[(~profile['is_unique'])&(profile['distinct_count']>1)].groupby('distinct_count').size()

        for idx, num in dcount.iteritems():
            matched = profile[profile['distinct_count']==idx].index.tolist()

            if num > 1 and len(df[matched].drop_duplicates().index) == idx:
                for i, col in enumerate(matched):
                    matched_columns.append([ col, ', '.join([x for x in matched if x != col]) ])

        matched_columns = pd.DataFrame(matched_columns, columns=['', 'matched_columns']).set_index('')

        dtype_check = self.validate_dtypes()

        validate = profile.where(profile.apply(lambda x: cutoffs[x.name]['method'](x.fillna(0), cutoffs[x.name]['threshold'])), axis=1).dropna(how='all')
        validate = validate.join(matched_columns, how='outer').join(dtype_check, how='outer')
        validate['p_missing'] = validate['p_missing'].fillna(0.0).apply(lambda x: str(round(x*100)) + '%' if x != 0 else np.nan) if 'p_missing' in validate.columns else np.nan
        validate['p_zeros'] = validate['p_zeros'].fillna(0.0).apply(lambda x: str(round(x*100)) + '%' if x != 0 else np.nan) if 'p_zeros' in validate.columns else np.nan
        validate['distinct_count'] = validate['distinct_count'].apply(lambda x: True if x == x else False)

        return validate

    def validate_dtypes(self):
        '''
            Compares column data types specified by the data steward with the pandas data types.
        '''
        df = self.df[[ c for c in self.df.columns if c != 'geometry' ]]

        dtype_map = {
            'object': ['TEXT', 'VARCHAR', 'esriFieldTypeString'],
            'int64': ['INTEGER', 'esriFieldTypeSmallInteger', 'esriFieldTypeInteger', 'esriFieldTypeOID'],
            'float64': ['DECIMAL', 'esriFieldTypeDouble', 'float'],
            'bool': ['TRUE/FALSE'],
            'datetime64': ['DATETIME', 'esriFieldTypeDate']
        }

        for key in list(dtype_map.keys()):
            for t in dtype_map[key]:
                dtype_map[t.upper()] = key

            dtype_map.pop(key)

        results = {}
        schema = pd.DataFrame(self.schema)
        if not schema.empty:
            schema = schema.set_index('name').T

        for column in np.setdiff1d(schema.columns, df.columns):
            results[column] = 'Missing from data'

        for column in np.setdiff1d(df.columns, schema.columns):
            results[column] = 'Missing from schema'

        for column in np.intersect1d(schema.columns, df.columns):
            if schema[column]['type'].upper()  in dtype_map:
                column_dtype = df[column].dtype.name                       # Actual
                pandas_dtype = dtype_map[schema[column]['type'].upper()]        # Should be

                passed = column_dtype == pandas_dtype
                if not passed:
                    try:
                        column_values = df[column].dropna().drop_duplicates()
                        if not column_values.empty:
                            if pandas_dtype in ['int64', 'float64', 'float32', 'float']:
                                column_values = pd.to_numeric(column_values)
                            elif pandas_dtype in ['datetime64']:
                                column_values = pd.to_datetime(column_values)
                            elif pandas_dtype in ['bool']:
                                column_values = column_values.astype(pandas_dtype)
                            else:
                                column_values = column_values.astype(str)

                        passed = True
                    except Exception as e:
                        results[column] = {
                            'message': 'Unable to map {column_dtype} to {pandas_dtype}'.format(
                                column_dtype=column_dtype,
                                pandas_dtype=schema[column]['type']
                            ),
                            'level': 'error'
                        }

                if passed:
                    results[column] = {
                        'message': 'Pass',
                        'level': 'success'
                    }
            else:
                results[column] = {
                        'message': 'No mapping found for dtype: {0}'.format(schema[column]['type']),
                        'level': 'error'
                    }

        results = pd.DataFrame.from_dict(results, orient='index').drop('level', axis=1).replace('Pass', np.nan)
        results.columns = ['dtype_map']

        return results

    def validate_geometry(self):
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }

        invalid_geometries = self.df.index[~self.df['geometry'].is_valid]
        if invalid_geometries.empty:
            return {
                'message': 'Pass',
                'level': 'success'
            }

        return {
            'message': 'Invalid geometries found',
            'level': 'error',
            'details': {
                'count': invalid_geometries.shape[0],
                'content': invalid_geometries.to_json()
            }
        }
        
    def validate_slivers(self):
        GEOM_TYPE_MAP = {
            'Polygon': {'shapely_geometry': MultiPolygon, 'threshold': self.area_m2_thresh},
            'LineString': {'shapely_geometry': MultiLineString, 'threshold': self.len_m_thresh}
        }
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }

        df = self.df.explode().to_crs({'init': 'epsg:2019', 'units': 'm'})

        if any(['linestring' in x.lower() or 'polygon' in x.lower() for x in self.df.geom_type]):
            def get_area_or_length(x):
                if 'polygon' in x.geom_type.lower():
                    return True if x.area < self.area_m2_thresh else False
                elif 'linestring' in x.geom_type.lower():
                    return True if x.length < self.len_m_thresh else False
                else:
                    return np.nan

            df['sliver'] = df['geometry'].apply(get_area_or_length)
            slivers = df[df['sliver'] == True]

            if slivers.empty:
                return {
                    'message': 'Pass',
                    'level': 'success'
                }

            return {
                'message': 'Slivers found',
                'level': 'warning',
                'details': {
                    'count': slivers.shape[0],
                    'content': slivers.to_json(),
                }
            }

        return {
            'message': 'Points only, no polygons or lines',
            'level': 'info'
        }

    def validate_single_geom_type(self):
        '''
        '''
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }

        geom_types = self.df['geometry'].geom_type.unique()

        if len(geom_types) == 1:
            return {
                'message': 'Pass',
                'level': 'success'
            }

        return {
            'message': ', '.join([str(x) for x in geom_types]),
            'level': 'warning',
            'details': {
                'count': len(geom_types),
                'content': list(geom_types)
            }
        }

    def validate_column_names(self):
        '''
        '''
        if all(len(x) <= self.ax_column_name_length for x in self.df.columns):
            return {
                'message': 'Column names may be truncated',
                'level': 'warning'
            }

        return {
            'message': 'Pass',
            'level': 'success'
        }

    def validate_crs(self):
        '''
        '''
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }

        if self.df.to_crs(epsg=self.epsg_code).cx[self.xmin:self.xmax, self.ymin:self.ymax].shape[0] == self.df.shape[0] and np.inf not in self.df.to_crs(epsg=self.epsg_code).total_bounds:
            return {
                'message': 'Pass',
                'level': 'success'
            }

        return {
            'message': 'Coordinate reference system code provided may be incorrect',
            'level': 'warning'
        }

    def validate_geometries_within_bbox(self):
        '''
        '''
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }

        if self.df.to_crs(epsg=self.epsg_code).cx[self.xmin:self.xmax, self.ymin:self.ymax].shape[0] != self.df.shape[0]:
            return {
                'message': 'Not all geometries within boundaries',
                'level': 'warning'
            }

        return {
            'message': 'Pass',
            'level': 'success'
        }

    def validate_geometries_in_boundaries(self):
        '''
        '''
        if not isinstance(self.df, gpd.geodataframe.GeoDataFrame):
            return {
                'message': 'Data not a valid GeoDataFrame',
                'level': 'info'
            }
        
        # get city boundaries by merging wards polygons into one
        boundaries = utils.read_agol_endpoint(agol_url=self.city_wards_agol_url)
        boundaries['constant'] = 1
        boundaries = boundaries.dissolve('constant').reset_index()
        boundaries = boundaries.drop([c for c in boundaries.columns if c != 'geometry'], axis=1).to_crs(epsg=self.epsg_code)

        # breakup source dataframe multi-features to check them individually
        gdf = self.df.to_crs(epsg=self.epsg_code).explode().reset_index()

        # perform spatial join between individual source features and city boundaries
        join_df = gpd.sjoin(gdf, boundaries, how='inner').set_index(['level_0', 'level_1'])
        gdf = gdf.set_index(['level_0', 'level_1'])
        outer = gdf[~gdf.index.isin(join_df.index)]

        if outer.empty:
            return {
                'message': 'Pass',
                'level': 'success'
            }

        return {
            'message': 'Not all geometries within provided polygon',
            'level': 'warning',
            'details': {
                'count': outer.shape[0],
                'content': outer.to_crs(epsg=4326).to_json(),
                'reference': boundaries.to_crs(epsg=4326).to_json()
            }
        }
