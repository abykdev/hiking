import HomeScreen from '../components/screens/HomeScreen';
import MyRoutesScreen from '../components/screens/MyRoutesScreen';
import ExploreScreen from '../components/screens/ExploreScreen';
import HikeDetailScreen from '../components/screens/HikeDetailScreen';
import CreateEventScreen from '../components/screens/CreateEventScreen';
import FindBuddiesScreen from '../components/screens/FindBuddiesScreen';
import MessagesScreen from '../components/screens/MessagesScreen';
import ProfileScreen from '../components/screens/ProfileScreen';
import ProfileMeScreen from '../components/screens/ProfileMeScreen';
import RoutesScreen from '../components/screens/RoutesScreen';
import AddRouteScreen from '../components/screens/AddRouteScreen';
import RouteSingleScreen from '../components/screens/RouteSingleScreen';
import AdminPanelScreen from '../components/screens/AdminPanelScreen';
import AddEventScreen from '../components/screens/AddEventScreen';

export const screens = {
  home: HomeScreen,
  explore: ExploreScreen,
  hikeDetail: HikeDetailScreen,
  createEvent: CreateEventScreen,
  findBuddies: FindBuddiesScreen,
  messages: MessagesScreen,
  profile: ProfileScreen,
  profileMe: ProfileMeScreen,
  routes: RoutesScreen,
  addRoute: AddRouteScreen,
  routeSingle: RouteSingleScreen,
  adminPanel: AdminPanelScreen,
  addEvent: AddEventScreen,
  myRoutes: MyRoutesScreen
};

export const ROOT_SCREENS = new Set([
  'home',
  'explore',
  'myRoutes',
  'messages',
  'profile',
]);