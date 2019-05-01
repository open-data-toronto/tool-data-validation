var test;
var srcFileName;
var testForm;

$(document).ready(function () {
    function addSchemaRows(numRows, checkAll = false, columnName, columnType) {
        numRows = numRows | 1;
        let columns_excluded_defaults = ['geometry', 'shape__length', 'shape__area', 'x', 'y', '_id', 'objectid', 'latitude', 'longitude', 'id']

        for (var i = 0; i < numRows; i++) {
            $('#table-schema tbody').append(
                '<tr>' +
                '<td class="wide" data-label="Include">' +
                '<div class="ui fitted toggle checkbox' + ((columnName) ? ((columns_excluded_defaults.indexOf(columnName.toLowerCase()) > -1) ? ' exclude' : '') : '') + '">' +
                '<input class="field-meta" type="checkbox" data-schema="include">' +
                '</div>' +
                '</td>' +
                '<td class="twelve wide" data-label="Name">' +
                '<div class="ui fluid input disabled">' +
                '<input class="field-meta" type="text" data-schema="name" placeholder="Field name' + ((columnName) ? '" value="' + columnName : '') + '">' +
                '</div>' +
                '</td>' +
                '<td class="two wide" data-label="Type">' +
                '<div class="ui selection dropdown">' +
                '<input class="field-meta" type="hidden" data-schema="type' + ((columnType) ? '" value="' + columnType : '') + '">' +
                '<i class="dropdown icon"></i>' +
                '<div class="default text">Field type</div>' +
                '<div class="menu">' +
                '<div class="item" data-value="text">Text</div>' +
                '<div class="item" data-value="integer">Whole Number</div>' +
                '<div class="item" data-value="float">Decimal Number</div>' +
                '<div class="item" data-value="datetime">Date & Time</div>' +
                '<div class="item" data-value="date">Date</div>' +
                '<div class="item" data-value="boolean">True/False</div>' +
                '</div>' +
                '</div>' +
                '</td>' +
                '</tr>'
            );
        }

        if (checkAll === true) {
            $('.ui.checkbox').checkbox('set checked')
            $('.ui.dropdown').dropdown();
        } else if (checkAll === false) {
            $('#table-schema tbody .ui.checkbox').last().checkbox('set checked')
            $('#table-schema tbody .ui.dropdown').last().dropdown()
        }
    }

    function formatNumber(n, plusSign = false) {
        let num = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (plusSign) {
            (n > 0) ? num = '+' + num: n
        }
        return num
    }

    function makeTableHeaders(columns) {
        return '<th class="center aligned">' + columns.join('</th><th class="center aligned">') + '</th>'
    }

    function removeEmptyTabs(accordionId) {
        // remove empty tables and tab
        $("#" + accordionId).find('table').each(function () {
            if ($(this).find('tbody tr').length <= 0) {
                $(this)
                    .parent()
                    .parent()
                    .find('[data-tab="' + $(this).parent().data('tab') + '"]')
                    .remove();
                $(this)
                    .remove();
            }
        })

        // set first of remaining tabs to active
        let activateTab = $("#" + accordionId).find('.menu a.item').first().data('tab');
        $("#" + accordionId).find('*[data-tab="' + activateTab + '"]').addClass('active');
    }

    function parseUrlName(url) {
        return url
            .split('/')
            .map(x => {
                return (["FeatureServer", "0", "query", "", "query?"].indexOf(x) < 0) ? x : null
            })
            .filter(x => x !== null).slice(-1)[0]
    }

    function makeDataProfileTable(jsonContent, tableId = 'report-column-profile') {
        jsonContent['data'].map(row => {
            if (!row.slice(1).every(t => t === false)) {
                $('#' + tableId + ' tbody')
                    .append('<tr><td>' + row[0] + '</td>' + row.slice(1).map(cell => {
                        let tableCell = '<td class="center aligned ';
                        if (cell === false) {
                            tableCell += 'disabled"><i class="checkmark icon"></i>'
                        } else {
                            tableCell += 'warning"><i class="warning icon"></i> ' + ((cell === true) ? '' : ((typeof(x) === 'object') ? cell['message'] : cell))
                        } 
                        return tableCell += '</td>'
                    }) + '</tr>')
            } else {
                $('#pass-' + tableId + ' tbody')
                    .append('<tr><td>' + row[0] + '</td><td class="center aligned disabled"><i class="icon checkmark"></i>' + row.slice(1).map(n => '').join('</td><td class="center aligned disabled"><i class="icon checkmark"></i>') + '</td></tr>')
            }
        });
        $('#' + tableId + '.sortable').tablesort();
    }

    function fillSummaryMessages(validateData) {
        // dataset validation
        let valParams = {};
        if (validateData.Geometry.level === 'error') {
            valParams.level = 'negative'
            valParams.msg = 'Do not publish. There are invalid geometries in the file.'
            valParams.icon = 'close'
        } else if (Object.keys(validateData).map( x => validateData[x].level).indexOf('warning') > -1) {
            valParams.level = 'warning'
            valParams.msg = 'Found potential areas of improvement but no blockers to publication.'
            valParams.icon = 'warning'
        } else {
            valParams.level = 'success'
            valParams.msg = 'All validation checks passed. No issues or observations.'
            valParams.icon = 'checkmark'
        }
        $('#dataset-validation .message.attached')
            .addClass(valParams.level)
            .find('.header')
            .first()
            .append(valParams.msg)
            .find('i')
            .addClass(valParams.icon)

        // column profiling
        let colParams = {};
        if ($('#report-column-profile-issues tbody tr').length > 1) {
            colParams.level = 'warning'
            colParams.msg = 'Found potential areas of improvement but no blockers to publication.'
            colParams.icon = 'warning'
        } else if ($('#report-column-profile-pass tbody tr').length > 1) {
            colParams.level = 'success'
            colParams.msg = 'All columns look good, no issues or observations.'
            colParams.icon = 'checkmark'
        } else {
            colParams.level = 'info'
            colParams.msg = 'No checks performed because all columns were excluded.'
            colParams.icon = 'info'
        }
        $('#column-validation .message.attached')
            .addClass(colParams.level)
            .find('.header')
            .first()
            .append(colParams.msg)
            .find('i')
            .addClass(colParams.icon)

        // column comparison
        let compParams = {};
        if ($('#compare-columns-added tbody tr').length > 1 || $('#compare-columns-removed tbody tr').length > 1) {
            compParams.msg = 'Do not publish. Columns have been added or removed.'
            compParams.level = 'negative'
            compParams.icon = 'close'
        } else if ($('#compare-columns-matched tbody tr').length > 1) {
            compParams.level = 'success'
            compParams.msg = 'All column types match between file and ArcGIS Online.'
            compParams.icon = 'checkmark'
        } else {
            compParams.level = 'info'
            compParams.msg = 'Every column was excluded so no checks were performed.'
            compParams.icon = 'info'
        }
        $('#comparison-results-columns .message.attached')
            .addClass(compParams.level)
            .find('.header')
            .first()
            .append(compParams.msg)
            .find('i')
            .addClass(compParams.icon)
    }

    function addListeners() {
        // data file to validate
        $('#new_file').on('change', function () {
            if ($('#form-atpf').form('is valid', 'new_file')) {
                // if file IS valid (i.e. allowed extension), proceed with upload and get rid of error message, if there is one
                $('#new-uploaded-file').html( this.value.replace('C:\\fakepath\\', '') );
                $('#table-schema tbody').empty();
                $('#fields-accordion').show();

                let formData = new FormData();
                let file = $('#new_file').prop('files')[0];
                formData.append('new_file', file);

                $.ajax({
                    type: 'POST',
                    url: 'upload',
                    data: formData,
                    contentType: false,
                    processData: false,
                    dataType: 'json',
                    beforeSend: () => $('#page-dimmer').dimmer('show'),
                    complete: () => $('#page-dimmer').dimmer('hide'),
                    success: res => {
                        $('#upload-new-file-button').addClass('disabled');
                        Object.keys(res).map(k => {
                            addSchemaRows(1, 'skip', k, res[k])
                        })
                        $('.ui.checkbox').checkbox('check');
                        $('.ui.checkbox.exclude').checkbox('uncheck');
                        $('.ui.dropdown').dropdown();
                    }
                });

                $('div#formats-msg').replaceWith($(
                    '<p id="formats-msg">' + $('#formats-msg').html() + '</p>'));
            } else {
                // if file IS NOT valid (i.e. not an allowed extension), make extension message an error
                $('#new_file').val('');
                $('#new-uploaded-file').html('Select data file');
                $('p#formats-msg').replaceWith($('<div class="ui negative message" id="formats-msg">' + $('#formats-msg').html() + '</div>'));
                $('#fields-accordion').hide();
            }
        });

        // data file to compare
        $('#src_file').on('change', function () {
            let formData = new FormData();

            if ($('#form-atpf').form('is valid', 'src_file')) {
                // if file is valid update file name, upload, remove upload error message (if any), and disable ArcGIS URL option
                $('#agol_url').val('');
                let srcFileName = this.value.replace('C:\\fakepath\\', '');
                (srcFileName) ? $('#src-uploaded-file').html(srcFileName) : $('#src-uploaded-file').html('Select data file');

                formData.append('src_file', $('#src_file').prop('files')[0])

                $.ajax({
                    type: 'POST',
                    url: 'upload',
                    data: formData,
                    contentType: false,
                    processData: false,
                    beforeSend: () => $('#page-dimmer').dimmer('show'),
                    complete: () => $('#page-dimmer').dimmer('hide'),
                    success: () => {
                        $('#comparison-data-tabs a.item[data-tab="agol_url"]').each(function () {
                            $(this).replaceWith($('<span class="item disabled" data-tab="agol_url">' + this.innerHTML + '</span>'))
                        });
                        $('#upload-src-file-button').addClass('disabled');
                    }
                });

                $('#src_file_error').remove();
            } else {
                // if file is not valid: add error message and enable AGOL URL
                $('[data-tab="src_file"].tab').append('<div class="ui negative message" id="src_file_error">Allowed formats include CSV, GeoJSON, Shapefile (ZIP), and JSON (unnested)</div>');

                $('#src_file').val('');
                $('#src-uploaded-file').html('Select data file');

                $('#comparison-data-tabs span.item.disabled').each(function () {
                    $(this).replaceWith($('<a class="item" data-tab="agol_url">' + this.innerHTML + '</a>'))
                });

                $('#comparison-data-tabs.menu .item').tab({
                    context: 'parent'
                });

                formData.append('src_file', $('#src_file').prop('files')[0])

                $.ajax({
                    type: 'POST',
                    url: 'upload',
                    data: formData,
                    contentType: false,
                    processData: false
                });
            }
        });

        // AGOL URL
        $('#agol_url').on('blur', function () {
            if ($('#form-atpf').form('is valid', 'agol_url')) {
                // if AGOL URL is valid
                if ($('#agol_url').val() != "") {
                    // if not empty, disable comparison file upload
                    $('#comparison-data-tabs a.item[data-tab="src_file"]').each(function () {
                        $(this).replaceWith($('<span class="item disabled" data-tab="' + $(this).data('tab') + '">' + this.innerHTML + '</span>'))
                    })
                } else {
                    // if empty, enable comparison file upload
                    $('#comparison-data-tabs span.item[data-tab="src_file"]').each(function () {
                        $(this).replaceWith($('<a class="item" data-tab="' + $(this).data('tab') + '">' + this.innerHTML + '</a>'))
                    })
                    $('#comparison-data-tabs.menu .item').tab({
                        context: 'parent'
                    });
                }
            } else {
                // if AGOL URL is invalid, enable comparison file upload
                $('#comparison-data-tabs span.item[data-tab="src_file"]').each(function () {
                    $(this).replaceWith($('<a class="item" data-tab="' + $(this).data('tab') + '">' + this.innerHTML + '</a>'))
                })
                $('#comparison-data-tabs.menu .item').tab({
                    context: 'parent'
                });
            }
        });

        $('.clear.button').on('click', function () {
            // remove schema
            $('#table-schema tbody').empty();

            // reset uploads
            $('input[type="file"]').val('');
            $('.labeled.upload.button').removeClass('disabled');
            $('.labeled.upload.button label.basic.left.pointing.label').html('Select data file');

            // enable disabled tabs
            $('#comparison-data-tabs span.item.disabled').each(function () {
                $(this).replaceWith($('<a class="item" data-tab="' + $(this).data('tab') + '">' + this.innerHTML + '</a>'))
            });
            $('#comparison-data-tabs.menu .item').tab({
                context: 'parent'
            });
            $('#fields-accordion').hide();
            $('.form .ui.error.message').empty();
        });

        $('#download').on('click', function () { window.location='/download' });
    }

    function buildUI() {
        $('#fields-accordion').hide();
        $('#fields-accordion').accordion();

        $('#btn-add-row').click(addSchemaRows);

        $('#form-atpf').form({
            on: 'blur',
            fields: {
                agol_url: {
                    identifier: 'agol_url',
                    optional: true,
                    rules: [{
                        type: 'url',
                        prompt: '{name}: URL is not valid, please review and try again'
                    }]
                }
                ,
                new_file: {
                    identifier: 'new_file',
                    rules: [{
                        type: 'empty',
                        prompt: 'Validation data: please upload a file'
                    },
                    {
                      type   : 'regExp',
                      value  : '/^(.*.((zip|csv|json|geojson)$))?[^.]*$/i',
                      prompt : 'Validation data: formats allowed are CSV, GeoJSON, Shapefile (ZIP), or JSON (unnested)' + this
                    }]
                }
                ,
                src_file: {
                    identifier: 'src_file',
                    rules: [{
                      type   : 'regExp',
                      value  : '/^(.*.((zip|csv|json|geojson)$))?[^.]*$/i',
                      prompt : 'Comparison data: formats allowed are CSV, GeoJSON, Shapefile (ZIP), or JSON (unnested)'
                    }]
                }
            }
        });

        $('#report').hide();

        $('#form-atpf').submit(function (evt) {
            if ($('#form-atpf').form('is valid')) {
                evt.preventDefault()
                let formData = new FormData(this),
                    schema = [],
                    columns_excluded = [];

                $('#table-schema tbody tr').each(function () {
                    let column = {},
                        fields = $(this).find('[data-label]');

                    if (fields.length) {
                        if ($(this).find('[data-schema="include"]')[0].checked) {
                            $(this).find('[data-schema][data-schema!="include"]').each(function (n) {
                                column[$(this).data('schema')] = $(this).val();
                            });
                            schema.push(column);
                        } else {
                            columns_excluded.push($(this).find('[data-schema="name"]').val())
                        }
                    }
                });
                formData.append('schema', JSON.stringify(schema));
                formData.append('columns_excluded', JSON.stringify(columns_excluded));

                // removing files from form sent since they are uploaded independently on field change above
                formData.delete('src_file');
                formData.delete('new_file');

                $.ajax({
                    type: 'GET',
                    url: 'validate',
                    data: {
                        'agol_url': JSON.stringify(formData.get('agol_url')),
                        'schema': JSON.stringify(schema),
                        'columns_excluded': JSON.stringify(columns_excluded)
                    },
                    dataType: 'json',
                    beforeSend: () => $('#page-dimmer').dimmer('show'),
                    complete: () => $('#page-dimmer').dimmer('hide'),
                    success: res => {
                        let {
                            validate_data,
                            validate_columns,
                            compare_columns,
                            compare_rows,
                            columns_excluded,
                            new_file_name,
                            comparison_url,
                            comparison_file_name,
                            compare_dataframes
                        } = res;
                        let datasetName = formData.get('dataset_name');

                        $('#form-atpf').hide();
                        $('h1').html((datasetName ? datasetName + '<div class="ui sub header">Data Validation Report Results</div>' : 'Data Validation Report' ))
                        // $('#report-info tbody')
                        //     .append('<tr><td>New File</td><td>' + new_file_name + '</td></tr>')
                        //     .append(comparison_url ? '<tr><td>ArcGIS Online URL</td><td><a href="' + comparison_url + '">' + comparison_url + '</a></td></tr>' : '')
                        //     .append(comparison_file_name ? '<tr><td>Comparison File</td><td>' + comparison_file_name + '</td></tr>' : '')

                        $('#file-results-overview')
                            .append('<div class="ui sub header">' + new_file_name + '</div>');

                        // Dataset Validation
                        Object.keys(validate_data).map(k => {
                            let id = 'validate-' + k.toLowerCase().split(' ').join('-'),
                                messageType = validate_data[k]['level'],
                                iconTypes = {
                                    'error': 'close',
                                    'warning': 'warning',
                                    'success': 'checkmark'
                                };

                            $('#report-data-profile tbody').append('<tr id="' + id + '"></tr>');

                            $('#' + id)
                                .append('<td class="validation-name">' + k + '</td>')
                                .append('<td class="validation-result center aligned ' + validate_data[k]['level'].replace('success', 'disabled').replace('info', 'disabled') + '"></td>')
                                .find('.validation-result').last()
                                .html(
                                    ((iconTypes[messageType]) ? '<i class="' + iconTypes[messageType] + ' icon" />' : '') + validate_data[k]['message']
                            );

                        });

                        // Column Validation
                        let reportColumnProfileHeadlines = makeTableHeaders(validate_columns['columns']);
                        ['report-column-profile', 'report-column-profile-pass'].map(x => {
                            $('#' + x + ' thead tr').append(reportColumnProfileHeadlines)
                        });
                        if (columns_excluded.length > 0) {
                            $('#excluded-columns table tbody').append('<tr><td>' + columns_excluded.join('</td></tr><tr><td>') + '</td></tr>')
                        } 
                        makeDataProfileTable(validate_columns);

                        // Comparisons
                        if (!compare_rows && !compare_columns) {
                            $('#report-comparison').remove()
                        } else {
                            let cellTypes = {
                                modified: { messageType: 'warning', icon: 'warning' },
                                added: { messageType: 'error', icon: 'close' },
                                removed: { messageType: 'error', icon: 'close' },
                                matched: { messageType: 'disabled', icon: 'checkmark' }
                            };
                            
                            // Column types
                            compare_columns['data'].map(row => {
                                let change = row.slice(-1);
                                row = [...new Set(row.filter(x => x !== false))];
                                $('#compare-columns-' + change + ' tbody')
                                    .append('<tr><td>' + row.join('</td><td class="center aligned">') + '</td></tr>')
                                    .find('td').last()
                                    .addClass(cellTypes[change].messageType)
                                    .prepend('<i class="icon ' + cellTypes[change].icon + '" />');
                            });

                            // Row Counts
                            $('#report-compare-rows thead tr').append(makeTableHeaders(compare_rows['columns']));
                            compare_rows['data'].map(row => {
                                $('#report-compare-rows tbody').append('<tr><td>' + row[0] + '</td><td class="center aligned">' +
                                    formatNumber(row[1]) + '</td><td class="center aligned">' +
                                    formatNumber(row[2]) + '</td><td class="center aligned">' +
                                    formatNumber(row[3], true) + '</td></tr>'
                                )
                            });

                            // remove tabs with empty tables
                            removeEmptyTabs('report-comparison-accordion');

                            // initialize tabs
                            $('#report-comparison-tabs.menu .item').tab({
                                context: 'parent'
                            });

                            $('#comparison-results-dataset .ui.message')
                                .addClass(compare_dataframes.level)
                                .find('.header')
                                .first()
                                .append(compare_dataframes.message)
                                .find('i')
                                .addClass((compare_dataframes.level === 'info') ? 'info' : 'close');


                        $('#comparison-results')
                            .append('<div class="ui sub header">' + ((comparison_url) ? 'ArcGIS Online <a href="' + comparison_url + '">web service</a>': comparison_file_name) + '</div>');
                        }

                        // remove empty tabs from column validation
                        removeEmptyTabs('column-validation-accordion');

                        // initialize tabs for column validation
                        $('#report-data-profile-tabs.menu .item').tab({
                            context: 'parent'
                        });

                        $('.ui.accordion').accordion({
                            animateChildren: false,
                            exclusive: false
                        });


                        if (validate_data['Geometries In Boundaries']['details']) {
                            let mymap = L.map('validation-map', {
                                center: [43.70827599415934, -79.34185624122621],
                                zoom: 10
                            });
                            L.geoJSON(JSON.parse(validate_data['Geometries In Boundaries']['details']['reference']), {
                                style: {
                                    "color": "#474747",
                                    "weight": 4,
                                    "opacity": 0.25
                                }
                            }).addTo(mymap);
                            L.geoJSON(JSON.parse(validate_data['Geometries In Boundaries']['details']['content']), {
                                onEachFeature: function (feature, layer) {
                                    let popup = '';
                                    Object.keys(feature['properties']).map(f => {
                                        popup += '<strong>' + f + ':</strong> ' + feature['properties'][f] + '<br />'
                                    })
                                    layer.bindPopup(popup);
                                },
                                style: {
                                    "color": "#ff7800",
                                    "weight": 4,
                                    "opacity": 0.50
                                }
                            }).addTo(mymap);
                            L.tileLayer('https://communitymapcanada.ca/arcgis/rest/services/CommunityMapsCache/MapServer/tile/{z}/{y}/{x}?blankTile=false', {
                                attribution: '&copy; <a href="https://www.toronto.ca/">City of Toronto</a>'
                            }).addTo(mymap);
                        } else {
                            $("#validation-map").remove()
                        }
                        
                        fillSummaryMessages(validate_data)

                        $('#report').show();
                    }
                });
            }
        });
    }

    $('#comparison-data-tabs.menu .item').tab({
        context: 'parent'
    });



    buildUI();
    addListeners();
    
});
