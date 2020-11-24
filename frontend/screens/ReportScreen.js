import React, { Component } from 'react';
import 'react-native-gesture-handler';

import { StyleSheet, View, Text, Modal, Image, TextInput, Button, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import ImagePicker from 'react-native-image-picker';
import CameraRollPicker from 'react-native-camera-roll-picker';
import { withNavigation } from 'react-navigation';
import { RNS3 } from 'react-native-aws3';

import MapView from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { Callout } from 'react-native-maps';

const options = {
  takePhotoButtonTitle: 'Take Photos',
  chooseFromLibraryButtonTitle: 'Photo Gallery',
};

// Google Map
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = 0.0922;

export default class ReportScreen extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      user_id: this.props.navigation.state.params.user_id,
      isFinder: this.props.navigation.state.isFinder,

      avatarSource: null,
      filename: null,
      lat: null,
      lon: null,
      date: null,
      bucket: 'lostpetpictures',

      didUploadPicture: false,

      // Google Maps
      region: 'unknown',
      currentPosition: {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0,
        longitudeDelta: 0
      },
      lastPosition: 'unknown',
      isMapReady: false,
      userLocation:"",
      regionChangeProgress:false
    };
    
  }


  componentDidMount() {
    Geolocation.getCurrentPosition((position) => {
      const current_pos = JSON.stringify(position);
      this.setState({ region: current_pos });
      console.log("latitude is: " + position["coords"]["latitude"]);
      console.log("longitude is: " + position["coords"]["longitude"]);

      var coordination_info = {
        latitude: position["coords"]["latitude"],
        longitude: position["coords"]["longitude"],
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      this.setState(
        {
        currentPosition: coordination_info,
        lat: position["coords"]["latitude"],
        lon: position["coords"]["longitude"],
        });
    },
      (error) => alert(JSON.stringify(error)),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 },
    );
  }

  onMapReady=()=> {
    this.setState({isMapReady:true});
  }


  fetchAddress=()=> {
    console.log(this.state.currentPosition.latitude + ", " + this.state.currentPosition.longitude);
    fetch("https://maps.googleapis.com/maps/api/geocode/json?address=" + this.state.currentPosition.latitude + "," + this.state.currentPosition.longitude + "&key=" + "AIzaSyBk1oSy9YTS0SjTxnHiznhPyQpai8mgJh8")
    .then((response)=>
      response.json()
        )
    .then((responseJson) => {
      console.log("yooyoy" + responseJson);
      const userLocation = responseJson.results[0].formatted_address;
      console.log(userLocation);

      var change_coordination_info = {
        latitude: responseJson.results[0].geometry.location.lat,
        longitude: responseJson.results[0].geometry.location.lng,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };

      this.setState({
        currentPosition: change_coordination_info,
        userLocation: userLocation,
        lat: responseJson.results[0].geometry.location.lat,
        lon: responseJson.results[0].geometry.location.lng,
        regionChangeProgress:false
      });
    });
  }

  onRegionChange = currentPosition => {
    this.setState({
      currentPosition,
      regionChangeProgress:true
    }, ()=>{
      console.log("calling");
      this.fetchAddress();
      });
  }

  onLocationSelect=()=> alert(this.state.userLocation);

  //submit the report
  submit() {
    const url = this.state.isFinder == 0 ? 'http://ec2-34-214-245-195.us-west-2.compute.amazonaws.com:6464/pets/postLostPets' : 'http://ec2-34-214-245-195.us-west-2.compute.amazonaws.com:6464/pets/postFoundPets';

    if (this.state.didUploadPicture == false) {
      Alert.alert('Upload Picture First!', 'You need to provide a picture of your pet so we can run AI/ML image recognition');
      return;
    }

    if (this.state.user_id == null || this.state.filename == null || this.state.loc_x == null || this.state.loc_y == null || this.state.date == null) {
      Alert.alert('Incomplete Submission!', 'Please make sure you fill in all the fields and upload a picture');
      console.log(this.state);
      return;
    }

    let body = JSON.stringify(
      {
        userid: this.state.user_id,
        filename: this.state.filename,
        location_x: this.state.lat,
        location_y: this.state.lon,
        date: this.state.date,
        bucketName: this.state.bucket,
      });

    this.postToNodeServer(body, url);

    return;
  }

  async postToNodeServer(body, url) {
    console.log(`Calling API Endpoint: ${url}`);

    const response = await fetch(url,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body
      })

    if (response.status == 201 || response.status == 200) {
      const json = await response.json();

      console.log(json);

      Alert.alert('Report Submitted!', `Tags Generated: ${json[0].tags}`, [
        { text: "OK", onPress: () => this.props.navigation.navigate("HomePage") }
      ]);
    }
  }



  // get photo from photo gallery
  getPhoto() {
    ImagePicker.showImagePicker(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else {
        this.uploadPhotoToS3(response);
      }
    })
  }

  async uploadPhotoToS3(imagePickerResponse) {
    const source = { uri: imagePickerResponse.uri };
    var photo_str = `${imagePickerResponse.fileName}`;
    this.setState({ filename: photo_str });

    // send images to S3
    const file = {
      uri: imagePickerResponse.uri,
      name: this.state.filename,
      type: 'image/png'
    }

    const config = {
      bucket: 'lostpetpictures',
      region: 'us-west-2',
      accessKey: 'AKIAJ5OYQDSWAJXXAVFQ',
      secretKey: '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',
      successActionStatus: 201
    }
    const response = await RNS3.put(file, config);

    if (response.status == 201 || response.status == 200) {
      this.setState({
        didUploadPicture: true
      });
    }

    this.setState({
      avatarSource: source,
    });
  }



  render() {
    return (
      <View style={styles.container}>

        <View style={styles.imageWrapper}>
            <Image source={this.state.avatarSource} style={styles.photolist} />
          </View>

          <View style={styles.mapcontainer} >
            
            <MapView
              style={styles.map}
              showUserLocation={true}
              initialRegion={this.state.currentPosition}
              onMapReady={this.onMapReady}
              onRegionChangeComplete={this.onRegionChange}
              testID={'Map_detox'}>

              <MapView.Marker
                coordinate={{
                  latitude: this.state.currentPosition.latitude,
                  longitude: this.state.currentPosition.longitude
                }}
                title="Your current location"
                // image={require('../assets/pin.png')}
                style={{ width: "5%", height: "5%" }}
                draggable
              >
              </MapView.Marker>
            </MapView>

            <View style={styles.detailSection}>
              <Text style={{ fontSize: 16, fontWeight: "bold", fontFamily: "roboto", marginBottom: 20 }}>Move map for location</Text>
              <Text style={{ fontSize: 10, color: "#999" }}>LOCATION</Text>
              <Text numberOfLines={2} style={{ fontSize: 14, paddingVertical: 10, borderBottomColor: "silver", borderBottomWidth: 0.5 }}>
                {!this.state.regionChangeProgress ? this.state.userLocation : "Identifying Location..."}</Text>
              <View style={styles.btnContainer}>
              
                <Button
                  title="PICK THIS LOCATION"
                  disabled={this.state.regionChangeProgress}
                  onPress={this.onLocationSelect}
                >
                </Button>

              </View>
            </View>
          </View>

            <TextInput
              style={styles.textInputField}
              testID={'DateInput_detox'}
              placeholder="Date: (yyyy-mm-dd hr-min)"
              onChangeText={(value) => this.setState({ date: value })}
              value={this.state.date}
            ></TextInput>

          
    
        <TouchableOpacity style={styles.SearchButton} testID={'UploadButton_detox'} onPress={() => this.getPhoto()}>
            <Text style={styles.textStyle}>Upload Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.SearchButton} testID={'Reportsubmit_detox'} onPress={() => this.submit()}>
            <Text style={styles.textStyle}>Submit</Text>
          </TouchableOpacity>
     
          
      </View>

    )
  }


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#BBDEFB',
    alignItems: 'baseline',
    justifyContent: 'center',
    display: "flex"
  },

  topcontainer: {
    flex: 9,
    flexDirection: 'column',
    backgroundColor: '#BBDEFB',
    alignItems: 'baseline',
    justifyContent: 'center',
  },

  bottomcontainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    alignItems: 'baseline',
    justifyContent: 'center',
  },

  imageWrapper: {
    display: "flex",
    flex: 1,
    width: "100%",
    height: 200,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top:10,
  },

  mapcontainer: {
    position:"absolute",
    height: "45%",
    width: "90%",
    display: "flex",
    left: "5%",
    top: "40%",
    display: "flex",
    flex: 7,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  photolist: {
    width: 200,
    height: 200
  },
  SearchButton: {
    display: "flex",
    alignSelf: 'center',
    padding: 20,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    height: "5%",
    width: "55%",
    justifyContent: 'center',
    marginHorizontal: 5,
    marginVertical: "5%",
  },
  ReportButton: {
    flex: 1,
    alignSelf: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 25,
    height: "20%",
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: 20,
    marginBottom: 10,
  },
  textStyle: {
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#fff',
    fontSize: 16,
  },
  textInputField: {
    fontSize: 15,
    width: '80%',
    left: '10%',
    borderBottomColor: '#000',
    borderBottomWidth: 1,
    display: "flex",
    flexDirection: "column",
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#FFFFF9'
  },
  inputView: {
    width: '80%',
    backgroundColor: '#465881',
    borderRadius: 25,
    height: 50,
    marginBottom: 20,
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    marginBottom: 40,
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  detailSection: {
    height: "20%",
    width: "95%",
    backgroundColor: "#fff",
    display: "flex",
    position: "absolute",
    bottom: 0,
    left:"2.5%",
    justifyContent: "flex-start"
  },
  btnContainer: {
    position: "absolute",
    width:"70%",
    bottom: 0,
    left: "15%",
  }
});
