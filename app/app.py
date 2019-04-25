from flask import Flask, render_template, request

import json

import utils
import validate_data as vd

ALLOWED_EXTENSION = ['json', 'geojson']

app = Flask(__name__)

data = None

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    global data
    content = request.files['payload']
    data = utils.read_file(content.read(), content.filename.split('.')[-1])
    columns = utils.get_columns(data)

    return json.dumps(columns)


@app.route('/validate', methods=['GET'])
def validate():
    agol_url = json.loads(request.args.get('agol_url'))
    schema = json.loads(request.args.get('schema'))
    schema = [x for x in schema if len(x['name'])]
    columns_excluded = json.loads(request.args.get('columns_excluded'))

    validation = vd.DataFrameValidation(data=data, schema=schema, columns_excluded=columns_excluded)
    
    results = {
        'params': validation.get_params()
    }

    validate_columns = {
        'index': '',
        'distinct_count': 'Constant Value',
        'p_missing': 'Over {perc_missing_thresh}% Missing'.format(**results['params']),
        'p_zeros': 'Over {perc_zeros_thresh}% Zeros'.format(**results['params']),
        'matched_columns': 'Code Column Match',
        'is_unique': 'All Uniques',
        'dtype_map': 'Data Type',
    }
    compare_columns = {
        'index': '',
        'new': 'File Uploaded',
        'source': 'ArcGIS Online',
        'message': 'Change',
    }
    compare_rows = {
        'index': '',
        'new': 'File Uploaded',
        'source': 'ArcGIS Online',
        'difference': 'Difference',
    }

    validate_columns_df = validation.profile_columns().astype(object).fillna(False)
    validate_columns_df = validate_columns_df.reset_index(drop=False)[[ c for c in validate_columns ]].rename(columns=validate_columns)
    
    results['validate_data'] = validation.profile_dataframe()
    results['validate_columns'] = validate_columns_df.to_dict(orient='split')
    results['compare_columns'] = None
    results['compare_rows'] = None
    results['columns_excluded'] = columns_excluded

    if agol_url !=  '':
        src = utils.read_agol_endpoint(agol_url=agol_url)

        comparison = vd.DataFrameComparison(src=src, new=data, columns_excluded=columns_excluded)
        compare_columns_df = comparison.compare_columns()[[ c for c in compare_columns ]].rename(columns=compare_columns)
        compare_rows_df = comparison.compare_rows()[[ c for c in compare_rows ]].rename(columns=compare_rows)

        results['compare_columns'] = compare_columns_df.to_dict(orient='split')
        results['compare_rows'] = compare_rows_df.to_dict(orient='split')
    
    return json.dumps(results)


if __name__ == "__main__":
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0')
