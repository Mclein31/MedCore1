// expo-notifications adds the iOS `aps-environment` (Push Notifications) entitlement on prebuild.
// The app only shows local notifications (no remote push yet), and a free Apple personal team
// cannot sign an app that requests Push Notifications, so drop the entitlement.
// Remove this plugin when backend push delivery is added.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo loads config plugins as CommonJS.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
