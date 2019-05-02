from flask import Flask, render_template, request, make_response

import json

import utils
import validate_data as vd

ALLOWED_EXTENSION = ['json', 'geojson']

app = Flask(__name__)

new_data = None
new_data_filename = None

src_data = None
src_data_filename = None

@app.route('/')
def home():
    global new_data, src_data, new_data_filename, src_data_filename
    new_data, src_data, new_data_filename, src_data_filename = None, None, None, None
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    global new_data, src_data, new_data_filename, src_data_filename
    if 'new_file' in request.files:
        new_file_content = request.files['new_file']
        new_data_filename = new_file_content.filename
        new_data = utils.read_file(new_file_content.read(), new_data_filename.split('.')[-1])
        columns = utils.get_columns(new_data)
        return json.dumps(columns)

    elif 'new_file' in request.form:
        new_data = None
        return "new_data cleared"
    
    if 'src_file' in request.files:
        src_file_content = request.files['src_file']
        src_data_filename = src_file_content.filename
        src_data = utils.read_file(src_file_content.read(), src_data_filename.split('.')[-1])
        return "src_data uploaded: " + src_data_filename

    elif 'src_file' in request.form:
        src_data = None
        return "src_data cleared"

@app.route('/validate', methods=['GET'])
def validate():
    global src_data, src_data_filename, new_data, new_data_filename
    agol_url = json.loads(request.args.get('agol_url'))
    schema = json.loads(request.args.get('schema'))
    schema = [x for x in schema if len(x['name'])]
    columns_excluded = json.loads(request.args.get('columns_excluded'))

    validation = vd.DataFrameValidation(data=new_data, schema=schema, columns_excluded=columns_excluded)
    
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
        'p_leading_space': 'Over {perc_leading_sp}% Leading Spaces'.format(**results['params']),
        'p_trailing_space': 'Over {perc_trailing_sp}% Trailing Spaces'.format(**results['params'])
    }
    compare_columns = {
        'index': '',
        'new': 'Validation Data File',
        'source': 'Comparison Data',
        'message': 'Change',
    }
    compare_rows = {
        'index': '',
        'new': 'Validation Data File',
        'source': 'Comparison Data',
        'difference': 'Difference',
    }

    validate_columns_df = validation.profile_columns().astype(object).fillna(False)
    validate_columns_df = validate_columns_df.reset_index(drop=False)[[ c for c in validate_columns ]].rename(columns=validate_columns)
    
    results['validate_data'] = validation.profile_dataframe()
    results['validate_columns'] = validate_columns_df.to_dict(orient='split')
    results['compare_columns'] = None
    results['compare_rows'] = None
    results['columns_excluded'] = columns_excluded
    results['new_file_name'] = new_data_filename

    if agol_url !=  '' or src_data is not None:
        src_data = src_data if src_data is not None else utils.read_agol_endpoint(agol_url=agol_url)

        comparison = vd.DataFrameComparison(src=src_data, new=new_data, columns_excluded=columns_excluded)
        compare_columns_df = comparison.compare_columns()[[ c for c in compare_columns ]].rename(columns=compare_columns)
        compare_rows_df = comparison.compare_rows()[[ c for c in compare_rows ]].rename(columns=compare_rows)

        results['compare_columns'] = compare_columns_df.to_dict(orient='split')
        results['compare_rows'] = compare_rows_df.to_dict(orient='split')
        results['comparison_file_name'] = src_data_filename
        results['comparison_url'] = agol_url
        results['compare_dataframes'] = comparison.compare_dataframes()
    
    return json.dumps(results)

@app.route('/download', methods=['GET'])
def download():
    global new_data, new_data_filename
    resp = make_response(new_data.to_csv(index=False))
    resp.headers["Content-Disposition"] = "attachment; filename={0}_checked.csv".format(new_data_filename.split('.')[0])
    resp.headers["Content-Type"] = "text/csv"

    return resp

if __name__ == "__main__":
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0')
