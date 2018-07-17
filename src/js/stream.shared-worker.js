import Rx from "rxjs";
import { request } from "@dcos/mesos-client";

import Config from "./config/Config";
import { linearBackoff } from "./utils/rxjsUtils";
import { MesosStreamType } from "./core/MesosStream";
import container from "./container";

const MAX_RETRIES = 5;
const RETRY_DELAY = 500;
const MAX_RETRY_DELAY = 5000;

const mesosStream = container.get(MesosStreamType);
const getMasterRequest = request(
  { type: "GET_MASTER" },
  "/mesos/api/v1?get_master"
).retryWhen(linearBackoff(RETRY_DELAY, MAX_RETRIES));

const dataStream = mesosStream.merge(getMasterRequest).distinctUntilChanged();

const waitStream = getMasterRequest.zip(mesosStream.take(1));
const eventTriggerStream = dataStream.merge(
  // A lot of DCOS UI rely on the MesosStateStore emitting
  // MESOS_STATE_CHANGE events. After the switch to the stream, we lost this
  // event. To avoid a deeper refactor, we introduced this fake emitter.
  //
  // TODO: https://jira.mesosphere.com/browse/DCOS-18277
  Rx.Observable.interval(Config.getRefreshRate())
);

// Since we introduced the fake event above, we have to guarantee certain
// refresh limits to the UI. They are:
//
// MOST once every (Config.getRefreshRate() * 0.5) ms. due to sampleTime.
// LEAST once every tick of Config.getRefreshRate() ms in
// Observable.interval
//
// TODO: https://jira.mesosphere.com/browse/DCOS-18277
const stream = waitStream
  .concat(eventTriggerStream)
  .sampleTime(Config.getRefreshRate() * 0.5)
  .retryWhen(linearBackoff(RETRY_DELAY, -1, MAX_RETRY_DELAY));

// eslint-disable-next-line
onconnect = function(event) {
  const port = event.ports[0];

  stream.subscribe(message => {
    if (typeof message !== "number") {
      console.log(message);
      port.postMessage(message);
    }
  });
};