import { cleanServiceJSON } from "#SRC/js/utils/CleanJSONUtil";
import { isSDKService } from "#PLUGINS/services/src/js/utils/ServiceUtil";
import { findNestedPropertyInObject } from "#SRC/js/utils/Util";

import {
  ROUTE_ACCESS_PREFIX,
  FRAMEWORK_ID_VALID_CHARACTERS
} from "../constants/FrameworkConstants";
import FrameworkUtil from "../utils/FrameworkUtil";
import ServiceStatus from "../constants/ServiceStatus";

import Application from "./Application";
import FrameworkSpec from "./FrameworkSpec";

/**
 * Status response codes and description
 * | HTTP Response Code | Priority | Reason                                           |
 * |--------------------+----------+--------------------------------------------------|
 * |                418 |        1 | Initializing                                     |
 * |                200 |        1 | Running/Ready                                    |
 * |                500 |        1 | Error Creating Service                           |
 * |                204 |        2 | Deploying:Pending (Awaiting Resources)           |
 * |                202 |        2 | Deploying:Starting                               |
 * |                203 |        4 | Recovering: Pending Degraded(Awaiting Resources) |
 * |                205 |        4 | Degraded (Recovering):Starting                   |
 * |                206 |        3 | Degraded                                         |
 * |                420 |        5 | Backing up                                       |
 * |                421 |        5 | Restoring                                        |
 * |                426 |        6 | Upgrade / Rollback / Downgrade                   |
 * |                503 |          | Service Unavailable                              |
 */

const frameworkStatusHelper = (displayName, key, priority) => ({
  displayName,
  key,
  priority
});

const FrameworkStatus = {
  418: frameworkStatusHelper("Initializing", ServiceStatus.DEPLOYING, 1),
  200: frameworkStatusHelper("Running/Ready", ServiceStatus.RUNNING, 1),
  500: frameworkStatusHelper(
    "Error Creating Service",
    ServiceStatus.DELAYED,
    1
  ),
  204: frameworkStatusHelper("Deploying:Pending", ServiceStatus.DEPLOYING, 2),
  202: frameworkStatusHelper("Deploying:Starting", ServiceStatus.DEPLOYING, 2),
  203: frameworkStatusHelper(
    "Recovering: Pending Degraded",
    ServiceStatus.RECOVERING,
    4
  ),
  205: frameworkStatusHelper(
    "Degraded (Recovering):Starting",
    ServiceStatus.RECOVERING,
    4
  ),
  206: frameworkStatusHelper("Degraded", ServiceStatus.RECOVERING, 3),
  420: frameworkStatusHelper("Backing up", ServiceStatus.RECOVERING, 5),
  421: frameworkStatusHelper("Restoring", ServiceStatus.RECOVERING, 5),
  426: frameworkStatusHelper(
    "Upgrade / Rollback / Downgrade",
    ServiceStatus.DEPLOYING,
    6
  ),
  503: frameworkStatusHelper("Service Unavailable", ServiceStatus.STOPPED)
};

module.exports = class Framework extends Application {
  constructor() {
    super(...arguments);

    // The variable is prefixed because `Item` will expose all the properties
    // it gets as a properties of this object and we want to avoid any naming
    // collisions.
    this._spec = null;
  }

  /**
   * @override
   */
  getImages() {
    return FrameworkUtil.getServiceImages(this.get("images"));
  }

  getPackageName() {
    return this.getLabels().DCOS_PACKAGE_NAME;
  }

  /**
   * @override
   */
  getVersion() {
    return this.getLabels().DCOS_PACKAGE_VERSION;
  }

  getFrameworkName() {
    return this.getLabels().DCOS_PACKAGE_FRAMEWORK_NAME;
  }

  getNodeIDs() {
    return this.get("slave_ids");
  }

  getResourceID() {
    const regexp = new RegExp(`[^${FRAMEWORK_ID_VALID_CHARACTERS}]`, "g");

    // Strip non-alphanumeric chars from name for safety
    return ROUTE_ACCESS_PREFIX + (this.get("name") || "").replace(regexp, "");
  }

  /**
   * @override
   */
  getSpec() {
    if (this._spec == null) {
      // State and other _useless_ information is removed to create a clean
      // service spec.
      this._spec = new FrameworkSpec(cleanServiceJSON(this.get()));
    }

    return this._spec;
  }

  getCheckStatus() {
    const checkStatus = this.get("tasks").reduce((acc, cur) => {
      if (cur.checkResult != null) {
        const curStatusCode = findNestedPropertyInObject(
          cur,
          "checkResult.http.statusCode"
        );
        const accStatusCode =
          findNestedPropertyInObject(acc, "checkResult.http.statusCode") ||
          null;
        if (curStatusCode > accStatusCode) {
          return cur;
        }
      }

      return acc;
    }, false);

    if (checkStatus == null) {
      return false;
    }

    return checkStatus;
  }

  getStatus() {
    const checkStatus = this.getCheckStatus();
    const statusCode = findNestedPropertyInObject(
      checkStatus,
      "checkResult.http.statusCode"
    );

    return checkStatus
      ? FrameworkStatus[statusCode].displayName
      : super.getStatus();
  }

  getServiceStatus() {
    const checkStatus = this.getCheckStatus();
    const statusCode = findNestedPropertyInObject(
      checkStatus,
      "checkResult.http.statusCode"
    );

    return checkStatus
      ? FrameworkStatus[statusCode].key
      : super.getServiceStatus();
  }

  getTasksSummary() {
    const isSDK = isSDKService(this);
    // TODO: Circular reference workaround DCOS_OSS-783
    const MesosStateStore = require("#SRC/js/stores/MesosStateStore");

    const tasksSummary = Object.assign({}, super.getTasksSummary());
    const tasks = MesosStateStore.getTasksByService(this) || [];
    const tasksRunning = this.get("TASK_RUNNING") || 0;
    tasksSummary.tasksRunning += tasksRunning;
    tasksSummary.tasksUnknown += tasksRunning;

    tasks.reduce(function(memo, task) {
      if (task.state !== "TASK_RUNNING" || task.isStartedByMarathon) {
        return memo;
      }
      if (task.statuses != null) {
        return task.statuses.reduce(function(memo, status) {
          if (status.healthy || (isSDK && status.healthy === undefined)) {
            memo.tasksHealthy++;
            memo.tasksUnknown--;
          }
          if (status.healthy === false) {
            memo.tasksUnhealthy++;
            memo.tasksUnknown--;
          }

          return memo;
        }, memo);
      }

      return memo;
    }, tasksSummary);

    return tasksSummary;
  }

  getUsageStats(resource) {
    const value = this.get("used_resources")[resource];

    return { value };
  }

  getResources() {
    // There's an unfortunate naming issue in Mesos.
    // used_resources is actually allocated resources
    // the name can't be changed to keep backward compatibility.
    // This is why `getResources` returns `used_resources`
    const allocatedFrameworkResources = this.get("used_resources") || {
      cpus: 0,
      mem: 0,
      gpus: 0,
      disk: 0
    };

    // Framework doesn't know how many resources its scheduler consumes.
    // Scheduler is launched by Marathon not the Framework itself.
    // So we should get this information separately from the Marathon spec
    const schedulerResources = this.getSpec().getResources();

    return {
      cpus: allocatedFrameworkResources.cpus + schedulerResources.cpus,
      mem: allocatedFrameworkResources.mem + schedulerResources.mem,
      gpus: allocatedFrameworkResources.gpus + schedulerResources.gpus,
      disk: allocatedFrameworkResources.disk + schedulerResources.disk
    };
  }
};
