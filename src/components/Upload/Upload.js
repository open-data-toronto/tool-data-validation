import React, { Component, createRef } from 'react';
import {
    Segment,
    Header,
    Menu,
    Button,
    Input
} from 'semantic-ui-react';
import './Upload.css';

class Upload extends Component {
    getInitialState = () => {
        return {
            activeItem: 'file',
            fileUploaded: false,
            validUrl: true
        }
    };

    handleItemClick = (e, { name }) => this.setState({ activeItem: name });

    fileChange = e => this.setState(
        {
            file: e.target.files[0],
            fileUploaded: true
        },
        () => this.props.updateData(this.props.number, { file: this.state.file })
    );

    validateUrl = e => this.setState(
        {
            validUrl: !!new RegExp('^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$', 'i').test(e.target.value),
            agolUrl: e.target.value
        },
        () => { if (this.state.validUrl) { this.props.updateData(this.props.number, { agolUrl: this.state.agolUrl }) } }
    );

    fileInputRef = createRef();

    state = this.getInitialState();

    render() {
        let { activeItem, fileUploaded, file, validUrl, agolUrl } = this.state;

        return (
            <Segment basic className='Upload'>
                <Header
                    className='Upload-Header'
                    attached='top'
                    content={fileUploaded ? file.name : `Dataset #${this.props.number}`}
                    subheader={fileUploaded ? `Dataset #${this.props.number}` : ''}
                    block
                />
                <Segment
                    className='Upload-Container'
                    attached='bottom'>
                    <Menu secondary pointing>
                        <Menu.Item name='file' active={activeItem === 'file'} disabled={(agolUrl && validUrl) === true} onClick={this.handleItemClick} content='Data File' />
                        <Menu.Item name='agol' active={activeItem === 'agol'} disabled={fileUploaded === true} onClick={this.handleItemClick} content='AGOL Endpoint' />
                    </Menu>
                    <Segment basic>
                        {
                            activeItem === 'file' ?
                                <div className='Upload-Container-Tab'>
                                    <p>Allowed formats include CSV, GeoJSON, Shapefile (ZIP), and JSON (unnested)</p>
                                    <Button
                                        content='Upload'
                                        icon='cloud upload'
                                        labelPosition='right'
                                        disabled={fileUploaded === true}
                                        onClick={() => this.fileInputRef.current.click()}
                                        type='submit'
                                        primary
                                    />
                                    <input
                                        ref={this.fileInputRef}
                                        type='file'
                                        hidden
                                        onChange={this.fileChange}
                                    />
                                    {
                                        fileUploaded ?
                                            <span className="Upload-Container-Tab-FileName">{file.name}</span>
                                            : null
                                    }
                                </div>
                                :
                                <div className='Upload-Container-Tab'>
                                    <p>Uploaded data file can be compared to an <a href="http://insideto-dev.toronto.ca/itweb/support/geospatial/MapServiceCatalog/searchGCC.html" target="_blank" rel="noopener noreferrer">existing map service</a> in ArcGIS Online or to another data file.</p>
                                    <Input
                                        label='https://'
                                        labelPosition='left'
                                        placeholder='gis.toronto.ca/arcgis/rest/services/primary/dataset/FeatureServer/0'
                                        onChange={this.validateUrl}
                                        error={(agolUrl && !validUrl) === true}
                                        fluid />
                                </div>
                        }
                    </Segment>
                </Segment>
            </Segment>
        )
    }
}

export default Upload;
