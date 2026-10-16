import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSession } from './lib/session';
import { StaySelectionProvider } from './lib/stays';
import { BillScreen } from './screens/BillScreen';
import { CoverageScreen } from './screens/CoverageScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PaymentPlanScreen } from './screens/PaymentPlanScreen';
import { PaymentsScreen } from './screens/PaymentsScreen';
import { PayScreen } from './screens/PayScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { QuestionChargeScreen } from './screens/QuestionChargeScreen';
import { SignInScreen } from './screens/SignInScreen';
import { UpdatesScreen } from './screens/UpdatesScreen';
import { AppHeader, PillTabBar } from './ui/chrome';
import { Loading } from './ui/kit';
import { C } from './ui/theme';

export type TabParams = {
  Home: undefined;
  Bill: undefined;
  Coverage: undefined;
  Payments: undefined;
  Profile: undefined;
};

export type RootParams = {
  Tabs: NavigatorScreenParams<TabParams>;
  Documents: undefined;
  Updates: undefined;
  Pay: { stayId: string };
  PaymentPlan: { stayId: string };
  QuestionCharge: { stayId: string; chargeId: string };
};

export type RootScreenProps<K extends keyof RootParams> = NativeStackScreenProps<RootParams, K>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- React Navigation's typing hook
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging
    interface RootParamList extends RootParams {}
  }
}

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootParams>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: C.brand,
    background: C.paper,
    card: C.surface,
    text: C.ink,
    border: C.border,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        header: ({ route, options }) => (
          <AppHeader
            title={options.title ?? route.name}
            branded={route.name === 'Home'}
            background={route.name === 'Home' ? C.paper : C.surface}
          />
        ),
        sceneStyle: { backgroundColor: C.paper },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Bill" component={BillScreen} options={{ title: 'Bill' }} />
      <Tab.Screen name="Coverage" component={CoverageScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useSession();
  if (status === 'restoring') return <Loading message="Opening MedCore…" />;
  return (
    <NavigationContainer theme={theme}>
      {status === 'signedOut' ? (
        <SignInScreen />
      ) : (
        <StaySelectionProvider>
          <Stack.Navigator
            screenOptions={{ headerTintColor: C.brandDark, headerBackButtonDisplayMode: 'minimal' }}
          >
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
            <Stack.Screen name="Updates" component={UpdatesScreen} options={{ title: 'Hospital updates' }} />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="Pay" component={PayScreen} options={{ title: 'Pay online' }} />
              <Stack.Screen
                name="PaymentPlan"
                component={PaymentPlanScreen}
                options={{ title: 'Payment plan' }}
              />
              <Stack.Screen
                name="QuestionCharge"
                component={QuestionChargeScreen}
                options={{ title: 'Question a charge' }}
              />
            </Stack.Group>
          </Stack.Navigator>
        </StaySelectionProvider>
      )}
    </NavigationContainer>
  );
}
