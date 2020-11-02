import 'react-native-gesture-handler';
import {createStackNavigator} from 'react-navigation-stack';
import {createAppContainer} from 'react-navigation';

import Login from '../screens/LoginScreen';
import Find from '../screens/FindScreen';
import RF from '../screens/ReportFound';
import RL from '../screens/ReportLost';
import Browse from '../screens/BrowseScreen';
import PostInfo from '../screens/PostInfo';
import HomePage from '../screens/HomePage';

const screens = {
    LoginPage: {
        screen: Login,
        navigationOptions: {
            title: 'FirstPage',
            headerShown: false
        },
    },
    Find: {
        screen: Find,
        navigationOptions: {
            title: 'FindPage',
            headerShown: false
        },
    },
    ReportFoundPage: {
        screen: RF,
        navigationOptions: {
            title: 'ReportFoundPage',
            headerShown: false
        },
    },
    ReportLostPage:{
        screen: RL,
        navigationOptions: {
            title: 'ReportLosePage',
            headerShown: false
        },
    },
    BrowsePetPage: {
        screen: Browse,
        navigationOptions: {
            title: 'BrowsePage',
            headerShown: false
        }
    },
    PostInfo:{
        screen: PostInfo,
        navigationOptions: {
            title: 'PostInfo',
            headerShown: false
        }
    },

    HomePage: {
        screen: HomePage,
        navigationOptions: {
            title: 'HomePage',
            headerShown: false
        }
    }
}

//create new stack navigator, pass the screens you want to navigate in the app
const HomeStack = createStackNavigator(screens);

//wrap the stack navigator inside the app container, this function returns an
//component that we can render to App.js, and it contains all the navigation stuff
//in the navigation stack
export default createAppContainer(HomeStack);