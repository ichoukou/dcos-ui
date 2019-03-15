import "reflect-metadata"; // Needed for inversify
import { Container } from "@extension-kid/core";
import notificationServiceFactory from "@extension-kid/notification-service";
import toastsExtensionFactory from "@extension-kid/toast-notifications";
import dataLayerExtensionFactory from "@extension-kid/data-layer";
import jobsExtensionFactory from "#PLUGINS/jobs/src/js";
import repositoriesExtensionFactory from "#PLUGINS/catalog/src/js";

import { TYPES } from "./types/containerTypes";
import mesosStream from "./core/MesosStream";
import { i18n } from "./i18n";

const container = new Container();

container.bind(TYPES.MesosStream).toConstantValue(mesosStream);
container.bind(TYPES.I18n).toConstantValue(i18n);

const factories = {
  notification: notificationServiceFactory,
  toast: toastsExtensionFactory,
  dataLayer: dataLayerExtensionFactory,
  jobs: jobsExtensionFactory,
  repositoriesExtension: repositoriesExtensionFactory
};

Object.entries(factories).forEach(([name, factory]) => {
  const containerModule = factory();
  if (containerModule) {
    container.load(containerModule);
  } else {
    // tslint:disable-next-line
    console.error(`Could not load ${name} extension, please check export`);
  }
});

export default container;
