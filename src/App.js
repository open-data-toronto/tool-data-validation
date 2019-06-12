import React, {
  Component,
  createRef
} from 'react';
import {
  Ref,
  Container,
  Button
} from 'semantic-ui-react';
import Navbar from './components/Navbar/Navbar'
import Upload from './components/Upload/Upload'
import './App.css';

class App extends Component {
  numberOfDatasets = 2;
  state = { ...[...Array(this.numberOfDatasets).keys()].map(n => { return { [n]: {} } }) };
  ref = createRef();

  updateData = (n, i) => {
    console.debug(n, i);
    this.setState({ [n]: { ...i } }, () => { console.debug(this.state) })
  };

  // fileUpload = file => {
  //   const url = "/some/path/to/post";
  //   const formData = new FormData();
  //   formData.append("file", file);
  //   const config = {
  //     headers: {
  //       "Content-type": "multipart/form-data"
  //     }
  //   };
  //   // return put(url, formData, config);
  // };

  render() {
    return (
      <Ref innerRef={this.ref}>
        <div className='App'>
          <Navbar />
          <Container className='App-Container'>
            {[...Array(this.numberOfDatasets).keys()].map(i => <Upload number={i + 1} key={`dataset-upload-${i + 1}`} updateData={this.updateData} />)}
            <Button content='Submit' icon='play' labelPosition='right' floated='right' primary />
            <Button content='Clear' icon='undo' labelPosition='right' floated='left' />
          </Container>
        </div>
      </Ref>
    );
  }
}

export default App;
